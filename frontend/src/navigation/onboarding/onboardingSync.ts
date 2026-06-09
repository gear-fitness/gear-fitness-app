import { updateUserProfile, uploadProfilePicture } from "../../api/userService";
import { followUserByUsername } from "../../api/userService";
import { getAllExercises, createExercise } from "../../api/exerciseService";
import { createRoutine } from "../../api/routineService";
import { DAY_FULL } from "../../utils/days";
import { OnboardingDraft } from "./types";
import { calcAge } from "./calcAge";
import { heightToInches, weightToLbs } from "./units";

/** Push the collected profile fields to the backend. Best-effort:
 *  a failure here must never block the user from entering the app. */
export async function syncOnboardingProfile(
  draft: OnboardingDraft,
  refreshUser: () => Promise<void>,
): Promise<void> {
  try {
    const age = draft.dob
      ? calcAge(draft.dob.year, draft.dob.month, draft.dob.day)
      : null;

    await updateUserProfile(
      heightToInches(draft.height),
      weightToLbs(draft.weight),
      age,
      draft.profile?.username ?? null,
      draft.profile?.name ?? null,
      draft.gender ?? null,
    );

    if (draft.profile?.photoUri) {
      await uploadProfilePicture(draft.profile.photoUri);
      await refreshUser();
    }
  } catch (err) {
    console.warn("Onboarding profile sync failed:", err);
  }
}

/** Follow the accounts the user queued during onboarding. */
export async function applyPendingFollows(usernames?: string[]): Promise<void> {
  if (!usernames || usernames.length === 0) return;
  await Promise.all(
    usernames.map(async (username) => {
      try {
        await followUserByUsername(username);
      } catch (err) {
        // A missing/placeholder founder handle shouldn't fail the batch.
        console.warn(`Could not follow @${username}:`, err);
      }
    }),
  );
}

/** Persist the routines drafted in onboarding. Exercise names are resolved
 *  against the live catalog, creating any that don't exist, then each
 *  routine is created with the resolved exercise IDs. */
export async function saveDraftedRoutines(
  draft: OnboardingDraft,
): Promise<void> {
  const routines = (draft.routines ?? []).filter((r) => r.exercises.length > 0);
  if (routines.length === 0) return;

  let catalog: Awaited<ReturnType<typeof getAllExercises>> = [];
  try {
    catalog = await getAllExercises();
  } catch (err) {
    console.warn("Could not load exercise catalog for onboarding sync:", err);
  }

  const byName = new Map(catalog.map((e) => [e.name.toLowerCase(), e]));

  const resolveExerciseId = async (
    name: string,
    bodyParts: { bodyPart: string; targetType: "PRIMARY" | "SECONDARY" }[],
  ): Promise<string | null> => {
    const existing = byName.get(name.toLowerCase());
    if (existing) return existing.exerciseId;
    try {
      const created = await createExercise({
        name,
        description: null,
        bodyParts,
      });
      byName.set(name.toLowerCase(), created);
      return created.exerciseId;
    } catch (err) {
      console.warn(`Could not create exercise "${name}":`, err);
      return null;
    }
  };

  for (const routine of routines) {
    try {
      const ids: string[] = [];
      for (const ex of routine.exercises) {
        const id = await resolveExerciseId(ex.name, ex.bodyParts);
        if (id) ids.push(id);
      }
      if (ids.length === 0) continue;
      const days = routine.scheduledDays
        .map((d) => DAY_FULL[d])
        .filter(Boolean);
      await createRoutine(routine.name.trim() || "My Routine", days, ids);
    } catch (err) {
      console.warn(`Could not save routine "${routine.name}":`, err);
    }
  }
}

/** Run every post-signup sync task. Each sub-task swallows its own errors
 *  so one failure can't strand the user mid-onboarding. */
export async function runPostSignupSync(
  draft: OnboardingDraft,
  refreshUser: () => Promise<void>,
): Promise<void> {
  await syncOnboardingProfile(draft, refreshUser);
  await Promise.all([
    applyPendingFollows(draft.pendingFollows),
    saveDraftedRoutines(draft),
  ]);
}

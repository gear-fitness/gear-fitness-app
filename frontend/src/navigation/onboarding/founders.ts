/** NOT CURRENTLY IMPLEMENTED — the founder/accountability step is hidden from
 *  onboarding, so these accounts are not surfaced to users. Left in place for
 *  when the step is re-enabled (see TODO below to wire real accounts first).
 *
 *  Curated accounts surfaced on the social/accountability step. Real user
 *  search needs auth, which the user doesn't have yet during onboarding, so
 *  these handles are queued in the draft and followed right after sign-up.
 *  Update the usernames to match the real founder/ambassador accounts. */
export interface SuggestedAccount {
  username: string;
  name: string;
  blurb: string;
  /** Real avatar URL once available from the DB; falls back to a placeholder. */
  photoUri?: string;
}

// TODO: these are mock accounts. Pull the real founder/ambassador accounts
// (and their photoUri) from the database once the onboarding suggestions
// endpoint exists.
export const FOUNDER_ACCOUNTS: SuggestedAccount[] = [
  {
    username: "alton",
    name: "Alton",
    blurb: "Co-founder · strength and powerlifting",
  },
  {
    username: "bryant",
    name: "Bryant",
    blurb: "Co-founder · hypertrophy and aesthetics",
  },
  {
    username: "kobe",
    name: "Kobe",
    blurb: "Co-founder · building Gear in public",
  },
  {
    username: "max",
    name: "Max",
    blurb: "Co-founder · conditioning and athletics",
  },
  {
    username: "alex",
    name: "Alex",
    blurb: "Co-founder · mobility and recovery",
  },
];

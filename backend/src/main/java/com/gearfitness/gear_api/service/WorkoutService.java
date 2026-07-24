package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.BodyPartDTO;
import com.gearfitness.gear_api.dto.DailyVolumeDTO;
import com.gearfitness.gear_api.dto.WeeklyVolumeDTO;
import com.gearfitness.gear_api.dto.WorkoutDetailDTO;
import com.gearfitness.gear_api.dto.WorkoutExerciseDTO;
import com.gearfitness.gear_api.dto.WorkoutSetDTO;
import com.gearfitness.gear_api.dto.WorkoutSubmissionDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Exercise;
import com.gearfitness.gear_api.entity.Post;
import com.gearfitness.gear_api.entity.Workout;
import com.gearfitness.gear_api.entity.WorkoutExercise;
import com.gearfitness.gear_api.entity.WorkoutSet;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.ExerciseRepository;
import com.gearfitness.gear_api.repository.ImageModerationRepository;
import com.gearfitness.gear_api.repository.NotificationRepository;
import com.gearfitness.gear_api.repository.PostRepository;
import com.gearfitness.gear_api.repository.ReportRepository;
import com.gearfitness.gear_api.repository.WorkoutRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class WorkoutService {

  private final WorkoutRepository workoutRepository;
  private final ExerciseRepository exerciseRepository;
  private final PostRepository postRepository;
  private final AppUserRepository appUserRepository;
  private final NotificationRepository notificationRepository;
  private final ReportRepository reportRepository;
  private final ImageModerationRepository imageModerationRepository;
  private final StreakService streakService;
  private final S3StorageService s3StorageService;
  private final PrService prService;
  private final ModerationService moderationService;
  private final MentionService mentionService;

  @Transactional(readOnly = true)
  public List<Workout> getWorkoutsByUser(UUID userId) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() ->
        new RuntimeException("User not found with id: " + userId)
      );
    return workoutRepository.findByUserOrderByDatePerformedDescCreatedAtDesc(
      user
    );
  }

  @Transactional(readOnly = true)
  public WorkoutDetailDTO getWorkoutDetails(
    UUID workoutId,
    UUID requestingUserId
  ) {
    Workout workout = workoutRepository
      .findById(workoutId)
      .orElseThrow(() ->
        new RuntimeException("Workout not found with id: " + workoutId)
      );

    boolean isOwner =
      requestingUserId != null &&
      workout.getUser().getUserId().equals(requestingUserId);

    List<WorkoutExerciseDTO> exercises = workout
      .getWorkoutExercises()
      .stream()
      .sorted(Comparator.comparing(WorkoutExercise::getPosition))
      .map(we -> {
        List<WorkoutSetDTO> sets = we
          .getWorkoutSets()
          .stream()
          .sorted(Comparator.comparing(ws -> ws.getSetNumber()))
          .map(ws ->
            new WorkoutSetDTO(
              ws.getWorkoutSetId(),
              ws.getSetNumber(),
              ws.getReps(),
              ws.getWeightLbs(),
              ws.getIsPr()
            )
          )
          .collect(Collectors.toList());

        return new WorkoutExerciseDTO(
          we.getWorkoutExerciseId(),
          we.getExercise().getName(),
          we
            .getExercise()
            .getBodyParts()
            .stream()
            .map(bp -> new BodyPartDTO(bp.getBodyPart(), bp.getTargetType()))
            .toList(),
          we.getPosition(),
          we.getSupersetGroup(),
          isOwner ? we.getNote() : null,
          sets
        );
      })
      .collect(Collectors.toList());

    return WorkoutDetailDTO.builder()
      .workoutId(workout.getWorkoutId())
      .name(workout.getName())
      .datePerformed(workout.getDatePerformed())
      .durationMin(workout.getDurationMin())
      .bodyTags(
        workout.getBodyTags() != null
          ? workout.getBodyTags().stream().map(Enum::name).toList()
          : List.of()
      )
      .exercises(exercises)
      .photoUrls(
        workout.getPhotoUrls() != null
          ? new ArrayList<>(workout.getPhotoUrls())
          : new ArrayList<>()
      )
      .build();
  }

  public Workout addWorkout(Workout workout) {
    return workoutRepository.save(workout);
  }

  // Weekly volume statistics
  @Transactional(readOnly = true)
  public List<WeeklyVolumeDTO> getWeeklyVolume(UUID userId, int numberOfWeeks) {
    List<Workout> workouts = workoutRepository.findByUser_UserId(userId);

    if (workouts.isEmpty()) {
      return Collections.emptyList();
    }

    // Group workouts by week
    Map<LocalDate, List<Workout>> workoutsByWeek = new TreeMap<>();

    for (Workout workout : workouts) {
      LocalDate workoutDate = workout.getDatePerformed();
      LocalDate weekStart = workoutDate.with(
        TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)
      );

      workoutsByWeek
        .computeIfAbsent(weekStart, k -> new ArrayList<>())
        .add(workout);
    }

    // Calculate volume for each week
    List<WeeklyVolumeDTO> weeklyVolumes = new ArrayList<>();

    for (Map.Entry<
      LocalDate,
      List<Workout>
    > entry : workoutsByWeek.entrySet()) {
      LocalDate weekStart = entry.getKey();
      LocalDate weekEnd = weekStart.plusDays(6);
      List<Workout> weekWorkouts = entry.getValue();

      BigDecimal totalVolume = BigDecimal.ZERO;

      for (Workout workout : weekWorkouts) {
        for (WorkoutExercise exercise : workout.getWorkoutExercises()) {
          for (WorkoutSet set : exercise.getWorkoutSets()) {
            if (set.getWeightLbs() != null && set.getReps() != null) {
              BigDecimal setVolume = set
                .getWeightLbs()
                .multiply(new BigDecimal(set.getReps()));
              totalVolume = totalVolume.add(setVolume);
            }
          }
        }
      }

      weeklyVolumes.add(
        WeeklyVolumeDTO.builder()
          .weekStartDate(weekStart)
          .weekEndDate(weekEnd)
          .totalVolumeLbs(totalVolume)
          .workoutCount(weekWorkouts.size())
          .build()
      );
    }

    // Sort by date
    weeklyVolumes.sort(Comparator.comparing(WeeklyVolumeDTO::getWeekStartDate));

    // Return only the requested number of weeks (most recent)
    if (numberOfWeeks > 0 && weeklyVolumes.size() > numberOfWeeks) {
      return weeklyVolumes.subList(
        weeklyVolumes.size() - numberOfWeeks,
        weeklyVolumes.size()
      );
    }

    return weeklyVolumes;
  }

  // Daily volume statistics
  @Transactional(readOnly = true)
  public List<DailyVolumeDTO> getDailyVolume(
    UUID userId,
    int numberOfWeeks,
    DayOfWeek weekStartDay,
    String localDate
  ) {
    List<Workout> workouts = workoutRepository.findByUser_UserId(userId);

    if (workouts.isEmpty()) {
      return Collections.emptyList();
    }

    // Calculate date range
    // Extend endDate to the end of the current week (Saturday) to ensure full week
    // is displayed
    LocalDate referenceDate = (localDate != null && !localDate.isBlank())
      ? LocalDate.parse(localDate)
      : LocalDate.now();
    LocalDate endDate = referenceDate.with(
      TemporalAdjusters.nextOrSame(DayOfWeek.SATURDAY)
    );

    // If numberOfWeeks is 0 or negative, fetch all data from the earliest workout
    LocalDate startDate;
    if (numberOfWeeks <= 0) {
      // Find the earliest workout date
      LocalDate earliestDate = workouts
        .stream()
        .map(Workout::getDatePerformed)
        .min(LocalDate::compareTo)
        .orElse(endDate);
      // Align to the week start day
      startDate = earliestDate.with(
        TemporalAdjusters.previousOrSame(weekStartDay)
      );
    } else {
      startDate = endDate
        .minusWeeks(numberOfWeeks)
        .with(TemporalAdjusters.previousOrSame(weekStartDay));
    }

    // Group workouts by date
    Map<LocalDate, List<Workout>> workoutsByDate = new TreeMap<>();

    for (Workout workout : workouts) {
      LocalDate workoutDate = workout.getDatePerformed();
      // Only include workouts within the date range
      if (!workoutDate.isBefore(startDate) && !workoutDate.isAfter(endDate)) {
        workoutsByDate
          .computeIfAbsent(workoutDate, k -> new ArrayList<>())
          .add(workout);
      }
    }

    // Calculate volume for each date
    Map<LocalDate, BigDecimal> volumeByDate = new HashMap<>();
    Map<LocalDate, Integer> workoutCountByDate = new HashMap<>();

    for (Map.Entry<
      LocalDate,
      List<Workout>
    > entry : workoutsByDate.entrySet()) {
      LocalDate date = entry.getKey();
      List<Workout> dateWorkouts = entry.getValue();

      BigDecimal totalVolume = BigDecimal.ZERO;

      for (Workout workout : dateWorkouts) {
        for (WorkoutExercise exercise : workout.getWorkoutExercises()) {
          for (WorkoutSet set : exercise.getWorkoutSets()) {
            if (set.getWeightLbs() != null && set.getReps() != null) {
              BigDecimal setVolume = set
                .getWeightLbs()
                .multiply(new BigDecimal(set.getReps()));
              totalVolume = totalVolume.add(setVolume);
            }
          }
        }
      }

      volumeByDate.put(date, totalVolume);
      workoutCountByDate.put(date, dateWorkouts.size());
    }

    // Fill gaps with zero-volume days and create DTOs
    List<DailyVolumeDTO> dailyVolumes = new ArrayList<>();
    LocalDate currentDate = startDate;

    while (!currentDate.isAfter(endDate)) {
      dailyVolumes.add(
        DailyVolumeDTO.builder()
          .date(currentDate)
          .totalVolumeLbs(
            volumeByDate.getOrDefault(currentDate, BigDecimal.ZERO)
          )
          .workoutCount(workoutCountByDate.getOrDefault(currentDate, 0))
          .build()
      );
      currentDate = currentDate.plusDays(1);
    }

    return dailyVolumes;
  }

  /**
   * Normalize a client-supplied idempotency key: trimmed, empty treated as
   * absent. Shared with the controller's duplicate-race recovery so both
   * sides look up the exact string that was stored.
   */
  public static String normalizeIdempotencyKey(String raw) {
    if (raw == null) {
      return null;
    }
    String key = raw.trim();
    if (key.isEmpty()) {
      return null;
    }
    if (key.length() > 64) {
      throw new IllegalArgumentException("idempotencyKey exceeds 64 chars");
    }
    return key;
  }

  @Transactional
  public WorkoutDetailDTO submitWorkout(
    WorkoutSubmissionDTO submission,
    UUID userId
  ) {
    // Idempotent resubmit: a retry of an already-committed submission (lost
    // response, offline-queue re-flush) returns the existing workout instead
    // of creating a duplicate. Side effects (PRs, streak, post, moderation)
    // already ran when the first submission committed.
    String idempotencyKey = normalizeIdempotencyKey(
      submission.getIdempotencyKey()
    );
    if (idempotencyKey != null) {
      Optional<Workout> existing =
        workoutRepository.findFirstByUser_UserIdAndIdempotencyKey(
          userId,
          idempotencyKey
        );
      if (existing.isPresent()) {
        return getWorkoutDetails(existing.get().getWorkoutId(), userId);
      }
    }

    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));

    // Create workout entity
    Workout workout = Workout.builder()
      .user(user)
      .name(submission.getName())
      .datePerformed(
        submission.getDatePerformed() != null
          ? LocalDate.parse(submission.getDatePerformed())
          : LocalDate.now()
      )
      .durationMin(submission.getDurationMin())
      .bodyTags(
        submission.getBodyTags() != null
          ? submission.getBodyTags()
          : new ArrayList<>()
      )
      .photoUrls(
        submission.getPhotoUrls() != null
          ? new ArrayList<>(submission.getPhotoUrls())
          : new ArrayList<>()
      )
      .workoutExercises(new ArrayList<>())
      .idempotencyKey(idempotencyKey)
      .build();

    // Save workout first to get ID. saveAndFlush (not save) so a concurrent
    // duplicate of the same idempotency key raises
    // DataIntegrityViolationException here, inside the method body, where the
    // controller can catch it; a commit-time violation would surface as
    // TransactionSystemException instead.
    workout = workoutRepository.saveAndFlush(workout);

    // Create workout exercises
    List<Integer> supersetGroups = SupersetHygiene.normalize(
      submission
        .getExercises()
        .stream()
        .map(WorkoutSubmissionDTO.ExerciseSubmissionDTO::getSupersetGroup)
        .toList()
    );
    for (int i = 0; i < submission.getExercises().size(); i++) {
      WorkoutSubmissionDTO.ExerciseSubmissionDTO exerciseDto = submission
        .getExercises()
        .get(i);
      Exercise exercise = exerciseRepository
        .findById(exerciseDto.getExerciseId())
        .orElseThrow(() -> new IllegalArgumentException("Exercise not found"));

      WorkoutExercise workoutExercise = WorkoutExercise.builder()
        .workout(workout)
        .exercise(exercise)
        .position(i + 1)
        .supersetGroup(supersetGroups.get(i))
        .note(exerciseDto.getNote())
        .workoutSets(new ArrayList<>())
        .build();

      // Create sets
      int setNumber = 1;
      for (WorkoutSubmissionDTO.SetSubmissionDTO setDto : exerciseDto.getSets()) {
        // Skip empty sets
        if (
          setDto.getReps() == null ||
          setDto.getWeight() == null ||
          setDto.getWeight().trim().isEmpty()
        ) {
          continue;
        }

        WorkoutSet workoutSet = WorkoutSet.builder()
          .workoutExercise(workoutExercise)
          .setNumber(setNumber++)
          .reps(setDto.getReps())
          .weightLbs(new BigDecimal(setDto.getWeight()))
          .isPr(false)
          .build();

        workoutExercise.getWorkoutSets().add(workoutSet);
      }

      workout.getWorkoutExercises().add(workoutExercise);
    }

    // Save complete workout with exercises and sets
    workout = workoutRepository.save(workout);

    // Recompute PRs for each exercise touched by this workout. Submission may
    // be back-dated, so a full per-(user, exercise) recompute is needed.
    Set<UUID> touchedExerciseIds = workout
      .getWorkoutExercises()
      .stream()
      .map(we -> we.getExercise().getExerciseId())
      .collect(Collectors.toSet());
    for (UUID exerciseId : touchedExerciseIds) {
      prService.recomputePrsForUserExercise(userId, exerciseId);
    }

    // Update daily streak after workout submission. Use the workout's
    // datePerformed (already in the user's local date) so the streak walks
    // forward from the user's local "today", not the server's UTC date.
    streakService.recalculateStreak(user, workout.getDatePerformed());

    // Always create a post. Resolve visibility: explicit value wins; if old
    // client sent createPost=false with no visibility, default to PRIVATE so
    // "save only" workouts are not accidentally made public.
    Post.PostVisibility visibility = Post.PostVisibility.PUBLIC;
    if (
      submission.getVisibility() != null &&
      !submission.getVisibility().isBlank()
    ) {
      visibility = Post.PostVisibility.valueOf(submission.getVisibility());
    } else if (Boolean.FALSE.equals(submission.getCreatePost())) {
      visibility = Post.PostVisibility.PRIVATE;
    }

    Post post = Post.builder()
      .user(user)
      .workout(workout)
      .caption(submission.getCaption())
      .imageUrl(submission.getImageUrl())
      .visibility(visibility)
      .build();

    postRepository.save(post);

    // Notify any @mentioned users in the caption.
    if (post.getCaption() != null && !post.getCaption().isBlank()) {
      mentionService.notifyCaptionMentions(user, post.getCaption(), post);
    }

    // Run image moderation once this transaction commits. Deferring to
    // afterCommit guarantees the async worker sees the persisted post row
    // (and the image is already in S3 — the client uploads via presigned PUT
    // before submitting). Only post images (posts/ keys) are moderated.
    String imageKey = post.getImageUrl();
    if (
      imageKey != null && imageKey.startsWith(S3StorageService.POSTS_PREFIX)
    ) {
      UUID postId = post.getPostId();
      TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            moderationService.moderatePostImage(postId, imageKey);
          }
        }
      );
    }

    // Return workout details
    return getWorkoutDetails(workout.getWorkoutId(), userId);
  }

  /**
   * Recovery lookup for the controller after a concurrent-duplicate
   * DataIntegrityViolationException: the losing transaction is rollback-only,
   * so the winner's row must be read in this fresh transaction.
   */
  @Transactional(readOnly = true)
  public WorkoutDetailDTO getWorkoutDetailsByIdempotencyKey(
    UUID userId,
    String idempotencyKey
  ) {
    String key = normalizeIdempotencyKey(idempotencyKey);
    if (key == null) {
      return null;
    }
    return workoutRepository
      .findFirstByUser_UserIdAndIdempotencyKey(userId, key)
      .map(w -> getWorkoutDetails(w.getWorkoutId(), userId))
      .orElse(null);
  }

  @Transactional
  public void deleteWorkout(UUID workoutId, UUID userId) {
    Workout workout = workoutRepository
      .findById(workoutId)
      .orElseThrow(() ->
        new IllegalArgumentException("Workout not found with id: " + workoutId)
      );

    // Security check: Verify the user owns this workout
    if (!workout.getUser().getUserId().equals(userId)) {
      throw new IllegalArgumentException(
        "User does not have permission to delete this workout"
      );
    }

    // A post hidden/removed by moderation is filtered out of the Workout->Post
    // association by the @SQLRestriction on Post, so the workout's cascade can't
    // see it. Load it directly (mirrors PostRepository.updateModerationStatus's
    // restriction-bypassing style) so the post and every reference to it are
    // cleaned up and the workout delete doesn't trip the post.workout_id FK.
    Post post = workout.getPost();
    boolean postHiddenFromCascade = post == null;
    if (postHiddenFromCascade) {
      post = postRepository.findAnyByWorkoutId(workoutId).orElse(null);
    }
    if (post != null) {
      notificationRepository.deleteAllByPost(post);
      notificationRepository.deleteAllByCommentIn(post.getPostComments());
      // report and image_moderation reference post_id without ON DELETE CASCADE
      // and aren't JPA-cascaded from Post, so clear them before the post row.
      reportRepository.deleteByPost_PostId(post.getPostId());
      imageModerationRepository.deleteByPost_PostId(post.getPostId());
      if (postHiddenFromCascade) {
        // The workout cascade won't see this hidden post, so delete it
        // explicitly (its likes/comments cascade via JPA).
        postRepository.delete(post);
        postRepository.flush();
      }
    }

    if (workout.getPhotoUrls() != null) {
      for (String key : workout.getPhotoUrls()) {
        s3StorageService.deleteImageByKey(key);
      }
    }

    // Snapshot the exercises this workout touched before cascade delete, so we
    // can recompute PRs for each (user, exercise) afterwards.
    Set<UUID> touchedExerciseIds = workout
      .getWorkoutExercises()
      .stream()
      .map(we -> we.getExercise().getExerciseId())
      .collect(Collectors.toSet());
    AppUser owner = workout.getUser();

    // Delete the workout - cascade will handle related entities
    workoutRepository.delete(workout);
    workoutRepository.flush();

    // Recompute PRs for each exercise this workout touched. Sets that were
    // shadowed by the deleted workout's lifts may now qualify as PRs.
    for (UUID exerciseId : touchedExerciseIds) {
      prService.recomputePrsForUserExercise(owner.getUserId(), exerciseId);
    }

    // Recalculate streak after deletion. Deletion isn't user-time-sensitive,
    // so UTC "today" is acceptable.
    streakService.recalculateStreak(owner, LocalDate.now(ZoneOffset.UTC));
  }
}

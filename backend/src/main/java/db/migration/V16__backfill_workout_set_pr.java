package db.migration;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.UUID;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/**
 * One-time backfill of workout_set.is_pr for every existing (user, exercise)
 * pair. Future writes maintain the flag in WorkoutService via PrService.
 *
 * Rule (mirrors PrService.recomputePrsForUserExercise and the PR chart in
 * ExerciseHistory.tsx): at most one set per workout is flagged — the heaviest
 * set in the workout, and only if its weight strictly exceeds the running max
 * across all earlier workouts for the same (user, exercise). Tiebreak within
 * a workout: most reps wins; if reps also tie, earliest by position then
 * set_number. Null-weight sets are ignored.
 *
 * Implemented with raw JDBC because Java migrations run before the application
 * context is built and cannot inject Spring beans.
 */
public class V16__backfill_workout_set_pr extends BaseJavaMigration {

  @Override
  public void migrate(Context context) throws Exception {
    Connection conn = context.getConnection();

    try (Statement reset = conn.createStatement()) {
      reset.executeUpdate("UPDATE workout_set SET is_pr = FALSE");
    }

    String selectSql =
      "SELECT s.workout_set_id, s.weight_lbs, s.reps, " +
      "       w.user_id, we.exercise_id, w.workout_id " +
      "FROM workout_set s " +
      "  JOIN workout_exercise we ON we.workout_exercise_id = s.workout_exercise_id " +
      "  JOIN workout w ON w.workout_id = we.workout_id " +
      "WHERE s.weight_lbs IS NOT NULL " +
      "ORDER BY w.user_id, we.exercise_id, " +
      "         w.date_performed ASC, w.created_at ASC, " +
      "         we.position ASC, s.set_number ASC";

    String updateSql =
      "UPDATE workout_set SET is_pr = TRUE WHERE workout_set_id = ?";

    UUID currentUser = null;
    UUID currentExercise = null;
    UUID currentWorkout = null;
    BigDecimal runningMax = null;
    UUID workoutBestSetId = null;
    BigDecimal workoutBestWeight = null;
    int workoutBestReps = 0;
    int prCount = 0;

    try (
      PreparedStatement select = conn.prepareStatement(selectSql);
      PreparedStatement update = conn.prepareStatement(updateSql);
      ResultSet rs = select.executeQuery()
    ) {
      while (rs.next()) {
        UUID setId = (UUID) rs.getObject("workout_set_id");
        BigDecimal weight = rs.getBigDecimal("weight_lbs");
        int reps = rs.getInt("reps");
        UUID userId = (UUID) rs.getObject("user_id");
        UUID exerciseId = (UUID) rs.getObject("exercise_id");
        UUID workoutId = (UUID) rs.getObject("workout_id");

        boolean newPair =
          !userId.equals(currentUser) || !exerciseId.equals(currentExercise);
        boolean newWorkout = newPair || !workoutId.equals(currentWorkout);

        if (newWorkout) {
          // Flush the previous workout's best.
          if (
            workoutBestSetId != null &&
            (runningMax == null || workoutBestWeight.compareTo(runningMax) > 0)
          ) {
            runningMax = workoutBestWeight;
            update.setObject(1, workoutBestSetId);
            update.addBatch();
            prCount++;
          }
          workoutBestSetId = null;
          workoutBestWeight = null;
          workoutBestReps = 0;
        }

        if (newPair) {
          currentUser = userId;
          currentExercise = exerciseId;
          runningMax = null;
        }
        currentWorkout = workoutId;

        // Tiebreak: heavier weight first, then more reps. On full ties the
        // earliest row wins (rows arrive in position then set_number order).
        if (workoutBestWeight == null) {
          workoutBestWeight = weight;
          workoutBestReps = reps;
          workoutBestSetId = setId;
        } else {
          int weightCmp = weight.compareTo(workoutBestWeight);
          if (weightCmp > 0 || (weightCmp == 0 && reps > workoutBestReps)) {
            workoutBestWeight = weight;
            workoutBestReps = reps;
            workoutBestSetId = setId;
          }
        }
      }

      // Flush the final workout.
      if (
        workoutBestSetId != null &&
        (runningMax == null || workoutBestWeight.compareTo(runningMax) > 0)
      ) {
        update.setObject(1, workoutBestSetId);
        update.addBatch();
        prCount++;
      }

      if (prCount > 0) {
        update.executeBatch();
      }
    }
  }
}

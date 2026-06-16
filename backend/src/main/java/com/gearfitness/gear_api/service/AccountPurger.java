package com.gearfitness.gear_api.service;

import jakarta.persistence.EntityManager;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Hard-deletes every database row belonging to a single already-soft-deleted
 * user. Lives in its own bean (not the scheduler) so that {@code @Transactional}
 * is honored via the Spring proxy: each call runs in its OWN transaction, so one
 * user's failure rolls back only that user and never the rest of the batch.
 *
 * <p>Safety invariants:
 * <ul>
 *   <li>Every statement is scoped to this user's own rows ({@code user_id = :uid})
 *       or to engagement on this user's own posts/workouts
 *       ({@code post_id/workout_id IN (this user's ...)}). No statement can ever
 *       reach another user's standalone data.</li>
 *   <li>Deletes run child-before-parent to satisfy every foreign key that lacks
 *       {@code ON DELETE CASCADE} (verified against migrations V1–V25). FKs that
 *       DO cascade — notification (V8), refresh_token (V9), rest_day /
 *       streak_restore (V11), workout_photo_url (V14), exercise_body_part (V12),
 *       routine_exercise / routine_scheduled_days (V6) — are left to the database,
 *       and routine.source_workout_id (V6, ON DELETE SET NULL) likewise.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class AccountPurger {

  private final EntityManager em;

  @Transactional
  public void purgeUserData(UUID userId) {
    // 1) Likes/comments THIS user placed on any post (post_*.user_id -> app_user).
    exec("DELETE FROM post_like WHERE user_id = :uid", userId);
    exec("DELETE FROM post_comment WHERE user_id = :uid", userId);

    // 2) Engagement by ANYONE on THIS user's posts. post_like.post_id and
    //    post_comment.post_id reference post with no cascade, so these must go
    //    before the user's posts are deleted.
    exec(
      "DELETE FROM post_like WHERE post_id IN " +
        "(SELECT post_id FROM post WHERE user_id = :uid)",
      userId
    );
    exec(
      "DELETE FROM post_comment WHERE post_id IN " +
        "(SELECT post_id FROM post WHERE user_id = :uid)",
      userId
    );

    // 3) Reports filed BY this user, and reports AGAINST this user's posts
    //    (report.reporter_id and report.post_id, neither cascades).
    exec("DELETE FROM report WHERE reporter_id = :uid", userId);
    exec(
      "DELETE FROM report WHERE post_id IN " +
        "(SELECT post_id FROM post WHERE user_id = :uid)",
      userId
    );

    // 4) This user's posts. notification.post_id / comment_id cascade (V8), so
    //    related notifications clear automatically here.
    exec("DELETE FROM post WHERE user_id = :uid", userId);

    // 5) This user's workouts + non-cascading children. post.workout_id refs are
    //    gone (step 4). workout_photo_url cascades (V14); routine.source_workout_id
    //    is SET NULL (V6).
    exec(
      "DELETE FROM workout_set WHERE workout_exercise_id IN " +
        "(SELECT we.workout_exercise_id FROM workout_exercise we " +
        "JOIN workout w ON we.workout_id = w.workout_id WHERE w.user_id = :uid)",
      userId
    );
    exec(
      "DELETE FROM workout_exercise WHERE workout_id IN " +
        "(SELECT workout_id FROM workout WHERE user_id = :uid)",
      userId
    );
    exec(
      "DELETE FROM workout_body_tags WHERE workout_id IN " +
        "(SELECT workout_id FROM workout WHERE user_id = :uid)",
      userId
    );
    exec("DELETE FROM workout WHERE user_id = :uid", userId);

    // 6) This user's routines. routine_exercise + routine_scheduled_days cascade
    //    (V6), which also clears their references to exercises before step 7.
    exec("DELETE FROM routine WHERE user_id = :uid", userId);

    // 7) This user's custom exercises. exercise_body_part cascades (V12). Any
    //    references from this user's own workout_exercise / routine_exercise are
    //    already gone (steps 5/6). If another user ever referenced this custom
    //    exercise, the FK will reject the delete and this user's whole purge is
    //    rolled back and retried next run (no partial state) — see scheduler.
    exec("DELETE FROM exercise WHERE user_id = :uid", userId);

    // 8) Follow edges in either direction.
    exec(
      "DELETE FROM follow WHERE follower_id = :uid OR followee_id = :uid",
      userId
    );

    // 9) Finally the user row. notification (actor/recipient), refresh_token,
    //    rest_day and streak_restore all cascade on this delete.
    exec("DELETE FROM app_user WHERE user_id = :uid", userId);
  }

  private void exec(String sql, UUID userId) {
    em.createNativeQuery(sql).setParameter("uid", userId).executeUpdate();
  }
}

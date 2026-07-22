package com.gearfitness.gear_api.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Follow;
import com.gearfitness.gear_api.entity.Location;
import com.gearfitness.gear_api.entity.Post;
import com.gearfitness.gear_api.entity.Workout;
import com.gearfitness.gear_api.repository.PostRepository.FriendAtLocation;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Query-level tests for the gym Lifters tab: everyone with at least one post
 * at the gym the viewer can see. The rule unifies the discover-grade grid
 * audience (strangers: PUBLIC posts from non-private accounts) with the
 * feed-grade friends rule (followed users: PUBLIC, or FRIENDS when mutual),
 * so like the friends-who-train-here tests these run against a real database
 * — every branch lives in the JPQL. Flyway is disabled (PostgreSQL-specific
 * migrations); Hibernate generates the schema.
 */
@DataJpaTest(
  properties = {
    "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
  }
)
class PostRepositoryLiftersAtLocationTest {

  @Autowired
  private TestEntityManager em;

  @Autowired
  private PostRepository postRepository;

  private AppUser viewer;
  private Location gym;
  private Location otherGym;

  @BeforeEach
  void setUp() {
    viewer = user("viewer");
    gym = em.persist(Location.builder().name("Iron Temple").build());
    otherGym = em.persist(Location.builder().name("Other Gym").build());
  }

  private AppUser user(String username) {
    return em.persist(
      AppUser.builder()
        .username(username)
        .displayName(username + " Display")
        .email(username + "@example.com")
        .passwordHash("hash")
        .build()
    );
  }

  private void follow(AppUser follower, AppUser followee) {
    follow(follower, followee, Follow.FollowStatus.ACCEPTED);
  }

  private void follow(
    AppUser follower,
    AppUser followee,
    Follow.FollowStatus status
  ) {
    em.persist(
      Follow.builder()
        .follower(follower)
        .followee(followee)
        .status(status)
        .build()
    );
  }

  private Post post(
    AppUser author,
    Location location,
    Post.PostVisibility visibility
  ) {
    Workout workout = em.persist(
      Workout.builder()
        .user(author)
        .name("Workout")
        .datePerformed(LocalDate.of(2026, 1, 1))
        .location(location)
        .build()
    );
    return em.persist(
      Post.builder()
        .user(author)
        .workout(workout)
        .visibility(visibility)
        .build()
    );
  }

  /**
   * Backdate/forward-date a post. created_at is @CreationTimestamp +
   * updatable=false, so ordering fixtures must be set with native SQL.
   */
  private void setPostedAt(Post post, LocalDateTime at) {
    em.flush();
    em
      .getEntityManager()
      .createNativeQuery("UPDATE post SET created_at = :at WHERE post_id = :id")
      .setParameter("at", at)
      .setParameter("id", post.getPostId())
      .executeUpdate();
    em.clear();
  }

  private Page<FriendAtLocation> lifters() {
    em.flush();
    return postRepository.findLiftersAt(
      gym.getLocationId(),
      viewer.getUserId(),
      Pageable.unpaged()
    );
  }

  private long count() {
    em.flush();
    return postRepository.countLiftersAt(
      gym.getLocationId(),
      viewer.getUserId()
    );
  }

  private List<UUID> lifterIds() {
    return lifters()
      .getContent()
      .stream()
      .map(FriendAtLocation::getUserId)
      .toList();
  }

  @Test
  void everyoneWithAViewerVisiblePostAppears() {
    // A stranger's PUBLIC post from a public account: discover-grade visible.
    AppUser stranger = user("stranger");
    post(stranger, gym, Post.PostVisibility.PUBLIC);

    // A followed private account's PUBLIC post: invisible to strangers but
    // visible to the viewer, who follows them.
    AppUser followedPrivate = user("followed-private");
    followedPrivate.setIsPrivate(true);
    follow(viewer, followedPrivate);
    post(followedPrivate, gym, Post.PostVisibility.PUBLIC);

    // A mutual friend's FRIENDS post.
    AppUser mutualFriend = user("mutual-friend");
    follow(viewer, mutualFriend);
    follow(mutualFriend, viewer);
    post(mutualFriend, gym, Post.PostVisibility.FRIENDS);

    // The viewer themself always sees their own posts, whatever the
    // visibility.
    post(viewer, gym, Post.PostVisibility.PRIVATE);

    assertThat(lifterIds()).containsExactlyInAnyOrder(
      stranger.getUserId(),
      followedPrivate.getUserId(),
      mutualFriend.getUserId(),
      viewer.getUserId()
    );
    assertThat(count()).isEqualTo(4);
  }

  @Test
  void usersWithOnlyHiddenPostsAreExcludedFromListAndCount() {
    // A followed user's PRIVATE post is theirs alone.
    AppUser privatePoster = user("private-poster");
    follow(viewer, privatePoster);
    post(privatePoster, gym, Post.PostVisibility.PRIVATE);

    // FRIENDS post without the follow-back: viewer isn't in its audience.
    AppUser oneWayFriend = user("one-way-friend");
    follow(viewer, oneWayFriend);
    post(oneWayFriend, gym, Post.PostVisibility.FRIENDS);

    // A non-followed private account's PUBLIC post: private accounts don't
    // surface to strangers.
    AppUser privateStranger = user("private-stranger");
    privateStranger.setIsPrivate(true);
    post(privateStranger, gym, Post.PostVisibility.PUBLIC);

    // A FRIENDS post from a stranger is never visible.
    AppUser friendsOnlyStranger = user("friends-only-stranger");
    post(friendsOnlyStranger, gym, Post.PostVisibility.FRIENDS);

    // Blocked in either direction hides the person entirely.
    AppUser blocked = user("blocked");
    follow(viewer, blocked, Follow.FollowStatus.BLOCKED);
    post(blocked, gym, Post.PostVisibility.PUBLIC);

    // A moderation-hidden PUBLIC post doesn't count.
    AppUser moderated = user("moderated");
    Post hiddenPost = post(moderated, gym, Post.PostVisibility.PUBLIC);
    em.flush();
    em
      .getEntityManager()
      .createNativeQuery(
        "UPDATE post SET moderation_status = 'HIDDEN' WHERE post_id = :id"
      )
      .setParameter("id", hiddenPost.getPostId())
      .executeUpdate();
    em.clear();

    assertThat(lifters().getContent()).isEmpty();
    assertThat(count()).isZero();
  }

  @Test
  void visiblePostsAtOtherGymsDoNotCountForThisGym() {
    AppUser elsewhere = user("elsewhere");
    post(elsewhere, otherGym, Post.PostVisibility.PUBLIC);

    assertThat(lifters().getContent()).isEmpty();
    assertThat(count()).isZero();
  }

  @Test
  void mutualsAreExactlyTheFollowedSubsetOfLifters() {
    // Two lifters, one followed: the Lifters tab shows both, the Mutuals tab
    // (findFriendsWhoTrainAt) only the followed one — never a stranger.
    AppUser stranger = user("stranger");
    post(stranger, gym, Post.PostVisibility.PUBLIC);

    AppUser followed = user("followed");
    follow(viewer, followed);
    post(followed, gym, Post.PostVisibility.PUBLIC);

    em.flush();
    Page<FriendAtLocation> mutuals = postRepository.findFriendsWhoTrainAt(
      gym.getLocationId(),
      viewer.getUserId(),
      Pageable.unpaged()
    );

    assertThat(lifterIds()).containsExactlyInAnyOrder(
      stranger.getUserId(),
      followed.getUserId()
    );
    assertThat(
      mutuals.getContent().stream().map(FriendAtLocation::getUserId).toList()
    ).containsExactly(followed.getUserId());
  }

  @Test
  void orderedByMostRecentVisiblePostAtThisGym() {
    AppUser early = user("early");
    AppUser late = user("late");

    setPostedAt(
      post(early, gym, Post.PostVisibility.PUBLIC),
      LocalDateTime.of(2026, 1, 1, 10, 0)
    );
    setPostedAt(
      post(late, gym, Post.PostVisibility.PUBLIC),
      LocalDateTime.of(2026, 2, 1, 10, 0)
    );
    // A newer post by "early" at a different gym must not lift them here.
    setPostedAt(
      post(early, otherGym, Post.PostVisibility.PUBLIC),
      LocalDateTime.of(2026, 3, 1, 10, 0)
    );

    assertThat(lifterIds()).containsExactly(
      late.getUserId(),
      early.getUserId()
    );
  }
}

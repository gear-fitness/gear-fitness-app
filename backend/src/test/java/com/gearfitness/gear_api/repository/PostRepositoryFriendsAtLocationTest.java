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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

/**
 * Query-level tests for the "friends who train here" section, against a real
 * (in-memory) database because every rule under test — follow gating, post
 * visibility, blocks, per-gym recency ordering — lives in the JPQL itself
 * and would be invisible to a mock. Flyway is disabled (the migrations are
 * PostgreSQL-specific); Hibernate generates the schema from the entities.
 */
@DataJpaTest(
  properties = {
    "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
  }
)
class PostRepositoryFriendsAtLocationTest {

  private static final PageRequest FIRST_TEN = PageRequest.of(0, 10);

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

  private List<UUID> resultUserIds(Page<FriendAtLocation> page) {
    return page.getContent().stream().map(FriendAtLocation::getUserId).toList();
  }

  private Page<FriendAtLocation> query() {
    em.flush();
    return postRepository.findFriendsWhoTrainAt(
      gym.getLocationId(),
      viewer.getUserId(),
      FIRST_TEN
    );
  }

  @Test
  void followedUserWithVisiblePostsAppears() {
    // PUBLIC post from a followed user: visible however the follow points.
    AppUser publicPoster = user("public-poster");
    follow(viewer, publicPoster);
    post(publicPoster, gym, Post.PostVisibility.PUBLIC);

    // FRIENDS post from a mutual follow: also visible to the viewer.
    AppUser mutualFriend = user("mutual-friend");
    follow(viewer, mutualFriend);
    follow(mutualFriend, viewer);
    post(mutualFriend, gym, Post.PostVisibility.FRIENDS);

    Page<FriendAtLocation> result = query();

    assertThat(resultUserIds(result)).containsExactlyInAnyOrder(
      publicPoster.getUserId(),
      mutualFriend.getUserId()
    );
    assertThat(result.getTotalElements()).isEqualTo(2);
  }

  @Test
  void projectionCarriesTheProfileFields() {
    AppUser friend = user("friend");
    follow(viewer, friend);
    friend.setProfilePictureUrl("avatars/friend.jpg");
    post(friend, gym, Post.PostVisibility.PUBLIC);

    FriendAtLocation row = query().getContent().get(0);

    assertThat(row.getUserId()).isEqualTo(friend.getUserId());
    assertThat(row.getUsername()).isEqualTo("friend");
    assertThat(row.getDisplayName()).isEqualTo("friend Display");
    assertThat(row.getProfilePictureUrl()).isEqualTo("avatars/friend.jpg");
    assertThat(row.getLastPostedAt()).isNotNull();
  }

  @Test
  void followedUserWithOnlyPostsHiddenFromTheViewerDoesNotAppear() {
    // PRIVATE posts are the author's alone.
    AppUser privatePoster = user("private-poster");
    follow(viewer, privatePoster);
    post(privatePoster, gym, Post.PostVisibility.PRIVATE);

    // FRIENDS post without the follow-back: viewer isn't in its audience.
    AppUser oneWayFriend = user("one-way-friend");
    follow(viewer, oneWayFriend);
    post(oneWayFriend, gym, Post.PostVisibility.FRIENDS);

    // Moderation-hidden PUBLIC post doesn't count either.
    AppUser moderated = user("moderated");
    follow(viewer, moderated);
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

    Page<FriendAtLocation> result = query();

    assertThat(result.getContent()).isEmpty();
    assertThat(result.getTotalElements()).isZero();
  }

  @Test
  void visiblePostsAtOtherGymsDoNotCountForThisGym() {
    AppUser friend = user("friend-elsewhere");
    follow(viewer, friend);
    post(friend, otherGym, Post.PostVisibility.PUBLIC);

    assertThat(query().getContent()).isEmpty();
  }

  @Test
  void nonFollowedUsersNeverAppear() {
    // A stranger posting publicly here — never in the viewer's section.
    AppUser stranger = user("stranger");
    post(stranger, gym, Post.PostVisibility.PUBLIC);

    // A PENDING follow request is not a follow.
    AppUser pending = user("pending");
    follow(viewer, pending, Follow.FollowStatus.PENDING);
    post(pending, gym, Post.PostVisibility.PUBLIC);

    // Someone who follows the viewer (but isn't followed back) doesn't
    // qualify either — the edge must point viewer -> them.
    AppUser followsViewer = user("follows-viewer");
    follow(followsViewer, viewer);
    post(followsViewer, gym, Post.PostVisibility.PUBLIC);

    // The viewer's own posts don't make them their own "friend".
    post(viewer, gym, Post.PostVisibility.PUBLIC);

    Page<FriendAtLocation> result = query();

    assertThat(result.getContent()).isEmpty();
    assertThat(result.getTotalElements()).isZero();
  }

  @Test
  void orderedByMostRecentVisiblePostAtThisGym() {
    AppUser early = user("early");
    AppUser middle = user("middle");
    AppUser late = user("late");
    for (AppUser friend : List.of(early, middle, late)) {
      follow(viewer, friend);
    }

    setPostedAt(
      post(early, gym, Post.PostVisibility.PUBLIC),
      LocalDateTime.of(2026, 1, 1, 10, 0)
    );
    setPostedAt(
      post(middle, gym, Post.PostVisibility.PUBLIC),
      LocalDateTime.of(2026, 2, 1, 10, 0)
    );
    // "late" also has an older post: ordering must use their newest one.
    setPostedAt(
      post(late, gym, Post.PostVisibility.PUBLIC),
      LocalDateTime.of(2025, 12, 1, 10, 0)
    );
    setPostedAt(
      post(late, gym, Post.PostVisibility.PUBLIC),
      LocalDateTime.of(2026, 3, 1, 10, 0)
    );
    // A newer post by "early" at a different gym must not lift them here.
    setPostedAt(
      post(early, otherGym, Post.PostVisibility.PUBLIC),
      LocalDateTime.of(2026, 4, 1, 10, 0)
    );

    Page<FriendAtLocation> result = query();

    assertThat(resultUserIds(result)).containsExactly(
      late.getUserId(),
      middle.getUserId(),
      early.getUserId()
    );
    // Each row is one person, once, even with several qualifying posts.
    assertThat(result.getTotalElements()).isEqualTo(3);
  }

  @Test
  void listIsCappedByThePageWhileTheTotalStaysTrue() {
    // Persist everything first, then timestamp: setPostedAt clears the
    // persistence context, which would detach the viewer mid-loop.
    List<Post> posts = new ArrayList<>();
    for (int i = 0; i < 12; i++) {
      AppUser friend = user("friend-" + i);
      follow(viewer, friend);
      posts.add(post(friend, gym, Post.PostVisibility.PUBLIC));
    }
    for (int i = 0; i < posts.size(); i++) {
      setPostedAt(
        posts.get(i),
        LocalDateTime.of(2026, 1, 1, 10, 0).plusDays(i)
      );
    }

    Page<FriendAtLocation> result = query();

    assertThat(result.getContent()).hasSize(10);
    assertThat(result.getTotalElements()).isEqualTo(12);
    // The two dropped by the cap are the two least-recent posters.
    assertThat(
      result.getContent().stream().map(FriendAtLocation::getUsername).toList()
    ).containsExactly(
      "friend-11",
      "friend-10",
      "friend-9",
      "friend-8",
      "friend-7",
      "friend-6",
      "friend-5",
      "friend-4",
      "friend-3",
      "friend-2"
    );
  }
}

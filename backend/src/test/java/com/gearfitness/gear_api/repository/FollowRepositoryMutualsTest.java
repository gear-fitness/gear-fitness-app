package com.gearfitness.gear_api.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Follow;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

/**
 * Query-level tests for the profile Mutuals tab: "people the viewer follows
 * who also follow this profile's owner". Against a real (in-memory) database
 * because the definition lives entirely in the JPQL. Flyway is disabled (the
 * migrations are PostgreSQL-specific); Hibernate generates the schema.
 */
@DataJpaTest(
  properties = {
    "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
  }
)
class FollowRepositoryMutualsTest {

  @Autowired
  private TestEntityManager em;

  @Autowired
  private FollowRepository followRepository;

  private AppUser viewer;

  @BeforeEach
  void setUp() {
    viewer = user("viewer");
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

  private List<UUID> mutualIds(AppUser target) {
    em.flush();
    return followRepository
      .findMutuals(viewer.getUserId(), target.getUserId())
      .stream()
      .map(f -> f.getFollowee().getUserId())
      .toList();
  }

  @Test
  void mutualsAreTheViewersFollowsWhoAlsoFollowTheProfileOwner() {
    AppUser owner = user("owner");
    // The viewer follows the owner directly — that edge alone must not put
    // the owner in their own mutuals list.
    follow(viewer, owner);

    // Followed by the viewer AND follows the owner: the one qualifying case.
    AppUser known = user("known-follower");
    follow(viewer, known);
    follow(known, owner);

    // Followed by the viewer but not following the owner.
    AppUser followedElsewhere = user("followed-elsewhere");
    follow(viewer, followedElsewhere);

    // Follows the owner but the viewer doesn't follow them.
    AppUser strangerFollower = user("stranger-follower");
    follow(strangerFollower, owner);

    assertThat(mutualIds(owner)).containsExactly(known.getUserId());
  }

  @Test
  void ownProfileMutualsAreFollowbacks() {
    // On the viewer's own profile the same formula degenerates to "people I
    // follow who follow me back".
    AppUser followback = user("followback");
    follow(viewer, followback);
    follow(followback, viewer);

    AppUser oneWayOut = user("one-way-out");
    follow(viewer, oneWayOut);

    AppUser oneWayIn = user("one-way-in");
    follow(oneWayIn, viewer);

    assertThat(mutualIds(viewer)).containsExactly(followback.getUserId());
  }

  @Test
  void pendingEdgesNeverCount() {
    AppUser owner = user("owner");

    // The viewer only requested to follow this person — not yet a follow.
    AppUser requested = user("requested");
    follow(viewer, requested, Follow.FollowStatus.PENDING);
    follow(requested, owner);

    // Followed by the viewer, but their follow of the owner is still pending.
    AppUser pendingTowardOwner = user("pending-toward-owner");
    follow(viewer, pendingTowardOwner);
    follow(pendingTowardOwner, owner, Follow.FollowStatus.PENDING);

    assertThat(mutualIds(owner)).isEmpty();
  }
}

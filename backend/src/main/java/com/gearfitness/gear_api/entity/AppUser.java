package com.gearfitness.gear_api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "app_user")
@Data
@SQLRestriction("deleted_at IS NULL")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppUser {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "user_id")
  private UUID userId;

  @Column(nullable = false, unique = true)
  private String username;

  @Column(name = "display_name")
  private String displayName;

  @Column
  private String gender;

  @Column
  private Integer weightLbs;

  @Column
  private Integer heightInches;

  @Column
  private Integer age;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(name = "password_hash", nullable = false)
  private String passwordHash;

  @Column(name = "is_private", nullable = false)
  @Builder.Default
  private Boolean isPrivate = false;

  @Column(name = "profile_picture_url", length = 512)
  private String profilePictureUrl;

  @Column(name = "expo_push_token")
  private String expoPushToken;

  // IANA zone id (e.g. "America/Denver") reported by the device, used to fire
  // streak notifications at the user's local midnight rather than UTC.
  @Column(name = "time_zone")
  private String timeZone;

  @Column(name = "current_streak", nullable = false)
  @Builder.Default
  private Integer currentStreak = 0;

  @Column(name = "longest_streak", nullable = false)
  @Builder.Default
  private Integer longestStreak = 0;

  @Column(name = "last_streak_date")
  private LocalDate lastStreakDate;

  // Subscription tier, authoritative source written by the RevenueCat webhook.
  @Enumerated(EnumType.STRING)
  @Column(name = "tier", nullable = false, length = 20)
  @Builder.Default
  private Tier tier = Tier.BASIC;

  @Column(name = "tier_expires_at")
  private LocalDateTime tierExpiresAt;

  @Column(name = "tier_product_id")
  private String tierProductId;

  @Column(name = "tier_store", length = 40)
  private String tierStore;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "deleted_at")
  private LocalDateTime deletedAt;

  // Relationships
  @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
  @JsonIgnore
  @Builder.Default
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Set<Workout> workouts = new HashSet<>();

  @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
  @JsonIgnore
  @Builder.Default
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Set<Post> posts = new HashSet<>();

  @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
  @JsonIgnore
  @Builder.Default
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Set<PostLike> postLikes = new HashSet<>();

  @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
  @JsonIgnore
  @Builder.Default
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Set<PostComment> postComments = new HashSet<>();

  @OneToMany(
    mappedBy = "follower",
    cascade = CascadeType.ALL,
    orphanRemoval = true
  )
  @JsonIgnore
  @Builder.Default
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Set<Follow> following = new HashSet<>();

  @OneToMany(
    mappedBy = "followee",
    cascade = CascadeType.ALL,
    orphanRemoval = true
  )
  @JsonIgnore
  @Builder.Default
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Set<Follow> followers = new HashSet<>();

  @Column(name = "apple_user_id", unique = true)
  private String appleUserId;
}

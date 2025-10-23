package com.gearfitness.gear_api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "follow")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(Follow.FollowId.class)
public class Follow {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "follower_id", nullable = false)
    private AppUser follower;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "followee_id", nullable = false)
    private AppUser followee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private FollowStatus status = FollowStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    public enum FollowStatus {
        PENDING,
        ACCEPTED,
        DECLINED,
        BLOCKED
    }

    // Composite Key Class
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FollowId implements Serializable {
        private UUID follower;
        private UUID followee;

        @Override
        public boolean equals(Object o) {
            if (this == o)
                return true;
            if (o == null || getClass() != o.getClass())
                return false;
            FollowId followId = (FollowId) o;
            return Objects.equals(follower, followId.follower) &&
                    Objects.equals(followee, followId.followee);
        }

        @Override
        public int hashCode() {
            return Objects.hash(follower, followee);
        }
    }
}

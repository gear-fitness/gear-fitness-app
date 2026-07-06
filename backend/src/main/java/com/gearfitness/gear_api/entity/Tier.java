package com.gearfitness.gear_api.entity;

/**
 * Subscription access level. Ordered so a higher tier includes everything a
 * lower tier has — use {@link #atLeast(Tier)} for gating rather than equality.
 * ULTRA is reserved for a future paid tier; today only BASIC and PLUS are sold.
 */
public enum Tier {
  BASIC(0),
  PLUS(1),
  ULTRA(2);

  private final int rank;

  Tier(int rank) {
    this.rank = rank;
  }

  /** True if this tier includes at least the privileges of {@code other}. */
  public boolean atLeast(Tier other) {
    return this.rank >= other.rank;
  }
}

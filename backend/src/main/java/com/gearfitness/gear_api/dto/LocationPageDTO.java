package com.gearfitness.gear_api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Header data for a gym's location page: identity plus visible-post stats. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationPageDTO {

  private UUID locationId;
  private String name;
  private String address;
  private BigDecimal latitude;
  private BigDecimal longitude;
  private Long postCount;

  // Distinct people with at least one post here the viewer can see — the
  // count behind the tappable "Lifters" stat, and viewer-specific for the
  // same reason the lifters list is (following someone widens what counts).
  private Long athleteCount;

  // The requesting user's own workout count at this gym. Personal to the
  // caller (computed from their token identity), unlike the public counts
  // above; includes their non-public posts.
  private Long viewerWorkoutCount;

  // People the viewer follows with at least one viewer-visible post here,
  // most recent post first, capped server-side. Viewer-specific like
  // viewerWorkoutCount.
  private List<LocationFriendDTO> friendsWhoTrainHere;

  // Uncapped total behind friendsWhoTrainHere, so the UI can say
  // "... and N others" truthfully when the list is truncated.
  private Long friendsWhoTrainHereCount;
}

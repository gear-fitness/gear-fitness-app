package com.gearfitness.gear_api.dto;

import lombok.Data;

/** Body for muting/unmuting a conversation for the current user. */
@Data
public class MuteRequest {

  private boolean muted;
}

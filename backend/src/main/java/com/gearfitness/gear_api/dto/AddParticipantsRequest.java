package com.gearfitness.gear_api.dto;

import java.util.List;
import java.util.UUID;
import lombok.Data;

@Data
public class AddParticipantsRequest {

  private List<UUID> userIds;
}

package com.gearfitness.gear_api.dto;

import java.util.List;
import lombok.Data;

@Data
public class ChatRequestDTO {

  private List<ChatMessageDTO> messages;
}

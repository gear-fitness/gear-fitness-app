package com.gearfitness.gear_api.dto;

import lombok.Data;
import java.util.List;

@Data
public class ChatRequestDTO {
    private List<ChatMessageDTO> messages;
}

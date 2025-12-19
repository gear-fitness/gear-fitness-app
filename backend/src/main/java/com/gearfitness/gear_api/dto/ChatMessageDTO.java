package com.gearfitness.gear_api.dto;

import lombok.Data;

@Data
public class ChatMessageDTO {
    private String text;
    private boolean isUser;
}

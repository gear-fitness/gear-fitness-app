package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.ChatRequestDTO;
import com.gearfitness.gear_api.dto.ChatResponseDTO;
import com.gearfitness.gear_api.service.GeminiService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workout-chat")
@RequiredArgsConstructor
public class WorkoutChatController {

  private final GeminiService geminiService;

  @PostMapping
  public ResponseEntity<ChatResponseDTO> chat(
    @RequestBody ChatRequestDTO request
  ) {
    List messages = request.getMessages();

    if (messages == null || messages.isEmpty()) {
      System.err.println(
        "ERROR: ChatRequestDTO received with null or empty 'messages' list."
      );
      return ResponseEntity.badRequest().body(
        new ChatResponseDTO(
          "Conversation history is missing or empty. Please ensure your request body is structured correctly."
        )
      );
    }

    String aiResponse = geminiService.generateWorkoutResponse(messages);

    return ResponseEntity.ok(new ChatResponseDTO(aiResponse));
  }
}

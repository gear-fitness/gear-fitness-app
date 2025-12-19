package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.ChatRequestDTO;
import com.gearfitness.gear_api.dto.ChatResponseDTO;
import com.gearfitness.gear_api.entity.Exercise;
import com.gearfitness.gear_api.repository.ExerciseRepository;
import com.gearfitness.gear_api.service.GeminiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
public class ExerciseChatController {

    private final ExerciseRepository exerciseRepository;
    private final GeminiService geminiService;

    @PostMapping("/{exerciseId}/chat")
    public ResponseEntity<ChatResponseDTO> chat(
            @PathVariable UUID exerciseId,
            @RequestBody ChatRequestDTO request) {

        // --- CRITICAL FIX START ---
        List messages = request.getMessages();
        
        // 1. Check if the DTO payload is missing the messages list (null) or if the list is empty
        if (messages == null || messages.isEmpty()) {
            System.err.println("ERROR: ChatRequestDTO received with null or empty 'messages' list.");
            // Return a 400 Bad Request to the client immediately
            return ResponseEntity.badRequest().body(
                new ChatResponseDTO("Conversation history is missing or empty. Please ensure your request body is structured correctly.")
            );
        }
        // --- CRITICAL FIX END ---

        Exercise exercise = exerciseRepository.findById(exerciseId)
            .orElseThrow(() -> new RuntimeException("Exercise not found"));

        // Pass the guaranteed non-null list to the service
        String aiResponse = geminiService.generateResponse(exercise, messages);

        return ResponseEntity.ok(new ChatResponseDTO(aiResponse));
    }
}
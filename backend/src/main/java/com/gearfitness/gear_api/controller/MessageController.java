package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.MarkReadRequest;
import com.gearfitness.gear_api.dto.MessageDTO;
import com.gearfitness.gear_api.dto.SendMessageRequest;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.MessageService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/conversations/{conversationId}/messages")
@RequiredArgsConstructor
public class MessageController {

  private final MessageService messageService;
  private final JwtService jwtService;

  /** One page of history, newest first. */
  @GetMapping
  public ResponseEntity<Page<MessageDTO>> getHistory(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID conversationId,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "30") int size
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    return ResponseEntity.ok(
      messageService.getHistory(userId, conversationId, page, size)
    );
  }

  @PostMapping
  public ResponseEntity<MessageDTO> send(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID conversationId,
    @RequestBody SendMessageRequest request
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    return ResponseEntity.ok(
      messageService.sendMessage(userId, conversationId, request)
    );
  }

  @PostMapping("/read")
  public ResponseEntity<Void> markRead(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID conversationId,
    @RequestBody MarkReadRequest request
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    messageService.markRead(
      userId,
      conversationId,
      request.getLastReadMessageId()
    );
    return ResponseEntity.ok().build();
  }
}

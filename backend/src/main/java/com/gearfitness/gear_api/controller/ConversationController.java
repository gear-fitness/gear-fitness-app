package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.AddParticipantsRequest;
import com.gearfitness.gear_api.dto.ConversationDTO;
import com.gearfitness.gear_api.dto.CreateConversationRequest;
import com.gearfitness.gear_api.dto.MuteRequest;
import com.gearfitness.gear_api.dto.UpdateConversationRequest;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.ConversationService;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

  private final ConversationService conversationService;
  private final JwtService jwtService;

  /** Primary inbox: accepted conversations, most recent first. */
  @GetMapping
  public ResponseEntity<Page<ConversationDTO>> getInbox(
    @RequestHeader("Authorization") String authHeader,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    return ResponseEntity.ok(conversationService.listInbox(userId, page, size));
  }

  /** Message requests: conversations awaiting the caller's acceptance. */
  @GetMapping("/requests")
  public ResponseEntity<Page<ConversationDTO>> getRequests(
    @RequestHeader("Authorization") String authHeader,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    return ResponseEntity.ok(
      conversationService.listRequests(userId, page, size)
    );
  }

  /** Total unread messages across accepted conversations, for the nav badge. */
  @GetMapping("/unread-count")
  public ResponseEntity<Map<String, Long>> getUnreadCount(
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    return ResponseEntity.ok(
      Map.of("count", conversationService.getUnreadTotal(userId))
    );
  }

  /** Number of pending message requests, for the Requests section header. */
  @GetMapping("/request-count")
  public ResponseEntity<Map<String, Long>> getRequestCount(
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    return ResponseEntity.ok(
      Map.of("count", conversationService.getRequestCount(userId))
    );
  }

  /** Create a conversation, or return the existing 1:1 thread. */
  @PostMapping
  public ResponseEntity<ConversationDTO> createConversation(
    @RequestHeader("Authorization") String authHeader,
    @RequestBody CreateConversationRequest request
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    return ResponseEntity.ok(
      conversationService.createOrGetConversation(
        userId,
        request.getParticipantIds(),
        request.getTitle()
      )
    );
  }

  /**
   * GET /api/conversations/direct/{otherUserId}
   * Resolve the caller's existing 1:1 thread with another user, if any, so a
   * draft can paint prior history immediately. 204 when no such thread exists.
   * (The literal {@code direct/} segment doesn't collide with {@code /{id}}.)
   */
  @GetMapping("/direct/{otherUserId}")
  public ResponseEntity<ConversationDTO> findDirect(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID otherUserId
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    return conversationService
      .findExistingDirect(userId, otherUserId)
      .map(ResponseEntity::ok)
      .orElseGet(() -> ResponseEntity.noContent().build());
  }

  @GetMapping("/{conversationId}")
  public ResponseEntity<ConversationDTO> getConversation(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID conversationId
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    return ResponseEntity.ok(
      conversationService.getConversation(userId, conversationId)
    );
  }

  @PostMapping("/{conversationId}/accept")
  public ResponseEntity<ConversationDTO> accept(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID conversationId
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    return ResponseEntity.ok(
      conversationService.acceptRequest(userId, conversationId)
    );
  }

  @PostMapping("/{conversationId}/decline")
  public ResponseEntity<Void> decline(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID conversationId
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    conversationService.declineRequest(userId, conversationId);
    return ResponseEntity.ok().build();
  }

  @PostMapping("/{conversationId}/leave")
  public ResponseEntity<Void> leave(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID conversationId
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    conversationService.leaveConversation(userId, conversationId);
    return ResponseEntity.ok().build();
  }

  /**
   * DELETE /api/conversations/{id}
   * Delete the chat for the caller only: it leaves their inbox but the thread
   * and its history survive for everyone else, and it returns to their inbox if
   * a new message arrives. Not the same as leaving a group.
   */
  @DeleteMapping("/{conversationId}")
  public ResponseEntity<Void> deleteForMe(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID conversationId
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    conversationService.hideConversation(userId, conversationId);
    return ResponseEntity.ok().build();
  }

  /**
   * POST /api/conversations/{id}/mute
   * Mute or unmute this conversation for the caller (silences their push
   * notifications only; the thread and its unread state are unchanged).
   */
  @PostMapping("/{conversationId}/mute")
  public ResponseEntity<Void> setMuted(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID conversationId,
    @RequestBody MuteRequest request
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    conversationService.setMuted(userId, conversationId, request.isMuted());
    return ResponseEntity.ok().build();
  }

  @PostMapping("/{conversationId}/participants")
  public ResponseEntity<ConversationDTO> addParticipants(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID conversationId,
    @RequestBody AddParticipantsRequest request
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    return ResponseEntity.ok(
      conversationService.addParticipants(
        userId,
        conversationId,
        request.getUserIds()
      )
    );
  }

  @DeleteMapping("/{conversationId}/participants/{targetUserId}")
  public ResponseEntity<Void> removeParticipant(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID conversationId,
    @PathVariable UUID targetUserId
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    conversationService.removeParticipant(userId, conversationId, targetUserId);
    return ResponseEntity.ok().build();
  }

  @PatchMapping("/{conversationId}")
  public ResponseEntity<ConversationDTO> updateGroup(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID conversationId,
    @RequestBody UpdateConversationRequest request
  ) {
    UUID userId = jwtService.extractUserId(authHeader.substring(7));
    return ResponseEntity.ok(
      conversationService.updateGroup(
        userId,
        conversationId,
        request.getTitle(),
        request.getImageKey()
      )
    );
  }
}

package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.MessageDTO;
import com.gearfitness.gear_api.dto.SendMessageRequest;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Conversation;
import com.gearfitness.gear_api.entity.Conversation.ConversationType;
import com.gearfitness.gear_api.entity.ConversationParticipant;
import com.gearfitness.gear_api.entity.ConversationParticipant.ParticipantState;
import com.gearfitness.gear_api.entity.Message;
import com.gearfitness.gear_api.entity.MessageMedia;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.ConversationParticipantRepository;
import com.gearfitness.gear_api.repository.FollowRepository;
import com.gearfitness.gear_api.repository.MessageRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class MessageService {

  private final MessageRepository messageRepository;
  private final ConversationParticipantRepository participantRepository;
  private final AppUserRepository appUserRepository;
  private final FollowRepository followRepository;
  private final ConversationService conversationService;
  private final DirectMessageMapper mapper;
  private final DirectMessageEventPublisher eventPublisher;
  private final DirectMessagePushService pushService;

  /**
   * Persist and return a message. The sender must be an active participant;
   * sending from a pending request implicitly accepts it. Sends are idempotent
   * on {@code clientNonce}. Real-time fan-out to other participants is layered on
   * in the WebSocket phase — this method is the durable write.
   */
  public MessageDTO sendMessage(
    UUID senderId,
    UUID conversationId,
    SendMessageRequest request
  ) {
    String content = request.getContent() != null
      ? request.getContent().trim()
      : null;
    if (content != null && content.isEmpty()) {
      content = null;
    }
    List<String> mediaKeys = request.getMediaKeys();
    boolean hasMedia = mediaKeys != null && !mediaKeys.isEmpty();
    if (content == null && !hasMedia) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Message must have text or media"
      );
    }

    ConversationParticipant me = conversationService.requireParticipant(
      conversationId,
      senderId
    );
    Conversation conversation = me.getConversation();

    // Idempotent replay: return the already-persisted message for this nonce.
    if (request.getClientNonce() != null && !request.getClientNonce().isBlank()) {
      var existing =
        messageRepository.findByConversation_ConversationIdAndSender_UserIdAndClientNonce(
          conversationId,
          senderId,
          request.getClientNonce()
        );
      if (existing.isPresent()) {
        return mapper.toMessageDto(existing.get());
      }
    }

    // A block in either direction on a 1:1 forbids further messaging.
    if (conversation.getType() == ConversationType.DIRECT) {
      participantRepository
        .findByConversation_ConversationIdAndLeftAtIsNull(conversationId)
        .stream()
        .map(p -> p.getUser().getUserId())
        .filter(id -> !id.equals(senderId))
        .findFirst()
        .ifPresent(otherId -> {
          if (followRepository.existsBlockBetween(senderId, otherId)) {
            throw new ResponseStatusException(
              HttpStatus.FORBIDDEN,
              "Cannot message a blocked user"
            );
          }
        });
    }

    // Photos can't be pushed at someone who hasn't accepted the request yet
    // (Instagram behaviour): a pending recipient only ever receives text until
    // they accept. Applies to groups too, so a stranger can't be added to a
    // group and sent images before accepting. The client hides the photo
    // option; this is the actual enforcement.
    if (hasMedia && hasUnacceptedRecipient(conversationId, senderId)) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "Photos can't be sent until your message request is accepted"
      );
    }

    AppUser sender = me.getUser();
    Message message = Message.builder()
      .conversation(conversation)
      .sender(sender)
      .content(content)
      .clientNonce(request.getClientNonce())
      .build();

    if (hasMedia) {
      int ordinal = 0;
      for (String key : mediaKeys) {
        if (key == null || key.isBlank()) {
          continue;
        }
        message
          .getMedia()
          .add(
            MessageMedia.builder()
              .message(message)
              .s3Key(key)
              .mediaType(MessageMedia.MediaType.IMAGE)
              .ordinal(ordinal++)
              .build()
          );
      }
    }

    // saveAndFlush, not save: @CreationTimestamp is populated by Hibernate at
    // INSERT (flush) time, and save() alone doesn't flush — so createdAt would
    // still be null below, leaving conversation.lastMessageAt null (breaking
    // inbox ordering) and returning createdAt: null in the DTO/socket payload.
    message = messageRepository.saveAndFlush(message);

    // A new message resurfaces the thread for anyone who deleted it or declined
    // the request — deletion is local and reversible, so it must never swallow
    // future messages. Participant lists are tiny, so this entity loop is
    // preferred over a bulk update (which would need to clear the persistence
    // context and detach the entities the DTO mapping below still needs).
    for (ConversationParticipant p : participantRepository.findByConversation_ConversationIdAndLeftAtIsNull(
      conversationId
    )) {
      if (p.getHiddenAt() != null) {
        p.setHiddenAt(null);
        participantRepository.save(p);
      }
    }

    // Bump inbox ordering and mark the thread read for the sender.
    conversation.setLastMessageAt(message.getCreatedAt());
    me.setLastReadMessageId(message.getMessageId());
    me.setLastReadAt(message.getCreatedAt());
    // Replying to a request accepts it.
    if (me.getState() == ParticipantState.PENDING) {
      me.setState(ParticipantState.ACCEPTED);
    }
    participantRepository.save(me);

    MessageDTO dto = mapper.toMessageDto(message);
    List<UUID> recipients = otherActiveParticipantIds(conversationId, senderId);

    // Read everything the push needs while the transaction (and session) is
    // still open; the push itself runs after commit.
    boolean isGroup = conversation.getType() == ConversationType.GROUP;
    String groupTitle = conversation.getTitle();
    String senderUsername = sender.getUsername();
    String preview = DirectMessagePushService.preview(content, hasMedia);

    publishAfterCommit(() -> {
      eventPublisher.newMessage(recipients, dto);
      pushService.pushNewMessage(
        conversationId,
        senderId,
        senderUsername,
        isGroup,
        groupTitle,
        preview
      );
    });
    return dto;
  }

  @Transactional(readOnly = true)
  public Page<MessageDTO> getHistory(
    UUID userId,
    UUID conversationId,
    int page,
    int size
  ) {
    conversationService.requireParticipant(conversationId, userId);
    Pageable pageable = PageRequest.of(page, size);
    return messageRepository
      .findByConversation_ConversationIdOrderByCreatedAtDesc(
        conversationId,
        pageable
      )
      .map(mapper::toMessageDto);
  }

  /**
   * Advance the caller's read pointer. A null message id marks the whole thread
   * read as of now.
   */
  public void markRead(
    UUID userId,
    UUID conversationId,
    UUID lastReadMessageId
  ) {
    ConversationParticipant me = conversationService.requireParticipant(
      conversationId,
      userId
    );
    if (lastReadMessageId != null) {
      Message message = requireMessageInConversation(
        lastReadMessageId,
        conversationId
      );
      me.setLastReadMessageId(message.getMessageId());
      me.setLastReadAt(message.getCreatedAt());
    } else {
      me.setLastReadAt(LocalDateTime.now());
    }
    participantRepository.save(me);

    UUID readId = me.getLastReadMessageId();
    List<UUID> recipients = otherActiveParticipantIds(conversationId, userId);
    publishAfterCommit(() ->
      eventPublisher.seen(recipients, conversationId, userId, readId)
    );
  }

  private Message requireMessageInConversation(
    UUID messageId,
    UUID conversationId
  ) {
    Message message = messageRepository
      .findById(messageId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found")
      );
    if (!message.getConversation().getConversationId().equals(conversationId)) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Message does not belong to this conversation"
      );
    }
    return message;
  }

  /**
   * Whether any active member other than the sender still has the conversation
   * as a pending request (i.e. hasn't accepted). Gates media sending.
   */
  private boolean hasUnacceptedRecipient(UUID conversationId, UUID senderId) {
    return participantRepository
      .findByConversation_ConversationIdAndLeftAtIsNull(conversationId)
      .stream()
      .anyMatch(
        p ->
          !p.getUser().getUserId().equals(senderId) &&
          p.getState() == ParticipantState.PENDING
      );
  }

  /** Active members of a conversation other than the given user (event targets). */
  private List<UUID> otherActiveParticipantIds(
    UUID conversationId,
    UUID excludeUserId
  ) {
    return participantRepository
      .findActiveParticipantUserIds(conversationId)
      .stream()
      .filter(id -> !id.equals(excludeUserId))
      .toList();
  }

  /**
   * Run a real-time publish only after the surrounding DB transaction commits,
   * so recipients never receive an event for a write that later rolls back.
   * Falls back to running inline if there is no active transaction.
   */
  private void publishAfterCommit(Runnable action) {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            action.run();
          }
        }
      );
    } else {
      action.run();
    }
  }
}

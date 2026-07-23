package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.ConversationDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Conversation;
import com.gearfitness.gear_api.entity.Conversation.ConversationType;
import com.gearfitness.gear_api.entity.ConversationParticipant;
import com.gearfitness.gear_api.entity.ConversationParticipant.ParticipantRole;
import com.gearfitness.gear_api.entity.ConversationParticipant.ParticipantState;
import com.gearfitness.gear_api.entity.Follow;
import com.gearfitness.gear_api.entity.Message;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.ConversationParticipantRepository;
import com.gearfitness.gear_api.repository.ConversationRepository;
import com.gearfitness.gear_api.repository.FollowRepository;
import com.gearfitness.gear_api.repository.MessageRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class ConversationService {

  private final ConversationRepository conversationRepository;
  private final ConversationParticipantRepository participantRepository;
  private final MessageRepository messageRepository;
  private final AppUserRepository appUserRepository;
  private final FollowRepository followRepository;
  private final DirectMessageMapper mapper;
  private final DirectMessageEventPublisher eventPublisher;

  /**
   * Start a conversation, or for a 1:1 return the existing thread. One other
   * participant creates a DIRECT thread (deduped by direct_key); two or more
   * create a GROUP. Each non-creator lands in the primary inbox (ACCEPTED) if
   * they already follow the creator, otherwise in Requests (PENDING).
   */
  public ConversationDTO createOrGetConversation(
    UUID creatorId,
    List<UUID> participantIds,
    String title
  ) {
    AppUser creator = requireUser(creatorId);

    // Distinct others, excluding the creator.
    LinkedHashSet<UUID> others = new LinkedHashSet<>();
    if (participantIds != null) {
      for (UUID id : participantIds) {
        if (id != null && !id.equals(creatorId)) {
          others.add(id);
        }
      }
    }
    if (others.isEmpty()) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "At least one other participant is required"
      );
    }

    // A block in either direction forbids messaging that user.
    for (UUID otherId : others) {
      if (followRepository.existsBlockBetween(creatorId, otherId)) {
        throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Cannot message a blocked user"
        );
      }
    }

    if (others.size() == 1) {
      return createOrGetDirect(creator, requireUser(others.iterator().next()));
    }
    return createGroup(creator, new ArrayList<>(others), title);
  }

  private ConversationDTO createOrGetDirect(AppUser creator, AppUser other) {
    String directKey = directKey(creator.getUserId(), other.getUserId());
    Optional<Conversation> existing = conversationRepository.findByDirectKey(
      directKey
    );
    if (existing.isPresent()) {
      return toConversationDto(existing.get(), creator.getUserId());
    }

    Conversation conversation = conversationRepository.save(
      Conversation.builder()
        .type(ConversationType.DIRECT)
        .createdBy(creator.getUserId())
        .directKey(directKey)
        .build()
    );

    // Creator initiated, so they are always accepted. The recipient is accepted
    // only if they already follow the creator, else the thread is a request.
    participantRepository.save(
      participant(conversation, creator, ParticipantRole.MEMBER, ParticipantState.ACCEPTED, creator.getUserId())
    );
    participantRepository.save(
      participant(
        conversation,
        other,
        ParticipantRole.MEMBER,
        routedState(other.getUserId(), creator.getUserId()),
        creator.getUserId()
      )
    );

    return toConversationDto(conversation, creator.getUserId());
  }

  private ConversationDTO createGroup(
    AppUser creator,
    List<UUID> otherIds,
    String title
  ) {
    Conversation conversation = conversationRepository.save(
      Conversation.builder()
        .type(ConversationType.GROUP)
        .title(title != null && !title.isBlank() ? title.trim() : null)
        .createdBy(creator.getUserId())
        .build()
    );

    // Group creator is the admin.
    participantRepository.save(
      participant(conversation, creator, ParticipantRole.ADMIN, ParticipantState.ACCEPTED, creator.getUserId())
    );
    for (UUID otherId : otherIds) {
      AppUser other = requireUser(otherId);
      participantRepository.save(
        participant(
          conversation,
          other,
          ParticipantRole.MEMBER,
          routedState(other.getUserId(), creator.getUserId()),
          creator.getUserId()
        )
      );
    }

    return toConversationDto(conversation, creator.getUserId());
  }

  @Transactional(readOnly = true)
  public Page<ConversationDTO> listInbox(UUID userId, int page, int size) {
    return listByState(userId, ParticipantState.ACCEPTED, page, size);
  }

  @Transactional(readOnly = true)
  public Page<ConversationDTO> listRequests(UUID userId, int page, int size) {
    return listByState(userId, ParticipantState.PENDING, page, size);
  }

  private Page<ConversationDTO> listByState(
    UUID userId,
    ParticipantState state,
    int page,
    int size
  ) {
    Pageable pageable = PageRequest.of(page, size);
    Page<Conversation> conversations =
      participantRepository.findConversationsByUserAndState(
        userId,
        state,
        pageable
      );

    List<UUID> ids = conversations
      .getContent()
      .stream()
      .map(Conversation::getConversationId)
      .toList();
    Map<UUID, Long> unread = unreadByConversation(userId, ids);

    return conversations.map(c ->
      toConversationDto(
        c,
        userId,
        unread.getOrDefault(c.getConversationId(), 0L)
      )
    );
  }

  @Transactional(readOnly = true)
  public ConversationDTO getConversation(UUID userId, UUID conversationId) {
    Conversation conversation = requireConversation(conversationId);
    requireParticipant(conversationId, userId);
    return toConversationDto(conversation, userId);
  }

  /**
   * Resolve the caller's existing 1:1 thread with another user, if one exists —
   * read-only, so opening a draft can paint prior history without creating a row
   * or un-hiding a previously deleted thread (a send still un-hides via the
   * normal path). Returns empty when there's no thread, or the caller isn't an
   * active participant in it.
   */
  @Transactional(readOnly = true)
  public Optional<ConversationDTO> findExistingDirect(
    UUID userId,
    UUID otherId
  ) {
    if (otherId == null || otherId.equals(userId)) {
      return Optional.empty();
    }
    return conversationRepository
      .findByDirectKey(directKey(userId, otherId))
      .filter(c ->
        participantRepository
          .findByConversation_ConversationIdAndUser_UserId(
            c.getConversationId(),
            userId
          )
          .filter(p -> p.getLeftAt() == null)
          .isPresent()
      )
      .map(c -> toConversationDto(c, userId));
  }

  /** Move a pending request into the primary inbox. */
  public ConversationDTO acceptRequest(UUID userId, UUID conversationId) {
    ConversationParticipant me = requireParticipant(conversationId, userId);
    if (me.getState() != ParticipantState.ACCEPTED) {
      me.setState(ParticipantState.ACCEPTED);
      participantRepository.save(me);

      // Tell the other side so their thread drops the pending state live (the
      // photo option unlocks the moment the request is accepted).
      List<UUID> others = participantRepository
        .findActiveParticipantUserIds(conversationId)
        .stream()
        .filter(id -> !id.equals(userId))
        .toList();
      eventPublisher.accepted(others, conversationId, userId);
    }
    return toConversationDto(requireConversation(conversationId), userId);
  }

  /**
   * Decline a request. Behaviour depends on the conversation type:
   *
   * <ul>
   *   <li><b>1:1</b>: hide it (reversible). If the sender messages again the thread
   *   returns to Requests. Using leftAt on a 1:1 would be a trap — direct_key
   *   dedupe resolves the sender's next message to this same conversation, where
   *   the decliner is still marked as left, so they'd be unreachable forever.</li>
   *   <li><b>Group</b>: leave it (permanent). A declined-but-still-PENDING member
   *   stays an active participant and, via the media gate
   *   ({@code hasUnacceptedRecipient}), blocks photo sending for the whole group.
   *   Leaving removes them from delivery/membership so the gate clears; they can be
   *   re-added later. Remaining members get a live {@code left} event so their photo
   *   option unlocks without a reload (mirrors {@link #acceptRequest}).</li>
   * </ul>
   */
  public void declineRequest(UUID userId, UUID conversationId) {
    Conversation conversation = requireConversation(conversationId);
    if (conversation.getType() == ConversationType.GROUP) {
      leaveConversation(userId, conversationId);
      List<UUID> others = participantRepository
        .findActiveParticipantUserIds(conversationId)
        .stream()
        .filter(id -> !id.equals(userId))
        .toList();
      eventPublisher.left(others, conversationId, userId);
    } else {
      hideConversation(userId, conversationId);
    }
  }

  /**
   * Delete a chat for one user: it leaves their inbox but the conversation and
   * its history are untouched for everyone else, and it reappears for them as
   * soon as a new message arrives. Also clears their unread by advancing the
   * read pointer, so a deleted thread can't leave a stale badge behind.
   */
  public void hideConversation(UUID userId, UUID conversationId) {
    ConversationParticipant me = requireParticipant(conversationId, userId);
    LocalDateTime now = LocalDateTime.now();
    me.setHiddenAt(now);
    me.setLastReadAt(now);
    participantRepository.save(me);
  }

  /**
   * Mute/unmute the conversation for one user. Muting only silences that user's
   * push notifications (see DirectMessagePushService); the thread still shows
   * and still tracks unread. Per-participant — muting doesn't affect anyone else.
   */
  public void setMuted(UUID userId, UUID conversationId, boolean muted) {
    ConversationParticipant me = requireParticipant(conversationId, userId);
    me.setMuted(muted);
    participantRepository.save(me);
  }

  public void leaveConversation(UUID userId, UUID conversationId) {
    ConversationParticipant me = requireParticipant(conversationId, userId);
    me.setLeftAt(LocalDateTime.now());
    participantRepository.save(me);
  }

  /** Add members to a group (existing members may add). */
  public ConversationDTO addParticipants(
    UUID actorId,
    UUID conversationId,
    List<UUID> userIds
  ) {
    Conversation conversation = requireGroup(conversationId);
    requireParticipant(conversationId, actorId);

    if (userIds != null) {
      for (UUID id : userIds) {
        if (id == null || id.equals(actorId)) {
          continue;
        }
        if (followRepository.existsBlockBetween(actorId, id)) {
          continue; // silently skip blocked users
        }
        Optional<ConversationParticipant> existing =
          participantRepository.findByConversation_ConversationIdAndUser_UserId(
            conversationId,
            id
          );
        if (existing.isPresent()) {
          // Re-add someone who previously left.
          ConversationParticipant p = existing.get();
          if (p.getLeftAt() != null) {
            p.setLeftAt(null);
            p.setState(routedState(id, actorId));
            participantRepository.save(p);
          }
          continue;
        }
        participantRepository.save(
          participant(
            conversation,
            requireUser(id),
            ParticipantRole.MEMBER,
            routedState(id, actorId),
            actorId
          )
        );
      }
    }
    return toConversationDto(conversation, actorId);
  }

  /** Remove a member from a group (admins only). */
  public void removeParticipant(
    UUID actorId,
    UUID conversationId,
    UUID targetId
  ) {
    requireGroup(conversationId);
    ConversationParticipant actor = requireParticipant(conversationId, actorId);
    if (actor.getRole() != ParticipantRole.ADMIN) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "Only an admin can remove members"
      );
    }
    ConversationParticipant target = requireParticipant(
      conversationId,
      targetId
    );
    target.setLeftAt(LocalDateTime.now());
    participantRepository.save(target);
  }

  /** Rename a group / set its avatar (admins only). */
  public ConversationDTO updateGroup(
    UUID actorId,
    UUID conversationId,
    String title,
    String imageKey
  ) {
    Conversation conversation = requireGroup(conversationId);
    ConversationParticipant actor = requireParticipant(conversationId, actorId);
    if (actor.getRole() != ParticipantRole.ADMIN) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "Only an admin can update the group"
      );
    }
    if (title != null) {
      conversation.setTitle(title.isBlank() ? null : title.trim());
    }
    if (imageKey != null) {
      conversation.setImageKey(imageKey.isBlank() ? null : imageKey);
    }
    conversationRepository.save(conversation);
    return toConversationDto(conversation, actorId);
  }

  @Transactional(readOnly = true)
  public long getUnreadTotal(UUID userId) {
    return messageRepository.countTotalUnread(userId);
  }

  @Transactional(readOnly = true)
  public long getRequestCount(UUID userId) {
    return participantRepository.countPendingRequests(userId);
  }

  // ---- shared helpers ----

  /** The active member row for (conversation, user), or 403/404. */
  public ConversationParticipant requireParticipant(
    UUID conversationId,
    UUID userId
  ) {
    ConversationParticipant p = participantRepository
      .findByConversation_ConversationIdAndUser_UserId(conversationId, userId)
      .orElseThrow(() ->
        new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Not a participant in this conversation"
        )
      );
    if (p.getLeftAt() != null) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "You are no longer in this conversation"
      );
    }
    return p;
  }

  public Conversation requireConversation(UUID conversationId) {
    return conversationRepository
      .findById(conversationId)
      .orElseThrow(() ->
        new ResponseStatusException(
          HttpStatus.NOT_FOUND,
          "Conversation not found"
        )
      );
  }

  private Conversation requireGroup(UUID conversationId) {
    Conversation c = requireConversation(conversationId);
    if (c.getType() != ConversationType.GROUP) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Not a group conversation"
      );
    }
    return c;
  }

  private AppUser requireUser(UUID userId) {
    return appUserRepository
      .findById(userId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
      );
  }

  private ConversationParticipant participant(
    Conversation conversation,
    AppUser user,
    ParticipantRole role,
    ParticipantState state,
    UUID addedBy
  ) {
    return ConversationParticipant.builder()
      .conversation(conversation)
      .user(user)
      .role(role)
      .state(state)
      .addedBy(addedBy)
      .build();
  }

  /**
   * Where a newly-added member lands: the primary inbox if they already follow
   * the person who added them, otherwise Requests.
   */
  private ParticipantState routedState(UUID memberId, UUID adderId) {
    boolean memberFollowsAdder =
      followRepository.existsByFollower_UserIdAndFollowee_UserIdAndStatus(
        memberId,
        adderId,
        Follow.FollowStatus.ACCEPTED
      );
    return memberFollowsAdder
      ? ParticipantState.ACCEPTED
      : ParticipantState.PENDING;
  }

  private String directKey(UUID a, UUID b) {
    String s1 = a.toString();
    String s2 = b.toString();
    return s1.compareTo(s2) <= 0 ? s1 + "_" + s2 : s2 + "_" + s1;
  }

  private Map<UUID, Long> unreadByConversation(
    UUID userId,
    List<UUID> conversationIds
  ) {
    Map<UUID, Long> result = new HashMap<>();
    if (conversationIds.isEmpty()) {
      return result;
    }
    for (Object[] row : messageRepository.countUnreadByConversation(
      userId,
      conversationIds
    )) {
      result.put((UUID) row[0], (Long) row[1]);
    }
    return result;
  }

  private ConversationDTO toConversationDto(
    Conversation conversation,
    UUID viewerId
  ) {
    long unread = unreadByConversation(
      viewerId,
      List.of(conversation.getConversationId())
    ).getOrDefault(conversation.getConversationId(), 0L);
    return toConversationDto(conversation, viewerId, unread);
  }

  private ConversationDTO toConversationDto(
    Conversation conversation,
    UUID viewerId,
    long unreadCount
  ) {
    List<ConversationParticipant> members =
      participantRepository.findByConversation_ConversationIdAndLeftAtIsNull(
        conversation.getConversationId()
      );

    ConversationParticipant me = members
      .stream()
      .filter(p -> p.getUser().getUserId().equals(viewerId))
      .findFirst()
      .orElse(null);

    Message last = messageRepository
      .findFirstByConversation_ConversationIdOrderByCreatedAtDesc(
        conversation.getConversationId()
      )
      .orElse(null);

    return ConversationDTO.builder()
      .conversationId(conversation.getConversationId())
      .type(conversation.getType().name())
      .title(conversation.getTitle())
      .imageKey(conversation.getImageKey())
      .createdBy(conversation.getCreatedBy())
      .createdAt(conversation.getCreatedAt())
      .lastMessageAt(conversation.getLastMessageAt())
      .myState(me != null ? me.getState().name() : null)
      .myRole(me != null ? me.getRole().name() : null)
      .muted(me != null && me.isMuted())
      .unreadCount(unreadCount)
      .participants(members.stream().map(mapper::toParticipantDto).toList())
      .lastMessage(last != null ? mapper.toMessageDto(last) : null)
      .build();
  }
}

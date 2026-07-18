package com.gearfitness.gear_api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gearfitness.gear_api.dto.ModerationItemDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.ImageModeration;
import com.gearfitness.gear_api.entity.Post;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.ImageModerationRepository;
import com.gearfitness.gear_api.repository.PostRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.services.rekognition.RekognitionClient;
import software.amazon.awssdk.services.rekognition.model.DetectModerationLabelsRequest;
import software.amazon.awssdk.services.rekognition.model.DetectModerationLabelsResponse;
import software.amazon.awssdk.services.rekognition.model.Image;
import software.amazon.awssdk.services.rekognition.model.ModerationLabel;
import software.amazon.awssdk.services.rekognition.model.S3Object;

/**
 * Automated image moderation via AWS Rekognition, plus the human review queue.
 *
 * <p>Detection runs asynchronously after an image upload completes (post
 * images and profile pictures) so it never blocks the upload/submit response.
 * Rekognition reads the S3 object server-side over IAM, so the buckets stay
 * private: the backend's IAM user needs
 * {@code rekognition:DetectModerationLabels} and {@code s3:GetObject} on both
 * buckets, and (since Rekognition is regional) the buckets and the Rekognition
 * client must live in the same region.
 *
 * <p>Outcomes: labels at/above the configured confidence threshold hide the
 * content (posts through the shared {@link PostModerationService}, the same
 * mechanism the report system uses; avatars by unlinking the key from the
 * profile) and queue a FLAGGED record; a clean image creates no record; a
 * Rekognition failure fails open (content stays visible) and queues an ERROR
 * record so a human still looks at it.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ModerationService {

  private final RekognitionClient rekognitionClient;
  private final PostRepository postRepository;
  private final AppUserRepository appUserRepository;
  private final ImageModerationRepository moderationRepository;
  private final PostModerationService postModerationService;
  private final S3StorageService s3StorageService;
  private final ObjectMapper objectMapper;

  /** Label confidence (0-100) at/above which a post is hidden for review. */
  @Value("${aws.moderation.min-confidence}")
  private float minConfidence;

  /**
   * Top-level Rekognition (v7) categories that cause a post to be hidden. This
   * is a gym/fitness app, so we flag only genuinely harmful content — Explicit
   * (full nudity, exposed female nipples/genitalia, sexual activity), Visually
   * Disturbing (gore, corpses), Violence (weapons, fighting, self-harm) and
   * Hate Symbols — and intentionally let normal fitness content through:
   * shirtless/barechested physiques, bodybuilders in posing trunks, sports
   * bras, swimwear/underwear and exposed legs/torso (the "Non-Explicit Nudity
   * of Intimate parts and Kissing" and "Swimwear or Underwear" branches), along
   * with everything else not listed (Drugs & Tobacco, Alcohol, Gambling, Rude
   * Gestures).
   *
   * LIMITATION: Rekognition moderation is visual-only. It flags hate SYMBOLS,
   * not hate SPEECH. Slurs in post captions or text rendered inside an image
   * are NOT detected here — that would require separate text moderation
   * (caption filtering and/or Rekognition DetectText + a wordlist check).
   */
  @Value(
    "${aws.moderation.flagged-categories:Explicit,Visually Disturbing,Violence,Hate Symbols}"
  )
  private Set<String> flaggedCategories;

  /** Shared secret reviewers present to reach the review endpoints. */
  @Value("${moderation.review-secret}")
  private String reviewSecret;

  @Async
  @Transactional
  public void moderatePostImage(UUID postId, String imageKey) {
    Post post = postRepository.findById(postId).orElse(null);
    if (post == null) {
      // Post was deleted (or already hidden) before moderation ran — nothing to do.
      log.warn("Moderation skipped: post {} not found", postId);
      return;
    }

    List<ModerationLabel> labels;
    try {
      labels = detectLabels(imageKey);
    } catch (Exception e) {
      // Fail open: don't punish a legitimate post for an AWS hiccup. Leave it
      // visible and queue an ERROR item for a human to look at.
      log.error(
        "Rekognition moderation failed for post {} (key {})",
        postId,
        imageKey,
        e
      );
      saveRecord(
        post,
        null,
        imageKey,
        ImageModeration.Status.ERROR,
        null,
        null,
        e.getMessage()
      );
      return;
    }

    // Keep only labels whose top-level (v7 L1) category is actionable for this
    // app. Rekognition returns the hierarchy flat (leaf + ancestors), so walk
    // each label up to its L1 category and match against the configured flag
    // set — this ignores whole non-actionable branches (e.g. shirtless,
    // swimwear), not just individual leaf names.
    List<ModerationLabel> actionable = actionableLabels(labels);

    if (actionable.isEmpty()) {
      // Clean: nothing over the threshold, or only non-actionable categories
      // (shirtless/swimwear/etc. are normal for a fitness app).
      return;
    }

    postModerationService.hide(post);
    saveRecord(
      post,
      null,
      imageKey,
      ImageModeration.Status.FLAGGED,
      serializeLabels(actionable),
      maxConfidence(actionable),
      null
    );
    log.info(
      "Post {} hidden by image moderation ({} actionable label(s))",
      postId,
      actionable.size()
    );
  }

  /**
   * Moderate a just-uploaded profile picture. Same pipeline as post images;
   * the avatar equivalent of hiding is unlinking the key from the profile
   * (profile_picture_url = NULL), so the app falls back to the default avatar
   * while the item sits in the review queue.
   */
  @Async
  @Transactional
  public void moderateProfileImage(UUID userId, String imageKey) {
    AppUser user = appUserRepository.findById(userId).orElse(null);
    if (user == null) {
      // Account deleted before moderation ran; nothing to do.
      log.warn("Moderation skipped: user {} not found", userId);
      return;
    }

    List<ModerationLabel> labels;
    try {
      labels = detectLabels(imageKey);
    } catch (Exception e) {
      // Fail open, same as posts: the avatar stays live, a human reviews.
      log.error(
        "Rekognition moderation failed for user {} avatar (key {})",
        userId,
        imageKey,
        e
      );
      saveRecord(
        null,
        user,
        imageKey,
        ImageModeration.Status.ERROR,
        null,
        null,
        e.getMessage()
      );
      return;
    }

    List<ModerationLabel> actionable = actionableLabels(labels);
    if (actionable.isEmpty()) {
      return;
    }

    user.setProfilePictureUrl(null);
    appUserRepository.save(user);
    saveRecord(
      null,
      user,
      imageKey,
      ImageModeration.Status.FLAGGED,
      serializeLabels(actionable),
      maxConfidence(actionable),
      null
    );
    log.info(
      "User {} avatar unlinked by image moderation ({} actionable label(s))",
      userId,
      actionable.size()
    );
  }

  /** Run Rekognition against the S3 object for {@code imageKey}. */
  private List<ModerationLabel> detectLabels(String imageKey) {
    DetectModerationLabelsResponse response =
      rekognitionClient.detectModerationLabels(
        DetectModerationLabelsRequest.builder()
          .image(
            Image.builder()
              .s3Object(
                S3Object.builder()
                  .bucket(s3StorageService.bucketForKey(imageKey))
                  .name(imageKey)
                  .build()
              )
              .build()
          )
          .minConfidence(minConfidence)
          .build()
      );
    return response.moderationLabels();
  }

  /** Review queue: posts hidden by moderation, plus ones that errored out. */
  public List<ModerationItemDTO> listQueue(String secret) {
    requireReviewer(secret);
    return moderationRepository
      .findByStatusInOrderByCreatedAtAsc(
        List.of(ImageModeration.Status.FLAGGED, ImageModeration.Status.ERROR)
      )
      .stream()
      .map(this::toDto)
      .toList();
  }

  /**
   * Reviewer clears a flag: the post goes back to VISIBLE, or the avatar is
   * relinked to the profile. ERROR items never hid anything, so approving one
   * just closes it out.
   */
  @Transactional
  public void approve(UUID moderationId, String secret) {
    requireReviewer(secret);
    ImageModeration item = loadItem(moderationId);
    requireOpen(item);
    if (item.getStatus() == ImageModeration.Status.FLAGGED) {
      if (item.getPostId() != null) {
        postModerationService.unhide(item.getPostId());
      } else {
        // Avatar keys are deterministic per user, so relinking is just setting
        // the key back. Skip silently if the account was deleted meanwhile.
        AppUser user = appUserRepository
          .findById(item.getUserId())
          .orElse(null);
        if (user != null) {
          user.setProfilePictureUrl(item.getImageKey());
          appUserRepository.save(user);
        }
      }
    }
    item.setStatus(ImageModeration.Status.APPROVED);
    item.setReviewedAt(LocalDateTime.now());
    moderationRepository.save(item);
  }

  /**
   * Reviewer confirms the content is bad: the post is permanently removed or
   * the avatar unlinked, and the image itself is deleted from S3 so confirmed
   * objectionable content doesn't linger in the bucket.
   *
   * <p>Avatar edge case (accepted): avatar keys are overwritten in place, so
   * rejecting a stale record deletes whatever image currently lives at the
   * key, possibly a newer upload. The user can simply re-upload.
   */
  @Transactional
  public void reject(UUID moderationId, String secret) {
    requireReviewer(secret);
    ImageModeration item = loadItem(moderationId);
    requireOpen(item);
    if (item.getPostId() != null) {
      postModerationService.remove(item.getPostId());
      s3StorageService.deleteImageByKey(item.getImageKey());
    } else {
      s3StorageService.deleteProfilePicture(item.getUserId());
      // Also unlink in case the item was an ERROR (fail-open kept it live) or
      // the user re-persisted the key after the flag cleared it.
      AppUser user = appUserRepository.findById(item.getUserId()).orElse(null);
      if (
        user != null && item.getImageKey().equals(user.getProfilePictureUrl())
      ) {
        user.setProfilePictureUrl(null);
        appUserRepository.save(user);
      }
    }
    item.setStatus(ImageModeration.Status.REJECTED);
    item.setReviewedAt(LocalDateTime.now());
    moderationRepository.save(item);
  }

  /**
   * Reject a review action on an item already in a terminal state. Reviewers
   * work from polled queue snapshots with a shared secret, so a stale view (or
   * a retried request) can re-submit a decision; without this guard a late
   * reject would re-hide and permanently delete content another reviewer had
   * already approved and restored.
   */
  private void requireOpen(ImageModeration item) {
    if (
      item.getStatus() == ImageModeration.Status.APPROVED ||
      item.getStatus() == ImageModeration.Status.REJECTED
    ) {
      throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "Moderation item was already reviewed"
      );
    }
  }

  private ImageModeration loadItem(UUID moderationId) {
    return moderationRepository
      .findById(moderationId)
      .orElseThrow(() ->
        new ResponseStatusException(
          HttpStatus.NOT_FOUND,
          "Moderation item not found"
        )
      );
  }

  private void requireReviewer(String provided) {
    if (
      reviewSecret == null ||
      reviewSecret.isBlank() ||
      provided == null ||
      !MessageDigest.isEqual(
        reviewSecret.getBytes(StandardCharsets.UTF_8),
        provided.getBytes(StandardCharsets.UTF_8)
      )
    ) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
  }

  private void saveRecord(
    Post post,
    AppUser user,
    String imageKey,
    ImageModeration.Status status,
    String labels,
    BigDecimal maxConfidence,
    String errorMessage
  ) {
    moderationRepository.save(
      ImageModeration.builder()
        .post(post)
        .user(user)
        .imageKey(imageKey)
        .status(status)
        .labels(labels)
        .maxConfidence(maxConfidence)
        .errorMessage(errorMessage)
        .build()
    );
  }

  private ModerationItemDTO toDto(ImageModeration item) {
    return ModerationItemDTO.builder()
      .moderationId(item.getModerationId())
      .postId(item.getPostId())
      .userId(item.getUserId())
      .imageKey(item.getImageKey())
      .imageViewUrl(viewUrlOrNull(item.getImageKey()))
      .status(item.getStatus().name())
      .labels(item.getLabels())
      .maxConfidence(item.getMaxConfidence())
      .createdAt(item.getCreatedAt())
      .build();
  }

  /**
   * Presigned GET url so the reviewer can actually look at the image. Null on
   * failure (e.g. an unknown key prefix) rather than failing the whole queue.
   */
  private String viewUrlOrNull(String imageKey) {
    try {
      return s3StorageService.generateViewUrl(imageKey);
    } catch (Exception e) {
      log.warn("Could not presign view url for moderation key {}", imageKey, e);
      return null;
    }
  }

  /** Labels whose top-level (L1) category is in the configured flag set. */
  private List<ModerationLabel> actionableLabels(List<ModerationLabel> labels) {
    Map<String, String> parentByName = labels
      .stream()
      .collect(
        Collectors.toMap(
          ModerationLabel::name,
          l -> l.parentName() == null ? "" : l.parentName(),
          (a, b) -> a
        )
      );
    return labels
      .stream()
      .filter(l -> isFlagged(topLevelCategory(l, parentByName)))
      .toList();
  }

  /** Walk a label up its parent chain to its top-level (L1) category name. */
  private String topLevelCategory(
    ModerationLabel label,
    Map<String, String> parentByName
  ) {
    String name = label.name();
    String parent = label.parentName();
    while (parent != null && !parent.isBlank()) {
      name = parent;
      parent = parentByName.get(parent);
    }
    return name;
  }

  private boolean isFlagged(String topCategory) {
    return flaggedCategories
      .stream()
      .anyMatch(c -> c.equalsIgnoreCase(topCategory));
  }

  private BigDecimal maxConfidence(List<ModerationLabel> labels) {
    return labels
      .stream()
      .map(ModerationLabel::confidence)
      .max(Float::compareTo)
      .map(c -> BigDecimal.valueOf(c).setScale(2, RoundingMode.HALF_UP))
      .orElse(null);
  }

  private String serializeLabels(List<ModerationLabel> labels) {
    List<Map<String, Object>> summary = labels
      .stream()
      .map(l ->
        Map.<String, Object>of(
          "name",
          l.name() == null ? "" : l.name(),
          "parentName",
          l.parentName() == null ? "" : l.parentName(),
          "confidence",
          l.confidence()
        )
      )
      .toList();
    try {
      return objectMapper.writeValueAsString(summary);
    } catch (JsonProcessingException e) {
      // Don't lose the flag over a serialization quirk; keep a readable fallback.
      log.warn("Failed to serialize moderation labels", e);
      return summary.toString();
    }
  }
}

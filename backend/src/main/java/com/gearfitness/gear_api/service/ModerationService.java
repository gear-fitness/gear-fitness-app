package com.gearfitness.gear_api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gearfitness.gear_api.dto.ModerationItemDTO;
import com.gearfitness.gear_api.entity.ImageModeration;
import com.gearfitness.gear_api.entity.Post;
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
 * <p>Detection runs asynchronously after a post's image upload completes so it
 * never blocks the upload/submit response. Rekognition reads the S3 object
 * server-side over IAM, so the bucket stays private — the backend's IAM user
 * needs {@code rekognition:DetectModerationLabels} and {@code s3:GetObject} on
 * the posts bucket, and (since Rekognition is regional) the bucket and the
 * Rekognition client must live in the same region.
 *
 * <p>Outcomes: labels at/above the configured confidence threshold hide the
 * post through the shared {@link PostModerationService} (the same mechanism the
 * report system uses) and queue a FLAGGED record; a clean image creates no
 * record; a Rekognition failure fails open (post stays visible) and queues an
 * ERROR record so a human still looks at it.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ModerationService {

  private final RekognitionClient rekognitionClient;
  private final PostRepository postRepository;
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
      labels = response.moderationLabels();
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

  /** Reviewer clears a flag: the post goes back to VISIBLE. */
  @Transactional
  public void approve(UUID moderationId, String secret) {
    requireReviewer(secret);
    ImageModeration item = loadItem(moderationId);
    postModerationService.unhide(item.getPost().getPostId());
    item.setStatus(ImageModeration.Status.APPROVED);
    item.setReviewedAt(LocalDateTime.now());
    moderationRepository.save(item);
  }

  /** Reviewer confirms the content is bad: the post is permanently removed. */
  @Transactional
  public void reject(UUID moderationId, String secret) {
    requireReviewer(secret);
    ImageModeration item = loadItem(moderationId);
    postModerationService.remove(item.getPost().getPostId());
    item.setStatus(ImageModeration.Status.REJECTED);
    item.setReviewedAt(LocalDateTime.now());
    moderationRepository.save(item);
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
    String imageKey,
    ImageModeration.Status status,
    String labels,
    BigDecimal maxConfidence,
    String errorMessage
  ) {
    moderationRepository.save(
      ImageModeration.builder()
        .post(post)
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
      .postId(item.getPost().getPostId())
      .imageKey(item.getImageKey())
      .status(item.getStatus().name())
      .labels(item.getLabels())
      .maxConfidence(item.getMaxConfidence())
      .createdAt(item.getCreatedAt())
      .build();
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

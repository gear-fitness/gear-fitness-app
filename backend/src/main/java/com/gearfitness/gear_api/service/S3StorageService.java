package com.gearfitness.gear_api.service;

import java.time.Duration;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

/**
 * All images live in two private buckets and are referenced everywhere by their
 * S3 KEY (never a URL). Clients view images through short-lived presigned GET
 * urls minted here, and upload post photos through short-lived presigned PUT
 * urls. The bucket for a key is resolved from its prefix, so callers only ever
 * pass a key.
 */
@Service
public class S3StorageService {

  // Profile keys (gear-fitness-profile-pictures). "profile-pictures/" is the
  // legacy/proxy-upload prefix; "profiles/" is reserved for future schemes.
  public static final String PROFILE_PICTURES_PREFIX = "profile-pictures/";
  public static final String PROFILES_PREFIX = "profiles/";
  // Post/workout image keys (gear-fitness-images). "workout-photos/" is the
  // legacy prefix; "posts/" is used for new presigned-PUT uploads.
  public static final String WORKOUT_PHOTOS_PREFIX = "workout-photos/";
  public static final String POSTS_PREFIX = "posts/";

  public static final Duration VIEW_URL_TTL = Duration.ofMinutes(10);
  private static final Duration UPLOAD_URL_TTL = Duration.ofMinutes(5);

  private final S3Client s3Client;
  private final S3Presigner s3Presigner;
  private final String profileBucket;
  private final String imagesBucket;

  public S3StorageService(
    S3Client s3Client,
    S3Presigner s3Presigner,
    @Value("${aws.s3.bucket-name}") String profileBucket,
    @Value("${aws.s3.posts-bucket-name}") String imagesBucket
  ) {
    this.s3Client = s3Client;
    this.s3Presigner = s3Presigner;
    this.profileBucket = profileBucket;
    this.imagesBucket = imagesBucket;
  }

  /**
   * Resolve which bucket a key belongs to from its prefix. Throws for any key
   * that is not under a known prefix — this is the guard that prevents a client
   * from presigning arbitrary objects.
   */
  private String bucketForKey(String key) {
    if (key == null || key.isBlank()) {
      throw new IllegalArgumentException("Image key is required");
    }
    if (
      key.startsWith(PROFILE_PICTURES_PREFIX) || key.startsWith(PROFILES_PREFIX)
    ) {
      return profileBucket;
    }
    if (key.startsWith(WORKOUT_PHOTOS_PREFIX) || key.startsWith(POSTS_PREFIX)) {
      return imagesBucket;
    }
    throw new IllegalArgumentException("Unrecognized image key: " + key);
  }

  // --- Viewing (both profile pics and post/workout images) -----------------

  /** Mint a short-lived presigned GET url for a stored key. */
  public String generateViewUrl(String key) {
    String bucket = bucketForKey(key);
    GetObjectRequest getRequest = GetObjectRequest.builder()
      .bucket(bucket)
      .key(key)
      .build();

    GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
      .signatureDuration(VIEW_URL_TTL)
      .getObjectRequest(getRequest)
      .build();

    return s3Presigner.presignGetObject(presignRequest).url().toString();
  }

  // --- Profile pictures (proxy/multipart upload kept; stored as key) --------

  /**
   * Upload a profile picture through the backend (proxy flow) and return the S3
   * KEY. The key is deterministic per user so re-uploads overwrite in place.
   */
  public String uploadProfilePicture(
    UUID userId,
    byte[] imageBytes,
    String contentType
  ) {
    String key = PROFILE_PICTURES_PREFIX + userId + ".jpg";

    PutObjectRequest putRequest = PutObjectRequest.builder()
      .bucket(profileBucket)
      .key(key)
      .contentType(contentType)
      .build();

    s3Client.putObject(putRequest, RequestBody.fromBytes(imageBytes));

    return key;
  }

  public void deleteProfilePicture(UUID userId) {
    deleteByKey(PROFILE_PICTURES_PREFIX + userId + ".jpg");
  }

  // --- Post/workout images (presigned PUT, direct-to-S3) --------------------

  /**
   * Generate a server-side key and a presigned PUT url for a new post/workout
   * image. The client must PUT with a Content-Type matching {@code contentType}
   * exactly or S3 returns SignatureDoesNotMatch.
   */
  public PresignedUpload generatePostImageUploadUrl(
    UUID userId,
    String contentType
  ) {
    String extension = "image/png".equalsIgnoreCase(contentType)
      ? "png"
      : "jpg";
    String key =
      POSTS_PREFIX + userId + "/" + UUID.randomUUID() + "." + extension;

    PutObjectRequest putRequest = PutObjectRequest.builder()
      .bucket(imagesBucket)
      .key(key)
      .contentType(contentType)
      .build();

    PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
      .signatureDuration(UPLOAD_URL_TTL)
      .putObjectRequest(putRequest)
      .build();

    String url = s3Presigner.presignPutObject(presignRequest).url().toString();
    return new PresignedUpload(key, url);
  }

  /**
   * Proxy-upload a workout photo through the backend and return its S3 KEY
   * (never a URL). Kept for OLD app clients that still POST multipart to
   * {@code /api/workouts/photos}; new clients upload via a presigned PUT
   * ({@link #generatePostImageUploadUrl}).
   *
   * Returning the bare key — not a URL — is deliberate: it matches how every
   * image reference is stored across the app. The client re-submits this value
   * in the workout's photoUrls and it is persisted as-is. Returning a presigned
   * URL instead would persist an expiring value into workout_photo_url that
   * would break once the signature lapsed. The new app resolves stored keys to
   * short-lived view urls via the images view-url endpoint.
   */
  public String uploadWorkoutPhoto(
    UUID userId,
    byte[] imageBytes,
    String contentType
  ) {
    String extension = "image/png".equalsIgnoreCase(contentType)
      ? "png"
      : "jpg";
    String key =
      WORKOUT_PHOTOS_PREFIX +
      userId +
      "/" +
      UUID.randomUUID() +
      "." +
      extension;

    PutObjectRequest putRequest = PutObjectRequest.builder()
      .bucket(imagesBucket)
      .key(key)
      .contentType(contentType)
      .build();

    s3Client.putObject(putRequest, RequestBody.fromBytes(imageBytes));

    return key;
  }

  /** Delete a post/workout image by its stored key. */
  public void deleteImageByKey(String key) {
    try {
      if (
        key == null ||
        !(key.startsWith(WORKOUT_PHOTOS_PREFIX) || key.startsWith(POSTS_PREFIX))
      ) {
        return;
      }
      deleteByKey(key);
    } catch (Exception e) {
      System.err.println("Failed to delete image from S3: " + e.getMessage());
    }
  }

  private void deleteByKey(String key) {
    DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
      .bucket(bucketForKey(key))
      .key(key)
      .build();
    s3Client.deleteObject(deleteRequest);
  }

  public record PresignedUpload(String key, String url) {}
}

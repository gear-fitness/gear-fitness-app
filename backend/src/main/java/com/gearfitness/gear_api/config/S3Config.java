package com.gearfitness.gear_api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.rekognition.RekognitionClient;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class S3Config {

  @Value("${aws.s3.region}")
  private String region;

  @Value("${aws.s3.access-key}")
  private String accessKey;

  @Value("${aws.s3.secret-key}")
  private String secretKey;

  private StaticCredentialsProvider credentialsProvider() {
    return StaticCredentialsProvider.create(
      AwsBasicCredentials.create(accessKey, secretKey)
    );
  }

  @Bean
  public S3Client s3Client() {
    return S3Client.builder()
      .region(Region.of(region))
      .credentialsProvider(credentialsProvider())
      .build();
  }

  // Presigner must use the SAME static keys as the S3Client so presigned URLs
  // are signed by the IAM user the bucket policies grant access to. Do not
  // switch to DefaultCredentialsProvider / instance profile here.
  @Bean
  public S3Presigner s3Presigner() {
    return S3Presigner.builder()
      .region(Region.of(region))
      .credentialsProvider(credentialsProvider())
      .build();
  }

  // Image moderation reads S3 objects server-side via IAM (buckets stay
  // private). The backend's IAM user needs rekognition:DetectModerationLabels
  // and s3:GetObject on the posts bucket. Rekognition is regional, so this
  // client MUST be in the same region as the bucket it reads — sharing
  // ${aws.s3.region} keeps the two from drifting apart.
  @Bean
  public RekognitionClient rekognitionClient() {
    return RekognitionClient.builder()
      .region(Region.of(region))
      .credentialsProvider(credentialsProvider())
      .build();
  }
}

package com.gearfitness.gear_api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.UUID;

@Service
public class S3StorageService {

    private final S3Client s3Client;
    private final String bucketName;
    private final String region;

    public S3StorageService(S3Client s3Client,
                            @Value("${aws.s3.bucket-name}") String bucketName,
                            @Value("${aws.s3.region}") String region) {
        this.s3Client = s3Client;
        this.bucketName = bucketName;
        this.region = region;
    }

    public String uploadProfilePicture(UUID userId, byte[] imageBytes, String contentType) {
        String key = "profile-pictures/" + userId + ".jpg";

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .build();

        s3Client.putObject(putRequest, RequestBody.fromBytes(imageBytes));

        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, key);
    }

    public void deleteProfilePicture(UUID userId) {
        String key = "profile-pictures/" + userId + ".jpg";

        DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        s3Client.deleteObject(deleteRequest);
    }
}
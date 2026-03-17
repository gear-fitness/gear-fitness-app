package com.gearfitness.gear_api.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpoPushService {
    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Async
    public void sendPushNotification(String expoPushToken, String title, String body, String jsonData) {
        if (expoPushToken == null || expoPushToken.isBlank()) {
            return;
        }

        try {
            String payload = String.format(
                    """
                            {
                                "to": "%s",
                                "sound": "default",
                                "title": "%s",
                                "body": "%s",
                                "data": %s
                            }
                            """,
                    expoPushToken,
                    escapeJson(title),
                    escapeJson(body),
                    jsonData);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(EXPO_PUSH_URL))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("Expo push response: {}", response.body());
        } catch (Exception e) {
            log.error("Failed to send push notification to {}: {}", expoPushToken, e.getMessage());
        }
    }

    private String escapeJson(String text) {
        if (text == null)
            return "";
        return text.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

}

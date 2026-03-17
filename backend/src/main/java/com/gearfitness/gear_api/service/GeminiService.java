package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.ChatMessageDTO;
import com.gearfitness.gear_api.entity.Exercise;
// SDK Imports
import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Content;
import com.google.genai.types.Part;
import com.google.genai.types.GenerateContentConfig; // ✅ ADD THIS

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class GeminiService {

    private final Client geminiClient;
    private final String modelName = "gemini-2.5-flash";

    public GeminiService(@Value("${gemini.api.key}") String apiKey) {
        this.geminiClient = Client.builder()
                .apiKey(apiKey)
                .build();
    }

    public String generateResponse(Exercise exercise, List<ChatMessageDTO> messages) {
        String systemText = String.format(
                "You are a helpful fitness coach specializing in the \"%s\" exercise for %s. %s\n\n" +
                        "Instructions:\n" +
                        "- Answer questions about this exercise only\n" +
                        "- Use plain text without markdown formatting\n" +
                        "- Keep responses to 3-4 sentences\n" +
                        "- Be conversational and helpful\n" +
                        "- Answer directly without asking clarifying questions first\n" +
                        "- For off-topic questions, politely redirect to this exercise",
                exercise.getName(),
                exercise.getBodyPart(),
                exercise.getDescription() != null ? exercise.getDescription() : "");

        return generateResponseWithSystemText(systemText, messages);
    }

    public String generateGeneralExerciseResponse(List<ChatMessageDTO> messages) {
        String systemText =
                "You are a helpful fitness coach who can answer questions about any exercise, workout movement, " +
                "training form, muscles worked, or exercise selection.\n\n" +
                "Instructions:\n" +
                "- Answer exercise and fitness questions in plain text without markdown formatting\n" +
                "- Keep responses to 3-4 sentences unless more detail is clearly needed\n" +
                "- Be conversational, practical, and safety-conscious\n" +
                "- If the user mentions a specific exercise, tailor the answer to that exercise\n" +
                "- If a question is unrelated to exercise or fitness, politely redirect back to fitness topics";

        return generateResponseWithSystemText(systemText, messages);
    }

    private String generateResponseWithSystemText(String systemText, List<ChatMessageDTO> messages) {
        try {
            List<Content> history = messages.subList(0, messages.size() - 1).stream()
                    .map(msg -> Content.builder()
                            .role(msg.isUser() ? "user" : "model")
                            .parts(List.of(Part.fromText(msg.getText())))
                            .build())
                    .collect(Collectors.toList());

            // ✅ Get the latest user message separately
            String currentMessage = messages.get(messages.size() - 1).getText();

            GenerateContentConfig config = GenerateContentConfig.builder()
                    .maxOutputTokens(250)
                    .systemInstruction(Content.builder()
                            .parts(List.of(Part.fromText(systemText)))
                            .build())
                    .build();

            // ✅ Pass history separately and add current message
            history.add(Content.builder()
                    .role("user")
                    .parts(List.of(Part.fromText(currentMessage)))
                    .build());

            GenerateContentResponse response = geminiClient.models.generateContent(
                    modelName,
                    history,
                    config);

            return response.text();

        } catch (Exception e) {
            System.err.println("Gemini SDK Error: " + e.getMessage());
            return "I'm having trouble connecting to the AI trainer right now. Please try again.";
        }
    }
}
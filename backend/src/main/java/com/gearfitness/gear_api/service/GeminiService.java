package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.ChatMessageDTO;
import com.gearfitness.gear_api.entity.Exercise;
// SDK Imports
import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Content;
import com.google.genai.types.Part;
import com.google.genai.types.GenerateContentConfig;

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

        /**
         * Generate a response for a specific exercise chat (existing behavior).
         */
        public String generateResponse(Exercise exercise, List<ChatMessageDTO> messages) {
                try {
                        String systemText = String.format(
                                        "You are a helpful fitness coach specializing in the \"%s\" exercise for %s. %s\n\n"
                                                        +
                                                        "Instructions:\n" +
                                                        "- Answer questions about this exercise only\n" +
                                                        "- Use plain text without markdown formatting\n" +
                                                        "- Keep responses to 3-4 sentences\n" +
                                                        "- Be conversational and helpful\n" +
                                                        "- Answer directly without asking clarifying questions first\n"
                                                        +
                                                        "- For off-topic questions, politely redirect to this exercise",
                                        exercise.getName(),
                                        exercise.getBodyPart(),
                                        exercise.getDescription() != null ? exercise.getDescription() : "");

                        return sendToGemini(systemText, messages);

                } catch (Exception e) {
                        System.err.println("Gemini SDK Error: " + e.getMessage());
                        return "I'm having trouble connecting to the AI trainer right now. Please try again.";
                }
        }

        /**
         * Generate a response for the general workout assistant (no specific exercise).
         */
        public String generateWorkoutResponse(List<ChatMessageDTO> messages) {
                try {
                        String systemText = "You are a knowledgeable and friendly workout assistant. You can answer questions about "
                                        +
                                        "any common gym exercise, including proper form, muscle groups targeted, rep and set schemes, "
                                        +
                                        "exercise variations, warm-up routines, injury prevention, and workout programming.\n\n"
                                        +
                                        "Instructions:\n" +
                                        "- Use plain text without markdown formatting\n" +
                                        "- Keep responses to 3-5 sentences unless the user asks for more detail\n" +
                                        "- Be conversational and encouraging\n" +
                                        "- Answer directly without asking clarifying questions first\n" +
                                        "- If a question is not related to fitness or exercise, politely redirect the conversation back to workout topics";

                        return sendToGemini(systemText, messages);

                } catch (Exception e) {
                        System.err.println("Gemini SDK Error: " + e.getMessage());
                        return "I'm having trouble connecting to the AI trainer right now. Please try again.";
                }
        }

        /**
         * Shared helper that builds the conversation history and calls Gemini.
         */
        private String sendToGemini(String systemText, List<ChatMessageDTO> messages) {
                List<Content> history = messages.subList(0, messages.size() - 1).stream()
                                .map(msg -> Content.builder()
                                                .role(msg.isUser() ? "user" : "model")
                                                .parts(List.of(Part.fromText(msg.getText())))
                                                .build())
                                .collect(Collectors.toList());

                String currentMessage = messages.get(messages.size() - 1).getText();

                GenerateContentConfig config = GenerateContentConfig.builder()
                                .maxOutputTokens(250)
                                .systemInstruction(Content.builder()
                                                .parts(List.of(Part.fromText(systemText)))
                                                .build())
                                .build();

                history.add(Content.builder()
                                .role("user")
                                .parts(List.of(Part.fromText(currentMessage)))
                                .build());

                GenerateContentResponse response = geminiClient.models.generateContent(
                                modelName,
                                history,
                                config);

                return response.text();
        }
}
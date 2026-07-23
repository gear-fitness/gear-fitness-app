package com.gearfitness.gear_api.security;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/**
 * Authenticates a STOMP connection at CONNECT time using the same JWT the REST
 * API uses. The client sends {@code Authorization: Bearer <jwt>} as a STOMP
 * native header on CONNECT; we validate it and attach a {@link StompPrincipal}
 * (named by the user's UUID) to the session so every later frame is bound to
 * that user. An invalid/missing token aborts the connection.
 */
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

  private final JwtService jwtService;

  @Override
  public Message<?> preSend(Message<?> message, MessageChannel channel) {
    StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
      message,
      StompHeaderAccessor.class
    );

    if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
      String authHeader = accessor.getFirstNativeHeader("Authorization");
      if (authHeader == null || !authHeader.startsWith("Bearer ")) {
        throw new MessagingException("Missing or invalid Authorization header");
      }
      String token = authHeader.substring(7);
      UUID userId;
      try {
        // Parses + verifies signature and expiry; throws on any problem.
        userId = jwtService.extractUserId(token);
      } catch (Exception e) {
        throw new MessagingException("Invalid or expired token");
      }
      accessor.setUser(new StompPrincipal(userId.toString()));
    }

    return message;
  }
}

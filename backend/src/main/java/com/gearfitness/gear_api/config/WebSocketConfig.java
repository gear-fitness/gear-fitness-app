package com.gearfitness.gear_api.config;

import com.gearfitness.gear_api.security.StompAuthChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP-over-WebSocket configuration for direct messaging.
 *
 * <p>Uses the built-in in-memory simple broker. NOTE (scaling): the simple
 * broker keeps subscriptions in this instance's memory, so it does NOT fan out
 * across multiple Elastic Beanstalk instances — a message published on instance
 * A won't reach a subscriber connected to instance B. For v1 the deployment must
 * run a single instance or use sticky sessions. The scale-out path is to swap
 * {@code enableSimpleBroker(...)} for {@code enableStompBrokerRelay(...)} pointed
 * at an external broker (RabbitMQ/ActiveMQ) — no application code changes needed.
 *
 * <p>Auth is enforced at STOMP CONNECT by {@link StompAuthChannelInterceptor}
 * (JWT), not at the HTTP handshake (which is permitted in SecurityConfig).
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

  private final StompAuthChannelInterceptor stompAuthChannelInterceptor;

  @Override
  public void registerStompEndpoints(StompEndpointRegistry registry) {
    // Raw WebSocket endpoint (React Native connects with a plain ws:// socket;
    // no SockJS fallback needed). Origins are permitted here; the JWT CONNECT
    // interceptor is the real gate.
    registry.addEndpoint("/ws").setAllowedOriginPatterns("*");
  }

  @Override
  public void configureMessageBroker(MessageBrokerRegistry registry) {
    // Heartbeats matter for push: a suspended/crashed client often never closes
    // its socket, so without them the broker (default [0,0] = disabled) keeps a
    // dead session in SimpUserRegistry forever, the user still looks "online",
    // and DirectMessagePushService skips their push notification. Heartbeats let
    // the server reap those sessions. Requires a TaskScheduler to be set.
    registry
      .enableSimpleBroker("/topic", "/queue")
      .setHeartbeatValue(new long[] { 10000, 10000 })
      .setTaskScheduler(webSocketHeartbeatScheduler());
    registry.setApplicationDestinationPrefixes("/app");
    // Per-user destinations: convertAndSendToUser(userId, "/queue/messages", ...)
    // delivers to /user/{userId}/queue/messages for that user's session(s).
    registry.setUserDestinationPrefix("/user");
  }

  /** Drives the simple broker's STOMP heartbeats (see configureMessageBroker). */
  @Bean
  public TaskScheduler webSocketHeartbeatScheduler() {
    ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
    scheduler.setPoolSize(1);
    scheduler.setThreadNamePrefix("ws-heartbeat-");
    scheduler.initialize();
    return scheduler;
  }

  @Override
  public void configureClientInboundChannel(ChannelRegistration registration) {
    registration.interceptors(stompAuthChannelInterceptor);
  }
}

package com.gearfitness.gear_api.config;

import com.gearfitness.gear_api.security.JwtAuthenticationFilter;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

  private final JwtAuthenticationFilter jwtAuthenticationFilter;

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http)
    throws Exception {
    http
      .csrf(csrf -> csrf.disable())
      .sessionManagement(session ->
        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
      )
      .authorizeHttpRequests(auth ->
        auth
          // Permit the container's ERROR dispatch so Boot's /error rendering
          // runs. Without this, anyRequest().authenticated() applies to the
          // error dispatch too (the JWT filter skips it, so it is always
          // anonymous) and the entry point rewrites every error status,
          // including ResponseStatusException 403/400/502/503, as a 401.
          .dispatcherTypeMatchers(DispatcherType.ERROR)
          .permitAll()
          .requestMatchers("/health")
          .permitAll()
          .requestMatchers("/actuator/health")
          .permitAll()
          .requestMatchers("/api/auth/**")
          .permitAll()
          .requestMatchers("/api/public/**")
          .permitAll()
          .requestMatchers("/api/users/username-availability")
          .permitAll()
          .requestMatchers("/api/webhooks/revenuecat")
          .permitAll()
          // WebSocket handshake is permitted at the HTTP layer; the STOMP
          // CONNECT frame is authenticated by StompAuthChannelInterceptor (JWT).
          .requestMatchers("/ws/**")
          .permitAll()
          .anyRequest()
          .authenticated()
      )
      .exceptionHandling(exceptions ->
        exceptions.authenticationEntryPoint(
          (request, response, authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Unauthorized\"}");
          }
        )
      )
      .addFilterBefore(
        jwtAuthenticationFilter,
        UsernamePasswordAuthenticationFilter.class
      );

    return http.build();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}

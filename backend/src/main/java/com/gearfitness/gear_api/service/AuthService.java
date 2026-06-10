package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.AuthResponse;
import com.gearfitness.gear_api.dto.UserDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.RefreshToken;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.ContentVisibilityRepository;
import com.gearfitness.gear_api.repository.RefreshTokenRepository;
import com.gearfitness.gear_api.security.GoogleTokenVerifier;
import com.gearfitness.gear_api.security.JwtService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

  private static final String INTENT_SIGN_IN = "sign_in";
  private static final String INTENT_SIGN_UP = "sign_up";
  private static final String ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND";
  private static final String ACCOUNT_ALREADY_EXISTS = "ACCOUNT_ALREADY_EXISTS";
  private static final String INVALID_AUTH_INTENT = "INVALID_AUTH_INTENT";

  private final AppUserRepository userRepository;
  private final GoogleTokenVerifier googleTokenVerifier;
  private final JwtService jwtService;
  private final RefreshTokenRepository refreshTokenRepository;
  private final ContentVisibilityRepository contentVisibilityRepository;

  @Value("${jwt.refresh-expiration}")
  private Long refreshExpiration;

  @Transactional
  public AuthResponse authenticateWithGoogle(
    String idToken,
    String intent,
    Boolean confirmRestore
  ) throws GeneralSecurityException, IOException {
    // Verify the Google token
    GoogleIdToken.Payload payload = googleTokenVerifier.verify(idToken);

    String email = payload.getEmail();
    String name = (String) payload.get("name");

    Optional<AppUser> softDeleted = userRepository
      .findByEmailIncludingDeleted(email)
      .filter(u -> u.getDeletedAt() != null);

    if (softDeleted.isPresent()) {
      AppUser user = softDeleted.get();

      if (!Boolean.TRUE.equals(confirmRestore)) {
        // No JWT issued yet — the client must confirm restore first.
        return AuthResponse.builder()
          .accountPendingDeletion(true)
          .deletedAt(user.getDeletedAt())
          .build();
      }

      LocalDateTime previousDeletedAt = user.getDeletedAt();
      user.setDeletedAt(null);
      userRepository.save(user);

      contentVisibilityRepository.restoreAllContentForUser(
        user.getUserId(),
        previousDeletedAt
      );

      String jwtToken = jwtService.generateToken(
        user.getUserId(),
        user.getEmail()
      );
      String refreshToken = createRefreshToken(user);

      return AuthResponse.builder()
        .token(jwtToken)
        .refreshToken(refreshToken)
        .user(convertToDTO(user))
        .newUser(false)
        .build();
    }

    boolean userExists = userRepository.existsByEmail(email);
    String normalizedIntent = normalizeIntent(intent);

    if (
      !INTENT_SIGN_IN.equals(normalizedIntent) &&
      !INTENT_SIGN_UP.equals(normalizedIntent)
    ) {
      return AuthResponse.builder()
        .errorCode(INVALID_AUTH_INTENT)
        .error("Invalid auth intent. Must be sign_in or sign_up.")
        .build();
    }

    if (INTENT_SIGN_IN.equals(normalizedIntent) && !userExists) {
      return AuthResponse.builder()
        .errorCode(ACCOUNT_NOT_FOUND)
        .error(
          "No account exists for this Google account. Please sign up first."
        )
        .build();
    }

    if (INTENT_SIGN_UP.equals(normalizedIntent) && userExists) {
      return AuthResponse.builder()
        .errorCode(ACCOUNT_ALREADY_EXISTS)
        .error(
          "An account already exists for this Google account. Please sign in."
        )
        .build();
    }

    AppUser user = userExists
      ? userRepository
          .findByEmail(email)
          .orElseThrow(() ->
            new RuntimeException("User not found after existence check")
          )
      : createNewUser(email, name);

    String jwtToken = jwtService.generateToken(
      user.getUserId(),
      user.getEmail()
    );
    String refreshToken = createRefreshToken(user);

    return AuthResponse.builder()
      .token(jwtToken)
      .refreshToken(refreshToken)
      .user(convertToDTO(user))
      .newUser(!userExists)
      .build();
  }

  private String normalizeIntent(String intent) {
    if (intent == null) {
      return "";
    }
    return intent.trim().toLowerCase();
  }

  @Transactional
  public AuthResponse refreshAccessToken(String refreshTokenStr) {
    // find the refresh token
    RefreshToken refreshToken = refreshTokenRepository
      .findByTokenAndRevokedFalse(refreshTokenStr)
      .orElseThrow(() -> new RuntimeException("Invalid refresh token"));
    if (refreshToken.getExpiryDate().isBefore(Instant.now())) {
      refreshToken.setRevoked(true);
      refreshTokenRepository.save(refreshToken);
      throw new RuntimeException("Refresh token expired");
    }
    AppUser user = refreshToken.getUser();

    // Revoke the old refresh token (rotation)
    refreshToken.setRevoked(true);
    refreshTokenRepository.save(refreshToken);

    // generate new tokens
    String newAccessToken = jwtService.generateToken(
      user.getUserId(),
      user.getEmail()
    );
    String newRefreshToken = createRefreshToken(user);

    return AuthResponse.builder()
      .token(newAccessToken)
      .refreshToken(newRefreshToken)
      .build();
  }

  @Transactional
  public void logout(String refreshTokenStr) {
    refreshTokenRepository
      .findByTokenAndRevokedFalse(refreshTokenStr)
      .ifPresent(token -> {
        token.setRevoked(true);
        refreshTokenRepository.save(token);
      });
  }

  private String createRefreshToken(AppUser user) {
    RefreshToken refreshToken = RefreshToken.builder()
      .token(UUID.randomUUID().toString())
      .user(user)
      .expiryDate(Instant.now().plusMillis(refreshExpiration))
      .revoked(false)
      .build();

    refreshTokenRepository.save(refreshToken);
    return refreshToken.getToken();
  }

  private AppUser createNewUser(String email, String name) {
    // Generate username from email or name
    String username = generateUniqueUsername(
      name != null ? name : email.split("@")[0]
    );

    AppUser newUser = AppUser.builder()
      .email(email)
      .username(username)
      .displayName(name)
      .passwordHash("") // OAuth users don't have passwords
      .isPrivate(false)
      .weightLbs(null) // Temporary default - user will set in profile setup
      .heightInches(null) // Temporary default - user will set in profile setup
      .age(null) // Temporary default - user will set in profile setup
      .build();

    return userRepository.save(newUser);
  }

  private String generateUniqueUsername(String baseName) {
    String username = baseName.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();

    if (username.length() < 3) {
      username = "user" + username;
    }

    String finalUsername = username;
    int counter = 1;

    while (userRepository.existsByUsername(finalUsername)) {
      finalUsername = username + counter;
      counter++;
    }

    return finalUsername;
  }

  public UserDTO getCurrentUser(String authHeader) {
    String token = authHeader.substring(7);
    String email = jwtService.extractEmail(token);
    AppUser user = userRepository
      .findByEmail(email)
      .orElseThrow(() -> new RuntimeException("User not found"));
    return convertToDTO(user);
  }

  private UserDTO convertToDTO(AppUser user) {
    return UserDTO.builder()
      .userId(user.getUserId())
      .username(user.getUsername())
      .displayName(user.getDisplayName())
      .gender(user.getGender())
      .email(user.getEmail())
      .weightLbs(user.getWeightLbs())
      .heightInches(user.getHeightInches())
      .age(user.getAge())
      .isPrivate(user.getIsPrivate())
      .createdAt(user.getCreatedAt())
      .build();
  }
}

package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.AppleLoginRequest;
import com.gearfitness.gear_api.dto.AuthResponse;
import com.gearfitness.gear_api.dto.GoogleLoginRequest;
import com.gearfitness.gear_api.dto.UserDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.RefreshToken;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.ContentVisibilityRepository;
import com.gearfitness.gear_api.repository.RefreshTokenRepository;
import com.gearfitness.gear_api.security.AppleTokenVerifier;
import com.gearfitness.gear_api.security.GoogleTokenVerifier;
import com.gearfitness.gear_api.security.JwtService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.nimbusds.jwt.JWTClaimsSet;
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
  private final AppleTokenVerifier appleTokenVerifier;

  @Value("${jwt.refresh-expiration}")
  private Long refreshExpiration;

  @Transactional
  public AuthResponse authenticateWithApple(AppleLoginRequest request)
    throws Exception {
    // Verify the Apple identity token
    JWTClaimsSet claims = appleTokenVerifier.verify(request.getIdentityToken());

    String appleUserId = claims.getSubject(); // the stable Apple sub
    String tokenEmail = claims.getStringClaim("email"); // may be null on subsequent sign-ins

    // Apple gives the email in the token on first sign-in, but the SDK also
    // returns it via the user object. Prefer the token claim (signed), fall
    // back to the request body (which we trust because we asked the SDK for it).
    String email = tokenEmail != null ? tokenEmail : request.getEmail();

    // ── Soft-delete handling ─────────────────────────────────────
    // Look up by appleUserId first (stable). Email may be missing or be a
    // relay address, so it's a less reliable key.
    Optional<AppUser> softDeleted = userRepository
      .findByAppleUserId(appleUserId)
      .filter(u -> u.getDeletedAt() != null);

    if (softDeleted.isPresent()) {
      AppUser user = softDeleted.get();

      if (!Boolean.TRUE.equals(request.getConfirmRestore())) {
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

    // ── Identity lookup (account linking by apple_user_id, then by email) ──
    Optional<AppUser> existingByApple = userRepository.findByAppleUserId(
      appleUserId
    );
    Optional<AppUser> existingByEmail = (email != null &&
      !isAppleRelayEmail(email))
      ? userRepository.findByEmail(email)
      : Optional.empty();

    boolean userExists =
      existingByApple.isPresent() || existingByEmail.isPresent();
    String normalizedIntent = normalizeIntent(request.getIntent());

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
        .error("No account exists for this Apple ID. Please sign up first.")
        .build();
    }

    if (
      INTENT_SIGN_UP.equals(normalizedIntent) && existingByApple.isPresent()
    ) {
      return AuthResponse.builder()
        .errorCode(ACCOUNT_ALREADY_EXISTS)
        .error("An account already exists for this Apple ID. Please sign in.")
        .build();
    }

    if (
      existingByApple.isEmpty() &&
      existingByEmail.isPresent() &&
      !Boolean.TRUE.equals(request.getConfirmLink())
    ) {
      return AuthResponse.builder()
        .accountExistsForLinking(true)
        .existingProvider("google")
        .build();
    }

    AppUser user;
    if (existingByApple.isPresent()) {
      // Returning Apple user — straightforward
      user = existingByApple.get();
    } else if (existingByEmail.isPresent()) {
      // Account linking: user previously signed up with Google using the same
      // verified email. Attach the Apple identity to their existing account.
      user = existingByEmail.get();
      user.setAppleUserId(appleUserId);
      user = userRepository.save(user);
    } else {
      // First-time signup via Apple
      user = createNewAppleUser(appleUserId, email, request);
    }

    String jwtToken = jwtService.generateToken(
      user.getUserId(),
      user.getEmail()
    );
    String refreshToken = createRefreshToken(user);

    return AuthResponse.builder()
      .token(jwtToken)
      .refreshToken(refreshToken)
      .user(convertToDTO(user))
      .newUser(existingByApple.isEmpty() && existingByEmail.isEmpty())
      .build();
  }

  /**
   * Apple's "Hide My Email" feature gives users an opaque relay address
   * ending in @privaterelay.appleid.com. We don't treat these as a valid
   * email match for account linking, since the same Apple ID can change
   * the relay over time for some edge cases.
   */
  private boolean isAppleRelayEmail(String email) {
    return (
      email != null && email.toLowerCase().endsWith("@privaterelay.appleid.com")
    );
  }

  private AppUser createNewAppleUser(
    String appleUserId,
    String email,
    AppleLoginRequest request
  ) {
    AppUser newUser = AppUser.builder()
      .email(email) // may be a relay address — that's fine
      .username(request.getUsername())
      .appleUserId(appleUserId)
      .displayName(request.getDisplayName())
      .gender(request.getGender())
      .heightInches(request.getHeightInches())
      .weightLbs(request.getWeightLbs())
      .age(request.getAge())
      .passwordHash("")
      .isPrivate(false)
      .build();

    return userRepository.save(newUser);
  }

  @Transactional
  public AuthResponse authenticateWithGoogle(GoogleLoginRequest request)
    throws GeneralSecurityException, IOException {
    // Verify the Google token
    GoogleIdToken.Payload payload = googleTokenVerifier.verify(
      request.getIdToken()
    );

    String email = payload.getEmail();
    // Old app clients send only {idToken, intent} and never a username; new
    // clients send the onboarding-chosen username/displayName. Capture the
    // Google profile name so createNewUser can fall back to it when the request
    // omits those fields.
    String googleName = (String) payload.get("name");

    Optional<AppUser> softDeleted = userRepository
      .findByEmailIncludingDeleted(email)
      .filter(u -> u.getDeletedAt() != null);

    if (softDeleted.isPresent()) {
      AppUser user = softDeleted.get();

      if (!Boolean.TRUE.equals(request.getConfirmRestore())) {
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
    String normalizedIntent = normalizeIntent(request.getIntent());

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
      : createNewUser(email, googleName, request);

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

  private AppUser createNewUser(
    String email,
    String googleName,
    GoogleLoginRequest request
  ) {
    // username is NOT NULL + UNIQUE. New clients always supply one; old clients
    // never do, so derive a unique one from the Google profile name (or the
    // email local-part) rather than inserting null. displayName falls back to
    // the Google name when the client omits it.
    String username = isBlank(request.getUsername())
      ? generateUniqueUsername(
          !isBlank(googleName) ? googleName : email.split("@")[0]
        )
      : request.getUsername();

    String displayName = isBlank(request.getDisplayName())
      ? googleName
      : request.getDisplayName();

    AppUser newUser = AppUser.builder()
      .email(email)
      .username(username)
      .displayName(displayName)
      .passwordHash("") // OAuth users don't have passwords
      .isPrivate(false)
      .weightLbs(request.getWeightLbs())
      .gender(request.getGender())
      .heightInches(request.getHeightInches())
      .age(request.getAge())
      .build();

    return userRepository.save(newUser);
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  /**
   * Derive a unique, rule-valid username from a base string. Strips it to
   * lowercase alphanumerics, pads short values, and appends an incrementing
   * suffix until free. Checks against ALL rows including soft-deleted ones,
   * since a soft-deleted account still occupies its username at the unique
   * constraint until it is hard-deleted.
   */
  private String generateUniqueUsername(String baseName) {
    String username = baseName.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();

    if (username.length() < 3) {
      username = "user" + username;
    }

    String finalUsername = username;
    int counter = 1;

    while (userRepository.existsByUsernameIncludingDeleted(finalUsername)) {
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

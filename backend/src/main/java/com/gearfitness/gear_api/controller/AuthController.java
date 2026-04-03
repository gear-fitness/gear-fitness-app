package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.AuthResponse;
import com.gearfitness.gear_api.dto.GoogleLoginRequest;
import com.gearfitness.gear_api.dto.RefreshTokenRequest;
import com.gearfitness.gear_api.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;

  @PostMapping("/google")
  public ResponseEntity<AuthResponse> googleLogin(
    @RequestBody GoogleLoginRequest request
  ) {
    try {
      AuthResponse response = authService.authenticateWithGoogle(
        request.getIdToken(),
        request.getIntent()
      );
      if (response.getError() != null) {
        return ResponseEntity.badRequest().body(response);
      }
      return ResponseEntity.ok(response);
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(
        AuthResponse.builder()
          .error("Authentication failed: " + e.getMessage())
          .errorCode("AUTH_FAILED")
          .build()
      );
    }
  }

  @PostMapping("/refresh")
  public ResponseEntity<AuthResponse> refreshToken(
    @RequestBody RefreshTokenRequest request
  ) {
    try {
      AuthResponse response = authService.refreshAccessToken(
        request.getRefreshToken()
      );
      return ResponseEntity.ok(response);
    } catch (Exception e) {
      return ResponseEntity.status(401).body(
        AuthResponse.builder()
          .error("Token refresh failed: " + e.getMessage())
          .build()
      );
    }
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(@RequestBody RefreshTokenRequest request) {
    authService.logout(request.getRefreshToken());
    return ResponseEntity.ok().build();
  }

  @GetMapping("/me")
  public ResponseEntity<?> getCurrentUser(
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      return ResponseEntity.ok(authService.getCurrentUser(authHeader));
    } catch (Exception e) {
      return ResponseEntity.badRequest().body("Error: " + e.getMessage());
    }
  }
}

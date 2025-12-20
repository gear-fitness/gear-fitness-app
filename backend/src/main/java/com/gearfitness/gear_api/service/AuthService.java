package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.AuthResponse;
import com.gearfitness.gear_api.dto.UserDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.security.GoogleTokenVerifier;
import com.gearfitness.gear_api.security.JwtService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AppUserRepository userRepository;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse authenticateWithGoogle(String idToken) throws GeneralSecurityException, IOException {
        // Verify the Google token
        GoogleIdToken.Payload payload = googleTokenVerifier.verify(idToken);

        String email = payload.getEmail();
        String name = (String) payload.get("name");

        // Check if user exists
        boolean isNewUser = !userRepository.existsByEmail(email);

        // Find or create user
        AppUser user = userRepository.findByEmail(email)
                .orElseGet(() -> createNewUser(email, name));

        // Generate JWT token
        String jwtToken = jwtService.generateToken(user.getUserId(), user.getEmail());

        return AuthResponse.builder()
                .token(jwtToken)
                .user(convertToDTO(user))
                .newUser(isNewUser)
                .build();
    }

    private AppUser createNewUser(String email, String name) {
        // Generate username from email or name
        String username = generateUniqueUsername(name != null ? name : email.split("@")[0]);

        AppUser newUser = AppUser.builder()
                .email(email)
                .username(username)
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
        
        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return convertToDTO(user);
    }

    private UserDTO convertToDTO(AppUser user) {
        return UserDTO.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .weightLbs(user.getWeightLbs())
                .heightInches(user.getHeightInches())
                .age(user.getAge())
                .isPrivate(user.getIsPrivate())
                .createdAt(user.getCreatedAt())
                .build();
    }
}

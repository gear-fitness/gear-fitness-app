package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.UpdateUserProfileRequest;
import com.gearfitness.gear_api.dto.UserDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AppUserService {
    
    private final AppUserRepository userRepository;

    /**
     * Get user profile by user ID
     */
    public UserDTO getUserProfile(UUID userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return convertToDTO(user);
    }

    /**
     * Get user profile by username
     */
    public UserDTO getUserProfileByUsername(String username) {
        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return convertToDTO(user);
    }

    /**
     * Update user profile
     */
    @Transactional
    public UserDTO updateUserProfile(UUID userId, UpdateUserProfileRequest request) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Update username if provided and different
        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())) {
            // Check if username is already taken
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new RuntimeException("Username already taken");
            }
            user.setUsername(request.getUsername());
        }

        // Update other fields if provided
        if (request.getWeightLbs() != null) {
            user.setWeightLbs(request.getWeightLbs());
        }
        
        if (request.getHeightInches() != null) {
            user.setHeightInches(request.getHeightInches());
        }
        
        if (request.getAge() != null) {
            user.setAge(request.getAge());
        }
        
        if (request.getIsPrivate() != null) {
            user.setIsPrivate(request.getIsPrivate());
        }

        // Save and return
        AppUser updatedUser = userRepository.save(user);
        return convertToDTO(updatedUser);
    }

    /**
     * Convert AppUser entity to UserDTO
     */
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
package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.UpdateUserProfileRequest;
import com.gearfitness.gear_api.dto.UserDTO;
import com.gearfitness.gear_api.dto.UserProfileDTO;
import com.gearfitness.gear_api.dto.WorkoutStatsDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Follow;
import com.gearfitness.gear_api.entity.Workout;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.FollowRepository;
import com.gearfitness.gear_api.repository.WorkoutRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AppUserService {

    private final AppUserRepository userRepository;
    private final WorkoutRepository workoutRepository;
    private final FollowRepository followRepository;

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
     * Get enhanced user profile by user ID
     * Includes workout stats and social metrics
     */
    public UserProfileDTO getEnhancedUserProfile(UUID userId, UUID viewingUserId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return buildEnhancedProfile(user, viewingUserId);
    }

    /**
     * Get enhanced user profile by username
     * Includes workout stats and social metrics
     */
    public UserProfileDTO getEnhancedUserProfileByUsername(String username, UUID viewingUserId) {
        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return buildEnhancedProfile(user, viewingUserId);
    }

    /**
     * Build enhanced profile with stats
     */
    private UserProfileDTO buildEnhancedProfile(AppUser user, UUID viewingUserId) {
        WorkoutStatsDTO workoutStats = calculateWorkoutStats(user);
        long followersCount = followRepository.countByFolloweeAndStatus(user, Follow.FollowStatus.ACCEPTED);
        long followingCount = followRepository.countByFollowerAndStatus(user, Follow.FollowStatus.ACCEPTED);

        Boolean isFollowing = null;
        if (viewingUserId != null && !viewingUserId.equals(user.getUserId())) {
            AppUser viewingUser = userRepository.findById(viewingUserId).orElse(null);
            if (viewingUser != null) {
                isFollowing = followRepository.existsByFollowerAndFolloweeAndStatus(
                        viewingUser, user, Follow.FollowStatus.ACCEPTED
                );
            }
        }

        return UserProfileDTO.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .weightLbs(user.getWeightLbs())
                .heightInches(user.getHeightInches())
                .age(user.getAge())
                .isPrivate(user.getIsPrivate())
                .createdAt(user.getCreatedAt())
                .workoutStats(workoutStats)
                .followersCount(followersCount)
                .followingCount(followingCount)
                .isFollowing(isFollowing)
                .build();
    }

    /**
     * Calculate workout statistics for a user
     */
    private WorkoutStatsDTO calculateWorkoutStats(AppUser user) {
        // Total workouts
        long totalWorkouts = workoutRepository.countByUser(user);

        // Get start and end of current week (Monday to Sunday)
        LocalDate today = LocalDate.now();
        LocalDate startOfWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endOfWeek = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        // Workouts this week
        long workoutsThisWeek = workoutRepository.countByUserAndDatePerformedBetween(
                user, startOfWeek, endOfWeek
        );

        // Build weekly split (map of day names to workout counts)
        Map<String, Integer> weeklySplit = buildWeeklySplit(user, startOfWeek, endOfWeek);

        return WorkoutStatsDTO.builder()
                .totalWorkouts(totalWorkouts)
                .workoutsThisWeek(workoutsThisWeek)
                .weeklySplit(weeklySplit)
                .build();
    }

    /**
     * Build weekly split map for the current week
     */
    private Map<String, Integer> buildWeeklySplit(AppUser user, LocalDate startOfWeek, LocalDate endOfWeek) {
        List<Workout> weekWorkouts = workoutRepository.findByUserAndDatePerformedBetween(
                user, startOfWeek, endOfWeek
        );

        // Initialize all days to 0
        Map<String, Integer> weeklySplit = new HashMap<>();
        weeklySplit.put("Mon", 0);
        weeklySplit.put("Tue", 0);
        weeklySplit.put("Wed", 0);
        weeklySplit.put("Thu", 0);
        weeklySplit.put("Fri", 0);
        weeklySplit.put("Sat", 0);
        weeklySplit.put("Sun", 0);

        // Count workouts per day
        for (Workout workout : weekWorkouts) {
            String dayName = getDayName(workout.getDatePerformed().getDayOfWeek());
            weeklySplit.put(dayName, weeklySplit.get(dayName) + 1);
        }

        return weeklySplit;
    }

    /**
     * Convert DayOfWeek to short day name
     */
    private String getDayName(DayOfWeek dayOfWeek) {
        switch (dayOfWeek) {
            case MONDAY: return "Mon";
            case TUESDAY: return "Tue";
            case WEDNESDAY: return "Wed";
            case THURSDAY: return "Thu";
            case FRIDAY: return "Fri";
            case SATURDAY: return "Sat";
            case SUNDAY: return "Sun";
            default: return "";
        }
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
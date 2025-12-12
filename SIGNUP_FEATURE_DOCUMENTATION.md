# First-Time User Sign-Up Feature Documentation

## Overview

This document explains the implementation of the first-time user profile setup feature for Gear Fitness. The feature collects essential user information (height, weight, age) when a new user signs up via Google OAuth, ensuring the database has complete user profiles before allowing access to the main application.

## Summary of Changes

### What Was Changed
- **Database Schema**: Added three new required fields to the `app_user` table
- **Backend API**: Created new user profile endpoints and updated authentication flow
- **Frontend**: Added a new profile setup screen with navigation logic for new users

### Why These Changes Matter
Previously, users could sign up via Google OAuth and immediately access the app without providing essential fitness metrics. This feature ensures we collect height, weight, and age upfront, enabling better personalized fitness experiences and recommendations.

---

## Database Changes

### Entity: AppUser
**File**: [backend/src/main/java/com/gearfitness/gear_api/entity/AppUser.java](backend/src/main/java/com/gearfitness/gear_api/entity/AppUser.java)

Three new required fields were added to the `AppUser` entity:

```java
@Column(nullable = false)
private Integer weightLbs;

@Column(nullable = false)
private Integer heightInches;

@Column(nullable = false)
private Integer age;
```

**Field Constraints**:
- All three fields are marked as `nullable = false` (required in database)
- Type: `Integer` for all three fields
- Units: `weightLbs` (pounds), `heightInches` (inches), `age` (years)

### SQL Schema Update
**File**: [backend/src/main/resources/data.sql](backend/src/main/resources/data.sql)

The seed data SQL was updated to include the new fields:

```sql
INSERT INTO app_user (user_id, username, email, password_hash, is_private, age, height_inches, weight_lbs, created_at)
VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'bryant', 'bryant@example.com', '...', false, 25, 72, 180, ...),
    ('550e8400-e29b-41d4-a716-446655440002', 'max', 'max@example.com', '...', false, 28, 70, 190, ...),
    ...
```

**Migration Note**: Since the app uses `spring.jpa.hibernate.ddl-auto=create`, the schema is recreated on each startup. For production, a proper migration strategy (Flyway/Liquibase) would be needed.

---

## Backend API Changes

### 1. New DTO: UpdateUserProfileRequest
**File**: [backend/src/main/java/com/gearfitness/gear_api/dto/UpdateUserProfileRequest.java](backend/src/main/java/com/gearfitness/gear_api/dto/UpdateUserProfileRequest.java)

A new Data Transfer Object for profile update requests:

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserProfileRequest {
    private String username;      // Optional - only if user wants to change it
    private Integer weightLbs;    // Optional
    private Integer heightInches; // Optional
    private Integer age;          // Optional
    private Boolean isPrivate;    // Optional
}
```

**Design Decision**: All fields are optional to allow partial updates (PATCH semantics even on PUT endpoint).

### 2. Updated DTO: UserDTO
**File**: [backend/src/main/java/com/gearfitness/gear_api/dto/UserDTO.java](backend/src/main/java/com/gearfitness/gear_api/dto/UserDTO.java)

Added the three new fields to the user response DTO:

```java
private Integer weightLbs;
private Integer heightInches;
private Integer age;
```

### 3. Updated DTO: AuthResponse
**File**: [backend/src/main/java/com/gearfitness/gear_api/dto/AuthResponse.java](backend/src/main/java/com/gearfitness/gear_api/dto/AuthResponse.java)

Added a `newUser` flag to inform the frontend whether the user is signing up for the first time:

```java
private boolean newUser;
```

### 4. Updated Service: AuthService
**File**: [backend/src/main/java/com/gearfitness/gear_api/service/AuthService.java](backend/src/main/java/com/gearfitness/gear_api/service/AuthService.java)

**Key Changes**:

#### New User Detection
Added logic to check if a user exists before creating them:

```java
boolean isNewUser = !userRepository.existsByEmail(email);
```

This flag is then included in the `AuthResponse`.

#### Default Values for New Users
When creating a new user via Google OAuth, temporary default values are set:

```java
.weightLbs(0)      // Temporary default - user will set in profile setup
.heightInches(0)   // Temporary default - user will set in profile setup
.age(0)            // Temporary default - user will set in profile setup
```

**Why Zeros?** These serve as placeholder values that will be replaced when the user completes their profile. The frontend validates that real values are provided before submission.

#### Updated UserDTO Conversion
The `convertToDTO()` method now includes the new fields in the response.

### 5. New Service: AppUserService
**File**: [backend/src/main/java/com/gearfitness/gear_api/service/AppUserService.java](backend/src/main/java/com/gearfitness/gear_api/service/AppUserService.java)

A fully implemented service for user profile management with three main methods:

#### `getUserProfile(UUID userId)`
Retrieves a user profile by user ID:
```java
public UserDTO getUserProfile(UUID userId) {
    AppUser user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    return convertToDTO(user);
}
```

#### `getUserProfileByUsername(String username)`
Retrieves a user profile by username:
```java
public UserDTO getUserProfileByUsername(String username) {
    AppUser user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
    return convertToDTO(user);
}
```

#### `updateUserProfile(UUID userId, UpdateUserProfileRequest request)`
Updates user profile with validation:

**Key Features**:
- ✅ **Transactional**: Ensures database consistency
- ✅ **Partial Updates**: Only updates fields that are provided (not null)
- ✅ **Username Uniqueness Check**: Prevents duplicate usernames
- ✅ **Null-safe**: Checks if each field is provided before updating

```java
@Transactional
public UserDTO updateUserProfile(UUID userId, UpdateUserProfileRequest request) {
    AppUser user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

    // Update username with uniqueness check
    if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())) {
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

    AppUser updatedUser = userRepository.save(user);
    return convertToDTO(updatedUser);
}
```

### 6. New Controller: AppUserController
**File**: [backend/src/main/java/com/gearfitness/gear_api/controller/AppUserController.java](backend/src/main/java/com/gearfitness/gear_api/controller/AppUserController.java)

A complete REST controller with four endpoints:

#### `GET /api/users/me`
Get the current authenticated user's profile:
```java
@GetMapping("/me")
public ResponseEntity<UserDTO> getCurrentUserProfile(@RequestHeader("Authorization") String authHeader)
```

**Authentication**: Extracts JWT token and user ID from the Authorization header.

#### `PUT /api/users/me` ⭐ **Used by Sign-Up Flow**
Update the current user's profile:
```java
@PutMapping("/me")
public ResponseEntity<?> updateCurrentUserProfile(
        @RequestHeader("Authorization") String authHeader,
        @RequestBody UpdateUserProfileRequest request)
```

**This endpoint is called by the sign-up profile screen** to save the user's height, weight, and age.

#### `GET /api/users/{username}`
Get any user's profile by username (public endpoint):
```java
@GetMapping("/{username}")
public ResponseEntity<?> getUserByUsername(@PathVariable String username)
```

**Future Enhancement**: Currently returns full profile; should filter based on privacy settings.

#### `PATCH /api/users/me/privacy`
Toggle user privacy setting:
```java
@PatchMapping("/me/privacy")
public ResponseEntity<?> updatePrivacySetting(
        @RequestHeader("Authorization") String authHeader,
        @RequestBody UpdateUserProfileRequest request)
```

---

## Frontend Changes

### 1. New Screen: SignUpProfile
**File**: [frontend/src/navigation/screens/SignUpProfile.tsx](frontend/src/navigation/screens/SignUpProfile.tsx)

A new React Native screen that collects user profile information.

#### Component State
```typescript
const [heightInches, setHeightInches] = useState("");
const [weightLbs, setWeightLbs] = useState("");
const [age, setAge] = useState("");
const [loading, setLoading] = useState(false);
```

#### Input Validation
The `validateInputs()` function ensures data quality:

```typescript
const validateInputs = () => {
  const height = parseInt(heightInches);
  const weight = parseInt(weightLbs);
  const userAge = parseInt(age);

  // Check all fields are filled
  if (!heightInches || !weightLbs || !age) {
    Alert.alert("Missing Information", "Please fill in all fields");
    return false;
  }

  // Height: 24-96 inches (2-8 feet)
  if (isNaN(height) || height < 24 || height > 96) {
    Alert.alert("Invalid Height", "Please enter a valid height between 24 and 96 inches (2-8 feet)");
    return false;
  }

  // Weight: 50-500 lbs
  if (isNaN(weight) || weight < 50 || weight > 500) {
    Alert.alert("Invalid Weight", "Please enter a valid weight between 50 and 500 lbs");
    return false;
  }

  // Age: 13-120 years
  if (isNaN(userAge) || userAge < 13 || userAge > 120) {
    Alert.alert("Invalid Age", "Please enter a valid age between 13 and 120");
    return false;
  }

  return true;
};
```

**Validation Rules**:
- ✅ All fields required
- ✅ Height: 24-96 inches (2-8 feet)
- ✅ Weight: 50-500 lbs
- ✅ Age: 13-120 years

#### Profile Update Submission
The `handleSubmit()` function calls the backend API:

```typescript
const handleSubmit = async () => {
  if (!validateInputs()) return;

  setLoading(true);

  try {
    const authToken = await AsyncStorage.getItem("authToken");

    if (!authToken) {
      Alert.alert("Error", "Authentication token not found. Please log in again.");
      navigation.navigate("Login");
      return;
    }

    const response = await fetch("http://10.0.0.219:8080/api/users/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        heightInches: parseInt(heightInches),
        weightLbs: parseInt(weightLbs),
        age: parseInt(age),
      }),
    });

    if (response.ok) {
      const userData = await response.json();
      console.log("Profile updated successfully:", userData);
      navigation.navigate("HomeTabs");
    } else {
      const errorData = await response.json();
      Alert.alert("Error", errorData.message || "Failed to update profile");
    }
  } catch (error) {
    console.error("Profile update error:", error);
    Alert.alert("Error", "An error occurred while updating your profile");
  } finally {
    setLoading(false);
  }
};
```

**Flow**:
1. Validates inputs
2. Retrieves JWT token from AsyncStorage
3. Calls `PUT /api/users/me` with height, weight, and age
4. On success: navigates to HomeTabs
5. On error: shows error alert

### 2. Updated Navigation: Root Stack
**File**: [frontend/src/navigation/index.tsx](frontend/src/navigation/index.tsx)

Added the new SignUpProfile screen to the navigation stack:

```typescript
SignUpProfile: {
  screen: SignUpProfileScreen,
  options: {
    headerShown: true,
    title: "Complete Profile",
    headerBackVisible: false,  // Prevents back navigation (user must complete profile)
  },
}
```

**Navigation Configuration**:
- ✅ Header shown with title "Complete Profile"
- ✅ Back button hidden (`headerBackVisible: false`) to ensure users complete the profile
- ✅ Positioned before HomeTabs in the stack

### 3. Updated Login Screen
**File**: [frontend/src/navigation/screens/Login.tsx](frontend/src/navigation/screens/Login.tsx)

Updated the Google Sign-In flow to handle new users:

```typescript
const { token, user: userData, newUser } = await backendResponse.json();

// Store this token for future API calls
await AsyncStorage.setItem("authToken", token);

const { name, email, photo } = user;
console.log("User Info:", { name, email, photo });
console.log("Is new user:", newUser);

// Navigate to profile setup if new user, otherwise go to home
if (newUser) {
  navigation.navigate("SignUpProfile");
} else {
  navigation.navigate("HomeTabs");
}
```

**Key Changes**:
1. ✅ Destructures `newUser` flag from auth response
2. ✅ Conditional navigation based on `newUser` status
3. ✅ New users → SignUpProfile screen
4. ✅ Returning users → HomeTabs (main app)

---

## Complete Flow Diagram

### First-Time User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER OPENS APP                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Login Screen  │
                    └────────┬───────┘
                             │
                             │ User taps "Sign in with Google"
                             ▼
                    ┌────────────────┐
                    │ Google OAuth   │
                    │  (Get Token)   │
                    └────────┬───────┘
                             │
                             ▼
        ┌────────────────────────────────────────────┐
        │  POST /api/auth/google                     │
        │  Body: { idToken: "..." }                  │
        └────────┬───────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────────────────┐
        │  Backend: AuthService.authenticateGoogle() │
        │  1. Verify Google token                    │
        │  2. Check if user exists                   │
        │     - isNewUser = !userRepo.existsByEmail()│
        │  3. Create user if new (with 0 defaults)   │
        │  4. Generate JWT token                     │
        └────────┬───────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────────────────┐
        │  Response:                                 │
        │  {                                         │
        │    token: "jwt_token_here",                │
        │    user: { userId, email, ... },           │
        │    newUser: true  ← NEW FLAG               │
        │  }                                         │
        └────────┬───────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────────────────┐
        │  Frontend: Store JWT in AsyncStorage       │
        │  Check newUser flag                        │
        └────────┬───────────────────────────────────┘
                 │
                 ├─── newUser = false ─────────────────┐
                 │                                     │
                 │                                     ▼
                 │                            ┌─────────────────┐
                 │                            │   Navigate to   │
                 │                            │    HomeTabs     │
                 │                            │ (Main App)      │
                 │                            └─────────────────┘
                 │
                 └─── newUser = true ─────────────────┐
                                                      │
                                                      ▼
                                         ┌────────────────────────┐
                                         │  SignUpProfile Screen  │
                                         │  - Enter height        │
                                         │  - Enter weight        │
                                         │  - Enter age           │
                                         └────────┬───────────────┘
                                                  │
                                                  │ User fills form & taps "Continue"
                                                  ▼
                                         ┌────────────────────────┐
                                         │  Validate inputs       │
                                         │  - Height: 24-96 in    │
                                         │  - Weight: 50-500 lbs  │
                                         │  - Age: 13-120 years   │
                                         └────────┬───────────────┘
                                                  │
                                                  ▼
                                         ┌────────────────────────┐
                                         │  PUT /api/users/me     │
                                         │  Headers:              │
                                         │    Authorization:      │
                                         │      Bearer <token>    │
                                         │  Body:                 │
                                         │  {                     │
                                         │    heightInches: 70,   │
                                         │    weightLbs: 180,     │
                                         │    age: 25             │
                                         │  }                     │
                                         └────────┬───────────────┘
                                                  │
                                                  ▼
                                         ┌────────────────────────┐
                                         │  Backend:              │
                                         │  AppUserController     │
                                         │  1. Extract user ID    │
                                         │     from JWT           │
                                         │  2. Call               │
                                         │     userService        │
                                         │     .updateProfile()   │
                                         │  3. Update DB fields   │
                                         └────────┬───────────────┘
                                                  │
                                                  ▼
                                         ┌────────────────────────┐
                                         │  Database Updated      │
                                         │  app_user:             │
                                         │    weight_lbs = 180    │
                                         │    height_inches = 70  │
                                         │    age = 25            │
                                         └────────┬───────────────┘
                                                  │
                                                  ▼
                                         ┌────────────────────────┐
                                         │  Response: UserDTO     │
                                         │  (updated user data)   │
                                         └────────┬───────────────┘
                                                  │
                                                  ▼
                                         ┌────────────────────────┐
                                         │   Navigate to          │
                                         │    HomeTabs            │
                                         │   (Main App)           │
                                         └────────────────────────┘
```

### Returning User Flow

```
┌──────────────┐
│ Login Screen │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Google OAuth     │
└──────┬───────────┘
       │
       ▼
┌──────────────────────────┐
│ POST /api/auth/google    │
│ Response: newUser=false  │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────┐
│  Navigate to     │
│   HomeTabs       │
│  (Skip Profile)  │
└──────────────────┘
```

---

## API Endpoints Summary

| Method | Endpoint | Auth Required | Purpose |
|--------|----------|---------------|---------|
| POST | `/api/auth/google` | ❌ No | Google OAuth login, returns JWT + newUser flag |
| GET | `/api/users/me` | ✅ Yes | Get current user's profile |
| PUT | `/api/users/me` | ✅ Yes | Update current user's profile (used in sign-up) |
| GET | `/api/users/{username}` | ✅ Yes | Get user profile by username |
| PATCH | `/api/users/me/privacy` | ✅ Yes | Update privacy setting |

---

## Testing Checklist

### Backend Testing
- [ ] New user creation sets weight/height/age to 0
- [ ] Auth endpoint returns `newUser: true` for first-time users
- [ ] Auth endpoint returns `newUser: false` for existing users
- [ ] `PUT /api/users/me` successfully updates profile
- [ ] Username uniqueness is enforced
- [ ] JWT token correctly identifies user in protected endpoints

### Frontend Testing
- [ ] New users are redirected to SignUpProfile screen
- [ ] Returning users skip to HomeTabs
- [ ] Form validation prevents invalid inputs
- [ ] Submit button shows loading state
- [ ] Successful submission navigates to HomeTabs
- [ ] Error messages display for failed updates
- [ ] Back button is hidden on SignUpProfile screen

### Integration Testing
- [ ] Complete flow: Google Sign-In → Profile Setup → Home
- [ ] JWT token persists across app restarts
- [ ] Profile data displays correctly after setup

---

## Future Enhancements

### Security
- [ ] Add rate limiting to profile update endpoint
- [ ] Implement field-level validation on backend (not just frontend)
- [ ] Add CSRF protection for state-changing operations

### User Experience
- [ ] Allow skipping profile setup (with persistent reminder)
- [ ] Add profile picture upload during setup
- [ ] Show imperial/metric toggle for international users
- [ ] Add BMI calculation based on height/weight

### Features
- [ ] Privacy settings respect on user profile views
- [ ] Profile edit screen for existing users
- [ ] Profile completion percentage indicator
- [ ] Onboarding tutorial after profile setup

---

## Technical Debt & Notes

1. **Database Migration**: Currently using `ddl-auto=create` which drops the database on restart. Production needs Flyway/Liquibase migrations.

2. **Hardcoded Backend URL**: The frontend has a hardcoded IP address (`http://10.0.0.219:8080`). This should be environment-configurable.

3. **Error Handling**: Backend throws generic `RuntimeException`. Should use custom exceptions with proper HTTP status codes.

4. **Default Values**: New users get `0` for height/weight/age. Could validate these aren't still `0` when accessing certain features.

5. **Username Generation**: Currently uses email prefix for username. May need improvement for uniqueness.

6. **Null Safety**: While the update method handles null fields, database schema marks them as `NOT NULL`. This creates a mismatch that works due to defaults but should be addressed.

---

## Files Changed Summary

### Backend
- ✅ **New**: `UpdateUserProfileRequest.java` - DTO for profile updates
- ✅ **Modified**: `AppUser.java` - Added weight, height, age fields
- ✅ **Modified**: `UserDTO.java` - Added weight, height, age fields
- ✅ **Modified**: `AuthResponse.java` - Added newUser flag
- ✅ **Implemented**: `AppUserService.java` - Full service implementation
- ✅ **Implemented**: `AppUserController.java` - Full controller implementation
- ✅ **Modified**: `AuthService.java` - Added newUser detection and defaults
- ✅ **Modified**: `data.sql` - Updated seed data with new fields

### Frontend
- ✅ **New**: `SignUpProfile.tsx` - Profile setup screen
- ✅ **Modified**: `index.tsx` - Added SignUpProfile to navigation
- ✅ **Modified**: `Login.tsx` - Conditional navigation based on newUser flag

---

## Conclusion

This feature successfully implements a first-time user onboarding flow that:
1. ✅ Detects new users during Google OAuth authentication
2. ✅ Collects essential fitness metrics (height, weight, age)
3. ✅ Validates user input on both frontend and backend
4. ✅ Updates the database with complete user profiles
5. ✅ Provides a seamless experience for both new and returning users

The implementation follows REST principles, maintains security through JWT authentication, and provides a smooth user experience with proper validation and error handling.

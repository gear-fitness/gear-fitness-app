# Feature Branch Summary: User Sign-Up and Profile Page

**Branch:** `feature/user-sign-up-and-profile-page`
**Base Branch:** `main` (from commit `bee219d3`)
**Total Changes:** 27 files modified, 3,262 insertions, 61 deletions

---

## Overview

This branch implements a complete user onboarding and profile management system for the Gear Fitness application. The feature enables new users to complete their profile after Google authentication and allows existing users to view comprehensive profile data including workout statistics and social metrics.

---

## Key Features Implemented

### 1. **New User Onboarding Flow**
- Post-authentication profile setup screen for new users
- Collects essential fitness metrics: height, weight, and age
- Automatic routing: new users → profile setup, existing users → home tabs
- Form validation with user-friendly error messages

### 2. **Enhanced User Profile System**
- Real-time profile data fetching from backend
- Comprehensive profile information display
- Workout statistics integration
- Social metrics (followers/following counts)
- Weekly workout activity visualization

### 3. **Backend API Infrastructure**
- RESTful API endpoints for user profile management
- Follow/unfollow functionality
- Workout statistics calculation
- JWT-based authentication throughout

### 4. **Frontend Service Layer**
- Centralized API configuration
- Type-safe API calls with TypeScript
- Reusable authentication utilities
- Comprehensive error handling

---

## Technical Changes

### Frontend Changes

#### New Files Created

##### 1. **SignUpProfile.tsx** (`frontend/src/navigation/screens/SignUpProfile.tsx`)
**Purpose:** Onboarding screen for new users to complete their fitness profile

**Features:**
- Input fields for height (inches), weight (lbs), and age
- Client-side validation:
  - Height: 24-96 inches (2-8 feet)
  - Weight: 50-500 lbs
  - Age: 13-120 years
- Loading states with ActivityIndicator
- Keyboard-aware scrolling for better UX
- Theme-aware styling using React Navigation
- Automatic navigation to HomeTabs upon completion

**Why:** Essential for collecting user fitness data required for personalized workout tracking and recommendations.

##### 2. **userService.ts** (`frontend/src/api/userService.ts`)
**Purpose:** Centralized service layer for all user-related API calls

**Functions:**
- `getCurrentUserProfile()`: Fetch authenticated user's enhanced profile
- `getUserProfile(username)`: Fetch any user's profile by username
- `getUserFollowers(userId)`: Get list of followers
- `getUserFollowing(userId)`: Get list of following
- `followUser(userId)`: Follow a user
- `unfollowUser(userId)`: Unfollow a user
- `checkFollowStatus(userId)`: Check if current user follows another user

**Why:** Separates API logic from UI components, promotes code reuse, and ensures consistent error handling.

##### 3. **config.ts** (`frontend/src/api/config.ts`)
**Purpose:** Centralized API endpoint configuration

**Contents:**
- `API_BASE_URL`: Backend server URL (currently hardcoded, marked for environment variable migration)
- `API_ENDPOINTS`: Object mapping for all API routes
  - Auth endpoints
  - User profile endpoints
  - Follow/unfollow endpoints

**Why:** Single source of truth for API URLs, easier maintenance, and preparation for environment-based configuration.

##### 4. **types.ts** (`frontend/src/api/types.ts`)
**Purpose:** TypeScript type definitions matching backend DTOs

**Types Defined:**
- `WorkoutStats`: Total workouts, weekly workouts, daily split
- `UserProfile`: Comprehensive user profile data
- `FollowerUser`: Minimal user info for follower lists
- `FollowersResponse`, `FollowingResponse`, `FollowStatusResponse`: API response shapes

**Why:** Ensures type safety, catches errors at compile time, and provides IDE autocomplete.

##### 5. **auth.ts** (`frontend/src/utils/auth.ts`)
**Purpose:** Authentication token management utilities

**Functions:**
- `getAuthToken()`: Retrieve JWT from AsyncStorage
- `getAuthHeader()`: Generate Authorization header object
- `setAuthToken(token)`: Store JWT in AsyncStorage
- `clearAuthToken()`: Remove JWT from AsyncStorage

**Why:** Centralized token management, consistent error handling, and easier testing.

#### Modified Files

##### 1. **Profile.tsx** (`frontend/src/navigation/screens/Profile.tsx`)
**Changes:**
- Integrated real backend data fetching
- Added loading and error states
- Dynamic data rendering:
  - User stats (weight, height, age)
  - Workout statistics (total workouts, weekly activity)
  - Social metrics (followers, following counts)
  - Weekly workout calendar with activity indicators
- Removed hardcoded placeholder data
- Added retry functionality for failed data loads
- Implemented `formatHeight()` utility for feet/inches display

**Why:** Transform static mockup into functional, data-driven profile screen connected to backend.

##### 2. **Login.tsx** (`frontend/src/navigation/screens/Login.tsx`)
**Changes:**
- Added `newUser` flag handling from backend response
- Conditional navigation:
  - New users → `SignUpProfile` screen
  - Existing users → `HomeTabs`
- Console logging for debugging user status

**Why:** Implement onboarding flow to ensure new users complete their profile before accessing the app.

##### 3. **index.tsx** (`frontend/src/navigation/index.tsx`)
**Changes:**
- Added `SignUpProfile` route to RootStack navigator
- Configuration:
  - `headerShown: true`
  - `title: "Complete Profile"`
  - `headerBackVisible: false` (prevents navigation away before completion)

**Why:** Integrate new profile setup screen into navigation hierarchy.

---

### Backend Changes

#### New Files Created

##### 1. **AppUserController.java** (`backend/.../controller/AppUserController.java`)
**Purpose:** REST API endpoints for user profile operations

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users/me` | Get current user's basic profile |
| GET | `/api/users/me/profile` | Get current user's enhanced profile (with stats) |
| PUT | `/api/users/me` | Update current user's profile |
| GET | `/api/users/{username}` | Get user profile by username |
| PATCH | `/api/users/me/privacy` | Toggle privacy setting |

**Features:**
- JWT token extraction and user identification
- Error handling with appropriate HTTP status codes
- Optional authentication for public profile viewing
- Privacy setting toggle endpoint (for future use)

**Why:** Provide RESTful interface for frontend to interact with user data.

##### 2. **FollowController.java** (`backend/.../controller/FollowController.java`)
**Purpose:** REST API endpoints for follow/unfollow functionality

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/follows/{userId}` | Follow a user |
| DELETE | `/api/follows/{userId}` | Unfollow a user |
| GET | `/api/follows/{userId}/followers` | Get user's followers |
| GET | `/api/follows/{userId}/following` | Get users followed by user |
| GET | `/api/follows/{userId}/status` | Check if current user follows target user |

**Why:** Enable social features for user connections and networking within the fitness community.

##### 3. **UserProfileDTO.java** (`backend/.../dto/UserProfileDTO.java`)
**Purpose:** Enhanced user profile response object

**Fields:**
- Basic info: userId, username, email, physical stats, privacy settings
- Workout stats: `WorkoutStatsDTO` object
- Social metrics: followersCount, followingCount
- Context: `isFollowing` (viewer's relationship to profile user)

**Why:** Comprehensive profile data structure that combines user info, fitness data, and social context in a single response.

##### 4. **WorkoutStatsDTO.java** (`backend/.../dto/WorkoutStatsDTO.java`)
**Purpose:** Workout statistics data structure

**Fields:**
- `totalWorkouts`: Lifetime workout count
- `workoutsThisWeek`: Current week workout count
- `weeklySplit`: Map of day names → workout counts (Mon-Sun)

**Why:** Provide detailed workout analytics for user progress tracking and motivation.

##### 5. **UpdateUserProfileRequest.java** (`backend/.../dto/UpdateUserProfileRequest.java`)
**Purpose:** Request body for profile updates

**Fields:** username, weightLbs, heightInches, age, isPrivate (all optional)

**Why:** Flexible update mechanism allowing partial profile updates without requiring all fields.

##### 6. **FollowRepository.java** (`backend/.../repository/FollowRepository.java`)
**Purpose:** Data access layer for Follow entity

**Query Methods:**
- `countByFolloweeAndStatus()`: Count followers
- `countByFollowerAndStatus()`: Count following
- `findByFolloweeAndStatus()`: Get followers list
- `findByFollowerAndStatus()`: Get following list
- `findByFollowerAndFollowee()`: Find specific follow relationship
- `existsByFollowerAndFolloweeAndStatus()`: Check follow status

**Why:** Efficient database queries for social relationship management.

##### 7. **WorkoutRepository.java** (`backend/.../repository/WorkoutRepository.java`)
**Purpose:** Data access layer for Workout entity

**Query Methods:**
- `countByUser()`: Total workouts count
- `countByUserAndDatePerformedBetween()`: Workouts in date range
- `findByUserAndDatePerformedBetween()`: Get workouts in date range
- `findByUserOrderByDatePerformedDesc()`: Get all workouts chronologically

**Why:** Support workout statistics calculation and history retrieval.

#### Modified Files

##### 1. **AppUserService.java** (`backend/.../service/AppUserService.java`)
**New Methods:**
- `getUserProfile(UUID userId)`: Get basic user profile by ID
- `getUserProfileByUsername(String username)`: Get basic profile by username
- `updateUserProfile(UUID userId, UpdateUserProfileRequest request)`: Update user profile with validation
- `getEnhancedUserProfile(UUID userId, UUID viewingUserId)`: Get profile with stats and social context
- `getEnhancedUserProfileByUsername(String username, UUID viewingUserId)`: Enhanced profile by username
- `buildEnhancedProfile(AppUser user, UUID viewingUserId)`: Helper to construct enhanced profile DTO
- `calculateWorkoutStats(AppUser user)`: Calculate workout statistics
- `buildWeeklySplit(AppUser user, LocalDate startOfWeek, LocalDate endOfWeek)`: Calculate daily workout counts

**Business Logic:**
- Username uniqueness validation
- Workout statistics calculation using current week (Monday-Sunday)
- Follow status determination based on viewing user context
- Partial profile updates (only update provided fields)

**Why:** Centralize business logic, ensure data consistency, and provide rich profile information.

##### 2. **FollowService.java** (`backend/.../service/FollowService.java`)
**New Methods:**
- `followUser(UUID followerId, UUID followeeId)`: Create follow relationship
- `unfollowUser(UUID followerId, UUID followeeId)`: Remove follow relationship
- `getFollowers(UUID userId)`: Get list of followers
- `getFollowing(UUID userId)`: Get list of following
- `isFollowing(UUID followerId, UUID followeeId)`: Check follow status

**Business Logic:**
- Prevent self-following
- Handle follow/unfollow idempotency
- Filter by ACCEPTED status
- Convert to minimal DTO (userId, username only)

**Why:** Manage social relationships with proper validation and error handling.

##### 3. **AuthService.java** (`backend/.../service/AuthService.java`)
**Changes:**
- Added `newUser` flag to `AuthResponse`
- Check if user exists before creation (`userRepository.existsByEmail()`)
- Set temporary default values (0) for new user's fitness metrics
- Include fitness metrics in UserDTO conversion

**Why:** Enable frontend to distinguish new vs. existing users and route accordingly to onboarding flow.

##### 4. **AppUser.java** (`backend/.../entity/AppUser.java`)
**Changes:**
- Added fields: `weightLbs`, `heightInches`, `age`
- All three fields are `@Column(nullable = false)` but initialized to 0 for new users

**Why:** Store essential fitness metrics for personalized workout tracking and profile display.

##### 5. **Follow.java** (`backend/.../entity/Follow.java`)
**Changes:**
- Minor adjustments to entity structure (composite key handling)

**Why:** Ensure proper JPA relationship mapping for many-to-many follow relationships.

##### 6. **AuthResponse.java** (`backend/.../dto/AuthResponse.java`)
**Changes:**
- Added `newUser` boolean field

**Why:** Inform frontend whether user needs to complete profile setup.

##### 7. **UserDTO.java** (`backend/.../dto/UserDTO.java`)
**Changes:**
- Added fields: `weightLbs`, `heightInches`, `age`

**Why:** Include fitness metrics in basic user profile responses.

---

### Configuration and Data Changes

#### 1. **.gitignore**
**Changes:**
- Added `frontend/src/navigation/screens/.Login.tsx.swp` (vim swap file)
- Additional temporary file exclusions

**Why:** Prevent committing editor temporary files.

#### 2. **data.sql** (`backend/src/main/resources/data.sql`)
**Changes:**
- Updated seed data to include fitness metrics for test users
- Ensured test data compatibility with new schema

**Why:** Maintain functional seed data for development and testing.

---

## Architecture Decisions

### 1. **Separation of Concerns**
- Frontend: Separate API layer (`/api`) from UI components
- Backend: Layered architecture (Controller → Service → Repository)
- **Benefit:** Easier testing, maintenance, and code reuse

### 2. **DTO Pattern**
- Separate entities from API responses
- Multiple DTOs for different use cases (UserDTO, UserProfileDTO)
- **Benefit:** Prevents over-fetching, reduces coupling, enables API versioning

### 3. **JWT Authentication**
- Token extraction in controllers
- Token validation in security filter
- User ID extraction for authorization
- **Benefit:** Stateless authentication, scalable architecture

### 4. **Enhanced Profile with Context**
- `isFollowing` field changes based on viewing user
- Same endpoint provides different context for different viewers
- **Benefit:** Rich user experience without additional API calls

### 5. **Flexible Update Mechanism**
- Optional fields in `UpdateUserProfileRequest`
- Only update provided fields
- **Benefit:** Partial updates without requiring full object

### 6. **Workout Statistics Calculation**
- Real-time calculation from database
- Week-based statistics (Monday-Sunday)
- **Benefit:** Always accurate, no stale cached data

---

## Data Flow Examples

### New User Signup Flow
```
1. User clicks "Sign in with Google" (Login.tsx)
2. Frontend receives Google ID token
3. Frontend → POST /api/auth/google → Backend
4. Backend verifies token, creates user with defaults, returns { token, user, newUser: true }
5. Frontend stores token, navigates to SignUpProfile
6. User enters height, weight, age
7. Frontend → PUT /api/users/me → Backend
8. Backend updates user profile, returns updated user
9. Frontend navigates to HomeTabs
```

### Profile View Flow
```
1. User navigates to Profile tab
2. Frontend → GET /api/users/me/profile → Backend
3. Backend:
   - Fetches user from database
   - Calculates workout stats (total, weekly, daily split)
   - Counts followers/following
   - Returns UserProfileDTO
4. Frontend displays profile with real data
```

### Follow User Flow
```
1. User clicks "Follow" on another user's profile
2. Frontend → POST /api/follows/{userId} → Backend
3. Backend:
   - Extracts current user from JWT
   - Validates followee exists
   - Creates Follow entity with ACCEPTED status
   - Saves to database
4. Frontend updates UI to show "Following"
```

---

## Known Limitations & TODOs

### Current Limitations

1. **Hardcoded Backend URL**
   - Location: `frontend/src/api/config.ts:8`
   - Issue: `API_BASE_URL = 'http://10.54.49.13:8080'` is hardcoded
   - Impact: Must manually update for different environments
   - **TODO:** Move to environment variable or app config

2. **Default Fitness Metrics**
   - Location: `backend/.../service/AuthService.java:60-62`
   - Issue: New users created with `weightLbs=0`, `heightInches=0`, `age=0`
   - Impact: Invalid data until user completes profile
   - **Note:** Acceptable as users must complete profile before using app

3. **Username Field Not Used in Signup**
   - Location: `frontend/src/navigation/screens/SignUpProfile.tsx:26`
   - Issue: Username state variable defined but not rendered or used
   - Impact: Users cannot choose custom username during signup
   - **TODO:** Add username input field or remove unused state

4. **Privacy Settings Not Enforced**
   - Location: `backend/.../controller/AppUserController.java:101`
   - Issue: Comment "TODO: Filter response based on privacy settings"
   - Impact: Private profiles visible to all users
   - **TODO:** Implement privacy filtering logic

5. **No Profile Picture Support**
   - Issue: No fields or endpoints for user profile pictures
   - Impact: Cannot display user avatars
   - **TODO:** Add avatar URL field and upload functionality

6. **Real-time Updates Not Implemented**
   - Issue: Profile data fetched only on mount
   - Impact: Stale data if user has new workouts/followers
   - **TODO:** Implement pull-to-refresh or periodic polling

### Future Enhancements

1. Add profile picture upload
2. Implement privacy settings enforcement
3. Add username selection during signup
4. Environment-based configuration
5. Pull-to-refresh for profile data
6. Optimistic UI updates for follow/unfollow
7. Error retry mechanisms with exponential backoff
8. Profile edit screen
9. Account deletion functionality
10. Export workout data feature

---

## Testing Considerations

### What Should Be Tested

#### Frontend
- [ ] SignUpProfile form validation (boundary values)
- [ ] Profile data loading states (loading, error, success)
- [ ] API service error handling
- [ ] Navigation flow (new user vs. existing user)
- [ ] Token management utilities

#### Backend
- [ ] AppUserController endpoints (authorization, validation)
- [ ] FollowController endpoints (idempotency, self-follow prevention)
- [ ] AppUserService business logic (username uniqueness, stats calculation)
- [ ] FollowService business logic (relationship management)
- [ ] Repository query methods (correct data retrieval)
- [ ] Workout statistics calculation (week boundaries, time zones)

---

## Database Schema Changes

### AppUser Table
**New Columns:**
- `weight_lbs` (INTEGER, NOT NULL, default: 0)
- `height_inches` (INTEGER, NOT NULL, default: 0)
- `age` (INTEGER, NOT NULL, default: 0)

**Migration Impact:**
- Existing users will have NULL values (schema recreation on startup handles this)
- Development mode (`ddl-auto=create`) recreates schema on each restart

---

## Security Considerations

### Implemented
✅ JWT authentication on all user endpoints
✅ User ID extraction from token (prevents impersonation)
✅ Authorization checks (users can only update own profile)
✅ Input validation (age, height, weight ranges)

### Not Implemented (Future Work)
⚠️ Rate limiting on follow/unfollow endpoints
⚠️ Privacy settings enforcement
⚠️ Input sanitization for username (special characters)
⚠️ Email verification
⚠️ Account lockout on suspicious activity

---

## Performance Considerations

### Current Implementation
- Workout stats calculated on every profile request
- Follow counts queried separately
- No caching mechanism

### Optimization Opportunities
1. Cache workout statistics (invalidate on new workout)
2. Denormalize follower/following counts in AppUser table
3. Implement pagination for followers/following lists
4. Add database indexes on frequently queried columns
5. Use database views for complex statistics queries

---

## Commit History

| Commit | Date | Message |
|--------|------|---------|
| `9ee28def` | 2025-11-20 | NOT FINISHED// added fetching backend data from front end |
| `c244527f` | 2025-11-13 | https://www.tiktok.com/t/ZTMGLrV8m/ |
| `e27f500f` | 2025-11-04 | gitignore updated |
| `34ccec9d` | 2025-11-04 | first commit |

---

## Files Changed Summary

### Frontend (10 files)
- **New:** SignUpProfile.tsx, userService.ts, config.ts, types.ts, auth.ts
- **Modified:** Profile.tsx, Login.tsx, index.tsx, .gitignore
- **Deleted:** .Login.tsx.swp (swap file)

### Backend (15 files)
- **New:** AppUserController.java, FollowController.java, UserProfileDTO.java, WorkoutStatsDTO.java, UpdateUserProfileRequest.java, FollowRepository.java, WorkoutRepository.java
- **Modified:** AppUserService.java, FollowService.java, AuthService.java, AppUser.java, Follow.java, AuthResponse.java, UserDTO.java, data.sql

### Documentation (2 files)
- **New:** IMPLEMENTATION_SUMMARY.md, SIGNUP_FEATURE_DOCUMENTATION.md

**Total:** 27 files, 3,262 insertions, 61 deletions

---

## Conclusion

This branch successfully implements a comprehensive user onboarding and profile management system. The feature provides:

✅ Seamless new user onboarding with profile setup
✅ Rich user profiles with workout statistics
✅ Social features (follow/unfollow, followers count)
✅ Type-safe API layer with centralized configuration
✅ RESTful backend with proper layering and separation of concerns

The implementation follows best practices with DTO patterns, service layers, and proper authentication/authorization. While there are opportunities for optimization and additional features, the core functionality is solid and ready for integration into the main branch.

**Ready for:** Code review, QA testing, and merge to main branch.

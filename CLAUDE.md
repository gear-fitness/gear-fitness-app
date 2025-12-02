# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gear Fitness is a social fitness application combining workout tracking with social media features. Users can track workouts, view friends' posts and PRs (personal records), and interact with a fitness-focused community.

**Tech Stack:**
- Frontend: React Native (Expo) with TypeScript
- Backend: Spring Boot 3.5.6 (Java 17) with Spring Security
- Database: PostgreSQL 16
- Authentication: JWT + Google OAuth2

## Development Setup

### Backend

The backend is a Spring Boot application using Gradle.

**Prerequisites:**
- Java 17
- Docker (for PostgreSQL)

**Start the database:**
```bash
cd backend
docker-compose up -d
```

**Run the backend:**
```bash
cd backend
./gradlew bootRun
```
On Windows: `.\gradlew.bat bootRun`

**Run backend tests:**
```bash
cd backend
./gradlew test
```

**Database connection:**
- URL: `jdbc:postgresql://localhost:5432/mydb`
- User: `myuser`
- Password: `mypassword`
- DDL Mode: `create` (recreates schema on startup - configured in `application.properties`)

### Frontend

The frontend is a React Native application using Expo with development builds.

**Install dependencies:**
```bash
cd frontend
npm install
```

**Start development server:**
```bash
cd frontend
npm start
```

**Run on specific platform:**
```bash
npm run ios       # iOS simulator
npm run android   # Android emulator
npm run web       # Web browser
```

**Note:** This project uses Expo development builds and cannot run with Expo Go. The `ios` and `android` folders are gitignored and auto-generated via Continuous Native Generation.

## Architecture

### Backend Architecture

**Package Structure:** `com.gearfitness.gear_api`

The backend follows a layered architecture:

1. **Entity Layer** (`entity/`): JPA entities with Lombok annotations
   - `AppUser`: Core user entity with UUID primary key, includes relationships to workouts, posts, likes, comments, and follow relationships
   - `Workout`, `WorkoutExercise`, `WorkoutSet`: Workout tracking hierarchy
   - `Exercise`: Exercise definitions
   - `Post`, `PostComment`, `PostLike`: Social features
   - `Follow`: User following relationships (follower/followee pattern)

2. **Repository Layer** (`repository/`): Spring Data JPA repositories
   - Currently only `AppUserRepository` exists; others need implementation

3. **Service Layer** (`service/`): Business logic
   - Services exist for all entities but may be skeleton implementations
   - `AuthService`: Handles Google OAuth2 authentication and JWT token generation
   - `AppUserService`: User management

4. **Controller Layer** (`controller/`): REST API endpoints
   - `AuthController`: `/api/auth/**` - Authentication endpoints (public)
   - Other controllers for workouts, posts, follows, etc.

5. **Security** (`security/`, `config/`):
   - `JwtAuthenticationFilter`: Validates JWT tokens on each request
   - `JwtService`: Creates and validates JWT tokens
   - `GoogleTokenVerifier`: Verifies Google OAuth2 tokens
   - `SecurityConfig`: Configures Spring Security with stateless sessions
   - All endpoints require authentication except `/api/auth/**` and `/api/public/**`
   - CORS enabled for configured origins

**Key Configuration:**
- JWT secret and expiration configured in `application.properties`
- Google OAuth2 client ID configured for authentication
- CORS allows `localhost:3000` and `localhost:5173`

### Frontend Architecture

**Navigation Structure:**

The app uses React Navigation with a two-level hierarchy:

1. **Root Stack** (`RootStack`): Top-level navigation
   - `Login`: Initial login screen (Google Sign-In)
   - `HomeTabs`: Main app tabs (nested navigator)
   - `Profile`: User profile screen (supports deep linking via `@username`)
   - `Settings`: App settings
   - `PR`: Personal records view
   - `DetailedHistory`: Detailed workout history
   - `ExerciseSelect`: Modal for selecting exercises
   - `NotFound`: 404 page

2. **Bottom Tabs** (`HomeTabs`): Main app navigation
   - `Home`: Home feed
   - `Social`: Social/community feed
   - `Workouts`: Active workout tracking
   - `History`: Workout history calendar
   - `Profile`: User profile

**Key Features:**
- Google Sign-In configured in `App.tsx` with iOS client ID
- Theme support (light/dark) based on system appearance
- Deep linking enabled with custom URL scheme
- Tab bar icons use custom image assets from `src/assets/`

**Directory Structure:**
- `src/navigation/`: Navigation configuration and screen components
- `src/navigation/screens/`: Individual screen components
- `src/assets/`: Image assets for icons

### Data Flow

**Authentication Flow:**
1. Frontend: User signs in with Google → obtains Google ID token
2. Frontend → Backend: Sends Google token to `/api/auth/google-login`
3. Backend: Verifies token with Google, creates/finds user, generates JWT
4. Backend → Frontend: Returns JWT and user data
5. Frontend: Stores JWT, includes in Authorization header for subsequent requests
6. Backend: `JwtAuthenticationFilter` validates JWT on protected endpoints

**Entity Relationships:**
- `AppUser` has one-to-many relationships with: `Workout`, `Post`, `PostLike`, `PostComment`
- `AppUser` has self-referential many-to-many through `Follow` (followers/following)
- `Workout` → `WorkoutExercise` → `WorkoutSet` (hierarchical workout structure)
- `Exercise` is referenced by `WorkoutExercise`

## Important Notes

- The backend uses Lombok annotations (`@Data`, `@Builder`, etc.) - ensure Lombok is properly configured in your IDE
- Database schema is recreated on each backend startup (`spring.jpa.hibernate.ddl-auto=create`)
- Frontend iOS/Android folders are auto-generated - use config plugins for native modifications
- Many service/repository implementations are skeletal and may need completion
- Google OAuth client IDs in code are for development - should be environment-specific in production

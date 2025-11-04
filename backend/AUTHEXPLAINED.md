# Authentication System Documentation

**Date:** October 31st, 2025

---

## Overview

This app uses **Google OAuth 2.0** for user authentication, combined with **JWT tokens** for session management. The backend is Spring Boot with Spring Security, and the frontend is React Native with Expo.

## Complete Authentication Flow

### 1. Login Process

```
User taps "Sign in with Google"
    ↓
Google OAuth dialog opens
    ↓
User authenticates with Google
    ↓
Google returns idToken
    ↓
Frontend sends idToken to your backend
    ↓
Backend validates & creates/finds user
    ↓
Backend generates JWT token (24hr expiry)
    ↓
Frontend stores JWT in AsyncStorage
    ↓
User navigates to main app
```

**Frontend Implementation:** `frontend/src/navigation/screens/Login.tsx`

### 2. Backend Components

#### Authentication Endpoint
**File:** `backend/src/main/java/com/gearfitness/controller/AuthController.java`
- `POST /auth/google-signin` - Accepts Google idToken

#### Core Auth Services

1. **AuthService.java** (`backend/src/main/java/com/gearfitness/service/AuthService.java`)
   - Orchestrates the authentication flow
   - Coordinates between Google verification and JWT generation

2. **GoogleTokenVerifier.java** (`backend/src/main/java/com/gearfitness/service/GoogleTokenVerifier.java`)
   - Validates Google idToken with Google's servers
   - Extracts user information from verified token

3. **JwtService.java** (`backend/src/main/java/com/gearfitness/service/JwtService.java`)
   - Generates JWT tokens with user claims
   - Validates JWT tokens and extracts user information

#### Security Layer

1. **SecurityConfig.java** (`backend/src/main/java/com/gearfitness/config/SecurityConfig.java`)
   - Configures Spring Security
   - Sets up stateless session management
   - Defines public vs protected endpoints

2. **JwtAuthenticationFilter.java** (`backend/src/main/java/com/gearfitness/config/JwtAuthenticationFilter.java`)
   - Intercepts every HTTP request
   - Validates JWT tokens from Authorization header
   - Sets Spring Security context

### 3. How Authentication Works Step-by-Step

#### On Login:

1. Frontend obtains idToken from Google OAuth
2. Frontend sends POST to `/auth/google-signin` with `{ "idToken": "..." }`
3. Backend verifies idToken with Google's servers
4. Backend finds existing user OR creates new user in PostgreSQL database
5. Backend generates JWT with claims: `{ userId, email, exp: 24 hours }`
6. Backend returns: `{ "token": "eyJ...", "user": {...} }`
7. Frontend stores token in AsyncStorage

#### On Every API Request:

1. `JwtAuthenticationFilter` intercepts the request
2. Extracts JWT from `Authorization: Bearer <token>` header
3. Validates token signature and expiration
4. Extracts userId from token claims
5. Loads user from database using userId
6. Sets Spring Security context with authenticated user
7. Request proceeds to controller with authenticated context

### 4. Token Details

- **Algorithm**: HMAC-SHA256
- **Lifetime**: 24 hours
- **Claims**:
  - `userId` - Database user ID
  - `email` - User's email address
  - `exp` - Expiration timestamp
- **Secret**: Configured in `application.properties` (`jwt.secret`)

### 5. User Management

**Repository:** `backend/src/main/java/com/gearfitness/repository/AppUserRepository.java`

Users are automatically created on first login:
- **Table**: `app_user`
- **Fields**:
  - `id` - Primary key
  - `googleId` - Google's unique user identifier
  - `email` - User's email from Google
  - `name` - User's display name
  - `profileImageUrl` - User's Google profile picture URL
- **Note**: No passwords stored (Google handles authentication)

## Security Architecture

### Protected By:

1. **Google's OAuth validation** - User must authenticate with Google
2. **JWT signature verification** - Tokens cannot be forged without secret key
3. **Token expiration** - Tokens expire after 24 hours
4. **HTTPS encryption** - In production (recommended)
5. **Spring Security's stateless session management** - No server-side sessions
6. **CORS configuration** - Controls which origins can access the API
7. **Database user verification** - User must exist in database on each request

## Key Configuration Files

### Frontend

- **`frontend/src/App.tsx`** - Google OAuth client ID configuration
- **`frontend/src/navigation/screens/Login.tsx`** - Login screen implementation
- **`frontend/src/navigation/index.tsx`** - Route structure and navigation

### Backend

- **`backend/src/main/resources/application.properties`** - Contains:
  - JWT secret key
  - Google OAuth client IDs
  - Database credentials
  - Token expiration settings

## API Endpoints

### Public Endpoints (No Authentication Required)

- `POST /auth/google-signin` - Google OAuth sign-in

### Protected Endpoints (Require JWT Token)

All other endpoints require valid JWT in Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Critical Issues & Recommendations

### Security Issues

1. **Secrets in source code**
   - JWT secret, Google client IDs, and database credentials are hardcoded
   - **Fix**: Move to environment variables

2. **No token refresh mechanism**
   - Users must re-login every 24 hours
   - **Fix**: Implement refresh tokens with longer expiration

3. **No logout functionality**
   - Cannot invalidate compromised tokens
   - **Fix**: Implement token blacklist or use refresh token rotation

4. **Hardcoded backend URL**
   - `http://10.68.67.193:8080` won't work on other networks
   - **Fix**: Use environment-based configuration

5. **Token storage security**
   - AsyncStorage is not encrypted
   - **Fix**: Consider using Expo SecureStore for sensitive data

### Implementation Gaps

1. **Token not fully integrated**
   - Token is stored but not sent with all API requests yet
   - **Fix**: Create API interceptor to attach token to all requests

2. **Error handling**
   - Limited error handling for token expiration
   - **Fix**: Implement automatic logout on token expiration

## Testing the Authentication

### Backend Testing

```bash
# Start the backend server
cd backend
./mvnw spring-boot:run

# Test the auth endpoint (requires valid Google idToken)
curl -X POST http://localhost:8080/auth/google-signin \
  -H "Content-Type: application/json" \
  -d '{"idToken": "YOUR_GOOGLE_ID_TOKEN"}'

# Test a protected endpoint
curl http://localhost:8080/api/some-endpoint \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Frontend Testing

1. Run the Expo app
2. Tap "Sign in with Google"
3. Authenticate with Google account
4. Check AsyncStorage for stored token
5. Verify navigation to main app

## Future Enhancements

1. **Refresh Token Implementation**
   - Add refresh tokens with 30-day expiration
   - Implement token refresh endpoint
   - Auto-refresh before expiration

2. **Logout Functionality**
   - Add logout endpoint
   - Implement token blacklist (Redis)
   - Clear client-side storage

3. **Multi-Factor Authentication**
   - Add optional 2FA
   - SMS or authenticator app

4. **Session Management**
   - Track active sessions
   - Allow users to revoke sessions
   - Limit concurrent sessions

5. **Security Hardening**
   - Move all secrets to environment variables
   - Implement rate limiting
   - Add request signing
   - Enable security headers (HSTS, CSP, etc.)

---

**Last Updated:** October 31st, 2025

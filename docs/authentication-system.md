# Authentication System Documentation

## Overview

The application uses a centralized authentication system based on Supabase Auth. The authentication state is managed through a singleton service and exposed to components via a React Context.

## Architecture

### Core Components

1. **AuthService (src/services/AuthService.ts)**
   - Singleton service that manages authentication state
   - Handles communication with Supabase Auth
   - Provides methods for sign-in, sign-out, password reset, etc.
   - Maintains user session data and role information
   - Implements state listeners for real-time updates

2. **AuthContext (src/context/NewAuthContext.tsx)**
   - React Context that provides authentication state to components
   - Wraps the AuthService and exposes its functionality through hooks
   - Manages client-specific data loading
   - Provides the `useAuth()` hook for components to access auth state

3. **AuthProtectedRoute (src/components/auth/AuthProtectedRoute.tsx)**
   - Route wrapper that enforces authentication and role-based access control
   - Redirects unauthenticated users to login
   - Supports blocking new clients from accessing certain routes

### Authentication Flow

1. **Initialization**
   - On application load, AuthService initializes and checks for existing sessions
   - It attempts to restore session from localStorage if available
   - Sets up listeners for auth state changes from Supabase

2. **Login Process**
   - User enters credentials in Login.tsx
   - Credentials are passed to AuthService.signIn()
   - On successful authentication:
     - Session is stored in localStorage
     - AuthState is updated to AUTHENTICATED
     - User data and role information is loaded
     - Components are notified via state listeners

3. **Session Management**
   - Sessions are automatically refreshed when needed
   - Token expiration is handled by the AuthService
   - Session data is cached in localStorage for persistence

4. **Logout Process**
   - User triggers logout action
   - AuthService.signOut() is called
   - Session data is cleared from localStorage
   - AuthState is updated to UNAUTHENTICATED
   - Components are notified via state listeners

## State Storage

Authentication state is stored in the following locations:

1. **Memory**
   - AuthService maintains the current state in memory
   - This is the source of truth during the application session

2. **localStorage**
   - Session data is cached in localStorage under the key 'auth_session_cache'
   - This allows for persistence across page reloads
   - Contains minimal user data and tokens

## Debugging Utilities

The system includes several debugging utilities:

1. **authDebugUtils.ts**
   - Provides functions for inspecting auth state
   - Logs detailed information about the current session
   - Validates configuration settings

2. **authTroubleshooter.ts**
   - Comprehensive diagnostics for authentication issues
   - Tests email delivery configuration
   - Checks URL handling for password reset

3. **authMigration.ts**
   - Utilities for migrating from old auth systems
   - Cleans up legacy localStorage keys
   - Provides functions to reset auth state

## Best Practices

When working with the authentication system:

1. Always use the `useAuth()` hook to access authentication state
2. Never directly modify localStorage auth data
3. Use AuthProtectedRoute for securing routes
4. Handle loading states appropriately using the isLoading flag
5. Check authInitialized before making auth-dependent decisions
6. Use the hasRole() method to check user permissions

## Error Handling

The authentication system provides detailed error information:

1. AuthService maintains the last error in memory
2. Errors are propagated through the context
3. Components can access error details via useAuth().authError
4. Login and other auth forms display appropriate error messages

## Migration Notes

The system previously used a dual-context approach with UserContext and NewAuthContext. The application has been migrated to use only NewAuthContext for simplicity and to avoid potential conflicts.
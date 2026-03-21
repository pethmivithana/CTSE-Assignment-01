# User Service - API Endpoints

## Authentication & Authorization

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | No | Register (legacy, no OTP) |
| POST | /auth/register/request-otp | No | Send OTP for registration (email or phone) |
| POST | /auth/register/verify-otp | No | Verify OTP and create account |
| POST | /auth/login | No | Login (JWT + refresh token), rate limited |
| GET | /auth/google | No | Redirect to Google OAuth |
| GET | /auth/google/callback | No | Google OAuth callback |
| POST | /auth/refresh | No | Refresh access token |
| POST | /auth/logout | Yes | Logout (invalidates tokens) |
| POST | /auth/forgot-password | No | Request password reset OTP |
| POST | /auth/reset-password | No | Reset password with OTP |
| PUT | /auth/change-password | Yes | Change password (current required) |
| POST | /auth/reactivate/request-otp | No | Request OTP for reactivating deactivated account |
| POST | /auth/reactivate | No | Reactivate account with OTP |

## Profile Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /users/profile | Yes | Get current user (token verification) |
| GET | /users/profile/full | Yes | Full profile with addresses, preferences |
| PUT | /users/profile | Yes | Update name, phone, email, profilePicture |
| PUT | /users/profile/password | Yes | Change password |
| PUT | /users/profile/picture | Yes | Update profile picture (multipart or JSON URL) |
| GET | /users/profile/sessions | Yes | List active sessions/devices |
| DELETE | /users/profile/sessions/:sessionId | Yes | Revoke a session |

## Addresses

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /users/profile/addresses | Yes | Add address |
| PUT | /users/profile/addresses/:id | Yes | Update address |
| DELETE | /users/profile/addresses/:id | Yes | Delete address |
| PUT | /users/profile/addresses/:id/default | Yes | Set default address |

## User Preferences

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /users/profile/saved-restaurants | Yes | Add saved restaurant |
| DELETE | /users/profile/saved-restaurants/:id | Yes | Remove saved restaurant |
| GET | /users/profile/saved-restaurants | Yes | List saved restaurants |
| POST | /users/profile/favorite-foods | Yes | Add favorite food |
| DELETE | /users/profile/favorite-foods/:id | Yes | Remove favorite food |
| GET | /users/profile/favorite-foods | Yes | List favorite foods |
| PUT | /users/profile/dietary-preferences | Yes | Update dietary preferences |
| GET | /users/profile/dietary-preferences | Yes | Get dietary preferences |

## Account Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PUT | /users/profile/payment-preferences | Yes | Update default payment method |
| POST | /users/profile/deactivate | Yes | Deactivate account (password required) |

## Email Verification

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/verify/request-otp | No | Send email verification OTP |
| POST | /auth/verify/verify-otp | No | Verify OTP |
| POST | /auth/verify/resend | No | Resend verification OTP |

## Security

- **Rate limiting**: Login (5/15min), Register (10/hr), Forgot password (5/hr)
- **Login lockout**: 5 failed attempts → 30 min lock
- **Session tracking**: Device info, IP, user-agent stored per session
- **Role-based access**: Customer, Admin, Delivery Partner (deliveryPerson), Restaurant Owner (restaurantManager)

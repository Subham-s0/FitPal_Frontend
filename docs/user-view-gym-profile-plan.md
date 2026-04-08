# User View Gym Profile: Data Gap and Implementation Plan

## Scope
Align the user-facing gym profile page (`/gym/:id`) with real backend APIs, identify missing data, and define backend additions required for full parity with the intended UI.

## Current State
- Route is wired: `Frontend/src/app/router.tsx` maps `/gym/:id` to `GymProfile`.
- Screen is not API-driven: `Frontend/src/features/gyms/screens/GymProfile.tsx` uses hardcoded `gymData` mock objects.
- Backend profile APIs already exist:
  - `GET /gyms/{gymId}` via `PublicGymController#getGymProfile`
  - `GET /gyms/{gymId}/reviews` via `PublicGymController#getGymReviews`
- Frontend API client and types already exist:
  - `getPublicGymProfileApi`, `getPublicGymReviewsApi` in `Frontend/src/features/gyms/api.ts`
  - `PublicGymProfileResponse`, `PublicGymReviewResponse` in `Frontend/src/features/gyms/model.ts`

## Backend Data Already Supported
From `PublicGymProfileResponse` and reviews endpoint:
- Gym basics: `gymId`, `gymName`, `addressLine`, `city`, `country`, `latitude`, `longitude`
- Business/profile: `description`, `contactEmail`, `websiteUrl`, `logoUrl`
- Open status: `currentlyOpen`, `opensAt`, `closesAt`
- Live capacity metrics: `activeCheckIns`, `maxCapacity`, `occupancyPercent`, `occupancyLabel`
- Reputation: `rating`, `reviewCount`, plus reviews list (`reviewerName`, `rating`, `comments`, `createdAt`)
- Access/check-in: `minimumAccessTier`, `checkInEnabled`
- Gallery: ordered `photos` with `cover`, `caption`, `displayOrder`

## What Must Be Displayed (Using Existing Data)
- Identity and location: `gymName`, `addressLine`, `city`, `country`, map pin (`latitude`, `longitude`)
- Operational status: `currentlyOpen`, `opensAt`, `closesAt`
- Live crowd signal: `activeCheckIns`, `maxCapacity`, `occupancyPercent`, `occupancyLabel`
- Access clarity: `minimumAccessTier`, `checkInEnabled`
- Trust/reputation: `rating`, `reviewCount`, latest reviews from `/gyms/{gymId}/reviews`
- Contact and profile: `description`, `contactEmail`, `websiteUrl`
- Visuals: `logoUrl`, `photos[]` (cover + gallery + captions)

## Gaps: UI vs Backend
### A) Frontend is missing integration (backend supports these already)
- The profile page does not fetch or render backend data even though contract exists.
- No loading, not-found, or API error state handling for `/gyms/{gymId}` and `/gyms/{gymId}/reviews`.
- Time/number formatting is based on mock strings, not backend formats (`opensAt/closesAt` are `HH:mm`).

### B) Mock-only sections to remove or replace
These sections in current `GymProfile.tsx` are not backed by real API data:
- brand / chain labels
- equipment inventory grid
- static peak timeline bars
- global branch switcher

Recommendation:
- Remove these blocks for v1 user profile page.
- Replace with API-backed blocks listed in "What Must Be Displayed".

### C) Useful user-context fields not in current public profile response
For a richer user view experience (save/check-in CTA states on profile page):
- `isSaved` for current user
- `accessibleByCurrentUser` (tier eligibility result)
- optional `distanceMeters` (if client provides lat/lng, or client computes locally)

### D) Existing gym fields that can be exposed without new DB models
These already exist in `Gym` / `GymProfile` entities, but are not in `PublicGymProfileResponse`:
- `phoneNo`
- `postalCode`
- `establishedAt`
- `checkInAccessMode`
- `allowedCheckInRadiusMeters`

## Recommended API Design
Keep `GET /gyms/{gymId}` as neutral profile payload and add a user-context endpoint:
- `GET /users/me/gyms/{gymId}/profile-view`
- Returns public profile + user-specific fields (`isSaved`, `accessibleByCurrentUser`, optional `distanceMeters`)

Reason:
- Avoids mixing personalized fields into a general endpoint.
- Keeps API contracts explicit and easier to cache.

## Implementation Plan
### Phase 1: Replace mock profile with existing APIs (no backend schema change)
1. Refactor `Frontend/src/features/gyms/screens/GymProfile.tsx`:
   - remove hardcoded `gymData`
   - fetch `getPublicGymProfileApi(Number(id))`
   - fetch `getPublicGymReviewsApi(Number(id))`
2. Map backend fields to existing UI sections:
   - gallery from `photos`
   - occupancy card from `activeCheckIns`, `maxCapacity`, `occupancyPercent`, `occupancyLabel`
   - header/details from `gymName`, `description`, `contactEmail`, `websiteUrl`, `opensAt`, `closesAt`, `rating`
3. Add proper states:
   - loading skeleton/spinner
   - 404/empty state for invalid `gymId`
   - API error state with retry
4. Route/auth alignment:
   - since backend endpoint is `isAuthenticated()`, move `/gym/:id` under `ProtectedRoute` unless product wants true public access.

### Phase 2: Add user-context profile view endpoint
1. Backend:
   - add `GET /users/me/gyms/{gymId}/profile-view`
   - compute and return:
     - `isSaved` (from `SavedGymRepository`)
     - `accessibleByCurrentUser` (same tier logic as discovery service)
     - optional `distanceMeters` (if lat/lng query provided)
2. Frontend:
   - switch profile page to new endpoint for authenticated user view
   - wire save/unsave and check-in CTA enablement consistently.

### Phase 3: Improve profile richness using existing gym fields (no new models)
1. Backend response extension (same endpoint, no schema migration):
   - add to `PublicGymProfileResponse`: `phoneNo`, `postalCode`, `establishedAt`, `checkInAccessMode`, `allowedCheckInRadiusMeters`
2. Frontend display improvements:
   - "Visit Info" card: open/close, address, postal code, map/open-directions action
   - "Check-in Rules" card: enabled/disabled, minimum tier, access mode, allowed radius
   - "About Facility" card: description + established year + official contact links
   - "Community Snapshot": rating, review count, latest 3 reviews, "View all reviews" CTA
3. Optional lightweight signal (no new domain model):
   - derive crowd message from `occupancyPercent` and show trend-free real-time status only

## Test Plan
- Backend integration tests:
  - `/gyms/{id}` approved gym returns full payload
  - not-approved/non-existent gym returns 404
  - `/gyms/{id}/reviews` ordering and null-safe reviewer names
  - new `/users/me/gyms/{id}/profile-view` returns correct user-context fields
- Frontend tests:
  - route `/gym/:id` loads API data (no mock fallback)
  - loading/error/not-found states render correctly
  - save/check-in CTA state reflects backend fields
  - photos, reviews, occupancy, and check-in-rule cards map correctly from API response

## Delivery Order
1. Phase 1 first (fastest path to real data and immediate correctness).
2. Phase 2 second (user-specific CTA correctness).
3. Phase 3 last (new domain/data-model work).

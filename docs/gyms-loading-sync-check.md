# Gyms Loading and Sync Check

Last updated: 2026-04-15

## Purpose
This document records the recent loading-state fixes in the Find Gyms flow and the current frontend/backend connectivity status.

## Files In Scope
- src/features/gyms/screens/GymsScreen.tsx
- src/features/gyms/components/GymsSidebarRail.tsx
- src/features/gyms/hooks/useGymsRecommendation.ts

## Loading State Behavior

### Mobile (Find Gyms bottom card rail)
- While discover data is loading and no gym cards are available yet, a single skeleton gym card is shown.
- If loading is complete and no gyms match filters/search, a status card is shown:
  - "No gyms found." for general search/filter empty results.
  - "No saved gyms yet." for saved-only mode with no saved gyms.
- Gym cards render normally once data is available.

### Desktop (left sidebar rail)
- While discover data is loading, a desktop loading card is shown in the rail.
- The empty-state message appears only after loading completes and total result count is zero.
- Pagination controls remain shown only when total pages are greater than 1.

## Frontend and Backend Sync Notes

### Frontend proxy and API base
- Vite proxy sends /api requests to the configured backend target.
- If backend is not reachable, frontend shows ECONNREFUSED proxy errors.

### Meaning of ECONNREFUSED
This is a connectivity/runtime issue, not a frontend syntax issue. It means the backend service is not currently reachable at the configured host/port.

## Quick Verification Steps
1. Start backend service and confirm its port is listening.
2. Start frontend with npm run dev.
3. Open Find Gyms on desktop and mobile viewport.
4. Verify:
   - Loading card appears first.
   - No-results card appears only after loading completes with empty result.
   - Normal gym cards appear when data exists.

## Expected Outcome
- No parser errors in GymsSidebarRail.tsx.
- Predictable loading and empty-state UX on both desktop and mobile.
- API proxy errors only when backend is down or not reachable.

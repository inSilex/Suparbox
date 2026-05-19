# Project Structure: Suparbox

Suparbox is a web-based client for the Arbox scheduling service, allowing users to view weekly schedules, manage bookings, and sync classes with Google Calendar.

## Tech Stack
- **Frontend**: React (v19), TypeScript, Vite (rolldown)
- **Styling**: CSS Modules (`*.module.css`)
- **API**: Custom fetch-based client for Arbox and Google Calendar
- **Persistence**: IndexedDB (sync mappings, tokens), localStorage (auth tokens, seen messages)

---

## Directory Overview

### 1. `src/` (Core Web Application)
The main source code for the frontend application.

#### `api/`
Handles communication with external services.
- `arbox.ts`: Comprehensive API client for Arbox. Includes type definitions for profiles, memberships, lessons, bookings, and feed items.
- `googleCalendar.ts`: Client for interacting with the Google Calendar API (events, calendars).
- `pkce.ts`: Utility for Proof Key for Code Exchange (PKCE) authentication flow.

#### `assets/`
Static assets like images and SVGs used in the UI.
- `vite.svg`, `typescript.svg`, `hero.png`.

#### `hooks/`
Custom React hooks for shared logic.
- `useAuth.ts`: Authentication state management, profile/membership/location fetching, boot sequence with retry logic.
- `useBookings.ts`: Logic for fetching and managing user classes/bookings.
- `useFeed.ts`: Logic for fetching news feed items (box messages).
- `useInvitations.ts`: Logic for accepting/dismissing schedule invitations from friends.
- `useSync.ts`: Google Calendar OAuth flow, sync status management, per-lesson sync/unsync operations.

#### `services/`
Contains business logic and state persistence that sits between the API and UI.
- `calendarSyncService.ts`: Reconciles Arbox lessons with Google Calendar events — creates, updates, and deletes calendar entries.
- `syncStorage.ts`: IndexedDB-based management of sync mappings (Arbox lesson ID → Google event ID), Google OAuth tokens, calendar IDs, and cancelled lesson tracking.

#### `styles/`
Modular CSS files used throughout the application.
- `global.css`: Global CSS variables, dark mode support, base typography.
- `layout.module.css`: Topbar, navigation buttons, dropdowns, profile display.
- `components.module.css`: Reusable button variants (join, leave, waitlist, invite, subscribe), card styles, input fields, error boxes, spinners.
- `weekly_schedule.module.css`: Desktop week grid, day columns, lesson rows, friend avatars, mobile day picker and selected-day card.
- `bookings.module.css`: Bookings page layout, booking cards, sync section controls, status indicators.
- `announcement.module.css`: Announcement banner with invitations and news items.
- `tabs.module.css`: Tab bar styling for schedule/bookings navigation.
- `modal.module.css`: Friend invite modal and sync error modal overlays.
- `loading.module.css`: Full-screen loading overlay with progress bar and branding.

#### `ui/`
The React presentation layer.
- `App.tsx`: The root component. Wraps the app in an ErrorProvider context, manages global state (user profile, memberships, tokens), and handles main routing/tab switching.
- `WeeklySchedulePage.tsx`: Primary interface for viewing and interacting with the weekly class schedule. Desktop grid view and mobile day-picker view with swipe support. Includes subscribe/unsubscribe, join/leave standby, and friend invite flows with context-aware error handling.
- `BookingsPage.tsx`: Displays current and past bookings with Google Calendar sync controls (connect, disconnect, manual sync, sync-on-launch toggle). Shows unsubscribe errors with context-specific messages.
- `LoginPage.tsx`: Arbox authentication with MFA code flow, password mode fallback, and rate-limit backoff UI.
- `MenuBar.tsx`: Top navigation bar with membership/location dropdowns and logout button.
- `AppTabBar.tsx`: Sticky tab bar below the MenuBar for switching between Schedule and Bookings tabs.
- `AnnouncementBanner.tsx`: Horizontal banner showing friend schedule invitations and club news messages at a glance.
- `ErrorDisplay.tsx`: Simple error message component used on the login page for startup errors.
- `AppErrorDisplay.tsx`: Context-aware error display system using React Context. Provides `useAppError()` hook for components to report errors, and `AppErrorDisplay` component that renders dismissible notifications with context labels (e.g., `[Join "Yoga"]`). Includes `createErrorHandler()` utility for consistent API error parsing across the app.
- `FriendInviteModal.tsx`: Modal for inviting friends to booked sessions, rendered via React Portal.
- `SyncErrorModal.tsx`: Modal displayed when Google Calendar sync fails, showing lesson details and raw error.
- `LoadingOverlay.tsx`: Full-screen loading indicator with progress bar and step labels during boot.
- `WeekUtils.ts`: Date helpers for week calculations (start of week, add days, ISO date keys).
- `storage.ts`: localStorage utilities for auth tokens, login lockout state, and seen message IDs.

#### `main.tsx`
The entry point of the application — renders `<App />` into the `#root` DOM node.

### 2. `public/`
Static assets served directly (e.g., `logo.png`, `logo.ico`). The index HTML also loads Google's GSI client script for OAuth.

---

## Key Workflows

1. **Authentication**: `LoginPage.tsx` handles login via MFA or password mode using the Arbox API (`arbox.ts`) and PKCE flow. Tokens are persisted in localStorage via `storage.ts`. Rate-limit backoff prevents brute-force attempts.
2. **Boot Sequence**: `useAuth.ts` loads tokens, fetches profile/memberships/locations, retrieves feed data (news + invitations), and sets up the app shell. A 5-second fallback timeout ensures the UI never gets stuck loading. Startup errors are displayed via `ErrorDisplay.tsx`.
3. **Schedule Viewing**: `WeeklySchedulePage.tsx` fetches lessons for the current week via `arbox.ts`, filters by membership visibility, and renders a desktop grid or mobile day view. Users can subscribe, join standby, leave, or invite friends — all with context-aware error handling.
4. **Calendar Sync**: `useSync.ts` orchestrates Google OAuth 2.0 PKCE flow. Once connected, `calendarSyncService.ts` reconciles Arbox lessons with Google Calendar events via `googleCalendar.ts`, storing mappings in IndexedDB through `syncStorage.ts`. Past lesson events are automatically deleted.
5. **Invitations**: Friend schedule invitations arrive through the feed API and are displayed in `AnnouncementBanner.tsx` and on the feed page. Users can accept (subscribing them to the lesson) or dismiss them via `useInvitations.ts`.

## Error Handling System

The app uses a React Context-based error system (`AppErrorDisplay.tsx`) that provides context-aware, user-friendly messages for all Arbox backend communication errors:

- **`ErrorProvider`**: Wraps the app and manages global error state.
- **`useAppError()`**: Hook that components call to report errors with an optional context label (e.g., `showError('Failed', 'Join "Yoga"')`).
- **`AppErrorDisplay`**: Renders dismissible error notifications with context labels in the page header.

### Error Message Logic

When an API call fails, the system parses the response and displays appropriate messages:

| Condition | User-Facing Message |
|-----------|-------------------|
| HTTP 401/403 | "Authentication expired. Please log in again." |
| HTTP 429 | "Too many requests. Please wait a moment and try again." |
| Backend `messageToUser` array | First item's message text |
| Backend `messageToUser` string | The message directly |
| Other API error body | Parsed from response or generic fallback |

This applies to all user actions: subscribing/unsubscribing, joining/leaving waitlists, Google Calendar sync, and friend invitations. Each error is tagged with a context label (e.g., `[Join "Yoga"]`, `Leave "Kickboxing"`) so users know which action triggered the error.

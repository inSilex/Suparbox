# Suparbox Web

An application for managing Arbox schedules and syncing with Google Calendar.

[Live Site: https://suparbox.pages.dev/](https://suparbox.pages.dev/)

## Features

- **Weekly Schedule**: View your upcoming classes, join waitlists, and manage bookings across a responsive grid or mobile day view.
- **Google Calendar Sync**: Automatically sync your Arbox lessons with Google Calendar using OAuth 2.0 PKCE flow.
- **Announcements & Invitations**: See club news and friend schedule invitations in the top banner and on the feed page.
- **Authentication**: Secure login using the Arbox PKCE flow with MFA support and rate-limit backoff.
- **Context-Aware Error Handling**: All API communication errors display user-friendly, context-specific messages (e.g., authentication expiry, rate limits, backend validation errors) with dismissible notifications.
- **Friend Invites**: Invite friends to join your booked sessions via a modal picker.

## Tech Stack

- **Frontend**: React (v19), TypeScript, Vite (rolldown)
- **Styling**: CSS Modules (`*.module.css`)
- **Persistence**: IndexedDB (sync mappings, Google tokens), localStorage (auth tokens, seen messages)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)

### Installation

1. Clone the repository (if applicable).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Google OAuth credentials:
   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   VITE_GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### Development

To start the development server:

```bash
npm run dev
```


## License

This project is licensed under the
Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0).

See the LICENSE file for details.


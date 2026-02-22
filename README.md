# ConverX - Currency Converter

ConverX is an Expo Router app for live currency conversion with strong offline behavior, local history, and notification-driven tracking tools (rate alerts, pinned daily pair updates, and retention reminders).

Package metadata:
- `package.json` name: `converx_app`
- App display name (from `app.config.ts`): `ConverX - Currency Converter`

## Current App Features

### Conversion core (`src/app/index.tsx`)
- Multi-currency converter with `2-5` active rows.
- Default pair starts at `USD/KES` (`src/constants/currencyConverter.ts`).
- Expression keypad supports arithmetic input (`+`, `-`, `*`, `/`, `%`, `=`) with sanitization and safe evaluation (`src/utils/currencyConverterUtils.ts`).
- Tap a row to make it active, long press value to copy, swipe row to remove or favorite.
- Quick swap is available when exactly two currencies are selected.
- Share support for conversion results and app link.

### Currency data + offline caching (`src/services/currencyService.ts`)
- Provider: ExchangeRate-API v6 (`https://v6.exchangerate-api.com/v6`).
- Fetches:
  - Currency code list (`/codes`)
  - Global rates relative to `USD` (`/latest/USD`)
- Daily fetch policy:
  - At most one network sync per local calendar day.
  - Falls back to cached MMKV data when offline or provider fails.
- In-memory cache + MMKV cache + request de-duplication for in-flight fetches.
- Retries with exponential backoff (`3` retries).

### Notifications

#### 1) Rate alerts (`src/app/rate-alerts.tsx`, `src/services/rateAlertNotificationService.ts`)
- User creates alert for pair + target + condition (`atOrAbove` or `atOrBelow`).
- Manual check now + automatic background checks.
- Android notification channel: `rate-alerts`.
- Background task:
  - Task name: `rate-alerts-background-check`
  - Minimum interval: `60` minutes.
- Alerts auto-disable after trigger to prevent duplicate alerts.

#### 2) Pinned daily pair notification (`src/app/pinned-rate-notification.tsx`, `src/services/pinnedRateNotificationService.ts`)
- Tracks one pair and amount in a sticky notification.
- Stores latest rate snapshot and trend direction (`up/down/flat`).
- User configures refresh time (hour/minute, local time).
- Android notification channel: `pinned-rate-updates`.
- Background task:
  - Task name: `pinned-rate-daily-refresh`
  - Minimum interval: `24` hours.

#### 3) Retention reminders (`src/services/retentionReminderService.ts`)
- Schedules reminder sequence when user has not checked currencies recently.
- Reminder stages after last activity: `30h`, `78h`, `174h`.
- Android notification channel: `retention-reminders`.
- Suppressed when pinned-rate notification is enabled.

### History (`src/app/history.tsx`)
- Conversion history stored locally in MMKV.
- Automatic retention cleanup: entries older than `3` days are removed.
- Manual clear history action is available.

### Settings + support
- Theme mode: `system`, `dark`, `light` (`src/context/ThemeContext.tsx`).
- Help screen stores user submissions locally and sends feedback to Sentry (`src/app/help.tsx`).
- Optional WhatsApp handoff for support reports.
- Settings includes links for privacy/terms and store rating flow.

### Observability + analytics
- Sentry initialized at app startup and wrapped around root layout (`src/app/_layout.tsx`, `sentry.config.ts`).
- Expo Updates metadata attached to Sentry scope (`src/utils/expoUpdateMetadata.ts`).
- Vexo analytics initialized from env key (`src/app/_layout.tsx`).

## Routes (Expo Router)

- `/` -> converter (`src/app/index.tsx`)
- `/settings` (`src/app/settings.tsx`)
- `/history` (`src/app/history.tsx`)
- `/rate-alerts` (`src/app/rate-alerts.tsx`)
- `/pinned-rate-notification` (`src/app/pinned-rate-notification.tsx`)
- `/help` (`src/app/help.tsx`)

## App Identity and Deep Links

From `app.config.ts`:
- Owner: `mohhussbit`
- Slug: `converx`
- Version: `1.0.0`
- EAS project ID: `7269c1c1-fbc7-48c5-8aa2-ca72cb9ba322`
- Preview/production scheme: `converx`
- Development scheme: `converx-dev`
- Preview/production bundle ID and Android package: `com.mohhussbit.converx`
- Development bundle ID/package suffix: `.dev`

In-app sharing currently uses web URL: `https://converx.expo.app`.

Converter route reads optional URL params:
- `fromCurrency`
- `toCurrency`
- `amount`

## Screenshots

|                                                |                                                    |                                           |
| ---------------------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| ![Initial](assets/screenshots/image1.png)      | ![Modal](assets/screenshots/image2.png)            | ![History](assets/screenshots/image3.png) |
| ![No Currency](assets/screenshots/image4.png)  | ![No Currency Dark](assets/screenshots/image5.png) |                                           |

## Tech Stack (Current in `package.json`)

- Expo `^55.0.0-preview.11`
- React Native `0.83.2`
- React `19.2.0`
- Expo Router `~55.0.0-preview.8`
- TypeScript `~5.9.2` (strict mode)
- react-native-reanimated `~4.2.1`
- react-native-mmkv `^4.1.2`
- expo-notifications `~55.0.7`
- expo-background-task `~55.0.6`
- expo-task-manager `~55.0.6`
- @legendapp/list `^2.0.19`
- @sentry/react-native `~7.11.0`
- vexo-analytics `^1.5.1`

## Project Structure

```text
.
|-- app.config.ts
|-- eas.json
|-- src
|   |-- app
|   |   |-- _layout.tsx
|   |   |-- index.tsx
|   |   |-- settings.tsx
|   |   |-- history.tsx
|   |   |-- help.tsx
|   |   |-- rate-alerts.tsx
|   |   `-- pinned-rate-notification.tsx
|   |-- components
|   |-- constants
|   |-- context
|   |-- hooks
|   |-- services
|   |-- store
|   |-- styles
|   `-- utils
|-- plugins
|   |-- customize.js
|   `-- scrollbar-color.js
`-- assets
```

## Setup

### Prerequisites

- Node.js 20+ (recommended with current Expo SDK)
- Bun (project uses `bun.lock`)
- Android Studio for Android builds
- Xcode for iOS builds (macOS only)

### Install

```bash
bun install
```

### Run Locally

```bash
# Start Metro + Expo dev tools
bun run start

# Or launch directly on a platform
bun run android
bun run ios
```

### Environment Variables

Create `.env.local` in the project root.

```bash
# App config environment
APP_ENV=preview

# Required for live currency API fetches
EXPO_PUBLIC_EXCHANGERATE_API_KEY=your_exchangerate_api_key

# Optional legacy fallback keys still accepted by code
EXPO_PUBLIC_RATES_API_KEY=your_exchangerate_api_key
EXPO_PUBLIC_RATES_API_URL=your_exchangerate_api_key

# Optional analytics / UX integrations
EXPO_PUBLIC_VEXO_API_KEY=your_vexo_key
EXPO_PUBLIC_APP_STORE_ID=your_ios_app_store_id
EXPO_PUBLIC_SUPPORT_WHATSAPP_NUMBER=your_whatsapp_number

# Optional build-time Sentry auth (for CI/release tooling)
SENTRY_AUTH_TOKEN=your_sentry_auth_token
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
```

Notes:
- `APP_ENV` supports `development`, `preview`, `production` (`app.config.ts`).
- If `EXPO_PUBLIC_EXCHANGERATE_API_KEY` is missing, live fetches fail and app relies on existing cached data.
- `EXPO_PUBLIC_APP_STORE_ID` is only used for iOS "Rate App".
- `EXPO_PUBLIC_SUPPORT_WHATSAPP_NUMBER` enables WhatsApp submit flow in Help screen.

## Scripts

- `bun run start` -> Expo dev server
- `bun run offline` -> Expo dev server in offline mode
- `bun run android` -> run Android debug build on device/emulator
- `bun run ios` -> run iOS build
- `bun run release:android` -> Android release variant
- `bun run release:ios` -> iOS release configuration
- `bun run build:android` -> EAS Android preview build
- `bun run build:web` -> export web build
- `bun run release:web` -> `eas deploy --prod`
- `bun run publish:expo` -> OTA update to preview branch
- `bun run lint` -> ESLint + Prettier check
- `bun run format` -> ESLint fix + Prettier write
- `bun run test` -> Jest watch mode (no committed test files currently)
- `bun run analyze:web` -> source-map-explorer for web bundle
- `bun run analyze:ios` -> source-map-explorer for iOS bundle
- `bun run analyze:android` -> source-map-explorer for Android bundle
- `bun run upgrade` -> bump Expo + run `expo install --fix`

## EAS Build/Update Configuration

From `eas.json`:
- `development` profile -> internal dev client, channel `development`
- `preview` profile -> internal distribution, channel `preview`
- `production` profile -> channel `production`

Runtime settings from `app.config.ts`:
- Dynamic app identity based on `APP_ENV`
- `expo-updates` URL configured with EAS project ID
- Runtime version policy: `appVersion`
- Includes plugins for splash screen, edge-to-edge, build properties, Sentry, notifications, router, background task, and font.

## Local Persistence (MMKV)

Implemented in `src/store/storage.ts` using `react-native-mmkv`.
Common keys used by the app:
- `currencies`, `exchangeRates`, `lastCurrenciesFetch`, `lastExchangeRatesFetch`
- `selectedCurrencyCodes`, `activeCurrencyCode`, `lastFromCurrency`, `lastToCurrency`, `lastAmount`
- `conversionHistory`, `lastConvertedAmount`
- `favoriteCurrencyCodes`, `recentCurrencyCodes`
- `theme`
- `rateAlerts`
- `pinnedRateNotificationConfig`
- `retentionReminderState`, `retentionReminderPermissionPrompted`
- `userFeedbacks`
- `widgetPreferences` (service exists; currently not wired to UI)

## Platform Notes

- Web:
  - Converter, settings, history, and help work.
  - Notification features that depend on native background scheduling are limited or unavailable.
- Android/iOS:
  - Full notifications support (permission-dependent).
  - Background tasks are "best effort" and OS-controlled.

## CI Workflows Present in Repo

`.github/workflows` currently includes:
- `update-deps.yml`
- `version-management.yml`

These workflows reference additional CI secrets (`EXPO_TOKEN`, backend URLs, etc.) that are not required for local app runtime.

## License

[MIT](LICENSE)

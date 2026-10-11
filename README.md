# PlayTracker

Offline tracker for a game house: count games played on each PlayStation station (one PS + one TV) and time scooter rentals. All data stays on the device in SQLite. There is no backend.

## Stack

| Area | Choice |
| --- | --- |
| Framework | Expo SDK 57, React Native 0.86, React 19 |
| Navigation | Expo Router (file-based, bottom tabs) |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) |
| Styling | NativeWind 4 + Tailwind CSS 3 |
| Storage | `expo-sqlite` (local, offline) |
| Data | TanStack Query (cache + optimistic updates over SQLite) |
| Lists | FlashList v2 (virtualized, recycled rows) |
| Font | Plus Jakarta Sans |
| Tests | Jest (`jest-expo`) + React Native Testing Library 14, `sql.js` for DB tests |

## Getting started

```bash
npm install
npx expo start          # press a (Android) / i (iOS), or scan with Expo Go
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Metro dev server |
| `npm test` | Run the Jest suite once |
| `npm run test:watch` | Jest in watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint via `expo lint` |

## Builds (EAS)

The app is linked to the EAS project `flo-titan/playtracker` (`extra.eas.projectId` in `app.json`).

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview   # installable .apk
```

Two apps from one project (`app.config.js` switches on `APP_VARIANT`), so both can be installed at once:

| Profile | App | Android id | Use |
| --- | --- | --- | --- |
| `development` | PlayTracker Dev (slate/amber icon) | `com.flotitan.playtracker.dev` | Connects to `npx expo start`; changes show instantly |
| `preview` | PlayTracker (violet/cyan icon) | `com.flotitan.playtracker` | Standalone APK, full speed |
| `production` | PlayTracker | `com.flotitan.playtracker` | Play Store AAB |

`npx expo start` serves the dev app by default. Rebuild the development app only when a native library is added.

## Project structure

```
src/
  app/                    # Expo Router routes (screens only)
    _layout.tsx           # Fonts, theme, SQLite + migrations, TanStack Query, stack
    index.tsx             # Landing: pick PS or Scooters
    ps.tsx                # PS (stations)
    scooters.tsx          # Scooters
  components/
    ui/                   # PressableScale, Button, IconButton, Sheet, StatTile, ...
    gaming/               # ZoneCard, ZoneEditSheet
    scooters/             # ScooterCard, PresetBubbles, TimerProgress, ScooterEditSheet
    __tests__/            # Component tests
  db/
    schema.ts             # Tables, migrations (PRAGMA user_version), seed data
    zonesRepo.ts          # Game counting queries
    scootersRepo.ts       # Scooter session queries
    types.ts              # Database interface + row types
    __tests__/            # Repository tests (real SQL on sql.js)
  hooks/                  # useZones, useScooters, useNow, useGridColumns, ...
  lib/                    # Pure logic: timer, gaming summaries, grid, time formatting
  test/                   # Test-only helpers (sql.js adapter)
  theme/palette.js        # Color tokens shared by Tailwind and components
```

## How it works

**Navigation**: the app opens on a landing screen with two cards, **PS** and **Scooters**, each showing today's numbers. Tap one to open it; the back arrow (or Android back) returns to the landing screen. Each screen header has a light/dark toggle, saved on the device.

**Speed**: every action updates TanStack Query's cache on the same frame as the tap and writes to SQLite in the background (if a write fails, the screen re-reads from SQLite). Lists use FlashList, and React Compiler memoizes components.

**Collapsing**: every card collapses to a single row (count and +1, or live time and Start/End). The list header has Collapse/Expand all. Collapsed state is remembered per card.

**PS**: each station is one PS + TV. Tapping a card (or its `+1` button) logs a game (a row in `game_plays` tagged with the current title and the local day), so "today" counts reset at midnight on their own and history is kept. Each card has undo and reset right on it, and **Reset day** above the list clears every station at once.

Players are optional: add names to a station and each one gets its own `−`/`+` counter. The station total is the sum of all players plus any games not credited to a player. Removing a player keeps their games on the station total. Long-press or `…` opens the editor: rename, game title, players, undo, reset, delete.

**Scooters**: the `+15m / +30m / +60m` bubbles stack minutes, either before a ride (pre-booking) or during one (extending). Start stamps the current time. With minutes booked the timer counts down. With none it counts up. Card states:

| State | When | Color |
| --- | --- | --- |
| Idle | Not running | Gray |
| Riding | Running, time left | Neon green |
| Ending soon | Last 5 min, or last 20% of short rides | Amber |
| Overtime | Past the booked time | Red, shows `+M:SS` |

Start and end times use the phone's own time zone and 12/24-hour setting. Ending a ride saves it to `scooter_sessions` and feeds the daily ride count and billed minutes (rounded up to the next minute). The reset button on a card cancels a ride without saving it, and **Reset day** cancels all rides and clears today's ride history.

## Web

Native targets are the priority. `expo-sqlite` on web also needs `Cross-Origin-Embedder-Policy: credentialless` and `Cross-Origin-Opener-Policy: same-origin` headers on the host.

# PlayTracker

Offline tracker for a game zone house: count games played on each PlayStation/TV section and time scooter rentals. All data stays on the device in SQLite. There is no backend.

## Stack

| Area | Choice |
| --- | --- |
| Framework | Expo SDK 57, React Native 0.86, React 19 |
| Navigation | Expo Router (file-based, bottom tabs) |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) |
| Styling | NativeWind 4 + Tailwind CSS 3 |
| Storage | `expo-sqlite` (local, offline) |
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
npx eas-cli@latest build:configure     # creates eas.json the first time
npx eas-cli@latest build --platform android --profile preview
```

## Project structure

```
src/
  app/                    # Expo Router routes (screens only)
    _layout.tsx           # SQLiteProvider + migrations, root stack
    (tabs)/
      _layout.tsx         # Bottom tab bar
      index.tsx           # Gaming Zones
      scooters.tsx        # Scooters
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

**Gaming Zones**: each section is one PS + TV. Tapping a card logs a game (a row in `game_plays` tagged with the current title and the local day), so "today" counts reset at midnight on their own and history is kept. Long-press or the `…` button opens the editor: rename, set the game title, undo the last tap, reset today, or delete the section.

**Scooters**: the `+15m / +30m / +60m` bubbles stack minutes, either before a ride (pre-booking) or during one (extending). Start stamps the current time. With minutes booked the timer counts down. With none it counts up. Card states:

| State | When | Color |
| --- | --- | --- |
| Idle | Not running | Gray |
| Riding | Running, time left | Neon green |
| Ending soon | Last 5 min, or last 20% of short rides | Amber |
| Overtime | Past the booked time | Red, shows `+M:SS` |

Ending a ride saves it to `scooter_sessions` and feeds the daily ride count and billed minutes (rounded up to the next minute).

## Web

Native targets are the priority. `expo-sqlite` on web also needs `Cross-Origin-Embedder-Policy: credentialless` and `Cross-Origin-Opener-Policy: same-origin` headers on the host.

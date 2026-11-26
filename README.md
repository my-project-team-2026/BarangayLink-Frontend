# BarangayLink Frontend

Frontend applications for **BarangayLink: Digital Barangay Management System**. One codebase family, three clients that talk to the same backend API:

| Folder | App | Stack |
| --- | --- | --- |
| [`web/`](web) | Web application | React 18, TypeScript, Vite 6 |
| [`desktop/`](desktop) | Windows / macOS desktop application | Electron 45 + the same React UI, packaged with electron-builder |
| [`mobile/`](mobile) | Android / iOS mobile application | Expo SDK 58, React Native 0.88 |

## Features

Roles: **Administrator**, **Barangay Staff** and **Resident**. What each user sees depends on their role.

- **Dashboard** with live summary of residents, households and document requests
- **Residents**: search, filter, pagination, add / edit / view records (staff and admin)
- **Document requests**: submit, track and update status with remarks
- **Households**: create households, view details, manage members
- **Announcements**: categories and pinned notices
- **Reports & analytics**: demographics and request statistics
- **Users & audit log**: staff account management and change history (administrator only)
- **Settings**: profile, password, light / dark theme
- Session handling: an expired or invalid token signs the user out automatically

The mobile app covers login, registration, dashboard, requests, announcements, reports and settings (including a backend server address setting).

## Requirements

- Node.js (current LTS) and npm
- The BarangayLink **backend API** running and reachable (default `http://localhost:3000/api/v1`), with PostgreSQL set up
- Mobile only: the **Expo Go** app on a phone, or an Android emulator / iOS simulator

## Configuration

Each app reads the API address from an environment variable. Copy `.env.example` to `.env` in the app folder and edit it. Do not commit `.env`.

| App | Variable | Default |
| --- | --- | --- |
| `web` | `VITE_API_BASE_URL` | `http://localhost:3000/api/v1` |
| `desktop` | `VITE_API_BASE_URL` | `http://localhost:3000/api/v1` |
| `mobile` | `EXPO_PUBLIC_API_BASE_URL` (optional) | detected from the Expo host, otherwise `http://localhost:3000/api/v1` |

For a packaged desktop app the address is fixed at build time, so set `VITE_API_BASE_URL` **before** running the build.
On a phone, `localhost` means the phone itself. Use the computer's LAN IP, for example `http://192.168.1.10:3000/api/v1`, or set it in the app under **Settings -> Backend server**.

## Run the apps

Install dependencies once in each app folder with `npm install`.

### Web

```bash
cd web
npm install
npm run dev        # Vite dev server
npm run build      # type-check and production build into dist/
npm run preview    # serve the production build
```

### Desktop

```bash
cd desktop
npm install
npm run dev        # starts Vite on 127.0.0.1:5174 and opens the Electron window
```

In development the Electron window opens with DevTools and may show a "Content-Security-Policy" warning. That is expected: the strict security policy is applied to production builds only, and the warning does not appear in the packaged app.

Build a distributable:

```bash
npm run pack       # unpacked app: release/win-unpacked/BarangayLink Desktop.exe
npm run win        # Windows installer (NSIS): release/BarangayLink Desktop Setup <version>.exe
npm run mac        # macOS dmg + zip (must be built on a Mac)
```

Packaged builds use hash routing, so they work when opened from the file system. The Windows build has been verified; the macOS target is configured but has not been tested.
The installer is not code-signed, so Windows SmartScreen may show an "unknown publisher" warning.

### Mobile

```bash
cd mobile
npm install
npx expo start     # then scan the QR code with Expo Go
```

- **Android**: scan the QR code in Expo Go.
- **iPhone**: install Expo Go from the App Store, then scan the QR code with the normal Camera app. Phone and computer must be on the same Wi-Fi. If Expo says you are signed in to Expo Go but not the CLI, run `npx expo login` with the same account.
- Other shortcuts: `npm run android`, `npm run ios`, `npm run web`.

## Project structure

```text
.
|- web/        React + Vite web app
|  `- src/     App.tsx, modules.tsx (households, announcements, reports), settings.tsx, shared.tsx, api.ts, types.ts
|- desktop/    Electron desktop app (same UI as web)
|  |- electron/   main.cjs, preload.cjs
|  `- src/        React UI
`- mobile/     Expo / React Native app
   |- App.tsx
   `- src/        api.ts, theme.ts, types.ts, screens/
```

`web` and `desktop` currently keep separate copies of the UI source, so a change to one usually needs the same change in the other.

## Troubleshooting

- **"Cannot reach the API" / API Offline**: start the backend and check `VITE_API_BASE_URL`. On a phone, use the computer's LAN IP and allow the backend port through the firewall.
- **"Resource not found: GET /api/v1/admin/users"**: the running backend does not have the admin routes. Update the backend to the current version and restart it.
- **Desktop window is blank in `npm run dev`**: make sure port 5174 is free; the dev server uses a fixed port.
- **"Invalid or expired token"**: sign out and sign in again.
- **Windows build fails on symbolic links**: run the terminal as Administrator or turn on Windows Developer Mode.

## Notes

- Never commit `.env` files, `node_modules`, `dist` or `release`.
- `npm audit` may report moderate warnings in dev tooling (file watcher and packaging tools). They do not ship in the apps. Avoid `npm audit fix --force`, which can downgrade Expo or Electron.
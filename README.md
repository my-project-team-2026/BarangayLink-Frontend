# BarangayLink Frontend

Responsive React + TypeScript + Vite frontend built around the supplied `Butter/barangaylink-backend` and the BarangayLink project proposal.

## Requirements

- Node.js 20+ recommended
- PostgreSQL database and the supplied backend configured and running
- Backend API at `http://localhost:3000/api/v1` by default

## Run the frontend

1. Extract this folder next to your existing backend folder.
2. Open a terminal in `BarangayLink-Frontend`.
3. Install dependencies and start Vite:

   ```bash
   npm install
   npm run dev
   ```

4. Open `http://localhost:5173`.
5. Start the backend separately from `Butter/barangaylink-backend`:

   ```bash
   npm install
   npm run dev
   ```

6. If your API is not at `http://localhost:3000/api/v1`, copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to the correct API base. Restart Vite after changing `.env`.

## Included screens

- Sign in using `POST /api/v1/auth/login`; stores JWT and user session in browser local storage.
- Resident self-registration using `POST /api/v1/auth/register`.
- Dashboard summary using `GET /api/v1/dashboard` for Administrator / Barangay Staff.
- Resident search and filtering using `GET /api/v1/residents`.
- Document request list using `GET /api/v1/requests`.
- Resident request submission using `POST /api/v1/requests`.
- Staff/Admin status updates using `PATCH /api/v1/requests/:id/status`.
- Responsive sidebar and clear placeholder screens for modules whose backend endpoints are not in the supplied project.

## Test accounts from the supplied `seedUsers.js`

The backend seed script defines:
- Administrator: `admin@barangaylink.gov` / `Admin123!`
- Barangay Staff: `staff@barangaylink.gov` / `Staff123!`

These accounts only exist after the backend team runs `node seedUsers.js` successfully against the configured database. Change these development passwords before any real use. Do not deploy the included backend `.env` credentials or JWT secret.

## Important integration notes

The supplied backend currently registers these routes:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/residents`
- `GET /api/v1/residents/:id`
- `GET /api/v1/requests`
- `POST /api/v1/requests`
- `PATCH /api/v1/requests/:id/status`
- `GET /api/v1/dashboard`
- `GET /api/health`

The proposal also calls for household management, announcements, user/account administration, resident add/edit/archive, reports, printable document generation, and IndexedDB caching. Those are not exposed by the provided backend routes, so the frontend does not pretend those operations work. The related navigation items show an explicit backend-needed message until those endpoints are implemented.

The backend uses PostgreSQL `search_path` from `DB_SCHEMA` (defaults to `barangay`). Its supplied `.env` currently contains local development credentials and a JWT secret. Keep that file private and rotate the values before any real deployment.

## If login works but the dashboard fails

- Verify PostgreSQL is running and the backend starts without database errors.
- Open `http://localhost:3000/api/health` and confirm it reports `UP`.
- Check that database schema/tables/functions and seed users exist.
- Confirm the frontend's `VITE_API_BASE_URL` matches the backend.
- If testing from another device, `localhost` refers to that device; use the backend computer's LAN IP and configure CORS/firewall accordingly.

## Stack

React 18, TypeScript, Vite, React Router, Lucide icons, custom responsive CSS. The project is organized to allow Capacitor or Electron packaging later; those packaging layers are not included yet.

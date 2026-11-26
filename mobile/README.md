# BarangayLink Mobile Application

A React Native & Expo mobile application for **BarangayLink: Digital Barangay Management System**.

Designed specifically for community residents and staff to access services on Android and iOS devices.

---

## 📱 Features Included
- **JWT Authentication**: Sign in and Resident Registration with stored sessions via `@react-native-async-storage/async-storage`.
- **Dashboard**:
  - Greeting banner, active workspace role badge.
  - Quick action buttons (New Request, View Requests, Notices).
  - Live statistics and overview of pending/ready document requests.
- **My Document Requests**:
  - Real-time status pills: `Pending`, `Approved`, `Ready for Release`, `Released`, `Rejected`.
  - Filter tabs by status.
  - Interactive Modal to submit requests (Clearance, Indigency, Residency, Certificate).
  - Tracking numbers and processor remarks.
- **Community Notices**:
  - Live feed of announcements with category badges (General, Health, Safety, Event).
  - Pinned announcement indicators.
- **Settings & Profile**:
  - Full resident profile details (Name, Email, Role, Purok/Zone, Contact Number).
  - **Dark Mode & Light Mode** toggle matching the web/desktop palette.
  - **Backend Server IP Configuration tool** with instant connectivity test.
  - Password update form.
  - Session sign-out.

---

## 🚀 How to Run the Mobile App

### 1. Ensure Backend is Running
Make sure your PostgreSQL backend is started:
```powershell
cd C:\Users\lawre\Desktop\Butter\Butter\backend
npm run dev
```

### 2. Start the Mobile Expo Server
In a new terminal:
```powershell
cd C:\Users\lawre\Desktop\Butter\Butter\mobile
npm run start
```
*(Or from the project root: `npm run mobile`)*

### 3. Open on your Device
- **On Physical Phone (Android or iPhone)**:
  1. Install the free **Expo Go** app from Google Play Store or Apple App Store.
  2. Ensure your phone is connected to the same Wi-Fi as your PC.
  3. Scan the QR code shown in the terminal with your phone's camera (iOS) or inside the Expo Go app (Android).
  4. In the app's login screen, tap **"Configure API Server"** and set it to your computer's local Wi-Fi IP (e.g., `http://192.168.1.xxx:3000/api/v1`).

- **On Android Emulator**:
  - Press `a` in the terminal to automatically launch on Android Emulator (defaults to `http://10.0.2.2:3000/api/v1`).

- **On Web Browser (Quick Preview)**:
  - Press `w` in the terminal to open the mobile interface in your browser.


### Backend URL
Set `EXPO_PUBLIC_API_BASE_URL` in a local `.env` to the backend machine LAN address, for example `http://192.168.x.x:3000/api/v1`. Do not commit a device-specific IP. Expo host discovery is used when available.

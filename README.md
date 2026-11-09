# TimeFlow Mobile

Native Expo client for the TimeFlow Enterprise API.

## Configure the API

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to the API origin
without an `/api/v1` suffix. For example, use your deployed HTTPS API origin;
for a local Android emulator, use `http://10.0.2.2:3000`. A physical phone needs
the development computer's reachable LAN address or a deployed HTTPS API.

## Run

```sh
npm install
npx expo start
```

The app supports account login and access requests, attendance with branch
geofencing, leave requests and approvals, employee and branch management, and
Super Admin CSV imports. Location is requested only when a user clocks in or
out, or when a manager explicitly uses their current coordinates for a branch.
To enable Google sign-in, set the Android, iOS and/or web OAuth client IDs in
the corresponding `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` variables.

The `timeflow://` URL scheme can open invitation activation links that include
a `token` query parameter.

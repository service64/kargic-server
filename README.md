# server-setup

## API base URL

- **Prefix:** `/api/v1`
- **Default server port:** from `config.port` (falls back to `50001` if unset). Check your `.env` / `src/config`.

Example base: `http://localhost:50001`

---

## Super admin login (frontend)

**Endpoint:** `POST /api/v1/user/super-admin/login`  
**Headers:** `Content-Type: application/json`  
**Body:** `{ "email": string, "password": string }`

**Bootstrap:** Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in `.env`. While **no** `Admin` with `role: SUPER_ADMIN` and `isDeleted: false` exists, the first login whose body matches those values (constant-time compare) **creates** a verified `User` (role `ADMIN`), two placeholder `Image` rows, and an `Admin` with `role: SUPER_ADMIN`.

**After bootstrap:** Log in with the same email and the **user password** (bcrypt) as for any user; the account must still have an active `SUPER_ADMIN` admin profile.

**Conflicts:** If the bootstrap email is already registered to another account with a **different** password, or that user already has a non-super-admin `Admin` profile, the server responds with **409**.

**Response JSON:** `accessToken`, `user`, `tier` — **no `refreshToken` in the body**; the refresh token is sent as an **HttpOnly** cookie (name from `REFRESH_TOKEN_COOKIE_NAME`, default `refreshToken`). Use `fetch(..., { credentials: 'include' })` from the browser so the cookie is stored and resent. Cookie flags follow `NODE_ENV` and optional `COOKIE_*` vars in `.env.example` (`Secure` in production unless `COOKIE_INSECURE=true`, `SameSite` via `COOKIE_SAME_SITE`).

This flow does **not** set `lsid` (no `LoginSession`).

```bash
curl -sS -c cookies.txt -X POST 'http://localhost:50001/api/v1/user/super-admin/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"your-password"}'
```

---

## User login (frontend)

> **Note:** `POST /api/v1/user/login` is not wired in `user.router.ts` in the current codebase; re-add the route if you need it. `UserService.loginUser` remains available.

**Endpoint:** `POST /api/v1/user/login`  
**Headers:** `Content-Type: application/json`

### Request body (JSON)

| Field        | Type   | Required | Notes |
|-------------|--------|----------|--------|
| `email`     | string | Yes      | Valid email. |
| `password`  | string | Yes      | Non-empty. |
| `deviceId`  | string | No       | **Recommended.** Must be a **UUID** (v4-style). Generate once per browser/app install, persist (e.g. `localStorage`), and send on every login. A session row is **reused** only when `userId` plus **all** of `deviceId`, `deviceType`, `os`, `browser`, `ip`, `userAgent`, and `timezone` match the stored record (after the same trimming/normalization the server uses). If any of those differ, a **new** session document is created (subject to the max-sessions limit). |
| `deviceType`| string | No       | e.g. `"web"`, `"mobile"`. |
| `os`        | string | No       | e.g. `"macOS"`. |
| `browser`   | string | No       | e.g. `"Chrome"`. |
| `timezone`  | string | No       | e.g. `"Asia/Dhaka"`. |

### Successful response shape

HTTP **200**. JSON envelope:

```json
{
  "status": 200,
  "message": "Logged in successfully",
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "user": { "...": "full user document fields from DB (password/otp stripped)" },
    "session": {
      "deviceId": "<uuid — yours if sent, or server-generated if omitted>",
      "sessionId": "<MongoDB ObjectId string for this login session>"
    }
  }
}
```

Use `Authorization: Bearer <accessToken>` on protected routes (if your app uses that header; allowed in CORS as configured in `app.ts`).

After **email/password login**, both `accessToken` and `refreshToken` include an `lsid` claim (login session id). Protected routes reject the token if that login session row was removed (e.g. after logout). Tokens from **verify-otp** do not include `lsid` and are not tied to `LoginSession` until the user logs in with a password.

### Validation error

HTTP **400** when the body fails Zod validation (e.g. invalid email or invalid `deviceId` format).

```json
{
  "status": 400,
  "message": "Validation Error",
  "data": null,
  "errors": [ /* Zod error details */ ]
}
```

### Example: cURL

Replace the URL port if your server uses a different one.

```bash
curl -sS -X POST 'http://localhost:50001/api/v1/user/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "helloworld111@deltajohnsons.com",
    "password": "secret12",
    "deviceId": "561bf622-97bf-4873-b447-d33866dc7659",
    "deviceType": "web",
    "os": "macOS",
    "browser": "Chrome",
    "timezone": "Asia/Dhaka"
  }'
```

### Example: fetch (browser)

```javascript
const res = await fetch('http://localhost:50001/api/v1/user/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'helloworld111@deltajohnsons.com',
    password: 'secret12',
    deviceId: '561bf622-97bf-4873-b447-d33866dc7659',
    deviceType: 'web',
    os: 'macOS',
    browser: 'Chrome',
    timezone: 'Asia/Dhaka',
  }),
});
const json = await res.json();
// json.data.accessToken, json.data.refreshToken, json.data.session, ...
```

---

## User logout (frontend)

**Endpoint:** `POST /api/v1/user/logout`  
**Headers:** `Content-Type: application/json`, `Authorization: Bearer <accessToken>` (must be from **password login**, not verify-otp only)

### Request body

| Field       | Type   | Required | Notes |
|------------|--------|----------|--------|
| `deviceId` | string | Yes      | Same UUID you send at login (`data.session.deviceId` in the response). Must match the login session embedded in the token. |

Deletes all `LoginSession` rows for this user with that `deviceId`. Because tokens carry `lsid`, **access and refresh JWTs for those sessions stop working** on the next API call (session row is gone). Still **clear tokens in the client** (storage/cookies) after a successful logout.

### Example: cURL

```bash
curl -sS -X POST 'http://localhost:50001/api/v1/user/logout' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -d '{ "deviceId": "561bf622-97bf-4873-b447-d33866dc7659" }'
```

CORS is configured in `app.ts` for `http://localhost:3000` and `http://localhost:5173`; add your origin there if the app runs elsewhere.
# kargic-server

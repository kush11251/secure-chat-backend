# Secure Chat Backend (Node.js, Express, MongoDB, Socket.IO)

## Overview
Secure real‑time chat backend supporting JWT auth (access/refresh), unique 6‑char user IDs, one‑to‑one and group chats, reactions, read receipts, typing indicators, online presence, pinned chats, media uploads via Cloudinary, push notifications (FCM), and a 1‑minute polling API for contacts' status.

## Tech Stack
- Express 4
- MongoDB + Mongoose 8
- Socket.IO 4
- Cloudinary SDK
- JWT (access + refresh)
- Multer for uploads (optional server-side path)

## Project Structure
/backend
 ├─ src
 │   ├─ config
 │   │   ├─ db.js
 │   │   ├─ cloudinary.js
 │   │   └─ websocket.js
 │   ├─ models
 │   │   ├─ User.js
 │   │   ├─ Contact.js
 │   │   ├─ Chat.js
 │   │   └─ Message.js
 │   ├─ controllers
 │   │   ├─ authController.js
 │   │   ├─ userController.js
 │   │   ├─ chatController.js
 │   │   ├─ messageController.js
 │   │   └─ mediaController.js
 │   ├─ routes
 │   │   ├─ authRoutes.js
 │   │   ├─ userRoutes.js
 │   │   ├─ chatRoutes.js
 │   │   └─ messageRoutes.js
 │   ├─ utils
 │   │   ├─ token.js
 │   │   ├─ generateUserID.js
 │   │   ├─ cloudinaryUploader.js
 │   │   └─ notifications.js
 │   ├─ middleware
 │   │   └─ verifyToken.js
 │   └─ server.js
 ├─ package.json
 └─ .env.example

## Quickstart
1. Copy `.env.example` to `.env` and fill values:
   - `PORT=4000`
   - `MONGO_URI=mongodb://127.0.0.1:27017/secure_chat`
   - `JWT_SECRET=...` (required)
   - `REFRESH_JWT_SECRET=...` (required)
   - `CORS_ORIGIN=http://localhost:4200` (Angular dev server)
   - Cloudinary keys if using server uploads
2. Install dependencies: `npm i`
3. Start dev: `npm run dev` → http://localhost:4000
4. Health: GET `/api/health` should return `{ status: "ok" }`

Health: GET /api/health

## Environment Variables
- See `.env.example` for all keys
- Set `CORS_ORIGIN` to frontend URL (e.g., `http://localhost:4200`) to allow credentials and Socket.IO auth

## Auth
- POST /api/auth/register { name, email, password }
- POST /api/auth/login { email, password }
- POST /api/auth/refresh { refreshToken? } or cookie
- POST /api/auth/logout (auth)

JWT handshake with Socket.IO: pass access token via `io("/", { auth: { token } })`.

## Users
- GET /api/users/me (auth)
- GET /api/users/search?uid=ABC123 (auth)
- POST /api/users/contacts { uid } (auth) – bidirectional add
- GET /api/users/contacts (auth)
- GET /api/users/active-contacts (auth) – for 1‑minute polling
- POST /api/users/notifications-token { token } (auth)
 - DELETE /api/users/contacts/:uid (auth)

## Chats
- GET /api/chats (auth)
- POST /api/chats/direct { userId } (auth)
- POST /api/chats/group { groupName, memberIds[] } (auth)
- PATCH /api/chats/:chatId { groupName? } (auth, admin)
- POST /api/chats/:chatId/members { memberIds[] } (auth, admin)
- DELETE /api/chats/:chatId/members/:memberId (auth, admin)
- POST /api/chats/:chatId/pin (auth)
- POST /api/chats/:chatId/unpin (auth)

## Messages
- GET /api/messages/:chatId?limit=50&before=ISO (auth)
- POST /api/messages { chatId, type, content?, mediaUrl? } (auth)
- POST /api/messages/:messageId/reactions { emoji } (auth)
- DELETE /api/messages/:messageId/reactions (auth)
- POST /api/messages/:chatId/read (auth)

## Media (Cloudinary)
- Preferred flow: Frontend uploads directly to Cloudinary, then call:
- POST /api/messages/media { chatId, type, mediaUrl } (auth)

Alternate server upload (multipart):
- POST /api/messages/media/upload (auth, form-data field `file`, body: chatId, type)

## Socket.IO Events
- user:online / user:offline
- message:send (HTTP) → message:receive (WS)
- typing:start / typing:stop
- message:read
- reaction:update
- group:update

## Notes
- Client-side AES: send encrypted `content` to backend; backend stores as-is (no decryption).
- Presence also toggles via WS connection auth; fallback via polling endpoint.
- Push notifications require FCM server key and stored device tokens.

## Development Tips
- Use Angular dev server with proxy to `http://localhost:4000` to simplify credentials and WS (`BACKEND_URL` env for proxy).
- For Postman:
  - Base URL: `http://localhost:4000/api`
  - Add `Authorization: Bearer {{accessToken}}` where `accessToken` is from login/register responses.

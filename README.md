# Music Theory Study App

A React Native mobile app for studying music theory. Admin users build content (textbooks, chapters, flashcards); regular users study that content through a clean reading interface and flashcard practice.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (SDK 52+) |
| Routing | Expo Router (file-based, `app/` directory) |
| Backend | PocketBase (self-hosted, exposed via ngrok) |
| Language | TypeScript |
| Auth | PocketBase email/password + OTP email verification |
| Storage | PocketBase collections (books, chapters, flashcards) |
| File uploads | PocketBase file fields (images in chapters + flashcards) |

---

## Setup

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- PocketBase running locally
- ngrok (to expose PocketBase to the phone)

### Install
```bash
npm install
```

### Environment
Create a `.env` file in the project root:
```env
EXPO_PUBLIC_PB_URL=https://your-ngrok-url.ngrok-free.app
```

> If running locally without ngrok, edit `src/api/pb.ts` directly and set `PB_URL` to your machine's local IP, e.g. `http://192.168.1.43:8090`.

### Run PocketBase
```bash
./pocketbase serve --http="0.0.0.0:8090"
```
The `0.0.0.0` flag is required so devices on the network (or ngrok) can reach it — without it PocketBase only accepts localhost connections.

### ngrok
```bash
ngrok http 8090
```
Copy the HTTPS URL into your `.env` file.

### Start the app
```bash
npx expo start --clear
```

---

## PocketBase Collections

### `users`
Standard PocketBase auth collection.
- `username` (text)
- `email` (email)
- OTP enabled for email verification on register

### `books`
- `title` (text)
- `author` (text)
- `icon` (text — emoji)
- `color` (text — hex color)
- `order` (number)

### `chapters`
- `book` (relation → books)
- `number` (number)
- `title` (text)
- `subtitle` (text)
- `content` (json — serialised `ContentBlock[]`)
- `images` (file, multiple — stores uploaded block images)

### `flashcards`
- `chapter` (relation → chapters)
- `front` (text)
- `back` (text)
- `front_image` (file — optional)
- `back_image` (file — optional)
- `order` (number)

---

## Project Structure

```
app/                        # Expo Router routes
  _layout.tsx               # Root layout — AuthProvider + NavigationGuard
  index.tsx                 # Splash/redirect screen (no logic, just spinner)
  login.tsx                 # Wires LoginScreen to AuthContext
  register.tsx              # Wires RegisterScreen to AuthContext
  otp.tsx                   # OTP verification screen
  dashboard.tsx             # Main app shell

src/
  api/
    pb.ts                   # PocketBase client, auth persistence, getFileUrl()
    auth.ts                 # login, register, OTP, logout helpers
    content.ts              # CRUD for books, chapters, flashcards

  context/
    AuthContext.tsx          # AuthProvider + useAuth hook

  hooks/
    useAuth.ts              # Re-export from AuthContext (backwards compat)

  types/
    index.ts                # User, Book, Chapter, Flashcard interfaces
    blocks.ts               # ContentBlock, BlockType, TableRow interfaces

  constants/
    theme.ts                # Colors, FontSize, Spacing, Radius
    admin.ts                # ADMIN_USERNAME constant

  components/
    layout/Screen.tsx        # SafeAreaView wrapper with scroll/keyboard support
    ui/                     # Button, Input, Card, Heading, BodyText
    shared/
      ConfirmModal.tsx       # Reusable delete confirmation modal
      ImagePickerModal.tsx   # Camera / photo library picker modal

  utils/
    pickImage.ts            # pickImageNative(), pickImageFromWeb(), appendImageToFormData()

  screens/
    LoginScreen.tsx
    RegisterScreen.tsx
    OTPScreen.tsx
    DashboardScreen.tsx      # Tab nav shell (admin vs student tabs)
    SettingsScreen.tsx

    admin/
      StudyBuilderScreen.tsx         # Admin home: Books / Flashcards menu
      builder/
        BookBuilderScreen.tsx        # Create/delete textbooks
        ChapterBuilderScreen.tsx     # Create/delete chapters, enter block editor
        BlockEditorScreen.tsx        # Full drag-and-drop block editor for chapter content
      flashcards/
        FlashcardBookPickerScreen.tsx
        FlashcardBuilderScreen.tsx
        FlashcardFormScreen.tsx      # Create/edit flashcard with optional images

    bookpractice/
      BookPracticeScreen.tsx         # Student view: books → chapters → content + flashcards
```

---

## Authentication Flow

1. App starts → `index.tsx` shows spinner
2. `NavigationGuard` in `_layout.tsx` checks `AuthContext`
3. Not logged in → `/login`
4. Login → PocketBase `authWithPassword`
5. On register → OTP email sent → `/otp` screen → `authWithOTP`
6. Auth token persisted in `AsyncStorage` via `pb.authStore.onChange`
7. On next launch, `loadAuth()` restores session from AsyncStorage
8. Logged in on auth route → `/dashboard`

---

## Admin vs Student

Determined by `ADMIN_USERNAME` constant in `src/constants/admin.ts` (currently `'navaneeth'`). If `user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase()`, the user sees the builder tabs; otherwise they see the study tabs.

---

## Block Editor

Chapter content is stored as a JSON array of `ContentBlock` objects in the `chapters.content` field.

**Block types:** `heading`, `subheading`, `paragraph`, `bullets`, `table`, `divider`, `image`

**Key behaviours:**
- Drag-and-drop reordering via `react-native-draggable-flatlist`
- Each block collapses to save screen space
- Text editing happens in a modal (to avoid keyboard issues in draggable lists)
- Image blocks: picked image is stored locally (as `PickedImage`) until Save is pressed, then uploaded to `chapters.images` file field, filename stored in `block.imageFile`
- Save uploads all pending images first, then writes the updated content JSON

### Image Storage Pattern
Images in chapter blocks are stored differently from flashcard images:

- **Flashcards**: image stored as a dedicated PocketBase file field (`front_image`, `back_image`). URL computed live via `pb.files.getURL(record, filename)`.
- **Chapter blocks**: image filename stored inside the content JSON as `block.imageFile`. URL computed live via `getFileUrl('chapters', chapter.id, block.imageFile)` from `src/api/pb.ts`.

`getFileUrl` builds: `PB_URL + /api/files/chapters/RECORD_ID/FILENAME`

This avoids relying on PocketBase's internal `collectionId` field being present on typed model objects.

**Important bug history:** `record.images` from PocketBase returns a plain string (not an array) when there is only one file. The save function normalises this: `Array.isArray(raw) ? raw : [raw]`.

---

## Known Gotchas

- **`requestKey: null`** on all PocketBase queries — prevents auto-cancellation when a component remounts quickly (e.g. navigating back and forth causes the previous request to be cancelled, leaving the screen in a loading state forever).
- **`SafeAreaView`** must be imported from `react-native-safe-area-context`, not `react-native`.
- **`MediaType`** for expo-image-picker: use `['images'] as any` — the `MediaType` enum is undefined in the installed version.
- **Expo Router + AuthProvider**: route files (`index.tsx`, `login.tsx`, etc.) render as navigator screens — they mount before `RootLayout`'s JSX finishes, so `useAuth()` cannot be called directly inside them unless they are wrapped. Solution: `index.tsx` has no auth logic; `NavigationGuard` (inside `AuthProvider`) handles all redirects.
- **ngrok free tier** shows a browser interstitial on first visit. Open the ngrok URL in the phone's browser once to dismiss it before using the app.

---

## Dependencies (key packages)

```json
"expo": "~52.x",
"expo-router": "~4.x",
"pocketbase": "^0.21.x",
"react-native-draggable-flatlist": "^4.x",
"react-native-gesture-handler": "^2.x",
"react-native-safe-area-context": "^4.x",
"expo-image-picker": "^15.x",
"@react-native-async-storage/async-storage": "^1.x"
```
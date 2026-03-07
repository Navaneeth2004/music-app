# Music Theory Study App

A React Native mobile app for studying music theory. Admins build structured content — textbooks, chapters with a rich block editor, and flashcard decks. Students read, study, and practice through a clean interface.

---

## Features

### Admin (content builder)
- **Textbook editor** — create books with chapters, reorder, import/export
- **Block editor** — rich chapter content with headings, paragraphs, bullet lists, tables, images, and audio blocks; drag-to-reorder; draft system
- **Flashcard builder** — chapter-attached flashcards and standalone solo decks with front/back text, images, and audio
- **Import/Export** — per-book, per-chapter, per-deck JSON export; full backup with embedded media

### Student (study practice)
- **Books & Chapters** — browse textbooks, read chapter content with full block rendering
- **Flashcard study** — browse mode (tap to flip) and exam mode (rate cards: Got it / Unsure / Missed) with retry of missed cards
- **Solo Decks** — standalone flashcard sets
- **⭐ Favourites** — pin books and decks to the top of lists
- **🔍 Search** — instant full-text search across books, chapters, and all flashcards
- **Backup & Restore** — full export including images and audio, importable on any device

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 52 |
| Routing | Expo Router (file-based, `app/` directory) |
| Database | SQLite via `expo-sqlite` |
| Auth | Local SHA-256 password hashing via `expo-crypto` |
| Session | `AsyncStorage` (token-based session persistence) |
| File storage | Local device filesystem via `expo-file-system` |
| Media picking | `expo-image-picker`, `expo-document-picker` |
| Sharing | `expo-sharing` |
| Language | TypeScript |
| Gestures | `react-native-gesture-handler`, `react-native-draggable-flatlist` |

---

## Architecture

### Auth
Fully local — no server required. Passwords are SHA-256 hashed via `expo-crypto` and stored in SQLite. Sessions persist in `AsyncStorage`. The admin user is identified by a hardcoded username constant (`src/constants/admin.ts`).

### Database
All content lives in a local SQLite database (`studyapp.db`) in the app's private sandbox. Every content table includes a `user_id` column so multiple accounts on the same device are fully isolated.

**Tables:** `users`, `books`, `chapters`, `chapter_flashcards`, `solo_decks`, `solo_flashcards`

### Media
Images and audio are stored as **local file URIs** in the database. Files stay wherever the user picked them from (camera roll, files app). The DB stores the path; the app reads the file at runtime. No server, no uploads.

### Backup format (v2)
A single `.json` file containing:
- All text content (books, chapters, flashcards, decks)
- `media` map: `{ "images/filename.jpg": "<base64>", "audio/clip.m4a": "<base64>" }`
- `favourites`: pinned book and deck IDs

On import, base64-encoded media is decoded and written to `documentDirectory/media/`. v1 backups (text only) are also importable.

---

## Project Structure

```
app/
  _layout.tsx          ← AuthProvider + NavigationGuard + Expo Router Stack
  index.tsx            ← spinner only (no auth calls — see gotcha below)
  dashboard.tsx        ← mounts DashboardScreen

src/
  api/
    db.ts              ← SQLite layer, all CRUD + dbSearchAll
    auth.ts            ← local login/register/logout/loadSession
    content.ts         ← thin wrappers over db.ts

  constants/
    theme.ts           ← Colors, FontSize, Spacing, Radius
    admin.ts           ← ADMIN_USERNAME

  context/
    AuthContext.tsx    ← AuthProvider, useAuth hook, isAdmin flag

  types/
    index.ts           ← User, Book, Chapter, ChapterFlashcard, SoloDeck, SoloFlashcard
    blocks.ts          ← ContentBlock, BlockType, TableRow

  utils/
    favorites.ts       ← AsyncStorage-based pin/unpin for books and decks
    shuffle.ts         ← Fisher-Yates shuffle (used by exam mode)
    pickImage.ts       ← expo-image-picker wrapper
    pickAudio.ts       ← expo-document-picker audio wrapper
    exportJson.ts      ← share a JSON payload as a file

  components/
    shared/
      ConfirmModal.tsx
      SwipeableRow.tsx
      CardListHeader.tsx
      CardListItem.tsx
      ImagePickerModal.tsx
      ImageLightbox.tsx
      AudioPlayer.tsx

  screens/
    DashboardScreen.tsx          ← tab shell (admin: Builder+Settings, student: Study+Search+Settings)
    SettingsScreen.tsx
    BackupScreen.tsx             ← full export/import with media

    search/
      SearchScreen.tsx           ← global search, debounced, grouped by type

    admin/
      StudyBuilderScreen.tsx
      builder/
        BookBuilderScreen.tsx
        ChapterBuilderScreen.tsx
        BlockEditorScreen.tsx    ← richest screen; draft system, swipe-to-delete, drag reorder
      flashcards/
        FlashcardBookPickerScreen.tsx
        FlashcardBuilderScreen.tsx
        FlashcardFormScreen.tsx
        SoloDeckBuilderScreen.tsx
        SoloFlashcardFormScreen.tsx

    bookpractice/
      BookPracticeScreen.tsx     ← navigation state machine
      BookChapterScreens.tsx     ← BookListScreen, ChapterListScreen, ChapterViewScreen
      FlashcardScreens.tsx       ← FlashcardsScreen, SingleCardScreen, ExamScreen
      SoloScreens.tsx
      practiceShared.tsx         ← SoloDecksScreen, SoloDeckStudyScreen, SoloExamScreen + shared styles
```

---

## Setup

### Install dependencies
```bash
npx expo install
```

### Required packages (if starting fresh)
```bash
npx expo install expo-sqlite expo-crypto expo-file-system expo-sharing \
  expo-document-picker expo-image-picker expo-av \
  @react-native-async-storage/async-storage \
  react-native-gesture-handler react-native-draggable-flatlist \
  react-native-safe-area-context react-native-reanimated
```

### tsconfig.json — path alias
```json
{
  "compilerOptions": {
    "paths": { "@src/*": ["./src/*"] }
  }
}
```

### babel.config.js — Metro alias resolution
```js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        root: ['./'],
        alias: { '@src': './src' },
      }],
      'react-native-reanimated/plugin',
    ],
  };
};
```

### Run
```bash
npx expo start
```

---

## Key Implementation Notes

### Expo Router gotcha
Route files render before `AuthProvider` is ready — never call `useAuth()` in a route file. All auth logic and redirects live in `NavigationGuard` inside `_layout.tsx`.

### Block editor draft system
Explicit Draft button (not auto-save). `isDirty` tracks whether any change has been made since the last draft or save. Draft button is amber/active only when dirty. Saving clears the draft from AsyncStorage.

### Swipe-to-delete on blocks
Uses `Swipeable` from `react-native-gesture-handler` (not `PanResponder`) because the block list is inside `DraggableFlatList`. Invisible 1px right action gives a nudge feel without revealing a delete zone. Delete button removed from card headers.

### User isolation
Every content table has `user_id TEXT NOT NULL DEFAULT ''`. A module-level `_userId` variable in `db.ts` is set on login and cleared on logout. All queries filter by it.

### Search
`dbSearchAll(query)` runs LIKE queries against all five content tables with JOINs to carry navigation context. Results are debounced 300ms in the UI and grouped by type.

### Favourites
Stored in AsyncStorage as JSON arrays of IDs, keyed by type. Pinned items sort to the top in list screens. Included in backups but cannot be auto-restored by ID after import (IDs change on fresh insert).

---

## User Roles

| Feature | Admin | Student |
|---|---|---|
| Build textbooks and chapters | ✅ | ❌ |
| Build flashcard decks | ✅ | ❌ |
| Read chapters | ✅ | ✅ |
| Study flashcards | ✅ | ✅ |
| Search | ❌ | ✅ |
| Favourites | ❌ | ✅ |
| Backup & Restore | ✅ | ✅ |
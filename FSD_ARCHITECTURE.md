# Feature-Sliced Design (FSD) Architektur - Darts App

## 📋 Inhaltsverzeichnis

- [Überblick](#überblick)
- [Architekturprinzipien](#architekturprinzipien)
- [Layer-Struktur](#layer-struktur)
- [Abhängigkeitsregeln](#abhängigkeitsregeln)
- [Ordnerstruktur](#ordnerstruktur)
- [Migrationsplan](#migrationsplan)

---

## 🎯 Überblick

Diese Darts-Anwendung wurde nach der **Feature-Sliced Design (FSD)** Methodik strukturiert. FSD ist ein architektonisches Designmuster, das auf Modularität, Wartbarkeit und Skalierbarkeit ausgelegt ist.

### Hauptziele:

- ✅ **Klare Trennung von Verantwortlichkeiten**
- ✅ **Vorhersagbare Dateistruktur**
- ✅ **Einfache Navigation und Wartung**
- ✅ **Vermeidung von zirkulären Abhängigkeiten**
- ✅ **Bessere Testbarkeit**

---

## 🏗️ Architekturprinzipien

### 1. **Layering (Schichtung)**

Die Anwendung ist in hierarchische Layer aufgeteilt:

```
app → pages → widgets → features → entities → shared
```

### 2. **Slicing (Aufteilung)**

Jeder Layer ist in Slices (funktionale Module) unterteilt.

### 3. **Segments (Segmente)**

Jeder Slice enthält Segments für unterschiedliche Aspekte:

- `ui/` - React-Komponenten
- `model/` - Business Logic, State, Hooks
- `api/` - API-Calls
- `lib/` - Hilfsfunktionen
- `config/` - Konfigurationen

---

## 📚 Layer-Struktur

### 1️⃣ **Shared Layer** (Grundlage)

**Zweck:** Wiederverwendbarer Code ohne Business-Logik

```
src/shared/
├── ui/                    # Generische UI-Komponenten (Button, Input, etc.)
├── api/                   # API-Client, Base Requests
├── config/               # App-weite Konfigurationen (URLs, Constants)
├── hooks/                # Generische React Hooks
├── types/                # TypeScript Types & Interfaces
├── lib/                  # Utility Functions (formatters, validators)
└── assets/              # Icons, Fonts, Sounds
    ├── icons/
    ├── sounds/
    └── fonts/
```

**Beispiele:**

- `shared/ui/Button` - Generischer Button
- `shared/api/client` - Axios/Fetch Instance
- `shared/config/routes` - Route-Definitionen
- `shared/hooks/useDebounce` - Debounce Hook

---

### 2️⃣ **Entities Layer** (Business-Entitäten)

**Zweck:** Geschäftsobjekte ohne komplexe Interaktionen

```
src/entities/
├── player/
│   ├── ui/               # PlayerCard, PlayerAvatar
│   ├── model/            # Player State, Types
│   └── api/              # Player CRUD API
├── game/
│   ├── ui/               # GameCard, GameStatus
│   ├── model/            # Game State, Types
│   └── api/              # Game API
├── room/
│   ├── ui/               # RoomCard
│   ├── model/            # Room State
│   └── api/              # Room API
└── settings/
    ├── ui/               # SettingsView
    └── model/            # Settings Store
```

**Charakteristika:**

- Repräsentieren Domain-Objekte
- Keine User-Interaktionen
- Reine Darstellung von Daten

---

### 3️⃣ **Features Layer** (Benutzerinteraktionen)

**Zweck:** Einzelne User-Stories und Interaktionen

```
src/features/
├── game/
│   ├── start-game/
│   │   ├── ui/           # StartGameButton
│   │   └── model/        # startGame logic, sound handling
│   └── throw-darts/
│       ├── ui/           # ThrowInput, ScoreKeyboard
│       └── model/        # throw validation, scoring
├── player/
│   ├── add-player/
│   │   ├── ui/           # AddPlayerForm
│   │   └── model/        # addPlayer handler
│   └── remove-player/
│       ├── ui/           # RemovePlayerButton
│       └── model/        # removePlayer handler
├── room/
│   ├── create-room/
│   │   ├── ui/           # CreateRoomButton
│   │   └── model/        # createRoom logic
│   └── join-room/
│       ├── ui/           # JoinRoomForm
│       └── model/        # joinRoom via QR/Link
└── auth/
    ├── login/
    │   ├── ui/           # LoginForm
    │   └── model/        # login handler
    └── registration/
        ├── ui/           # RegistrationForm
        └── model/        # registration handler
```

**Charakteristika:**

- Eine konkrete User-Aktion
- Kombiniert Entities
- Enthält Business-Logik

---

### 4️⃣ **Widgets Layer** (Komposite-Blöcke)

**Zweck:** Große, wiederverwendbare Komponenten-Blöcke

```
src/widgets/
├── navigation/
│   └── ui/               # NavigationBar (mit routing logic)
├── game-board/
│   ├── ui/               # GameBoard Display
│   └── model/            # game board state
├── players-list/
│   ├── ui/               # LivePlayersList, OverviewPlayerItemList
│   └── model/            # players list state
├── keyboard/
│   └── ui/               # Dart Score Keyboard
├── podium/
│   └── ui/               # Winner Podium
├── statistics/
│   └── ui/               # Game Statistics Display
└── qr-code-display/
    └── ui/               # QR Code with invitation link
```

**Charakteristika:**

- Kombiniert mehrere Features & Entities
- Komplett eigenständige UI-Blöcke
- Wiederverwendbar über mehrere Pages

---

### 5️⃣ **Pages Layer** (Routen)

**Zweck:** Vollständige Seiten der Anwendung

```
src/pages/
├── start/
│   ├── ui/               # Start Page UI
│   ├── model/            # Page-specific logic
│   └── index.tsx         # Page Entry Point
├── game/
│   ├── ui/               # Game Page UI
│   ├── model/            # Game page state
│   └── index.tsx
├── game-summary/
│   ├── ui/               # Summary Page
│   ├── model/            # Summary logic
│   └── index.tsx
├── player-profile/
│   ├── ui/               # Profile Page
│   ├── model/            # Profile logic
│   └── index.tsx
├── login/
│   ├── ui/               # Login Page
│   ├── model/            # Login page state
│   └── index.tsx
├── registration/
│   ├── ui/               # Registration Page
│   ├── model/            # Registration state
│   └── index.tsx
└── joined-game/
    ├── ui/               # Joined Game Page
    ├── model/            # Joined game state
    └── index.tsx
```

**Charakteristika:**

- Entspricht einer Route
- Komponiert Widgets & Features
- Minimale eigene Logik

---

### 6️⃣ **App Layer** (Anwendungsinitialisierung)

**Zweck:** App-Setup, Provider, Router

```
src/app/
├── App.tsx              # Root Component
├── providers/           # Context Providers
├── router/              # Route Configuration
└── styles/              # Global Styles
```

---

## 🔗 Abhängigkeitsregeln

### Erlaubte Abhängigkeiten (Bottom-Up):

```
shared ← entities ← features ← widgets ← pages ← app
```

### Beispiele:

✅ **ERLAUBT:**

- `features/start-game` → `entities/game`
- `widgets/players-list` → `features/remove-player`
- `pages/start` → `widgets/qr-code-display`

❌ **VERBOTEN:**

- `entities/player` → `features/add-player`
- `shared/ui/Button` → `entities/game`
- `features` → `widgets`

### Public API Pattern:

Jeder Slice exportiert nur über `index.ts`:

```typescript
// entities/player/index.ts
export { PlayerCard } from "./ui/PlayerCard";
export { usePlayer } from "./model/usePlayer";
export type { Player } from "./model/types";
```

---

## 📂 Ordnerstruktur

### Vollständige Projektstruktur:

```
darts-app/
├── public/
│   ├── sounds/
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── providers/
│   ├── pages/
│   │   ├── start/
│   │   ├── game/
│   │   ├── game-summary/
│   │   ├── player-profile/
│   │   ├── login/
│   │   ├── registration/
│   │   └── joined-game/
│   ├── widgets/
│   │   ├── navigation/
│   │   ├── game-board/
│   │   ├── players-list/
│   │   ├── keyboard/
│   │   ├── podium/
│   │   ├── statistics/
│   │   └── qr-code-display/
│   ├── features/
│   │   ├── game/
│   │   │   ├── start-game/
│   │   │   └── throw-darts/
│   │   ├── player/
│   │   │   ├── add-player/
│   │   │   └── remove-player/
│   │   ├── room/
│   │   │   ├── create-room/
│   │   │   └── join-room/
│   │   └── auth/
│   │       ├── login/
│   │       └── registration/
│   ├── entities/
│   │   ├── player/
│   │   ├── game/
│   │   ├── room/
│   │   └── settings/
│   ├── shared/
│   │   ├── ui/
│   │   ├── api/
│   │   ├── config/
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── lib/
│   │   └── assets/
│   └── index.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── FSD_ARCHITECTURE.md (diese Datei)
```

---

## 🔄 Migrationsplan

### Phase 1: Shared Layer

1. Verschiebe `components/Button`, `components/InputField` → `shared/ui/`
2. Verschiebe `services/api.ts` → `shared/api/`
3. Verschiebe `types/` → `shared/types/`
4. Verschiebe `icons/`, `fonts/` → `shared/assets/`
5. Verschiebe generische Hooks → `shared/hooks/`
6. Erstelle `shared/config/constants.ts` für App-Konstanten

### Phase 2: Entities Layer

1. Erstelle `entities/player/` mit PlayerCard, PlayerAvatar
2. Erstelle `entities/game/` mit GameState, GameTypes
3. Erstelle `entities/room/` mit Room-Model
4. Erstelle `entities/settings/` mit Settings-Store
5. Verschiebe entsprechende API-Calls in `entity/*/api/`

### Phase 3: Features Layer

1. Extrahiere `features/game/start-game/`
2. Extrahiere `features/player/add-player/`
3. Extrahiere `features/player/remove-player/`
4. Extrahiere `features/room/create-room/`
5. Extrahiere `features/auth/login/`
6. Extrahiere `features/auth/registration/`

### Phase 4: Widgets Layer

1. Verschiebe `NavigationBar` → `widgets/navigation/`
2. Verschiebe `LivePlayersList` → `widgets/players-list/`
3. Verschiebe `Keyboard` → `widgets/keyboard/`
4. Verschiebe `Podium` → `widgets/podium/`
5. Verschiebe `QRCode` → `widgets/qr-code-display/`
6. Verschiebe `Statistics` → `widgets/statistics/`

### Phase 5: Pages Layer

1. Refactor `pages/start/` mit ui/ und model/
2. Refactor `pages/game/` mit ui/ und model/
3. Refactor `pages/gamesummary/` → `pages/game-summary/`
4. Refactor `pages/Playerprofile/` → `pages/player-profile/`
5. Refactor `pages/Login/` → `pages/login/`
6. Refactor `pages/Registration/` → `pages/registration/`
7. Refactor `pages/JoinedGame/` → `pages/joined-game/`

### Phase 6: App Layer

1. Cleanup `app/App.tsx`
2. Organisiere Router in `app/router/`
3. Organisiere Providers in `app/providers/`
4. Verschiebe globale Styles

---

## 📖 Best Practices

### 1. **Index-Dateien verwenden**

Jeder Slice sollte ein `index.ts` haben:

```typescript
// features/start-game/index.ts
export { StartGameButton } from "./ui/StartGameButton";
export { useStartGame } from "./model/useStartGame";
```

### 2. **Klare Namenskonventionen**

- **UI-Komponenten:** PascalCase (`PlayerCard.tsx`)
- **Hooks:** camelCase mit `use` Prefix (`useGameState.ts`)
- **API-Funktionen:** camelCase (`fetchPlayers.ts`)
- **Types:** PascalCase mit Type/Interface keyword

### 3. **Segment-Struktur einhalten**

```
feature-name/
├── ui/
├── model/
├── api/
├── lib/
├── config/
└── index.ts
```

### 4. **Single Responsibility**

Jede Feature sollte genau **eine User-Story** abbilden.

### 5. **Testing Structure**

Tests folgen der gleichen Struktur:

```
feature-name/
├── ui/
│   ├── Component.tsx
│   └── Component.test.tsx
└── model/
    ├── useHook.ts
    └── useHook.test.ts
```

---

## 🎓 Weitere Ressourcen

- [FSD Official Documentation](https://feature-sliced.design/)
- [FSD Examples](https://github.com/feature-sliced/examples)
- [FSD Discord Community](https://discord.gg/S8MzWTUsmp)

---

## 📝 Änderungshistorie

| Datum      | Version | Änderung                       |
| ---------- | ------- | ------------------------------ |
| 2025-12-03 | 1.0.0   | Initiale FSD-Struktur erstellt |

---

**Hinweis:** Diese Architektur ist ein Living Document und sollte bei strukturellen Änderungen aktualisiert werden.

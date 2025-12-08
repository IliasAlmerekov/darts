# 🎯 Refactoring Plan: Backend-First Architecture mit FSD

## Überblick

Dieser Plan beschreibt die komplette Umstellung der Darts-App auf eine **Backend-First Architecture** mit vollständiger **Feature-Sliced Design (FSD)** Struktur.

**Hauptziele:**

1. ✅ Alle Business-Logik ins Backend verschieben
2. ✅ Frontend wird zur reinen Presentation Layer
3. ✅ SessionStorage/LocalStorage komplett entfernen
4. ✅ Vollständige FSD-Architektur implementieren
5. ✅ Server-Sent Events für Echtzeit-Updates nutzen
6. ✅ Backend als Single Source of Truth

---

## 📋 Aktuelle Probleme

### 1. **State Management im Frontend**

- ❌ Nanostores speichern Spiel-State lokal (`$game`, `$settings`, `$room`, `$ui`)
- ❌ SessionStorage für OngoingGame und RoomInvitation
- ❌ LocalStorage für FinishedGames
- ❌ Frontend berechnet Scores und Spiellogik

### 2. **Business Logic im Frontend**

- ❌ Wurf-Validierung im Frontend
- ❌ Score-Berechnung im Frontend
- ❌ Rundenmanagement im Frontend
- ❌ Bust-Prüfung im Frontend

### 3. **Inkonsistente Datenquellen**

- ❌ Backend und Frontend können unterschiedliche Zustände haben
- ❌ Reload führt zu Datenverlust
- ❌ Keine zentrale Wahrheit (Source of Truth)

---

## 🎯 Ziel-Architektur

### Backend (Source of Truth)

```
Backend (Symfony)
├── Session Management (PHP Sessions)
├── Game State (PostgreSQL)
├── Business Logic (Services)
├── SSE Stream (Real-time Updates)
└── REST API (Data Queries)
```

### Frontend (Presentation Layer)

```
Frontend (React + FSD)
├── Pages (Routing)
├── Widgets (Composite Blocks)
├── Features (User Actions)
├── Entities (Domain Models)
└── Shared (UI Components, API Client)
```

---

## 📚 Phase 1: Shared Layer - API Infrastructure

### 1.1 API Client Setup

**Erstelle:** `src/shared/api/`

```typescript
src/shared/api/
├── client.ts              // Axios/Fetch Instance mit Interceptors
├── types.ts               // API Response Types
├── errors.ts              // Error Handling
└── config.ts              // Base URLs, Endpoints
```

**client.ts (Fetch):**

```typescript
const baseUrl = "/api";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    ...options,
  });

  if (response.status === 401) {
    window.location.href = "/";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};
```

**config.ts:**

```typescript
export const API_ENDPOINTS = {
  // Auth
  LOGIN: "/login",
  LOGOUT: "/logout",
  REGISTER: "/register",

  // Game Room
  CREATE_ROOM: "/room/create",
  LEAVE_ROOM: (id: number) => `/room/${id}`,
  SSE_STREAM: (id: number) => `/room/${id}/stream`,
  REMATCH: (id: number) => `/room/${id}/rematch`,

  // Game
  START_GAME: (id: number) => `/game/${id}/start`,
  RECORD_THROW: (id: number) => `/game/${id}/throw`,
  UNDO_THROW: (id: number) => `/game/${id}/throw`,
  GET_GAME: (id: number) => `/game/${id}`,
  FINISH_GAME: (id: number) => `/game/${id}/finished`,

  // Invitation
  CREATE_INVITE: (id: number) => `/invite/create/${id}`,
  JOIN_INVITE: (uuid: string) => `/invite/join/${uuid}`,

  // Statistics
  GAMES_OVERVIEW: "/games/overview",
  PLAYER_STATS: "/players/stats",
} as const;
```

### 1.2 Shared Types

**Erstelle:** `src/shared/types/`

```typescript
src/shared/types/
├── api.ts                 // API Request/Response Types
├── game.ts                // Game Domain Types
├── player.ts              // Player Domain Types
└── index.ts               // Re-exports
```

**game.ts:**

```typescript
export enum GameStatus {
  Lobby = "lobby",
  Started = "started",
  Finished = "finished",
}

export enum GameMode {
  Standard = "standard",
  DoubleOut = "double-out",
  TripleOut = "triple-out",
}

export interface GamePlayer {
  id: number;
  username: string;
  score: number;
  position: number | null;
  isWinner: boolean;
  playOrder: number;
  throws: number[];
}

export interface GameState {
  gameId: number;
  status: GameStatus;
  startScore: number;
  doubleOut: boolean;
  tripleOut: boolean;
  currentRound: number;
  currentPlayerId: number;
  winner: GamePlayer | null;
  players: GamePlayer[];
  throws: ThrowRecord[];
}

export interface ThrowRecord {
  playerId: number;
  round: number;
  throwNumber: number;
  value: number;
  score: number;
  isDouble: boolean;
  isTriple: boolean;
  isBust: boolean;
  timestamp: string;
}
```

---

## 📚 Phase 2: Entities Layer - Domain Models

### 2.1 Game Entity

**Erstelle:** `src/entities/game/`

```typescript
src/entities/game/
├── api/
│   ├── gameApi.ts         // Game API Calls
│   └── index.ts
├── model/
│   ├── types.ts           // Game Types
│   ├── gameStore.ts       // Game State (nur für Caching)
│   └── index.ts
├── ui/
│   ├── GameCard.tsx       // Game Card Component
│   ├── GameStatus.tsx     // Status Badge
│   └── index.ts
└── index.ts
```

**api/gameApi.ts:**

```typescript
import { apiClient } from "@/shared/api/client";
import { API_ENDPOINTS } from "@/shared/api/config";
import type { GameState, ThrowRequest, StartGameRequest } from "@/shared/types";

export const gameApi = {
  // Spiel abrufen
  getGame: async (gameId: number): Promise<GameState> => {
    return apiClient.get(API_ENDPOINTS.GET_GAME(gameId));
  },

  // Spiel starten
  startGame: async (gameId: number, data: StartGameRequest): Promise<GameState> => {
    return apiClient.post(API_ENDPOINTS.START_GAME(gameId), data);
  },

  // Wurf registrieren
  recordThrow: async (gameId: number, data: ThrowRequest): Promise<GameState> => {
    return apiClient.post(API_ENDPOINTS.RECORD_THROW(gameId), data);
  },

  // Wurf rückgängig
  undoThrow: async (gameId: number): Promise<GameState> => {
    return apiClient.delete(API_ENDPOINTS.UNDO_THROW(gameId));
  },

  // Spiel beenden
  finishGame: async (gameId: number): Promise<GameFinishResponse> => {
    return apiClient.get(API_ENDPOINTS.FINISH_GAME(gameId));
  },
};
```

**model/gameStore.ts (optional, nur für Caching):**

```typescript
import { atom } from "nanostores";
import type { GameState } from "@/shared/types";

// Nur als Cache, nicht als Source of Truth!
export const $currentGame = atom<GameState | null>(null);

export function setCurrentGame(game: GameState): void {
  $currentGame.set(game);
}

export function clearCurrentGame(): void {
  $currentGame.set(null);
}
```

### 2.2 Room Entity

**Erstelle:** `src/entities/room/`

```typescript
src/entities/room/
├── api/
│   ├── roomApi.ts
│   └── index.ts
├── model/
│   ├── types.ts
│   ├── sseHook.ts         // SSE Hook
│   └── index.ts
└── index.ts
```

**api/roomApi.ts:**

```typescript
import { apiClient } from "@/shared/api/client";
import { API_ENDPOINTS } from "@/shared/api/config";

export const roomApi = {
  createRoom: async (data?: { previousGameId?: number }): Promise<CreateRoomResponse> => {
    return apiClient.post(API_ENDPOINTS.CREATE_ROOM, data);
  },

  leaveRoom: async (gameId: number, playerId: number): Promise<void> => {
    return apiClient.delete(API_ENDPOINTS.LEAVE_ROOM(gameId), {
      params: { playerId },
    });
  },

  createRematch: async (gameId: number): Promise<CreateRoomResponse> => {
    return apiClient.post(API_ENDPOINTS.REMATCH(gameId));
  },
};
```

**model/sseHook.ts:**

```typescript
import { useEffect, useState } from "react";
import { API_ENDPOINTS } from "@/shared/api/config";

interface SseEvent {
  type: string;
  data: unknown;
}

export function useRoomStream(gameId: number | null) {
  const [event, setEvent] = useState<SseEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!gameId) return;

    const eventSource = new EventSource(API_ENDPOINTS.SSE_STREAM(gameId));

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.addEventListener("player-joined", (e) => {
      setEvent({ type: "player-joined", data: JSON.parse(e.data) });
    });

    eventSource.addEventListener("player-left", (e) => {
      setEvent({ type: "player-left", data: JSON.parse(e.data) });
    });

    eventSource.addEventListener("game-started", (e) => {
      setEvent({ type: "game-started", data: JSON.parse(e.data) });
    });

    eventSource.addEventListener("throw-recorded", (e) => {
      setEvent({ type: "throw-recorded", data: JSON.parse(e.data) });
    });

    eventSource.addEventListener("game-finished", (e) => {
      setEvent({ type: "game-finished", data: JSON.parse(e.data) });
    });

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [gameId]);

  return { event, isConnected };
}
```

### 2.3 Player Entity

**Erstelle:** `src/entities/player/`

```typescript
src/entities/player/
├── api/
│   ├── playerApi.ts
│   └── index.ts
├── model/
│   ├── types.ts
│   └── index.ts
├── ui/
│   ├── PlayerCard.tsx
│   ├── PlayerAvatar.tsx
│   └── index.ts
└── index.ts
```

---

## 📚 Phase 3: Features Layer - User Actions

### 3.1 Auth Features

**Erstelle:** `src/features/auth/`

```typescript
src/features/auth/
├── login/
│   ├── ui/
│   │   └── LoginForm.tsx
│   ├── model/
│   │   └── useLogin.ts
│   └── index.ts
├── registration/
│   ├── ui/
│   │   └── RegistrationForm.tsx
│   ├── model/
│   │   └── useRegistration.ts
│   └── index.ts
└── logout/
    ├── model/
    │   └── useLogout.ts
    └── index.ts
```

**login/model/useLogin.ts:**

```typescript
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/shared/api/client";

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("_username", username);
      formData.append("_password", password);

      const response = await apiClient.post("/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      // Backend redirected bereits zu /api/login/success
      if (response.redirect) {
        navigate(response.redirect);
      }
    } catch (err) {
      setError("Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
}
```

### 3.2 Game Features

**Erstelle:** `src/features/game/`

```typescript
src/features/game/
├── start-game/
│   ├── ui/
│   │   └── StartGameButton.tsx
│   ├── model/
│   │   └── useStartGame.ts
│   └── index.ts
├── record-throw/
│   ├── ui/
│   │   ├── ThrowInput.tsx
│   │   └── ScoreKeyboard.tsx
│   ├── model/
│   │   └── useRecordThrow.ts
│   └── index.ts
├── undo-throw/
│   ├── ui/
│   │   └── UndoButton.tsx
│   ├── model/
│   │   └── useUndoThrow.ts
│   └── index.ts
└── finish-game/
    ├── model/
    │   └── useFinishGame.ts
    └── index.ts
```

**record-throw/model/useRecordThrow.ts:**

```typescript
import { useState } from "react";
import { gameApi } from "@/entities/game";
import type { ThrowRequest } from "@/shared/types";

export function useRecordThrow(gameId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordThrow = async (data: ThrowRequest) => {
    setLoading(true);
    setError(null);

    try {
      // Backend macht ALLE Berechnungen!
      const updatedGame = await gameApi.recordThrow(gameId, data);

      // Gibt aktualisiertes Game zurück
      return updatedGame;
    } catch (err) {
      setError("Wurf konnte nicht registriert werden");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { recordThrow, loading, error };
}
```

### 3.3 Room Features

**Erstelle:** `src/features/room/`

```typescript
src/features/room/
├── create-room/
│   ├── ui/
│   │   └── CreateRoomButton.tsx
│   ├── model/
│   │   └── useCreateRoom.ts
│   └── index.ts
├── join-room/
│   ├── ui/
│   │   └── JoinRoomForm.tsx
│   ├── model/
│   │   └── useJoinRoom.ts
│   └── index.ts
├── leave-room/
│   ├── ui/
│   │   └── LeaveRoomButton.tsx
│   ├── model/
│   │   └── useLeaveRoom.ts
│   └── index.ts
└── rematch/
    ├── ui/
    │   └── RematchButton.tsx
    ├── model/
    │   └── useRematch.ts
    └── index.ts
```

**create-room/model/useCreateRoom.ts:**

```typescript
import { useState } from "react";
import { roomApi } from "@/entities/room";

export function useCreateRoom() {
  const [loading, setLoading] = useState(false);

  const createRoom = async (previousGameId?: number) => {
    setLoading(true);

    try {
      const response = await roomApi.createRoom({ previousGameId });
      return response; // { gameId, invitationLink }
    } finally {
      setLoading(false);
    }
  };

  return { createRoom, loading };
}
```

---

## 📚 Phase 4: Widgets Layer - Composite Blocks

### 4.1 Game Board Widget

**Erstelle:** `src/widgets/game-board/`

```typescript
src/widgets/game-board/
├── ui/
│   ├── GameBoard.tsx
│   ├── GameBoard.module.css
│   └── index.ts
├── model/
│   └── useGameBoard.ts
└── index.ts
```

**ui/GameBoard.tsx:**

```typescript
import { useEffect, useState } from 'react';
import { gameApi } from '@/entities/game';
import { useRoomStream } from '@/entities/room';
import { GamePlayersList } from '@/widgets/players-list';
import { ScoreKeyboard } from '@/features/game/record-throw';
import type { GameState } from '@/shared/types';

interface GameBoardProps {
  gameId: number;
}

export function GameBoard({ gameId }: GameBoardProps) {
  const [game, setGame] = useState<GameState | null>(null);
  const { event } = useRoomStream(gameId);

  // Initial Load
  useEffect(() => {
    gameApi.getGame(gameId).then(setGame);
  }, [gameId]);

  // SSE Updates
  useEffect(() => {
    if (event?.type === 'throw-recorded') {
      // Backend sendet vollständigen neuen Game State
      setGame(event.data as GameState);
    }
  }, [event]);

  if (!game) return <div>Loading...</div>;

  return (
    <div>
      <GamePlayersList players={game.players} currentPlayerId={game.currentPlayerId} />
      <ScoreKeyboard gameId={gameId} currentPlayer={game.currentPlayerId} />
    </div>
  );
}
```

### 4.2 Players List Widget

**Erstelle:** `src/widgets/players-list/`

```typescript
src/widgets/players-list/
├── ui/
│   ├── PlayersList.tsx
│   ├── PlayersListItem.tsx
│   └── index.ts
└── index.ts
```

### 4.3 Navigation Widget

**Erstelle:** `src/widgets/navigation/`

```typescript
src/widgets/navigation/
├── ui/
│   ├── NavigationBar.tsx
│   └── index.ts
└── index.ts
```

---

## 📚 Phase 5: Pages Layer - Complete FSD Migration

### 5.1 Start Page (Bereits teilweise migriert)

**Erweitere:** `src/pages/start/`

```typescript
src/pages/start/
├── ui/
│   ├── StartPage.tsx
│   ├── StartPage.module.css
│   └── index.ts
├── model/
│   └── useStartPage.ts      // NUR UI-Logik, keine Business Logic
└── index.ts
```

**model/useStartPage.ts (neu):**

```typescript
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { roomApi } from "@/entities/room";
import { useRoomStream } from "@/entities/room";
import { useCreateRoom } from "@/features/room/create-room";
import { useStartGame } from "@/features/game/start-game";

export function useStartPage() {
  const navigate = useNavigate();
  const [gameId, setGameId] = useState<number | null>(null);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const { event } = useRoomStream(gameId);
  const { createRoom, loading: creating } = useCreateRoom();
  const { startGame, loading: starting } = useStartGame();

  const handleCreateRoom = async (previousGameId?: number) => {
    const response = await createRoom(previousGameId);
    setGameId(response.gameId);
    setInvitationLink(response.invitationLink);
  };

  const handleStartGame = async () => {
    if (!gameId) return;

    await startGame(gameId, {
      startscore: 301,
      doubleout: true,
      tripleout: false,
    });

    navigate(`/game/${gameId}`);
  };

  // SSE: Player beigetreten
  useEffect(() => {
    if (event?.type === "player-joined") {
      // Backend sendet Update, neu laden
      // Kein State-Management nötig!
    }
  }, [event]);

  return {
    gameId,
    invitationLink,
    creating,
    starting,
    handleCreateRoom,
    handleStartGame,
  };
}
```

### 5.2 Game Page

**Erstelle:** `src/pages/game/`

```typescript
src/pages/game/
├── ui/
│   ├── GamePage.tsx
│   ├── GamePage.module.css
│   └── index.ts
├── model/
│   └── useGamePage.ts
└── index.ts
```

**ui/GamePage.tsx:**

```typescript
import { useParams } from 'react-router-dom';
import { GameBoard } from '@/widgets/game-board';
import { NavigationBar } from '@/widgets/navigation';

export function GamePage() {
  const { id } = useParams<{ id: string }>();
  const gameId = Number(id);

  return (
    <div>
      <NavigationBar />
      <GameBoard gameId={gameId} />
    </div>
  );
}
```

### 5.3 Game Summary Page (bereits migriert)

**Aktualisiere:** `src/pages/game-summary/model/useGameSummaryPage.ts`

```typescript
// ENTFERNE alle sessionStorage Calls!
// Backend hat bereits alles gespeichert
```

---

## 🔄 Migration Steps

### Step 1: Shared Layer (Woche 1)

1. ✅ API Client erstellen
2. ✅ Shared Types definieren
3. ✅ Error Handling Setup
4. ✅ Config mit Endpoints

### Step 2: Entities Layer (Woche 2)

1. ✅ Game Entity mit API
2. ✅ Room Entity mit SSE Hook
3. ✅ Player Entity mit API
4. ✅ Statistics Entity

### Step 3: Features Layer (Woche 3-4)

1. ✅ Auth Features (Login, Register, Logout)
2. ✅ Game Features (Start, Throw, Undo, Finish)
3. ✅ Room Features (Create, Join, Leave, Rematch)
4. ✅ Player Features (Add, Remove)

### Step 4: Widgets Layer (Woche 5)

1. ✅ Game Board Widget
2. ✅ Players List Widget
3. ✅ Navigation Widget
4. ✅ Statistics Widget

### Step 5: Pages Migration (Woche 6-7)

1. ✅ Login/Registration (bereits teilweise gemacht)
2. ✅ Start Page (aktualisieren)
3. ✅ Game Page (neu erstellen)
4. ✅ Game Summary (aktualisieren)
5. ✅ Statistics Page

### Step 6: Cleanup (Woche 8)

1. ❌ LÖSCHEN: Alle Nanostores (`$game`, `$settings`, etc.)
2. ❌ LÖSCHEN: SessionStorage/LocalStorage Calls
3. ❌ LÖSCHEN: Frontend-seitige Berechnungen
4. ❌ LÖSCHEN: Alte Service-Dateien
5. ✅ Tests schreiben
6. ✅ Dokumentation aktualisieren

---

## 🚫 Was wird ENTFERNT

### Stores (komplettes Löschen)

```
src/stores/
├── game.ts          ❌ DELETE
├── room.ts          ❌ DELETE
├── settings.ts      ❌ DELETE
├── ui.ts            ❌ DELETE
└── index.ts         ❌ DELETE
```

### Services (komplett ersetzen)

```
src/services/
├── api.ts           ❌ ERSETZEN durch src/shared/api/
├── Game/            ❌ ERSETZEN durch src/entities/game/
└── ...              ❌ ERSETZEN durch FSD Structure
```

### Hooks (teilweise ersetzen)

```
src/hooks/
├── useGameState.ts       ❌ DELETE (Backend hat State)
├── useGamePlayers.ts     ✅ BEHALTEN (fetch hook)
├── useGameThrows.ts      ❌ DELETE (Backend managed)
├── useRoomInvitation.ts  ❌ ERSETZEN (kein sessionStorage)
└── ...
```

### Components (nach FSD migrieren)

```
src/components/
├── Button/           → src/shared/ui/button/
├── Keyboard/         → src/features/game/record-throw/ui/
├── Overlay/          → src/shared/ui/overlay/
├── Podium/           → src/widgets/podium/
├── Statistics/       → src/widgets/statistics/
└── ...
```

---

## 🎯 Neue Datenflüsse

### Alter Fluss (❌ Falsch):

```
User Input → Frontend Logic → Update Local State → API Call → Backend
              ↓
        LocalStorage/SessionStorage
```

### Neuer Fluss (✅ Richtig):

```
User Input → API Call → Backend Logic → Database Update → SSE Event → Frontend Update
                                            ↓
                                   PHP Session (Backend)
```

### Beispiel: Wurf registrieren

**ALT (❌):**

```typescript
// Frontend berechnet alles selbst
const newScore = currentScore - value;
const isBust = newScore < 0;
updateLocalState({ score: newScore });
await api.recordThrow({ value });
```

**NEU (✅):**

```typescript
// Frontend sendet nur rohe Daten
const updatedGame = await gameApi.recordThrow(gameId, {
  playerId,
  value: 20,
  isDouble: false,
  isTriple: true,
});

// Backend returned vollständigen neuen State
setGame(updatedGame);
```

---

## 📊 Backend-Erweiterungen (optional)

### Zusätzliche Endpunkte die hilfreich wären:

```php
// 1. Game State via GET (existiert bereits)
GET /api/game/{id}

// 2. Current User Session Info
GET /api/user/current
Response: {
  id: 123,
  username: "player1",
  roles: ["ROLE_PLAYER"],
  currentGameId: 42 // Falls in Spiel
}

// 3. Player's Active Game
GET /api/player/active-game
Response: {
  gameId: 42,
  status: "started",
  isMyTurn: true
}
```

---

## ✅ Testing Strategy

### Unit Tests

```typescript
// Features
describe("useRecordThrow", () => {
  it("should call API and return updated game", async () => {
    const { recordThrow } = useRecordThrow(42);
    const result = await recordThrow({ value: 20 });
    expect(result.currentRound).toBe(5);
  });
});
```

### Integration Tests

```typescript
// Pages
describe('GamePage', () => {
  it('should load game and display players', async () => {
    render(<GamePage />);
    await waitFor(() => {
      expect(screen.getByText('Player 1')).toBeInTheDocument();
    });
  });
});
```

---

## 📝 Checkliste

### Phase 1: Foundation

- [ ] Shared API Client erstellen
- [ ] Shared Types definieren
- [ ] Error Handling implementieren
- [ ] Config mit Endpoints

### Phase 2: Entities

- [ ] Game Entity (API + Model + UI)
- [ ] Room Entity (API + SSE Hook)
- [ ] Player Entity (API + Model + UI)

### Phase 3: Features

- [ ] Auth Features (Login, Register, Logout)
- [ ] Game Features (Start, Throw, Undo, Finish)
- [ ] Room Features (Create, Join, Leave, Rematch)

### Phase 4: Widgets

- [ ] Game Board Widget
- [ ] Players List Widget
- [ ] Navigation Widget
- [ ] Statistics Widget

### Phase 5: Pages

- [ ] Login/Registration Pages
- [ ] Start Page
- [ ] Game Page
- [ ] Game Summary Page
- [ ] Statistics Page

### Phase 6: Cleanup

- [ ] Stores löschen
- [ ] SessionStorage/LocalStorage entfernen
- [ ] Alte Services löschen
- [ ] Frontend-Berechnungen entfernen
- [ ] Tests schreiben
- [ ] Dokumentation

---

## 🚀 Getting Started

### 1. Neuen Branch erstellen

```bash
git checkout -b refactor/fsd-backend-first
```

### 2. Shared Layer aufbauen

```bash
mkdir -p src/shared/{api,types,ui,lib,hooks}
```

### 3. API Client implementieren

```bash
# Datei: src/shared/api/client.ts
# Siehe Beispiele oben
```

### 4. Erste Entity migrieren (Game)

```bash
mkdir -p src/entities/game/{api,model,ui}
```

### 5. Erste Feature implementieren (Record Throw)

```bash
mkdir -p src/features/game/record-throw/{ui,model}
```

---

## 📚 Ressourcen

- [Feature-Sliced Design Dokumentation](https://feature-sliced.design/)
- [Backend Dokumentation](./BACKEND_DOKUMENTATION.md)
- [FSD Architecture](./FSD_ARCHITECTURE.md)
- [FSD Migration Guide](./FSD_MIGRATION_GUIDE.md)

---

**Erstellt:** 2025-12-08  
**Version:** 1.0  
**Status:** 📋 Planning

Welcome | Feature-Sliced Design
Architectural methodology for frontend projects

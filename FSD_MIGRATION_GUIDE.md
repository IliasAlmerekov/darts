# Migration Guide: Current → FSD Structure

## 📦 Aktuelle Struktur Mapping

### Components → Wohin verschieben?

| Aktuell                            | FSD Ziel                   | Grund                    |
| ---------------------------------- | -------------------------- | ------------------------ |
| `components/Button/`               | `shared/ui/button/`        | Generische UI-Komponente |
| `components/InputField/`           | `shared/ui/input/`         | Generische UI-Komponente |
| `components/LinkButton/`           | `shared/ui/link-button/`   | Generische UI-Komponente |
| `components/Overlay/`              | `shared/ui/overlay/`       | Generische UI-Komponente |
| `components/NavigationBar/`        | `widgets/navigation/`      | Komplexer UI-Block       |
| `components/LivePlayersList/`      | `widgets/players-list/`    | Komplexer UI-Block       |
| `components/Keyboard/`             | `widgets/keyboard/`        | Komplexer UI-Block       |
| `components/Podium/`               | `widgets/podium/`          | Komplexer UI-Block       |
| `components/Statistics/`           | `widgets/statistics/`      | Komplexer UI-Block       |
| `components/QRCode/`               | `widgets/qr-code-display/` | Komplexer UI-Block       |
| `components/GamePlayerItem/`       | `entities/player/ui/`      | Player-Darstellung       |
| `components/OverviewPlayerItem/`   | `entities/player/ui/`      | Player-Darstellung       |
| `components/PlayerItems/`          | `entities/player/ui/`      | Player-Darstellung       |
| `components/PodiumPlayerCard/`     | `entities/player/ui/`      | Player-Darstellung       |
| `components/Settings/`             | `entities/settings/ui/`    | Settings-Darstellung     |
| `components/ProtectedRoute/`       | `app/router/`              | App-Level Routing        |
| `components/LoginSuccessSkeleton/` | `pages/login/ui/`          | Login-Page spezifisch    |
| `components/StartPageSkeleton/`    | `pages/start/ui/`          | Start-Page spezifisch    |
| `components/Universalskeleton/`    | `shared/ui/skeleton/`      | Generische UI-Komponente |

### Services → Wohin verschieben?

| Aktuell           | FSD Ziel               |
| ----------------- | ---------------------- |
| `services/api.ts` | `shared/api/client.ts` |
| `services/Game/`  | `entities/game/api/`   |

### Stores → Wohin verschieben?

| Aktuell              | FSD Ziel                           |
| -------------------- | ---------------------------------- |
| `stores/game.ts`     | `entities/game/model/store.ts`     |
| `stores/room.ts`     | `entities/room/model/store.ts`     |
| `stores/settings.ts` | `entities/settings/model/store.ts` |
| `stores/ui.ts`       | `shared/model/ui-store.ts`         |

### Hooks → Wohin verschieben?

| Aktuell                                | FSD Ziel                                    | Layer   |
| -------------------------------------- | ------------------------------------------- | ------- |
| `hooks/useAuthenticatedUser.ts`        | `entities/player/model/`                    | Entity  |
| `hooks/useEventSource.ts`              | `shared/hooks/`                             | Shared  |
| `hooks/useGamePlayers.ts`              | `entities/game/model/`                      | Entity  |
| `hooks/useGameState.ts`                | `entities/game/model/`                      | Entity  |
| `hooks/useGameThrows.ts`               | `entities/game/model/`                      | Entity  |
| `hooks/useInitializePlayers.ts`        | `features/player/initialize-players/model/` | Feature |
| `hooks/useRoomInvitation.ts`           | `entities/room/model/`                      | Entity  |
| `hooks/useSyncLivePlayersWithEvent.ts` | `features/player/sync-players/model/`       | Feature |

### Pages → Wohin verschieben?

| Aktuell                 | FSD Ziel                                    |
| ----------------------- | ------------------------------------------- |
| `pages/start/start.tsx` | `pages/start/index.tsx` + `pages/start/ui/` |
| `pages/Game/`           | `pages/game/`                               |
| `pages/gamesummary/`    | `pages/game-summary/`                       |
| `pages/JoinedGame/`     | `pages/joined-game/`                        |
| `pages/Login/`          | `pages/login/`                              |
| `pages/Registration/`   | `pages/registration/`                       |
| `pages/Playerprofile/`  | `pages/player-profile/`                     |

### Types → Wohin verschieben?

| Aktuell             | FSD Ziel                   |
| ------------------- | -------------------------- |
| `types/BASIC.d.ts`  | `shared/types/basic.ts`    |
| `types/event.ts`    | `shared/types/event.ts`    |
| `types/global.d.ts` | `shared/types/global.d.ts` |

### Assets → Wohin verschieben?

| Aktuell          | FSD Ziel                                        |
| ---------------- | ----------------------------------------------- |
| `icons/`         | `shared/assets/icons/`                          |
| `fonts/`         | `shared/assets/fonts/`                          |
| `public/sounds/` | `shared/assets/sounds/` (oder in public lassen) |

### CSS → Wohin verschieben?

| Aktuell                   | FSD Ziel                  |
| ------------------------- | ------------------------- |
| `css/index.css`           | `app/styles/global.css`   |
| Component-spezifische CSS | Bleibt bei der Komponente |

---

## 🔧 Schritt-für-Schritt Migration

### Schritt 1: Shared Layer erstellen

```bash
# UI Komponenten
mv src/components/Button src/shared/ui/button
mv src/components/InputField src/shared/ui/input
mv src/components/LinkButton src/shared/ui/link-button
mv src/components/Overlay src/shared/ui/overlay
mv src/components/Universalskeleton src/shared/ui/skeleton

# API
mv src/services/api.ts src/shared/api/client.ts

# Hooks
mv src/hooks/useEventSource.ts src/shared/hooks/

# Types
mv src/types/* src/shared/types/

# Assets
mv src/icons/* src/shared/assets/icons/
mv src/fonts/* src/shared/assets/fonts/
```

### Schritt 2: Entities Layer erstellen

```bash
# Player Entity
mkdir -p src/entities/player/{ui,model,api}
mv src/components/GamePlayerItem/* src/entities/player/ui/
mv src/components/OverviewPlayerItem/* src/entities/player/ui/
mv src/components/PlayerItems/* src/entities/player/ui/
mv src/components/PodiumPlayerCard/* src/entities/player/ui/
mv src/hooks/useAuthenticatedUser.ts src/entities/player/model/

# Game Entity
mkdir -p src/entities/game/{ui,model,api}
mv src/stores/game.ts src/entities/game/model/store.ts
mv src/hooks/useGamePlayers.ts src/entities/game/model/
mv src/hooks/useGameState.ts src/entities/game/model/
mv src/hooks/useGameThrows.ts src/entities/game/model/
mv src/services/Game/* src/entities/game/api/

# Room Entity
mkdir -p src/entities/room/{ui,model}
mv src/stores/room.ts src/entities/room/model/store.ts
mv src/hooks/useRoomInvitation.ts src/entities/room/model/

# Settings Entity
mkdir -p src/entities/settings/{ui,model}
mv src/stores/settings.ts src/entities/settings/model/store.ts
mv src/components/Settings/* src/entities/settings/ui/
```

### Schritt 3: Features Layer erstellen

```bash
# Features aus Hooks extrahieren
mv src/hooks/useInitializePlayers.ts src/features/player/initialize-players/model/
mv src/hooks/useSyncLivePlayersWithEvent.ts src/features/player/sync-players/model/
```

### Schritt 4: Widgets Layer erstellen

```bash
mv src/components/NavigationBar src/widgets/navigation
mv src/components/LivePlayersList src/widgets/players-list
mv src/components/Keyboard src/widgets/keyboard
mv src/components/Podium src/widgets/podium
mv src/components/Statistics src/widgets/statistics
mv src/components/QRCode src/widgets/qr-code-display
```

### Schritt 5: Pages umorganisieren

```bash
# Bestehende Pages in ui/ Ordner verschieben
# Dann index.ts als Entry Point erstellen
```

### Schritt 6: Import-Pfade aktualisieren

Alle Import-Statements müssen aktualisiert werden:

```typescript
// Vorher
import Button from "../../components/Button/Button";

// Nachher
import { Button } from "shared/ui/button";
```

---

## ⚠️ Wichtige Hinweise

1. **Schrittweise migrieren:** Nicht alles auf einmal verschieben
2. **Tests laufen lassen:** Nach jedem Schritt Tests ausführen
3. **Imports aktualisieren:** Alle Import-Pfade anpassen
4. **Index-Dateien erstellen:** Public API für jeden Slice
5. **TypeScript-Fehler beheben:** tsconfig.json Paths anpassen

---

## 🎯 Erfolgskriterien

- [ ] Alle Dateien sind in FSD-Layer organisiert
- [ ] Keine zirkulären Abhängigkeiten
- [ ] Alle Tests laufen durch
- [ ] TypeScript kompiliert ohne Fehler
- [ ] App läuft wie vorher
- [ ] Imports folgen FSD-Konvention
- [ ] Jeder Slice hat index.ts mit Public API

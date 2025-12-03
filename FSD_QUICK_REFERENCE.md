# Feature-Sliced Design - Quick Reference

## 📋 Layer Übersicht

```
┌─────────────────────────────────────┐
│           APP LAYER                 │  ← Root, Providers, Router
├─────────────────────────────────────┤
│          PAGES LAYER                │  ← Routen/Seiten
├─────────────────────────────────────┤
│         WIDGETS LAYER               │  ← Große UI-Blöcke
├─────────────────────────────────────┤
│        FEATURES LAYER               │  ← User-Interaktionen
├─────────────────────────────────────┤
│        ENTITIES LAYER               │  ← Business-Objekte
├─────────────────────────────────────┤
│         SHARED LAYER                │  ← Wiederverwendbare Basis
└─────────────────────────────────────┘
```

## 🎯 Wann verwende ich welchen Layer?

### SHARED

- ✅ Generische UI-Komponenten (Button, Input)
- ✅ Utility-Funktionen (formatDate, validateEmail)
- ✅ API-Client Setup
- ✅ TypeScript Types/Interfaces
- ✅ Assets (Icons, Fonts, Sounds)

### ENTITIES

- ✅ Player, Game, Room Darstellung
- ✅ Reine Daten-Komponenten ohne Interaktion
- ✅ CRUD API-Calls
- ✅ Domain Types

### FEATURES

- ✅ "Start Game" Button mit Logik
- ✅ "Add Player" Formular
- ✅ "Throw Darts" Eingabe
- ✅ Eine konkrete User-Aktion

### WIDGETS

- ✅ Navigation Bar
- ✅ Player Liste (komplett)
- ✅ Game Board
- ✅ Keyboard Widget

### PAGES

- ✅ /start Route
- ✅ /game Route
- ✅ /game-summary Route
- ✅ Komponiert Widgets & Features

## 🔗 Abhängigkeitsregel

```
shared ← entities ← features ← widgets ← pages ← app
   ↑        ↑          ↑          ↑         ↑
   └────────┴──────────┴──────────┴─────────┘
        DARF IMPORTIERT WERDEN VON
```

## 📁 Segment-Struktur

```
feature-name/
├── ui/           # React Komponenten
├── model/        # Hooks, State, Logic
├── api/          # API Calls
├── lib/          # Utils
├── config/       # Konstanten
└── index.ts      # Public API
```

## ✅ Import-Beispiele

```typescript
// ✅ RICHTIG
import { Button } from "shared/ui/Button";
import { Player } from "entities/player";
import { AddPlayerButton } from "features/player/add-player";

// ❌ FALSCH
import { Button } from "shared/ui/Button/Button.tsx";
import { PlayerCard } from "entities/player/ui/PlayerCard";
```

## 🚀 Migrations-Checkliste

- [ ] Phase 1: Shared Layer (UI, API, Types, Assets)
- [ ] Phase 2: Entities Layer (Player, Game, Room, Settings)
- [ ] Phase 3: Features Layer (Start Game, Add/Remove Player, Auth)
- [ ] Phase 4: Widgets Layer (Navigation, Lists, Keyboard, Podium)
- [ ] Phase 5: Pages Layer (Alle Routen refactorn)
- [ ] Phase 6: App Layer (Router, Providers cleanup)

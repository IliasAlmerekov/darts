# Аудит репозитория darts-app

> **Дата**: 2026-03-04
> **Ветка**: `refactor/game`
> **Стек**: React 18 · TypeScript 5.8 · Vite 7 · React Router 6 · Nanostores · CSS Modules · Vitest · Playwright

---

## Текущие оценки

| Критерий | Сейчас | Цель |
|----------|--------|------|
| Архитектура / читаемость | 5/10 | 10/10 |
| Типобезопасность | 6/10 | 10/10 |
| Тестируемость | 4/10 | 10/10 |
| DX / инструменты | 5/10 | 10/10 |
| Безопасность | 7/10 | 10/10 |
| Performance | 6/10 | 10/10 |

---

## Задачи для достижения 10/10

Задачи сгруппированы по категории. Внутри каждой — от критичного к менее важному.

---

## 1. Архитектура / читаемость — 5/10

Цель: однозначная структура, в которой новый разработчик разбирается за 10 минут.

### 1.1 Удалить dependency-cruiser

**Проблема**: dep-cruiser имеет одно правило, которое уже продублировано в ESLint (`no-restricted-imports`). Для 3-слойной архитектуры (app → pages → shared) инструмент избыточен.

**Задача**:
- Удалить `.dependency-cruiser.cjs`
- Удалить из `package.json` скрипты `architecture:check`, `architecture:report`
- Удалить `"dependency-cruiser"` из `devDependencies`
- Перенести охрану границ полностью в ESLint (см. задачу 1.2)

---

### 1.2 Укрепить архитектурные границы через ESLint

**Проблема**: ESLint запрещает `shared → pages`, но не запрещает `pages → pages`. Правило также не покрывает импорты по относительному пути.

**Задача** — дополнить `eslint.config.mjs`:

```js
// Shared не импортирует pages/app (уже есть, оставить)
{
  files: ["src/shared/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: ["@/pages/*", "@/app/*", "../pages/*", "../app/*"],
    }],
  },
},
// Pages не импортируют другие pages
{
  files: ["src/pages/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: ["@/pages/*"],
      // Исключение: файл может импортировать из своей же папки
    }],
  },
},
```

---

### 1.3 Устранить два параллельных "api" в shared

**Проблема**: `shared/lib/api/` (HTTP-инфраструктура) и `shared/api/` (доменные вызовы) существуют параллельно. Плюс `shared/api/index.ts` реэкспортирует из `@/lib/api` — три точки входа для одной темы.

**Текущая структура**:
```
src/shared/
  api/           ← game.ts, room.ts, auth.ts, statistics.ts (домен)
  lib/
    api/         ← client.ts, errors.ts, types.ts (инфраструктура)
```

**Целевая структура**:
```
src/shared/
  api/
    client.ts    ← перенести из lib/api/
    errors.ts    ← перенести из lib/api/
    types.ts     ← перенести из lib/api/
    game.ts
    room.ts
    auth.ts
    statistics.ts
    index.ts
```

**Задача**:
- Переместить `shared/lib/api/client.ts`, `errors.ts`, `types.ts` в `shared/api/`
- Обновить все импорты: `@/lib/api` → `@/shared/api` или `@/api`
- Удалить папку `shared/lib/api/`
- Обновить алиасы в `vite.config.ts` и `tsconfig.json`

---

### 1.4 Разобрать `shared/lib/` по смыслу

**Проблема**: `shared/lib/` — свалка несвязанных файлов. Нет очевидного принципа организации.

**Текущее содержимое**:
```
shared/lib/
  parseThrowValue.ts     ← доменный парсер
  player-mappers.ts      ← доменная трансформация
  soundPlayer.ts         ← UI-утилита
  useEventSource.ts      ← хук (почему не в hooks/?)
  error-to-user-message.ts  ← UI-утилита
  auth-error-handling.ts    ← доменная логика
```

**Задача** — распределить по смыслу:
```
src/shared/
  api/               ← HTTP (см. 1.3)
  hooks/
    useEventSource.ts  ← перенести из lib/
    useRoomStream.ts   ← уже здесь
    useAuthenticatedUser.ts ← уже здесь
  lib/
    parseThrowValue.ts    ← оставить (чистая функция)
    player-mappers.ts     ← оставить (чистая функция)
    error-to-user-message.ts ← оставить
    auth-error-handling.ts   ← оставить
    soundPlayer.ts        ← оставить
```

После переноса `useEventSource.ts` — `shared/lib/` содержит только чистые функции без хуков. Это понятный инвариант.

---

### 1.5 Привести StatisticsPage к единому паттерну страниц

**Проблема**: Все страницы регистрируются в роутере через `import("@/pages/PageName")` и имеют единственный `index.tsx`. `StatisticsPage` нарушает это: три отдельных lazy-import из одной папки.

```tsx
// App.tsx — текущее состояние
const GameDetailPage = lazy(() => import("@/pages/StatisticsPage/GameDetailPage")); // нарушение
const GamesOverview  = lazy(() => import("@/pages/StatisticsPage/GamesOverview"));  // нарушение
const Statistics     = lazy(() => import("@/pages/StatisticsPage"));
```

**Задача**:
- Определиться: `GameDetailPage` и `GamesOverview` — это отдельные страницы или части `Statistics`
- Если отдельные страницы — вынести в `src/pages/GameDetailPage/` и `src/pages/GamesOverviewPage/`
- Если части одной — оставить вложенными и регистрировать через вложенные `<Route>` с одним lazy-import родителя
- Результат: каждый `import("@/pages/X")` всегда указывает на `index.tsx`

---

### 1.6 Уменьшить `shared/types/` — убрать избыточное дробление

**Проблема**: 7 файлов типов + `index.ts`, который реэкспортирует всё. Дробление без изоляции создаёт только навигационный overhead.

```
shared/types/
  game.ts, player.ts, api.ts, game-throws.ts,
  player-ui.ts, ui-props.ts, global.d.ts, index.ts
```

**Задача**:
- Объединить связанные типы: `game.ts` + `game-throws.ts` → `game.ts`
- Объединить `player.ts` + `player-ui.ts` → `player.ts`
- Объединить `api.ts` + `ui-props.ts` → в соответствующие доменные файлы
- Цель: 2–3 файла вместо 7

---

### 1.7 Вынести page-specific компоненты из `shared/ui/button/`

**Проблема**: `SettingsGroupBtn.tsx` и `ViewToogleBtn.tsx` (опечатка в имени) — компоненты конкретных страниц, а не переиспользуемые UI-примитивы.

**Задача**:
- Переместить `SettingsGroupBtn.tsx` в `src/pages/SettingsPage/components/`
- Переместить `ViewToogleBtn.tsx` в `src/pages/StatisticsPage/components/` и исправить опечатку → `ViewToggleBtn`
- `shared/ui/button/` должна содержать только `Button.tsx`

---

### 1.8 Очистить артефакты миграции

**Проблема**: `.gitkeep` файлы в уже заполненных папках — артефакты рефакторинга, которые создают шум при навигации.

**Задача**: Удалить:
- `src/pages/.gitkeep`
- `src/shared/hooks/.gitkeep`
- `src/shared/store/.gitkeep`

---

### 1.9 Устранить двойную вложенность `shared/ui/podium/ui/`

**Проблема**: `src/shared/ui/podium/ui/Podium.tsx` — двойная вложенность `podium/ui/` без причины. Все остальные компоненты живут прямо в своей папке.

**Задача**:
- Переместить содержимое `podium/ui/` на уровень `podium/`
- Удалить пустую папку `ui/`
- Итог: `shared/ui/podium/Podium.tsx`, `shared/ui/podium/PodiumPlayerCard.tsx`

---

### 1.10 Выровнять использование barrel-файлов `index.ts`

**Проблема**: половина папок имеет `index.ts`, половина — нет. Непредсказуемо.

**Задача** — выбрать одно из двух правил и применить везде:

**Вариант A (рекомендуется для простоты)**: `index.ts` только в `shared/ui/*` компонентах, которые экспортируют публичный API. Нигде больше.

**Вариант B**: `index.ts` везде.

После выбора — аудит всех папок и приведение к единому стандарту. Добавить правило в CONTRIBUTING.md.

---

## 2. Типобезопасность — 6/10

### 2.1 Включить `noUncheckedIndexedAccess` в tsconfig

**Проблема**: `players[0]` возвращает `Player`, а не `Player | undefined`. Код в `useThrowHandler.ts` обращается к элементам массива без проверки.

**Задача** — добавить в `tsconfig.json`:
```json
"noUncheckedIndexedAccess": true
```

После включения — исправить все TS-ошибки (в основном добавить optional chaining `?.` или ранние возвраты).

---

### 2.2 Убрать небезопасные type cast в API-клиенте

**Проблема**: `return data as T` в `shared/lib/api/client.ts:90` и `return data as GameThrowsResponse` в `shared/api/game.ts:109` — runtime тип не проверяется.

**Задача**: Добавить минимальные type guard-функции для критичных ответов:

```ts
// shared/api/game.ts
function isGameThrowsResponse(data: unknown): data is GameThrowsResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "players" in data &&
    "status" in data
  );
}

export async function getGameThrows(gameId: number): Promise<GameThrowsResponse> {
  const data = await apiClient.get(GAME_ENDPOINT(gameId));
  if (!isGameThrowsResponse(data)) {
    throw new ApiError("Unexpected response shape", { status: 200 });
  }
  return data;
}
```

Долгосрочно — рассмотреть Zod для схем всех API-ответов.

---

### 2.3 Исправить `window.location` в `ProtectedRoutes`

**Проблема**: `src/app/ProtectedRoutes.tsx:16` — `location.pathname` обращается к `window.location` (browser global), а не к React Router location. В тестовой среде pathname всегда `/`.

**Задача**:
```tsx
// было
import { Navigate, Outlet } from "react-router-dom";
// location.pathname.includes("/start") — window.location!

// стало
import { Navigate, Outlet, useLocation } from "react-router-dom";

const { pathname } = useLocation();
if (pathname.includes("/start")) { ... }
```

---

### 2.4 Убрать мёртвые поля из публичного API `useThrowHandler`

**Проблема**: `useThrowHandler.ts:611-612` — `isActionInFlight: false` и `isUndoInFlight: false` hardcoded. Потребители получают поля, которые никогда не меняются.

**Задача**:
- Удалить `isActionInFlight` и `isUndoInFlight` из возвращаемого объекта `useThrowHandler`
- Обновить все места использования (найти через `grep isActionInFlight`)
- Если флаги нужны — реализовать корректно через `useRef` + state

---

### 2.5 Типизировать маршруты — убрать магические строки

**Проблема**: строки `/start`, `/game/${id}`, `/summary/${id}`, `/details/${id}` дублируются в `useGameLogic.ts`, `useStartPage.ts`, `useGameSummaryPage.ts`, `App.tsx` без единого источника правды.

**Задача** — создать `src/shared/lib/routes.ts`:
```ts
export const ROUTES = {
  login: "/",
  register: "/register",
  start: (id?: number) => id ? `/start/${id}` : "/start",
  game: (id: number) => `/game/${id}`,
  summary: (id: number) => `/summary/${id}`,
  details: (id: number) => `/details/${id}`,
  gamesOverview: "/gamesoverview",
  settings: (id?: number) => id ? `/settings/${id}` : "/settings",
  statistics: "/statistics",
  joined: "/joined",
  playerProfile: "/playerprofile",
} as const;
```

Заменить все строковые литералы маршрутов на вызовы `ROUTES.*`.

---

## 3. Тестируемость — 4/10

### 3.1 Исправить Vitest environment

**Проблема**: `vite.config.ts:38` — `environment: "node"`. Компонентные тесты с RTL требуют `jsdom`. Тесты либо падают, либо работают некорректно.

**Задача**:
```ts
// vite.config.ts
test: {
  environment: "jsdom",  // было "node"
  globals: true,
  include: ["src/**/*.test.{ts,tsx}"],
  exclude: ["specs/**"],
},
```

Для файлов, тестирующих только чистые функции (например `useGameLogic.test.ts`, `parseThrowValue.test.ts`), добавить docblock чтобы не тянуть jsdom зря:
```ts
// @vitest-environment node
```

Проверка: `npm test` должен пройти без ошибок среды.

---

### 3.2 Добавить `AbortController` во все fetch-хуки

**Проблема**: нет отмены запросов при размонтировании. `setState` вызывается на мёртвых компонентах, возможны race condition при быстрой навигации.

**Затронутые файлы**: `useGameState.ts:42`, `useAuthenticatedUser.ts:24`

**Задача**:
```ts
// useGameState.ts
const fetchGameData = useCallback(async (signal?: AbortSignal) => {
  if (!gameId) return;
  try {
    const data = await getGameThrowsIfChanged(gameId, signal);
    if (data && !signal?.aborted) setGameData(data);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return;
    setError(err instanceof Error ? err : new Error("Failed to fetch"));
  }
}, [gameId]);

useEffect(() => {
  const controller = new AbortController();
  void fetchGameData(controller.signal);
  return () => controller.abort();
}, [fetchGameData]);
```

Аналогично — в `useAuthenticatedUser.ts`.

---

### 3.3 Удалить бесполезный E2E тест

**Проблема**: `tests/joined-game/simple.spec.ts` — тест проверяет, что `<body>` видим. Нулевая ценность, но создаёт иллюзию покрытия.

**Задача**: Удалить файл `tests/joined-game/simple.spec.ts`.

---

### 3.4 Написать E2E тесты для критических user journey

**Проблема**: 3 оставшихся E2E теста покрывают только `JoinedGamePage`. Полностью отсутствуют тесты для login flow и game flow.

**Задача** — создать:

**`tests/auth/login.spec.ts`**:
- Успешный логин → редирект на `/start`
- Неверный пароль → сообщение об ошибке
- Незалогиненный пользователь на `/start` → редирект на `/`

**`tests/start/create-game.spec.ts`**:
- Создание комнаты → появляется QR-код
- Добавление гостевого игрока → игрок виден в списке
- Старт игры → редирект на `/game/:id`

**`tests/game/basic-throw.spec.ts`**:
- Запись броска → счёт обновляется
- Undo броска → счёт возвращается

Минимальный setup: мокировать API через `page.route()` (аналог `unauthenticated-access.spec.ts`), не зависеть от реального backend.

---

### 3.5 Добавить reconnect-логику в `useRoomStream`

**Проблема**: `useRoomStream.ts:50` — `eventSource.onerror = () => { setIsConnected(false) }`. SSE соединение обрывается молча, без попытки восстановления.

**Задача**:
```ts
let retryTimeout: ReturnType<typeof setTimeout> | null = null;
let retryDelay = 1000;

eventSource.onerror = () => {
  setIsConnected(false);
  eventSource.close();

  retryTimeout = setTimeout(() => {
    retryDelay = Math.min(retryDelay * 2, 30000); // max 30s
    // пересоздать EventSource — вынести в функцию connect()
  }, retryDelay);
};

return () => {
  if (retryTimeout) clearTimeout(retryTimeout);
  eventSource.close();
};
```

---

## 4. DX / инструменты — 5/10

### 4.1 Создать `.husky/pre-commit`

**Проблема**: `lint-staged` настроен в `package.json:78`, но `.husky/pre-commit` не существует — `lint-staged` никогда не запускается автоматически.

**Задача**:
```sh
# создать файл .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx lint-staged
```
```sh
chmod +x .husky/pre-commit
```

Также удалить из `package.json` скрипт `"husky": "npm run stylelint && npm run eslint"` — он запускает полный линтинг всего проекта вместо только staged файлов.

---

### 4.2 Добавить `lazy()` для LoginPage и RegisterPage

**Проблема**: `App.tsx:8-9` — `LoginPage` и `RegisterPage` импортируются eagerly и попадают в main bundle, хотя все остальные страницы — через `lazy()`.

**Задача**:
```tsx
// App.tsx — было
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";

// стало
const LoginPage   = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
```

---

### 4.3 Перенести warmup-import из `useGameLogic` в `App.tsx`

**Проблема**: `useGameLogic.ts:89` — `void import("@/pages/GameSummaryPage")` внутри хука страницы. Логика прогрева чанков несогласована: часть в `App.tsx`, часть в page-хуке.

**Задача**:
- Удалить `void import("@/pages/GameSummaryPage")` из `useGameLogic.ts`
- Добавить `GameSummaryPage` в массив `warmUpRoutes` в `App.tsx` (там уже есть аналогичная логика)

---

### 4.4 Расширить `commitlint` — добавить отсутствующие типы

**Проблема**: `commitlint.config.mjs:3` — отсутствуют `perf`, `ci`, `build`, `revert`.

**Задача**:
```js
// commitlint.config.mjs
rules: {
  "type-enum": [2, "always", [
    "feat", "fix", "docs", "style", "refactor",
    "test", "chore", "perf", "ci", "build", "revert",
  ]],
},
```

---

### 4.5 Исправить `ignores` в `eslint.config.mjs`

**Проблема**: `eslint.config.mjs:13` — `ignores` объявлен внутри блока с `files` и `languageOptions`. В flat config это работает как per-rule override, а не global ignore.

**Задача**:
```js
// eslint.config.mjs — добавить в начало массива отдельным объектом
{
  ignores: ["**/*.config.ts", "**/*.config.js", "**/*.config.mjs", "dist/**"],
},
// остальные объекты конфига без ignores внутри
```

---

### 4.6 Добавить GitHub Actions CI

**Проблема**: единственный GitHub workflow — `copilot-setup-steps.yml` без реальных проверок. GitLab CI полноценный, GitHub — нет.

**Задача** — создать `.github/workflows/ci.yml` по аналогии с `.gitlab-ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run eslint
      - run: npm run stylelint
      - run: npx prettier --check .
      - run: npm test
      - run: npm run secrets:check
```

---

### 4.7 Сократить safety timeout в `useAuthenticatedUser`

**Проблема**: `useAuthenticatedUser.ts:20` — safety timeout 10 секунд держит пользователя на скелетоне в 4 раза дольше допустимого.

**Задача**: Сократить с `10000` до `5000`. Или заменить на `AbortController` с таймаутом (выполняется вместе с задачей 3.2):
```ts
const controller = new AbortController();
const timeoutId = window.setTimeout(() => controller.abort(), 5000);
```

---

## 5. Безопасность — 7/10

### 5.1 Убрать `window.location.href = "/"` из API-клиента

**Проблема**: `shared/lib/api/client.ts:72` и `shared/api/game.ts:88` — hard redirect при 401 сбрасывает всё React-состояние и историю навигации.

**Задача** — заменить на событийную модель:
```ts
// shared/api/client.ts
type AuthRedirectHandler = () => void;
let onUnauthorized: AuthRedirectHandler | null = null;

export function setUnauthorizedHandler(handler: AuthRedirectHandler): void {
  onUnauthorized = handler;
}

// внутри request() вместо window.location.href = "/":
if (response.status === 401) {
  onUnauthorized?.();
  throw new UnauthorizedError(...);
}
```

```tsx
// App.tsx или ProtectedRoutes
const navigate = useNavigate();
useEffect(() => {
  setUnauthorizedHandler(() => navigate("/"));
}, [navigate]);
```

---

### 5.2 Вынести inline SVG из `StartPage`

**Проблема**: `src/pages/StartPage/index.tsx:104-121` — SVG-иконка хардкожена прямо в JSX. Все остальные иконки используют импорт SVG-файлов.

**Задача**:
- Создать `src/assets/icons/user-add.svg` с содержимым инлайн-SVG
- Заменить JSX-разметку на `<img src={UserAddIcon} alt="Play as a guest" />`

---

## 6. Performance — 6/10

### 6.1 Изолировать глобальный стор game-state от race condition

**Проблема**: `$gameData`, `$isLoading`, `$error` — синглтоны (`shared/store/game-state.ts`). При навигации `GamePage → GameSummaryPage` обе страницы пишут в один атом. In-flight запрос с предыдущей страницы (без AbortController) может перезаписать данные следующей.

**Задача**:
- Выполнить задачу 3.2 (AbortController) — это решает немедленный race condition
- Добавить явный сброс стора при смене gameId в `useGameState.ts`:
  ```ts
  useEffect(() => {
    if (!gameId) { resetGameStore(); return; }
    if ($gameData.get()?.id !== gameId) resetGameStore();
  }, [gameId]);
  ```
- Долгосрочно: рассмотреть разделение `$gameData` (GamePage) и `$summaryData` (GameSummaryPage) в отдельные атомы

---

### 6.2 Кешировать auth-результат в store

**Проблема**: `useAuthenticatedUser` выполняет HTTP-запрос при каждом монтировании `ProtectedRoutes` — то есть при каждой навигации на защищённую страницу.

**Задача** — кешировать результат в nanostores:
```ts
// shared/store/auth.ts
export const $user = atom<AuthenticatedUser | null>(null);
export const $authChecked = atom<boolean>(false);

// useAuthenticatedUser.ts
export function useAuthenticatedUser() {
  const user = useStore($user);
  const checked = useStore($authChecked);

  useEffect(() => {
    if (checked) return; // не повторять запрос
    fetchUser().then(u => {
      $user.set(u);
      $authChecked.set(true);
    });
  }, [checked]);

  return { user, loading: !checked };
}
```

Инвалидировать `$authChecked` при логауте.

---

### 6.3 Вынести дублированные CSS файлы `AuthForm`

**Проблема**: `LoginPage/AuthForm.module.css` и `RegisterPage/AuthForm.module.css` — два файла с одинаковым именем в разных папках. Высокая вероятность дублирования стилей.

**Задача**:
- Сравнить содержимое двух файлов
- Вынести общие стили в `src/shared/ui/auth-form/AuthForm.module.css`
- Удалить дубли из обеих страниц
- Уникальные стили оставить в page-specific CSS

---

## Чеклист для следующего аудита

### Архитектура / читаемость
- [ ] dep-cruiser удалён, ESLint-правила покрывают все границы
- [ ] Один источник HTTP-инфраструктуры: `shared/api/`
- [ ] `shared/lib/` содержит только чистые функции, без хуков
- [ ] `shared/ui/button/` содержит только `Button.tsx`
- [ ] StatisticsPage следует паттерну `PageName/index.tsx`
- [ ] `shared/types/` содержит 2–3 файла вместо 7
- [ ] `shared/ui/podium/` без двойной вложенности
- [ ] Нет `.gitkeep` в непустых папках
- [ ] `index.ts` barrel-файлы используются по единому правилу
- [ ] `ROUTES` константы используются везде вместо строк

### Типобезопасность
- [ ] `noUncheckedIndexedAccess: true` в tsconfig, ошибки исправлены
- [ ] API-ответы проверяются через type guards, нет `data as T`
- [ ] `useLocation()` везде вместо `window.location`
- [ ] `isActionInFlight` / `isUndoInFlight` удалены или реализованы корректно
- [ ] TypeScript не находит ошибок: `npm run typecheck` чистый

### Тестируемость
- [ ] `environment: "jsdom"` в vite.config.ts
- [ ] `simple.spec.ts` удалён
- [ ] E2E тесты покрывают: login, create game, throw, undo
- [ ] AbortController во всех fetch-хуках
- [ ] SSE reconnect реализован в `useRoomStream`
- [ ] `npm test` проходит полностью

### DX / инструменты
- [ ] `.husky/pre-commit` существует и запускает `lint-staged`
- [ ] `LoginPage` и `RegisterPage` — lazy-loaded
- [ ] Warmup-логика только в `App.tsx`
- [ ] `commitlint` включает `perf`, `ci`, `build`, `revert`
- [ ] `eslint.config.mjs` — `ignores` как отдельный объект
- [ ] GitHub Actions CI с полным набором проверок
- [ ] Safety timeout ≤ 5s

### Безопасность
- [ ] Нет `window.location.href = "/"` в API-клиенте
- [ ] 401 обрабатывается через callback/navigate, без hard redirect
- [ ] Inline SVG вынесен в файл иконки

### Performance
- [ ] `$gameData` не перезаписывается при навигации между страницами
- [ ] Auth-результат кешируется, нет повторных запросов при навигации
- [ ] AbortController отменяет запросы при размонтировании
- [ ] Дублированные CSS объединены

# Research: 3.2 Добавить `AbortController` во все fetch-хуки

**Дата:** 2026-03-05  
**Источник исследования:** 3 параллельных sub-agent'а (game-state, auth-hook/api, tests)

## Scope

Задача: убрать отсутствие отмены запросов при размонтировании и снизить race conditions при быстрой навигации.

Затронутые области:

- `src/pages/GamePage/useGameState.ts`
- `src/shared/hooks/useAuthenticatedUser.ts`
- `src/shared/api/game.ts` (`getGameThrowsIfChanged`)
- `src/shared/api/auth.ts` (`getAuthenticatedUser`)

## Как исследовали

Параллельно подняты 3 агента:

1. Анализ `useGameState` и потока данных в game page.
2. Анализ `useAuthenticatedUser` + `getAuthenticatedUser` + call-sites.
3. Анализ текущего тестового покрытия и пробелов по abort/race.

## Findings

### 1) `useGameState` сейчас без отмены запроса

Файл: `src/pages/GamePage/useGameState.ts`  
`fetchGameData` не принимает `AbortSignal`, а `useEffect` не создаёт `AbortController`.

Следствия:

- Параллельные `refetch` (initial load, retry, побочные вызовы из логики страницы) не координируются.
- Старый запрос может завершиться позже нового и перезаписать актуальные данные/ошибку.
- При смене `gameId` ответ старого запроса может записаться в store новой игры.

### 2) `getGameThrowsIfChanged` не принимает signal и маскирует abort

Файл: `src/shared/api/game.ts`  
`getGameThrowsIfChanged(gameId)` вызывает `fetch` без `signal`.

Ключевой риск:

- В `catch` любая ошибка оборачивается в `NetworkError("Network request failed")`.
- Если просто добавить `AbortController` в хук без изменения API-функции, abort будет восприниматься как обычная сетевая ошибка.

### 3) `useAuthenticatedUser` не отменяет запрос на unmount

Файл: `src/shared/hooks/useAuthenticatedUser.ts`

Сейчас:

- Есть safety-timeout 10s, который только снимает `loading`.
- Cleanup чистит только timeout.
- Запрос `getAuthenticatedUser()` вызывается без внешнего `signal`.

Следствия:

- Возможны late updates после unmount (`setUser`, `setError`, `setLoading(false)`).
- Возможен поздний side-effect в store (`setCurrentGameId`) после ухода со страницы.

### 4) `getAuthenticatedUser` имеет внутренний abort, но не управляется извне

Файл: `src/shared/api/auth.ts`

Сейчас:

- Внутренний `AbortController` + timeout 8000ms.
- Нет способа передать внешний `AbortSignal` из хука/компонента.

Следствие:

- Запрос нельзя синхронизировать с жизненным циклом конкретного React-эффекта.

### 5) Покрытие тестами недостаточно для этого изменения

Найдено:

- Есть прямые тесты для `getGameThrowsIfChanged`: `src/shared/api/get-game.test.ts`.
- Нет прямых тестов на `useGameState`.
- Нет прямых тестов на `useAuthenticatedUser`.
- Нет прямых тестов на `getAuthenticatedUser` (встречается как mock в других тестах).

## Рекомендованный безопасный change set (без breaking changes)

1. `useGameState`:

- `fetchGameData(signal?: AbortSignal)`.
- В `useEffect` создать `AbortController`, вызвать `fetchGameData(controller.signal)`, в cleanup `controller.abort()`.
- Игнорировать `AbortError` и не писать error state для отменённых запросов.
- Перед `setGameData`/`setError`/`setLoading(false)` проверять, что запрос ещё актуален (через `signal.aborted` и/или requestId guard).

2. `getGameThrowsIfChanged`:

- Расширить сигнатуру, например: `getGameThrowsIfChanged(gameId: number, signal?: AbortSignal)`.
- Прокинуть `signal` в `fetch`.
- `AbortError` не преобразовывать в `NetworkError`, чтобы вызывающий код мог корректно отличать cancel от network failure.

3. `useAuthenticatedUser`:

- В `useEffect` создать `AbortController`.
- Передать `controller.signal` в `getAuthenticatedUser`.
- В cleanup: `clearTimeout` + `controller.abort()`.
- Не делать `setState`/`setCurrentGameId`, если запрос отменён.

4. `getAuthenticatedUser`:

- Добавить опциональный внешний сигнал без ломки API (например options/signal optional), сохранив текущий timeout по умолчанию.

## Минимальная тест-матрица для фикса

1. `getAuthenticatedUser`: timeout-abort прерывает fetch и чистит таймер.
2. `getAuthenticatedUser`: успешный быстрый ответ корректно возвращает `data.user ?? data`.
3. `useAuthenticatedUser`: unmount до завершения запроса не приводит к обновлению state/store.
4. `useGameState`: при смене `gameId` старый ответ не перезаписывает данные новой игры.
5. `getGameThrowsIfChanged`: aborted request не переводит UI в обычную network-error ветку.

## Риски и edge cases

- Неверная обработка `AbortError` может скрыть реальную сеть или, наоборот, показывать ложную ошибку.
- `isLoading` может залипнуть при неправильной координации parallel requests.
- Важно не повредить conditional-fetch логику (`ETag` / `since` / cache version map).

## Команды валидации после внедрения

```bash
npm run eslint
npm run stylelint
npm run test
npm run test:e2e
npm run typecheck
npx prettier --check .
```

## Неопределённость, которую надо зафиксировать до патча

Единая семантика для abort:

- В API-функциях abort должен `throw AbortError` или возвращать `null`?
- Для текущей архитектуры хуков безопаснее: пробрасывать abort как abort (не как NetworkError), а в хуках явно игнорировать его.

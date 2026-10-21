# Optimistic throw queue on the game page

A throw or undo tap must change the scoreboard within 200 ms, even when three throws are tapped in quick succession on slow Wi-Fi. Waiting for the server before each throw cannot meet that, so the game page keeps an optimistic queue (#123). The client applies each throw or undo to the scoreboard at once and sends the requests to the backend one at a time, in tap order.

## Rules

- The queue holds at most 6 unconfirmed throws, two full turns, so an unconfirmed turn change is allowed. When the queue is full, throw input is disabled and the page shows that it is syncing (#105).
- Undo is immediate. If the last throw has not been sent yet, undo removes it from the queue and the server never sees it. Otherwise the undo request joins the same queue behind the throws.
- If a queued request fails (network error, 409 on the state version, 5xx), the client clears the queue, reloads the game state from the server and tells the player that their last throws were not saved. If the server cannot be reached, input stays disabled until the player retries (#98).
- A winning throw shows the finish overlay at once. The client calls `/finish` only after the server acknowledges that throw (#96). If the server rejects it, the overlay closes and the scoreboard rolls back.
- Every response is tied to the game on screen. A response for another game, or one that arrives after the page has left the game, is ignored (#95).

## Considered options

- One request at a time, with input disabled until the server answers. Rejected: a tap waits for the network, which breaks the 200 ms rule.
- A limit of 3 throws, one turn. Rejected: the next player's first tap was dropped while the previous turn was still syncing.
- Retrying failed throws instead of reloading. Rejected: the throw API has no idempotency key, so a retry after a lost response could record the throw twice.

## Consequences

- A rejected throw of one player can roll back throws already shown for the next player. Tests cover this case.
- Only one tablet follows a running game (darts-backend ADR 0001), so the queue never has to merge throws from another device.

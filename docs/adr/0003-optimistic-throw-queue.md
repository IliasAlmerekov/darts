# Optimistic throw queue on the game page

Status: accepted.

Once the game is loaded, a throw or undo tap must change the scoreboard within 200 ms, even when three throws are tapped in quick succession on slow Wi-Fi. Waiting for the server before each throw cannot meet that, so the game page keeps an optimistic queue (#123). The client applies each throw or undo to the scoreboard at once and sends the requests to the backend one at a time, in tap order.

## Rules

- Throw and undo input stay disabled until the first load of the game state answers, so the loaded game cannot overwrite throws tapped while the load runs. This also holds when the store already shows the game from an earlier page. If that first load fails while the store shows the game, input stays disabled and the page shows "Could not load the game." with Retry, which loads the game again. No tap was lost, so the page does not say that throws were not saved, and a load that works shows no notice. A finished copy in the store is not shown: after the summary's Undo the server holds the reopened game, so the page loads it instead.
- The queue holds at most 6 unconfirmed throws, two full turns, so an unconfirmed turn change is allowed. When the queue is full, throw input is disabled and the page shows that it is syncing (#105).
- Undo is immediate, also when the queue is full. Each tap steps the scoreboard back by one throw. If the last throw has not been sent yet, undo removes it from the queue and the server never sees it. Otherwise the undo request joins the same queue behind the throws.
- If a queued request fails (network error, 409 on the state version, 5xx), the client clears the queue, reloads the game state from the server and tells the player that their last throws were not saved. Throw and undo input stay disabled during the reload. If the server cannot be reached, input stays disabled until the player retries (#98).
- The finish overlay appears at once for the first checkout only: a throw that takes a player to 0 while no other player is at 0, with two or more active players left. Later checkouts open no overlay; the regular Undo corrects a wrong one. Once an undo leaves no player at 0, the next checkout counts as the first again. A loaded game, also after a reload, starts with the overlay closed. The overlay offers Finish game, Continue and Undo Throw (#395). Finish game sends `POST /api/game/{gameId}/finish` only after the server has acknowledged every tap, the winning throw included; the server ranks the players, and the client opens the summary with that ranking. A failed finish shows an error in the overlay and keeps the game playable.
- A throw that leaves one active player shows no overlay and closes throw input; Undo stays open. The server finishes the game inside that throw request, and its ack says the game is finished. The client opens the summary once the ack says the game is finished and no tap waits for the server (#96). If the server rejects the winning throw, the overlay closes and the scoreboard rolls back.
- Every response is tied to the game on screen. A response for another game, or one that arrives after the page has left the game, is ignored (#95).

## Considered options

- One request at a time, with input disabled until the server answers. Rejected: a tap waits for the network, which breaks the 200 ms rule.
- A limit of 3 throws, one turn. Rejected: the next player's first tap was dropped while the previous turn was still syncing.
- Retrying failed throws instead of reloading. Rejected: the throw API has no idempotency key, so a retry after a lost response could record the throw twice.

## Consequences

- A rejected throw of one player can roll back throws already shown for the next player. Tests cover this case.
- Only one tablet follows a running game (darts-backend ADR 0001), so the queue never has to merge throws from another device.

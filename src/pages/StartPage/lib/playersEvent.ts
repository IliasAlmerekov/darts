import * as v from "valibot";
import type { LobbyPlayer } from "@/lib/game/lobbyPlayers";

const integerSchema = v.pipe(v.number(), v.integer());

const playersEventPlayerSchema = v.object({
  id: integerSchema,
  username: v.optional(v.nullable(v.string())),
  name: v.optional(v.nullable(v.string())),
  position: v.optional(v.nullable(v.pipe(integerSchema, v.minValue(0)))),
});

/** The `players` event of `/api/room/{id}/stream`. Older payloads send `items` instead. */
const playersEventSchema = v.object({
  players: v.optional(v.array(playersEventPlayerSchema)),
  items: v.optional(v.array(playersEventPlayerSchema)),
});

/**
 * The roster a `players` event carries, in event order. `"no-roster"` means the event has
 * no player list; `"invalid"` means any part of it fails validation, so none of it applies.
 */
export function parsePlayersEvent(payload: unknown): LobbyPlayer[] | "no-roster" | "invalid" {
  // `v.object` accepts arrays, which are no event payload either.
  const result = v.safeParse(playersEventSchema, payload);
  if (!result.success || Array.isArray(payload)) {
    return "invalid";
  }
  const list = result.output.items ?? result.output.players;
  if (list === undefined) {
    return "no-roster";
  }
  return list.map((player, index) => ({
    id: player.id,
    name: player.username ?? player.name ?? "",
    position: player.position ?? index,
  }));
}

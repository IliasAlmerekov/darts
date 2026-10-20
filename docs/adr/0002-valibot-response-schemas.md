# One Valibot schema per API response

Each response used to be checked by a hand-written `isXxx` guard, and its type was written separately as an interface. The two drifted apart (#101, #121), and every domain function checked the same data a second time after `apiClient` returned it. Now each response read in `src/shared/api/` is described once, as a Valibot schema, and its type is `v.InferOutput` of that schema. `apiClient` takes the schema in `validate`, runs `v.safeParse`, and returns the typed output. A failure still throws `ApiValidationError` with the raw body. `docs/backend-api-contract.json` is the source of truth for what each schema accepts.

## Considered options

- Keep hand-written guards and interfaces. Rejected: guard and type are two descriptions of one shape, and nothing keeps them in step.
- Zod (classic). Rejected for size: its method-chaining API pulls in most of the library, far beyond the 3 KB gzip budget for this change.
- `zod/mini`. A tree-shakable Zod API of about the same size as Valibot. It is the known fallback if Valibot has to go; the schemas would port almost one to one.
- Valibot. Chosen: it is built from small functions, so the bundle carries only the validators the schemas use.

## Consequences

- A schema may fill in contract defaults (`v.optional(schema, default)`), so the inferred type is true at runtime. The undo union's discriminant (`type: "full-state" | "ack"`) comes from the payload with its contract default since #209; before, a `v.transform` added it on the client.
- `v.object` drops keys the schema does not name. Code reads only what the schema describes.
- Domain functions trust the output of `apiClient` and no longer re-check it. Mapping to UI shapes still happens in mappers, not in schemas.
- Shared guards in `src/shared/lib/guards/` stay for code outside the API layer, such as error payloads and the game session store.

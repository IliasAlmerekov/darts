import * as v from "valibot";

// Schemas shared by 2+ domain files. A schema used by one domain stays in that file.

/** Contract `integer`. */
export const integerSchema = v.pipe(v.number(), v.integer());

/** Contract `SuccessMessageDto`. */
export const successMessageResponseSchema = v.object({
  message: v.string(),
  success: v.optional(v.boolean(), true),
});

export type SuccessMessageResponse = v.InferOutput<typeof successMessageResponseSchema>;

/** Contract response of `POST /api/invite/create/{id}`. */
export const invitationResponseSchema = v.object({
  success: v.boolean(),
  gameId: v.optional(v.nullable(integerSchema)),
  invitationLink: v.optional(v.nullable(v.string())),
  users: v.optional(
    v.array(
      v.object({
        id: v.optional(v.nullable(integerSchema)),
        username: v.optional(v.nullable(v.string())),
      }),
    ),
  ),
  message: v.optional(v.nullable(v.string())),
});

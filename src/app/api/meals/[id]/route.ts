import { z } from "zod";
import { AppError } from "../../../../server/errors";
import { api, assertSameOrigin, requireUserId } from "../../../../server/http";
import { deleteMeal } from "../../../../server/meals";

export const runtime = "nodejs";

const IdSchema = z.uuid();

export const DELETE = api<{ id: string }>("DELETE /api/meals/[id]", async (req, params, ctx) => {
  assertSameOrigin(req);
  const userId = await requireUserId();
  ctx.setUser(userId);
  const id = IdSchema.safeParse(params.id);
  if (!id.success || !(await deleteMeal(userId, id.data))) throw new AppError("NOT_FOUND");
  return new Response(null, { status: 204 });
});

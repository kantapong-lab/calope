import { MealsCreateSchema, MealsListQuerySchema } from "../../../shared/schemas";
import { AppError, zodDetails } from "../../../server/errors";
import { api, assertSameOrigin, readJson, requireUserId } from "../../../server/http";
import { createMeals, deleteAllMeals, listMeals } from "../../../server/meals";

export const runtime = "nodejs";

export const POST = api("POST /api/meals", async (req, _params, ctx) => {
  assertSameOrigin(req);
  const userId = await requireUserId();
  ctx.setUser(userId);
  const body = await readJson(req, MealsCreateSchema);
  return Response.json({ items: await createMeals(userId, body.items) }, { status: 201 });
});

export const GET = api("GET /api/meals", async (req, _params, ctx) => {
  const userId = await requireUserId();
  ctx.setUser(userId);
  const query = MealsListQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!query.success) throw new AppError("BAD_REQUEST", { details: zodDetails(query.error) });
  const before = query.data.before ? new Date(query.data.before) : undefined;
  return Response.json(await listMeals(userId, query.data.limit, before));
});

export const DELETE = api("DELETE /api/meals", async (req, _params, ctx) => {
  assertSameOrigin(req);
  const userId = await requireUserId();
  ctx.setUser(userId);
  if (new URL(req.url).searchParams.get("confirm") !== "true") throw new AppError("BAD_REQUEST");
  await deleteAllMeals(userId);
  return new Response(null, { status: 204 });
});

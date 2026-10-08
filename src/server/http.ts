import { auth } from "./auth";
import { AppError, errorResponse, zodDetails } from "./errors";
import { hashUserId, logEvent, type LogMeta } from "./log";

export type ApiContext = {
  requestId: string;
  setUser: (userId: string) => void;
  extra: Partial<Pick<LogMeta, "model" | "input_tokens" | "output_tokens" | "attempts">>;
};

type Handler<P> = (req: Request, params: P, ctx: ApiContext) => Promise<Response>;

// Wraps a route handler: stable error envelope for every failure, one metadata log line per request.
export function api<P extends Record<string, string> = Record<string, string>>(
  route: string,
  handler: Handler<P>,
  opts: { fallbackManual?: boolean } = {},
) {
  return async (req: Request, routeCtx?: { params: Promise<P> }): Promise<Response> => {
    const started = Date.now();
    const requestId = crypto.randomUUID();
    let userHash: string | undefined;
    let errorCode: string | undefined;
    let errorName: string | undefined;
    const extra: ApiContext["extra"] = {};
    let response: Response;
    try {
      const params = (await routeCtx?.params) as P;
      response = await handler(req, params, {
        requestId,
        extra,
        setUser: (id) => {
          userHash = hashUserId(id);
        },
      });
    } catch (err) {
      if (err instanceof AppError) {
        errorCode = err.code;
        response = errorResponse(err.code, err.extras);
      } else {
        errorCode = "INTERNAL_ERROR";
        errorName = err instanceof Error ? err.name : typeof err;
        response = errorResponse("INTERNAL_ERROR", { fallbackManual: opts.fallbackManual });
      }
    }
    logEvent({
      ...extra,
      request_id: requestId,
      route,
      status: response.status,
      latency_ms: Date.now() - started,
      user_hash: userHash,
      error_code: errorCode,
      error_name: errorName,
    });
    return response;
  };
}

// req.url is not used: behind a container or proxy its host is the bind address (e.g. 0.0.0.0:3000).
function expectedHost(req: Request): string | null {
  const appOrigin = process.env.APP_ORIGIN;
  if (appOrigin) {
    try {
      return new URL(appOrigin).host;
    } catch {
      return null;
    }
  }
  return req.headers.get("host");
}

export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  let originHost: string | null = null;
  try {
    originHost = new URL(origin ?? "").host;
  } catch {
    // malformed Origin is treated as a mismatch
  }
  const expected = expectedHost(req);
  if (!originHost || !expected || originHost !== expected) throw new AppError("BAD_ORIGIN");
}

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new AppError("UNAUTHENTICATED");
  return id;
}

export async function readJson<T>(
  req: Request,
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: Parameters<typeof zodDetails>[0] } },
): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError("BAD_REQUEST");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new AppError("BAD_REQUEST", { details: zodDetails(parsed.error) });
  return parsed.data;
}

import { container } from "./src/container.ts";
import { handleError, route } from "./src/api/router.ts";

const c = container();

export async function handler(req: Request): Promise<Response> {
  try {
    return await route(req, c);
  } catch (e) {
    return handleError(e);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}

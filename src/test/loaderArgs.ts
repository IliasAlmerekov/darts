import type { LoaderFunctionArgs, Params } from "react-router-dom";

/** Builds the arguments React Router passes to a route loader, for calling it in a test. */
export function makeLoaderArgs(request: Request, params: Params = {}): LoaderFunctionArgs {
  return { request, url: new URL(request.url), pattern: "", params, context: undefined };
}

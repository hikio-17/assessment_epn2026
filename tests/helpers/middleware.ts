import type {
  MiddlewareFunction,
  RouterContextProvider,
} from "react-router";

type MiddlewareArgs = {
  request: Request;
  url: URL;
  pattern: string;
  params: Record<string, string>;
  context: Readonly<RouterContextProvider>;
};

export async function runMiddlewareChain(
  middlewares: MiddlewareFunction[],
  args: MiddlewareArgs,
  finalResponse = () => new Response("ok"),
) {
  let index = 0;

  const next = async (): Promise<Response> => {
    if (index >= middlewares.length) {
      return finalResponse();
    }

    const middleware = middlewares[index++];
    const result = await middleware(args, next);

    return result instanceof Response
      ? result
      : next();
  };

  return next();
}

export function middlewareArgs(
  request: Request,
  context: Readonly<RouterContextProvider>,
  params: Record<string, string> = {},
): MiddlewareArgs {
  return {
    request,
    url: new URL(request.url),
    pattern: "/",
    params,
    context,
  };
}

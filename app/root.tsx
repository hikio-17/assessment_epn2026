import { rootMiddleware } from "./middleware/auth.server";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const middleware = rootMiddleware;

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({
  error,
}: Route.ErrorBoundaryProps) {
  let status = 500;
  let title = "Something went wrong";
  let message =
    "An unexpected error occurred. Please try again.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    status = error.status;

    if (error.status === 403) {
      title = "403 - Access denied";
      message =
        "You do not have permission to access this page.";
    } else if (error.status === 404) {
      title = "404 - Page not found";
      message =
        "The page you are looking for does not exist.";
    } else {
      title = `Error ${error.status}`;
      message = error.statusText || message;
    }
  } else if (error instanceof Error) {
    title = "Application error";

    if (import.meta.env.DEV) {
      message = error.message;
      stack = error.stack;
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 py-16 text-white">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">
          PeopleOps · {status}
        </p>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {title}
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">
          {message}
        </p>

        {stack ? (
          <pre className="mx-auto mt-6 max-h-72 max-w-xl overflow-auto rounded-2xl bg-black/30 p-4 text-left text-xs text-slate-300">
            <code>{stack}</code>
          </pre>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="/"
            className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            Back to dashboard
          </a>

          {status !== 403 ? (
            <a
              href="/login"
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Sign in
            </a>
          ) : null}
        </div>
      </div>
    </main>
  );
}

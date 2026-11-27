import {
  RouterContextProvider,
} from "react-router";

import { authUserContext } from "~/context.server";
import type { AuthUser } from "~/types";

export function createContext(
  user: AuthUser | null = null,
) {
  const context = new RouterContextProvider();

  context.set(authUserContext, user);

  return context;
}

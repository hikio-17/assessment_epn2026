import { createContext, type Session } from "react-router";

import type { AuthSessionData, AuthUser } from "./types";

export const sessionContext = createContext<
  Session<AuthSessionData> | null
>(null);

export const authUserContext = createContext<AuthUser | null>(null);
import "dotenv/config";

import {
  createCookieSessionStorage,
  type Session,
  type SessionStorage,
} from "react-router";

import type { AuthSessionData } from "./types";

let storage: SessionStorage<AuthSessionData> | null = null;

function getStorage(): SessionStorage<AuthSessionData> {
  if (storage) return storage;

  const secret = process.env.SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "SESSION_SECRET wajib diisi. Tambahkan ke .env sebelum menjalankan aplikasi.",
    );
  }

  storage = createCookieSessionStorage<AuthSessionData>({
    cookie: {
      name: "__peopleops_session",
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secrets: [secret],
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 60 * 60 * 8,
    },
  });

  return storage;
}

export async function getSession(
  cookieHeader?: string | null,
) {
  return getStorage().getSession(cookieHeader);
}

type CommitSessionOptions = Parameters<
  SessionStorage<AuthSessionData>["commitSession"]
>[1];

export async function commitSession(
  session: Session<AuthSessionData>,
  options?: CommitSessionOptions,
) {
  return getStorage().commitSession(session, options);
}

export async function destroySession(
  session: Session<AuthSessionData>,
) {
  return getStorage().destroySession(session);
}
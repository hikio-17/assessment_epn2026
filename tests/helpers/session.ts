import {
  commitSession,
  getSession,
} from "~/session.server";

export async function sessionCookieFor(
  userId: number,
) {
  const session = await getSession();
  session.set("userId", userId);
  const setCookie = await commitSession(session);

  return setCookie.split(";")[0];
}

// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import {
  clientAction,
  clientLoader,
} from "~/routes/drafts";
import { formRequest } from "../helpers/request";
import { unwrap } from "../helpers/unwrap";

describe("drafts client data", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty", async () => {
    const state = await clientLoader();

    expect(state.drafts).toEqual([]);
    expect(state.storageAvailable).toBe(true);
  });

  it("creates a draft in localStorage", async () => {
    const result = await clientAction({
      request: formRequest("http://localhost/drafts", {
        intent: "create",
        name: "Draft Employee",
        email: "draft@test.local",
        position: "Engineer",
        note: "cached",
      }),
      params: {},
    } as never);

    expect((await unwrap(result)).status).toBe(200);
    const state = await clientLoader();

    expect(state.drafts).toHaveLength(1);
    expect(state.drafts[0]).toMatchObject({
      name: "Draft Employee",
      email: "draft@test.local",
    });
  });

  it("rejects invalid draft input", async () => {
    const result = await clientAction({
      request: formRequest("http://localhost/drafts", {
        intent: "create",
        name: "",
        email: "bad",
        position: "",
        note: "",
      }),
      params: {},
    } as never);

    const unwrapped = await unwrap(result);

    expect(unwrapped.status).toBe(400);
    expect(
      (unwrapped.data as { fieldErrors: unknown })
        .fieldErrors,
    ).toBeTruthy();
  });

  it("deletes a draft", async () => {
    await clientAction({
      request: formRequest("http://localhost/drafts", {
        intent: "create",
        name: "Delete Me",
        email: "delete@test.local",
        position: "Engineer",
        note: "",
      }),
      params: {},
    } as never);

    const state = await clientLoader();
    const id = state.drafts[0].id;

    const result = await clientAction({
      request: formRequest("http://localhost/drafts", {
        intent: "delete",
        id,
      }),
      params: {},
    } as never);

    expect((await unwrap(result)).status).toBe(200);
    expect((await clientLoader()).drafts).toEqual([]);
  });

  it("clears all drafts", async () => {
    await clientAction({
      request: formRequest("http://localhost/drafts", {
        intent: "create",
        name: "Draft One",
        email: "one@test.local",
        position: "Engineer",
        note: "",
      }),
      params: {},
    } as never);

    const result = await clientAction({
      request: formRequest("http://localhost/drafts", {
        intent: "clear",
      }),
      params: {},
    } as never);

    expect((await unwrap(result)).status).toBe(200);
    expect((await clientLoader()).drafts).toEqual([]);
  });
});

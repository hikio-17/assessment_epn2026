import { useEffect, useRef, useState } from "react";
import { Form } from "react-router";

import { ROLE_LABELS } from "~/lib/constants";
import { getInitials } from "~/lib/format";
import type { AuthUser } from "~/types";

type UserMenuProps = {
  user: AuthUser;
};

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Buka menu profil"
        className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white ring-offset-2 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {getInitials(user.name)}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
        >
          <div className="px-3 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {user.email}
            </p>
            <span className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {ROLE_LABELS[user.role]}
            </span>
          </div>

          <div className="border-t border-slate-100 pt-2">
            <Form method="post" action="/logout">
              <button
                type="submit"
                role="menuitem"
                className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
              >
                Keluar
              </button>
            </Form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

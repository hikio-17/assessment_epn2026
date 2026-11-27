import {
  Form,
  data,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import {
  NotebookPen,
  Trash2,
  X,
} from "lucide-react";

import type { Route } from "./+types/drafts";
import { PageHeader } from "~/components/page-header";
import {
  clearDraftCache,
  readDraftCache,
  writeDraftCache,
  type DraftCacheState,
} from "~/lib/draft-cache";
import {
  employeeDraftSchema,
  toFieldErrors,
} from "~/lib/validation";
import type {
  DraftActionData,
  DraftFormValues,
  EmployeeDraft,
} from "~/types";

export async function clientLoader() {
  return readDraftCache();
}

clientLoader.hydrate = true as const;

export async function clientAction({
  request,
}: Route.ClientActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const cache = readDraftCache();

  if (!cache.storageAvailable) {
    return data(
      {
        ok: false,
        message:
          "localStorage tidak tersedia di browser ini.",
      } satisfies DraftActionData,
      { status: 500 },
    );
  }

  if (intent === "clear") {
    if (!clearDraftCache()) {
      return data(
        {
          ok: false,
          message: "Gagal menghapus cache draft.",
        } satisfies DraftActionData,
        { status: 500 },
      );
    }

    return data({
      ok: true,
      message: "Semua draft berhasil dihapus.",
    } satisfies DraftActionData);
  }

  if (intent === "delete") {
    const id = String(formData.get("id") ?? "");

    if (!id) {
      return data(
        {
          ok: false,
          message: "Draft ID tidak valid.",
        } satisfies DraftActionData,
        { status: 400 },
      );
    }

    const drafts = cache.drafts.filter(
      (draft) => draft.id !== id,
    );

    if (!writeDraftCache(drafts)) {
      return data(
        {
          ok: false,
          message: "Gagal menyimpan perubahan draft.",
        } satisfies DraftActionData,
        { status: 500 },
      );
    }

    return data({
      ok: true,
      message: "Draft berhasil dihapus.",
    } satisfies DraftActionData);
  }

  if (intent !== "create") {
    return data(
      {
        ok: false,
        message: "Aksi tidak dikenal.",
      } satisfies DraftActionData,
      { status: 400 },
    );
  }

  const values: DraftFormValues = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    position: String(
      formData.get("position") ?? "",
    ),
    note: String(formData.get("note") ?? ""),
  };

  const parsed = employeeDraftSchema.safeParse(values);

  if (!parsed.success) {
    return data(
      {
        ok: false,
        message: "Periksa kembali form draft.",
        fieldErrors: toFieldErrors(parsed.error),
        values,
      } satisfies DraftActionData,
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const draft: EmployeeDraft = {
    id: crypto.randomUUID(),
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  };

  if (!writeDraftCache([draft, ...cache.drafts])) {
    return data(
      {
        ok: false,
        message:
          "Gagal menyimpan draft. Storage mungkin penuh.",
        values,
      } satisfies DraftActionData,
      { status: 500 },
    );
  }

  return data({
    ok: true,
    message:
      "Draft disimpan di browser. Belum masuk database.",
  } satisfies DraftActionData);
}

export function meta() {
  return [{ title: "Employee drafts - PeopleOps" }];
}

function DraftSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-3xl bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-40 animate-pulse rounded-3xl bg-slate-200"
          />
        ))}
      </div>
    </div>
  );
}

export function HydrateFallback() {
  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Workspace", to: "/" },
          { label: "Drafts" },
        ]}
        title="Employee drafts"
        description="Draft disimpan di localStorage browser ini. Tidak masuk database dan tidak terkirim ke server."
      />
      <DraftSkeleton />
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white";

export default function DraftsPage() {
  const loaderData =
    useLoaderData<DraftCacheState>();
  const actionData =
    useActionData<DraftActionData>();
  const navigation = useNavigation();
  const submitting =
    navigation.state === "submitting";

  const fieldErrors =
    actionData?.fieldErrors ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Workspace", to: "/" },
          { label: "Drafts" },
        ]}
        title="Employee drafts"
        description="Draft disimpan di localStorage browser ini. Tidak masuk database dan tidak terkirim ke server."
        actions={
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
            {loaderData.storageAvailable
              ? "localStorage active"
              : "localStorage unavailable"}
            {loaderData.savedAt
              ? ` · ${loaderData.savedAt.slice(0, 10)}`
              : ""}
          </span>
        }
      />

      {actionData?.message ? (
        <div
          role={actionData.ok ? "status" : "alert"}
          className={`rounded-2xl border px-4 py-3 text-sm ${
            actionData.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {actionData.message}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">
          New draft
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Data sementara untuk calon employee.
        </p>

        <Form
          key={loaderData.savedAt ?? "empty"}
          method="post"
          noValidate
          className="mt-5 space-y-5"
        >
          <input
            type="hidden"
            name="intent"
            value="create"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="draft-name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Name
              </label>
              <input
                id="draft-name"
                name="name"
                defaultValue={actionData?.values?.name ?? ""}
                className={inputClass}
                placeholder="Angga Marta"
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name ? (
                <p className="mt-1.5 text-xs text-rose-600">
                  {fieldErrors.name}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="draft-email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="draft-email"
                name="email"
                type="email"
                defaultValue={actionData?.values?.email ?? ""}
                className={inputClass}
                placeholder="angga@peopleops.test"
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email ? (
                <p className="mt-1.5 text-xs text-rose-600">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="draft-position"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Position
              </label>
              <input
                id="draft-position"
                name="position"
                defaultValue={
                  actionData?.values?.position ?? ""
                }
                className={inputClass}
                placeholder="Backend Engineer"
                aria-invalid={Boolean(fieldErrors.position)}
              />
              {fieldErrors.position ? (
                <p className="mt-1.5 text-xs text-rose-600">
                  {fieldErrors.position}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="draft-note"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Note
              </label>
              <input
                id="draft-note"
                name="note"
                defaultValue={actionData?.values?.note ?? ""}
                className={inputClass}
                placeholder="Kandidat referral"
                aria-invalid={Boolean(fieldErrors.note)}
              />
              {fieldErrors.note ? (
                <p className="mt-1.5 text-xs text-rose-600">
                  {fieldErrors.note}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <NotebookPen className="h-4 w-4" />
              {submitting ? "Saving..." : "Save draft"}
            </button>
          </div>
        </Form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Saved drafts
            </h2>
            <p className="text-sm text-slate-500">
              {loaderData.drafts.length} draft di browser ini.
            </p>
          </div>

          {loaderData.drafts.length > 0 ? (
            <Form
              method="post"
              onSubmit={(event) => {
                if (
                  !window.confirm(
                    "Hapus semua draft dari localStorage?",
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              <input
                type="hidden"
                name="intent"
                value="clear"
              />
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Clear all
              </button>
            </Form>
          ) : null}
        </div>

        {loaderData.drafts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-500">
            Belum ada draft. Simpan draft pertama di form atas.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loaderData.drafts.map((draft) => (
              <article
                key={draft.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {draft.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {draft.email}
                    </p>
                  </div>

                  <Form
                    method="post"
                    onSubmit={(event) => {
                      if (
                        !window.confirm(
                          `Hapus draft ${draft.name}?`,
                        )
                      ) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input
                      type="hidden"
                      name="intent"
                      value="delete"
                    />
                    <input
                      type="hidden"
                      name="id"
                      value={draft.id}
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      aria-label={`Hapus draft ${draft.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Form>
                </div>

                <p className="mt-4 text-sm font-medium text-slate-700">
                  {draft.position}
                </p>

                {draft.note ? (
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                    {draft.note}
                  </p>
                ) : null}

                <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] uppercase tracking-wider text-slate-400">
                  Saved {draft.createdAt.slice(0, 10)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

# PeopleOps

Aplikasi HR untuk mengelola employee, department, assignment, upload foto, dan report. Dibangun dengan React Router 8 framework mode, TypeORM, dan PostgreSQL.

Fokus project ini ada di alur server-side React Router, validasi, session, RBAC, dan penanganan concurrency yang benar. Semua data utama diambil lewat loader atau action, bukan fetch di `useEffect`.

## Stack

- React Router 8 + React 19 + Vite 8
- TypeScript
- TypeORM 1.1 + PostgreSQL 17
- Tailwind CSS 4
- Zod
- Vitest + jsdom

## Menjalankan

Butuh Node 22.22 atau lebih baru, Yarn 1.22, dan Docker.

```bash
cd /home/hikio/workplaces/projects/asessment_epn1/assessment

cp .env.example .env
yarn install
yarn db:setup
yarn dev
```

`yarn db:setup` menyalakan PostgreSQL lewat Docker Compose lalu menjalankan seed.

Aplikasi tersedia di `http://localhost:5173`.

## Akun demo

| Email | Password | Role |
| --- | --- | --- |
| admin@peopleops.test | Password123! | ADMIN |
| hr@peopleops.test | Password123! | HR |
| viewer@peopleops.test | Password123! | VIEWER |

ADMIN dan HR bisa create, update, dan delete. VIEWER hanya bisa membaca.

## Route utama

| Route | Keterangan |
| --- | --- |
| `/login`, `/logout` | Login dan session |
| `/` | Dashboard |
| `/employees` | List, detail, create, edit, delete employee |
| `/employees/new` | Form employee + upload foto |
| `/employees/:id/edit` | Edit employee |
| `/assignments` | Advanced module dengan `useFetch`, dependent dropdown, dan toast |
| `/drafts` | Draft employee di localStorage |
| `/reports` | Report dengan layout terpisah |
| `/reports/export` | Export CSV, khusus ADMIN/HR |
| `/lab/parallel` | Demo 5 API paralel |
| `/admin/users` | Module khusus ADMIN |

## Catatan implementasi

- Semua halaman utama memakai `useLoaderData` dan form CRUD memakai `useActionData` serta komponen `Form`.
- Create/edit employee dan create/edit assignment dibuka sebagai modal. Route employee create/edit tetap tersedia sebagai fallback direct URL.
- Layout memakai root layout, app layout, employees layout, dan layout report terpisah.
- Middleware berjalan di root, layout, dan route. Auth dicek ulang di loader/action sebagai lapisan kedua.
- Upload foto dibatasi 2MB dan extension/MIME tertentu. File ditulis di dalam transaksi; kalau insert database gagal, file dihapus. Kalau upload gagal, transaksi rollback.
- Assignment memakai transaksi serializable, pessimistic row lock, partial unique index satu assignment aktif per employee, version untuk update, dan retry saat serialization failure.
- Report punya header dan sidebar sendiri, plus mode print dan export CSV.
- Halaman parallel memakai `Promise.all` di server loader. Bukti durasi parallel dibandingkan dengan estimasi sequential ditampilkan langsung di halaman.
- Module assignment memakai custom `useFetch` karena kebutuhan client-side interaction. Core CRUD tetap server-side. Form di halaman assignment tetap memakai komponen `Form` React Router, tetapi submit-nya dicegat dan diproses lewat `useFetch`.
- Satu-satunya `useEffect` ada di `app/hooks/use-fetch.ts`. Itu konsekuensi dari kebutuhan advanced module yang meminta client `useFetch`; halaman CRUD utama tidak memakai client fetch.
- Toast disimpan di external store dan di-dedupe berdasarkan ID operasi. Submit dikunci agar tidak mengirim request ganda.
- Draft employee memakai `clientLoader` dan `clientAction` dengan localStorage. Data draft tidak masuk database.

## File yang perlu dilihat saat review

| Bagian | Lokasi |
| --- | --- |
| Loader/action, Form, feedback | `app/routes/employees-*` |
| Session dan login | `app/session.server.ts`, `app/routes/login.tsx` |
| Middleware auth/RBAC | `app/middleware/auth.server.ts` |
| Upload dan rollback | `app/services/upload.server.ts`, `app/services/employee.server.ts` |
| Concurrency assignment | `app/services/assignment.server.ts`, `app/db/entities/assignment.entity.ts` |
| Report dan CSV | `app/routes/report-*`, `app/routes/reports-layout.tsx`, `app/services/report.server.ts` |
| Parallel API | `app/lib/parallel-demo.server.ts`, `app/routes/parallel-fetch.tsx` |
| useFetch dan toast | `app/hooks/use-fetch.ts`, `app/lib/toast-store.ts` |
| clientLoader/clientAction | `app/routes/drafts.tsx`, `app/lib/draft-cache.ts` |
| Test | `tests/unit`, `tests/integration` |

## Test

```bash
yarn test
```

Perintah di atas menyalakan container database, membuat database `assessment_test` bila belum ada, menyiapkan schema, lalu menjalankan seluruh test.

Hasil terakhir:

```text
Test Files  15 passed
Tests       82 passed
```

Test mencakup:

- validasi Zod: input kosong, format salah, duplicate
- unit test untuk upload, CSV, toast store, parallel demo, retry, authorization, draft cache
- integration route/API create, read, update, delete
- login, session, middleware, RBAC page dan API
- upload rollback dan pembersihan file
- race condition assignment: 3 create bersamaan menghasilkan 1 sukses dan 2 conflict
- update dengan version stale menghasilkan 409
- report aggregation dan export CSV
- clientLoader/clientAction dengan localStorage

Perintah lain:

```bash
yarn typecheck
yarn build
yarn test:unit
yarn test:coverage
```

## Struktur singkat

```text
app/
├─ components/       UI, form, loading bar, toast
├─ db/entities/      EntitySchema TypeORM
├─ hooks/            useFetch
├─ lib/              validasi, error, cache, CSV, helper
├─ middleware/       root, auth, RBAC
├─ routes/           halaman dan resource route
├─ services/         business logic dan query database
├─ auth.server.ts
├─ db.server.ts
├─ root.tsx
└─ routes.ts

scripts/              seed dan smoke test
tests/                unit dan integration test
```

## Catatan produksi

- `synchronize()` hanya dipakai oleh seed dan setup test. Untuk produksi sebaiknya tambahkan migration TypeORM.
- File upload masih disimpan di disk lokal (`uploads/`). Kalau akan deploy multi-instance, pindahkan ke object storage dan sesuaikan lifecycle cleanup-nya.
- Halaman `/lab/parallel` bergantung pada JSONPlaceholder. Kalau jaringan eksternal bermasalah, halaman tetap bisa dibuka tetapi kartu API akan menampilkan error.
- Ganti `SESSION_SECRET` sebelum deploy. Set `COOKIE_SECURE=true` jika aplikasi berjalan di HTTPS.
- Akun demo hanya untuk local development.

## Environment

```env
DATABASE_URL=postgresql://assessment:assessment@localhost:5432/assessment
TEST_DATABASE_URL=postgresql://assessment:assessment@localhost:5432/assessment_test
SESSION_SECRET=...
UPLOAD_DIR=./uploads
COOKIE_SECURE=false
```

Database berjalan di port `5432` dengan kredensial development `assessment` / `assessment`.

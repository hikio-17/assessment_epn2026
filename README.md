# PeopleOps

Aplikasi HR internal untuk mengelola data karyawan, departemen, penugasan, dan laporan. Dibangun dengan React Router 8, TypeORM, dan PostgreSQL.

Data utama diambil di server melalui `loader`, sedangkan mutasi data diproses melalui `action`.

## Fitur

- Login, sesi, dan kontrol akses berdasarkan peran `ADMIN`, `HR`, dan `VIEWER`.
- Sesi berlaku 8 jam, atau 30 hari jika **Ingat saya** dicentang.
- CRUD karyawan dengan upload foto, pencarian, filter departemen, dan pagination.
- Modul penugasan dengan dropdown departemen → karyawan, loading bar, toast, dan pengamanan konkurensi di database.
- Halaman admin untuk menambah pengguna. Tidak ada registrasi publik.
- Draft karyawan di localStorage menggunakan `clientLoader` dan `clientAction`.
- Laporan headcount dan payroll dengan layout terpisah, mode cetak, dan ekspor CSV.
- Halaman uji konkurensi lima API.
- Loading bar global di bawah topbar.

## Stack

- React Router 8 + React 19 + Vite 8
- TypeScript
- TypeORM 1.1 + PostgreSQL 17
- Tailwind CSS 4
- Zod
- Vitest + jsdom
- react-top-loading-bar

## Menjalankan

Butuh Node 22.22 atau lebih baru, Yarn 1.22, dan Docker.

```bash
cd assessment

cp .env.example .env
yarn install
yarn db:setup
yarn dev
```

`yarn db:setup` menyalakan PostgreSQL lewat Docker Compose lalu menjalankan seed.

Aplikasi tersedia di `http://localhost:5173`.

Untuk menjalankan hasil build:

```bash
yarn build
yarn start
```

## Akun demo

| Email | Password | Peran |
| --- | --- | --- |
| admin@peopleops.test | Password123! | ADMIN |
| hr@peopleops.test | Password123! | HR |
| viewer@peopleops.test | Password123! | VIEWER |

`ADMIN` dan `HR` dapat mengelola karyawan dan penugasan. `VIEWER` hanya dapat membaca. Halaman pengguna hanya dapat diakses `ADMIN`.

## Route

| Route | Keterangan |
| --- | --- |
| `/login`, `/logout` | Login dan sesi |
| `/` | Dasbor |
| `/employees` | Daftar karyawan, pencarian, dan filter |
| `/employees/new` | Form karyawan dan upload foto |
| `/employees/:id` | Detail karyawan |
| `/employees/:id/edit` | Edit karyawan |
| `/assignments` | Modul penugasan |
| `/drafts` | Draft karyawan di localStorage |
| `/reports` | Laporan headcount dan payroll |
| `/reports/export` | Ekspor CSV, khusus `ADMIN` dan `HR` |
| `/concurrency` | Uji konkurensi lima API |
| `/admin/users` | Daftar dan tambah pengguna, khusus `ADMIN` |

## Arsitektur

- Halaman utama memakai `useLoaderData`; form CRUD memakai `Form`, `useActionData`, dan validasi Zod.
- Layout terdiri dari root layout, app layout, employees layout, dan layout laporan terpisah.
- Middleware auth dan RBAC berjalan di root, layout, dan route. Pengecekan akses juga dilakukan di `loader` dan `action`.
- Upload foto dibatasi 2MB dengan tipe JPG, JPEG, PNG, atau WebP. File disimpan di dalam transaksi; jika insert database gagal, file dihapus. Jika upload gagal, transaksi dibatalkan.
- Penugasan memakai transaksi `SERIALIZABLE`, pessimistic row lock, partial unique index untuk satu penugasan aktif per karyawan, optimistic version, dan retry saat serialization failure.
- Modul penugasan memakai custom `useFetch` untuk interaksi form dan dependent dropdown. Submit dikunci agar tidak mengirim request ganda, dan toast di-dedupe berdasarkan ID operasi.
- Laporan memiliki header dan sidebar sendiri, mendukung mode cetak, dan ekspor CSV untuk `ADMIN` dan `HR`.
- Halaman `/concurrency` mengambil lima API dengan `Promise.all` di server loader, lalu membandingkan waktu paralel dengan total delay berurutan.
- Draft karyawan memakai `clientLoader` dan `clientAction` dengan localStorage. Data draft tidak masuk database.
- Loading bar global dipasang di layout utama dan layout laporan, serta terhubung ke navigasi dan proses `useFetch`.
- Pengguna baru dibuat dari halaman admin. Password di-hash dengan bcrypt dan email harus unik.

## Bagian penting

| Bagian | Lokasi |
| --- | --- |
| CRUD karyawan | `app/routes/employees-*` |
| Validasi dan form | `app/lib/validation.ts`, `app/lib/employee-form.ts`, `app/components/employee-form.tsx` |
| Sesi dan login | `app/session.server.ts`, `app/routes/login.tsx` |
| Middleware auth dan RBAC | `app/middleware/auth.server.ts` |
| Upload dan rollback | `app/services/upload.server.ts`, `app/services/employee.server.ts` |
| Konkurensi penugasan | `app/services/assignment.server.ts`, `app/db/entities/assignment.entity.ts` |
| Laporan dan CSV | `app/routes/report-*`, `app/routes/reports-layout.tsx`, `app/services/report.server.ts` |
| Konkurensi API | `app/lib/parallel-demo.server.ts`, `app/routes/parallel-fetch.tsx` |
| `useFetch` dan toast | `app/hooks/use-fetch.ts`, `app/lib/toast-store.ts` |
| Draft localStorage | `app/routes/drafts.tsx`, `app/lib/draft-cache.ts` |
| Pengguna admin | `app/services/user.server.ts`, `app/routes/admin-users.tsx` |
| Loading bar | `app/components/top-loading-bar.tsx`, `app/lib/page-loading.ts` |
| Test | `tests/unit`, `tests/integration` |

## Test

```bash
yarn test
```

Perintah tersebut menyalakan container database, membuat database `assessment_test` bila belum ada, menyiapkan schema, lalu menjalankan seluruh test.

Hasil terakhir:

```text
Test Files  16 passed
Tests       93 passed
```

Cakupan test:

- Unit test untuk validasi Zod, upload, CSV, toast store, concurrent request runner, retry, authorization, dan draft cache.
- Integration test untuk CRUD karyawan, penugasan, laporan, pengguna admin, serta route API.
- Test login, remember me, sesi, middleware, dan RBAC halaman maupun API.
- Test race condition penugasan, update dengan version stale, upload rollback, dan `clientLoader`/`clientAction`.

Perintah lain:

```bash
yarn typecheck
yarn build
yarn test:unit
yarn test:coverage
```

## Struktur project

```text
app/
├─ components/       UI, form, dialog, loading bar, toast
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

- `synchronize()` hanya dipakai oleh seed dan setup test. Untuk produksi, tambahkan migration TypeORM.
- File upload masih disimpan di disk lokal (`uploads/`). Untuk deployment multi-instance, pindahkan ke object storage dan sesuaikan lifecycle cleanup-nya.
- Halaman `/concurrency` bergantung pada JSONPlaceholder. Jika jaringan eksternal bermasalah, halaman tetap dapat dibuka tetapi kartu API akan menampilkan error.
- Ganti `SESSION_SECRET` sebelum deploy. Set `COOKIE_SECURE=true` jika aplikasi berjalan di HTTPS.
- Akun demo hanya untuk local development.
- Belum ada fitur reset password dan verifikasi email.

## Environment

```env
DATABASE_URL=postgresql://assessment:assessment@localhost:5432/assessment
TEST_DATABASE_URL=postgresql://assessment:assessment@localhost:5432/assessment_test
SESSION_SECRET=...
UPLOAD_DIR=./uploads
COOKIE_SECURE=false
```

Database development berjalan di port `5432` dengan kredensial `assessment` / `assessment`.

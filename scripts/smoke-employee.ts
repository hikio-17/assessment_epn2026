import { mkdir, readdir } from "node:fs/promises";

import {
  closeDataSource,
  getInitializedDataSource,
} from "../app/db.server";
import { DepartmentEntity } from "../app/db/entities";
import { AppError } from "../app/lib/errors";
import {
  createEmployee,
  deleteEmployee,
  updateEmployee,
} from "../app/services/employee.server";
import {
  getUploadDir,
  readStoredPhoto,
} from "../app/services/upload.server";

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47,
  0x0d, 0x0a, 0x1a, 0x0a,
]);

function makeFile(filename: string): File {
  return new File([PNG_BYTES], filename, {
    type: "image/png",
  });
}

async function listUploadFiles(): Promise<Set<string>> {
  try {
    return new Set(await readdir(getUploadDir()));
  } catch {
    return new Set();
  }
}

async function main() {
  const dataSource = await getInitializedDataSource();

  await mkdir(getUploadDir(), { recursive: true });

  let createdId: number | null = null;

  try {
    const it = await dataSource
      .getRepository(DepartmentEntity)
      .findOneBy({ code: "IT" });

    if (!it) {
      throw new Error(
        "Department IT belum ada. Jalankan yarn db:seed dulu.",
      );
    }

    const stamp = Date.now();

    const base = {
      name: "Smoke Test Employee",
      email: `smoke.${stamp}@peopleops.test`,
      position: "QA Smoke Tester",
      salary: 9_000_000,
      status: "ACTIVE" as const,
      departmentId: it.id,
    };

    const created = await createEmployee(
      base,
      makeFile("smoke.png"),
    );
    createdId = created.id;

    if (!created.photoPath) {
      throw new Error("photoPath kosong setelah create.");
    }

    const firstPhoto = created.photoPath;

    console.log(
      "1. create:",
      created.id,
      firstPhoto,
      "file exists:",
      Boolean(await readStoredPhoto(firstPhoto)),
    );

    const updated = await updateEmployee(
      created.id,
      {
        ...base,
        position: "Senior QA Smoke Tester",
      },
      makeFile("smoke-next.png"),
      false,
    );

    if (!updated.photoPath) {
      throw new Error("photoPath kosong setelah update.");
    }

    const secondPhoto = updated.photoPath;

    console.log("2. update new photo:", secondPhoto);
    console.log(
      "   old photo exists:",
      Boolean(await readStoredPhoto(firstPhoto)),
    );
    console.log(
      "   new photo exists:",
      Boolean(await readStoredPhoto(secondPhoto)),
    );

    const beforeRollback = await listUploadFiles();
    let rollbackCaught = false;

    try {
      await createEmployee(
        {
          ...base,
          email: `rollback.${stamp}@peopleops.test`,
          departmentId: 999_999,
        },
        makeFile("rollback.png"),
      );
    } catch (error) {
      if (!(error instanceof AppError)) {
        throw error;
      }

      rollbackCaught = true;
      console.log(
        "3. expected DB failure:",
        error.status,
        error.message,
        error.fieldErrors,
      );
    }

    const afterRollback = await listUploadFiles();
    const leakedFiles = [...afterRollback].filter(
      (filename) => !beforeRollback.has(filename),
    );

    console.log("   rollback caught:", rollbackCaught);
    console.log("   leaked files:", leakedFiles);

    if (!rollbackCaught || leakedFiles.length > 0) {
      throw new Error(
        "Rollback atau cleanup file gagal.",
      );
    }

    await deleteEmployee(created.id);
    createdId = null;

    const deletedPhotoStillExists =
      Boolean(await readStoredPhoto(secondPhoto));

    console.log(
      "4. delete: photo still exists:",
      deletedPhotoStillExists,
    );

    if (deletedPhotoStillExists) {
      throw new Error(
        "File foto masih ada setelah employee dihapus.",
      );
    }

    console.log("SMOKE TEST PASSED");
  } finally {
    if (createdId) {
      await deleteEmployee(createdId).catch(
        () => undefined,
      );
    }

    await closeDataSource();
  }
}

main().catch((error) => {
  console.error("SMOKE TEST FAILED", error);
  process.exitCode = 1;
});
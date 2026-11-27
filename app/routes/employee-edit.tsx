import {
  useActionData,
  useLoaderData,
} from "react-router";

import type { Route } from "./+types/employee-edit";
import { requirePageRole } from "~/authorization.server";
import { EmployeeForm } from "~/components/employee-form";
import { PageHeader } from "~/components/page-header";
import {
  employeeActionError,
  employeeActionSuccess,
} from "~/lib/employee-action";
import { parseEmployeeForm } from "~/lib/employee-form";
import {
  NotFoundError,
  ValidationError,
} from "~/lib/errors";
import { parseEmployeeId } from "~/lib/query";
import { listDepartments } from "~/services/department.server";
import {
  getEmployeeById,
  updateEmployee,
} from "~/services/employee.server";
import type {
  EmployeeActionData,
  EmployeeDTO,
  EmployeeFormValues,
} from "~/types";

function toFormValues(
  employee: EmployeeDTO,
): EmployeeFormValues {
  return {
    name: employee.name,
    email: employee.email,
    position: employee.position,
    departmentId: String(employee.departmentId),
    salary: String(employee.salary),
    status: employee.status,
  };
}

export async function loader({
  params,
  context,
}: Route.LoaderArgs) {
  requirePageRole(context, ["ADMIN", "HR"]);

  const id = parseEmployeeId(params.id);

  if (!id) {
    throw new Response("Karyawan tidak ditemukan", {
      status: 404,
    });
  }

  try {
    const [employee, departments] = await Promise.all([
      getEmployeeById(id),
      listDepartments(),
    ]);

    return {
      employee,
      departments,
      values: toFormValues(employee),
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new Response("Karyawan tidak ditemukan", {
        status: 404,
      });
    }

    throw error;
  }
}

export async function action({
  request,
  params,
  context,
}: Route.ActionArgs) {
  requirePageRole(context, ["ADMIN", "HR"]);

  const id = parseEmployeeId(params.id);

  if (!id) {
    return employeeActionError(
      new ValidationError("ID karyawan tidak valid."),
      "update",
    );
  }

  const formData = await request.formData();
  const parsed = parseEmployeeForm(formData);

  if (
    !parsed.input ||
    Object.keys(parsed.fieldErrors).length > 0
  ) {
    return employeeActionError(
      new ValidationError(
        "Periksa kembali form.",
        parsed.fieldErrors,
      ),
      "update",
    );
  }

  try {
    const employee = await updateEmployee(
      id,
      parsed.input,
      parsed.photo,
      parsed.removePhoto,
    );

    return employeeActionSuccess(
      "Karyawan berhasil diperbarui.",
      employee,
      parsed.values,
      "update",
    );
  } catch (error) {
    return employeeActionError(error, "update");
  }
}

export function meta() {
  return [{ title: "Ubah karyawan - PeopleOps" }];
}

export default function EmployeeEditPage() {
  const { employee, departments, values } =
    useLoaderData<typeof loader>();
  const actionData =
    useActionData<EmployeeActionData>();

  const formValues = actionData?.values ?? values;

  const currentPhotoUrl =
    actionData?.employee?.photoUrl ??
    employee.photoUrl;

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Workspace", to: "/" },
          { label: "Karyawan", to: "/employees" },
          {
            label: employee.name,
            to: `/employees/${employee.id}`,
          },
          { label: "Ubah" },
        ]}
        title="Ubah karyawan"
        description="Perbarui data karyawan, ganti foto, atau hapus foto yang ada."
      />

      <EmployeeForm
        key={
          actionData?.employee?.updatedAt ??
          employee.updatedAt
        }
        mode="edit"
        departments={departments}
        values={formValues}
        actionData={actionData}
        currentPhotoUrl={currentPhotoUrl}
        employeeId={employee.id}
        cancelTo={`/employees/${employee.id}`}
      />
    </div>
  );
}
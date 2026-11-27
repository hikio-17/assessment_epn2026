import {
  useActionData,
  useLoaderData,
} from "react-router";

import type { Route } from "./+types/employee-new";
import { requirePageRole } from "~/authorization.server";
import { EmployeeForm } from "~/components/employee-form";
import { PageHeader } from "~/components/page-header";
import {
  employeeActionError,
  employeeActionSuccess,
} from "~/lib/employee-action";
import { parseEmployeeForm } from "~/lib/employee-form";
import { ValidationError } from "~/lib/errors";
import { listDepartments } from "~/services/department.server";
import { createEmployee } from "~/services/employee.server";
import type {
  EmployeeActionData,
  EmployeeFormValues,
} from "~/types";

const emptyValues: EmployeeFormValues = {
  name: "",
  email: "",
  position: "",
  departmentId: "",
  salary: "",
  status: "ACTIVE",
};

export async function loader({
  context,
}: Route.LoaderArgs) {
  requirePageRole(context, ["ADMIN", "HR"]);

  return {
    departments: await listDepartments(),
  };
}

export async function action({
  request,
  context,
}: Route.ActionArgs) {
  requirePageRole(context, ["ADMIN", "HR"]);

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
      "create",
    );
  }

  try {
    const employee = await createEmployee(
      parsed.input,
      parsed.photo,
    );

    return employeeActionSuccess(
      "Karyawan berhasil dibuat.",
      employee,
      parsed.values,
      "create",
    );
  } catch (error) {
    return employeeActionError(error, "create");
  }
}

export function meta() {
  return [{ title: "Tambah karyawan - PeopleOps" }];
}

export default function EmployeeNewPage() {
  const { departments } =
    useLoaderData<typeof loader>();
  const actionData =
    useActionData<EmployeeActionData>();

  const values = actionData?.values ?? emptyValues;

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Workspace", to: "/" },
          { label: "Karyawan", to: "/employees" },
          { label: "Tambah karyawan" },
        ]}
        title="Tambah karyawan"
        description="Lengkapi data karyawan baru, termasuk departemen dan foto profil."
      />

      <EmployeeForm
        mode="create"
        departments={departments}
        values={values}
        actionData={actionData}
        cancelTo="/employees"
      />
    </div>
  );
}
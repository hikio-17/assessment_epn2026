import { EntitySchema } from "typeorm";

export interface Department {
  id: number;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const DepartmentEntity = new EntitySchema<Department>({
  name: "Department",
  tableName: "departments",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: "increment",
    },
    code: {
      type: "varchar",
      length: 20,
      unique: true,
    },
    name: {
      type: "varchar",
      length: 120,
      unique: true,
    },
    description: {
      type: "text",
      nullable: true,
    },
    createdAt: {
      name: "created_at",
      type: "timestamptz",
      createDate: true,
    },
    updatedAt: {
      name: "updated_at",
      type: "timestamptz",
      updateDate: true,
    },
  },
});
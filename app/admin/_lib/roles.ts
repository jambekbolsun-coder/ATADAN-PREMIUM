import type { StaffRole } from "../../lib/admin-auth";

export const ROLE_LABEL: Record<StaffRole, string> = {
  owner: "Владелец",
  director: "Директор",
  manager: "Менеджер по продажам",
  accountant: "Бухгалтер",
  marketer: "Маркетолог",
};

/** Как подписывать сотрудника: должность, если указана, иначе роль. */
export const staffTitle = (role: StaffRole, position?: string | null) => position?.trim() || ROLE_LABEL[role];

import type { StaffRole } from "../../lib/admin-auth";

export const ROLE_LABEL: Record<StaffRole, string> = {
  owner: "Владелец",
  director: "Директор",
  manager: "Менеджер по продажам",
  accountant: "Бухгалтер",
  marketer: "Маркетолог",
};

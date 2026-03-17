export const TEAM_MEMBERS = [
  { id: "655f7167-5449-43ae-ac2a-3df21d2b3d3f", label: "Ilias" },
  { id: "3af4cbc3-6f3e-44e4-a4e9-9ecb1fe65591", label: "Benzz" },
] as const;

export const TEAM_USER_IDS = TEAM_MEMBERS.map((member) => member.id);
export const DEFAULT_WORKSPACE_NAME = "E-COM-OS Team";

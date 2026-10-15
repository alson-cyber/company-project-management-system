import type { ProjectRole, ProjectStatus, UserStatus, WorkspaceRole } from "@/generated/prisma/enums";

/**
 * Development/test fixture data. Not production bootstrap: it uses a shared, documented
 * password and `.test` email addresses, and the seed entry point refuses to run in production.
 */

export interface SeedUser {
  name: string;
  email: string;
  jobTitle: string;
  status?: UserStatus;
  workspaceRoles: WorkspaceRole[];
}

export interface SeedProject {
  key: string;
  name: string;
  description: string;
  status: ProjectStatus;
  color: string;
  targetDate: string;
  members: { email: string; role: ProjectRole }[];
}

export const SEED_WORKSPACE = { name: "Company Workspace", defaultSlug: "company" } as const;

export const SEED_USERS = [
  { name: "Alson Chen", email: "alson.chen@workhub.test", jobTitle: "Managing Director", workspaceRoles: ["EXECUTIVE"] },
  { name: "Sarah Kim", email: "sarah.kim@workhub.test", jobTitle: "Delivery Manager", workspaceRoles: [] },
  { name: "Alex Noor", email: "alex.noor@workhub.test", jobTitle: "Senior Engineer", workspaceRoles: [] },
  { name: "Mika Ross", email: "mika.ross@workhub.test", jobTitle: "Product Designer", workspaceRoles: [] },
  { name: "Emma Davis", email: "emma.davis@workhub.test", jobTitle: "QA Engineer", workspaceRoles: [] },
  { name: "Omar Haleem", email: "omar.haleem@workhub.test", jobTitle: "IT Administrator", workspaceRoles: ["ADMIN"] },
  {
    name: "Lina Farah",
    email: "lina.farah@workhub.test",
    jobTitle: "Contractor (left)",
    status: "DEACTIVATED",
    workspaceRoles: [],
  },
] as const satisfies readonly SeedUser[];

export type SeedUserEmail = (typeof SEED_USERS)[number]["email"];

export const SEED_PROJECTS = [
  {
    key: "AQUA",
    name: "AquaDesk",
    description: "Resort excursion and activity booking and operations system.",
    status: "ACTIVE",
    color: "#18b8a3",
    targetDate: "2026-12-15",
    members: [
      { email: "sarah.kim@workhub.test", role: "LEAD" },
      { email: "alex.noor@workhub.test", role: "MEMBER" },
      { email: "mika.ross@workhub.test", role: "MEMBER" },
      { email: "emma.davis@workhub.test", role: "MEMBER" },
      { email: "lina.farah@workhub.test", role: "MEMBER" },
    ],
  },
  {
    key: "SV",
    name: "SignVeli",
    description: "E-signature and document workflow platform.",
    status: "ACTIVE",
    color: "#8b5cf6",
    targetDate: "2027-01-29",
    members: [
      { email: "alex.noor@workhub.test", role: "LEAD" },
      { email: "sarah.kim@workhub.test", role: "MEMBER" },
      { email: "mika.ross@workhub.test", role: "MEMBER" },
    ],
  },
  {
    key: "AIB",
    name: "AIB Portal",
    description: "Registration portal for Accountants in Business members.",
    status: "ACTIVE",
    color: "#e6a62b",
    targetDate: "2026-11-27",
    members: [
      { email: "alex.noor@workhub.test", role: "LEAD" },
      { email: "emma.davis@workhub.test", role: "MEMBER" },
    ],
  },
  {
    key: "PMS",
    name: "Internal PMS",
    description: "Company project management system.",
    status: "PLANNING",
    color: "#4f6cf7",
    targetDate: "2027-03-31",
    members: [
      { email: "alson.chen@workhub.test", role: "LEAD" },
      { email: "alex.noor@workhub.test", role: "MEMBER" },
      { email: "emma.davis@workhub.test", role: "MEMBER" },
    ],
  },
] as const satisfies readonly SeedProject[];


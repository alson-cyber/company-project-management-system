/**
 * The fixed vocabulary of activity actions. New business mutations add their action here,
 * so every event in the database comes from a known, typed list.
 */
export const ACTIVITY_ACTIONS = ["project.created", "project.health_changed", "project.member_added"] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const ACTIVITY_ENTITY_TYPES = ["project", "project_member"] as const;

export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];

export type ActivityActor = { type: "USER"; userId: string } | { type: "SYSTEM" };

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

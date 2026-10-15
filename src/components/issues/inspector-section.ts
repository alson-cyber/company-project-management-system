const SECTIONS = ["details", "notes", "attachments", "comments", "activity", "children"] as const;

export type InspectorSection = (typeof SECTIONS)[number];

export function parseInspectorSection(value: string | undefined): InspectorSection {
  return SECTIONS.includes(value as InspectorSection) ? (value as InspectorSection) : "details";
}

export const INSPECTOR_SECTIONS = SECTIONS;

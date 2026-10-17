const COLUMNS: Record<string, string> = {
  project: "project",
  projectKey: "project_key",
  health: "health",
  progress: "progress_percent",
  open: "open_executable",
  done: "done_executable",
  overdue: "overdue",
  highest: "highest_open",
  target: "target_date",
  lead: "project_lead",
  issue: "issue_key",
  title: "title",
  assignee: "assignee",
  priority: "priority",
  status: "status",
  due: "due_date",
  overdueDays: "overdue_days",
  actor: "actor",
  action: "action",
  when: "occurred_at",
  detail: "detail",
  completedBy: "completed_by",
};

export function csvFilename(report: string, day: string): string {
  return `workhub-${report}-${day}.csv`;
}

function cell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const labels = headers.map((header) => COLUMNS[header] ?? header);
  return [labels.join(","), ...rows.map((row) => row.map(cell).join(","))].join("\n") + "\n";
}

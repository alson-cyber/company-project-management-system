import type { IssuePriority, IssueStatus, IssueType } from "@/generated/prisma/enums";
import { issueKey } from "@/modules/issues/issue.keys";
import type { SeedUserEmail } from "@/modules/dev/dev-fixtures";
import type { Database } from "@/server/db";
import { getObjectStorage } from "@/server/storage";

export interface SeedIssueNode {
  title: string;
  type: IssueType;
  status?: IssueStatus;
  priority?: IssuePriority;
  assignee?: SeedUserEmail;
  reporter?: SeedUserEmail;
  creator?: SeedUserEmail;
  completedBy?: SeedUserEmail;
  dueDate?: string;
  plannedStartDate?: string;
  description?: string;
  labels?: string[];
  story?: { asA: string; iWant: string; soThat: string };
  acceptanceCriteria?: { text: string; isMet?: boolean }[];
  children?: SeedIssueNode[];
}

export const SEED_ISSUE_TREES: Record<string, SeedIssueNode[]> = {
  AQUA: [
    {
      title: "Guest booking experience",
      type: "EPIC",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assignee: "sarah.kim@workhub.test",
      plannedStartDate: "2026-09-01",
      description: "End-to-end booking for resort guests, from discovery to confirmation.",
      labels: ["booking"],
      children: [
        {
          title: "Streamline guest booking flow",
          type: "USER_STORY",
          status: "IN_PROGRESS",
          priority: "HIGH",
          assignee: "alex.noor@workhub.test",
          dueDate: "2026-11-20",
          plannedStartDate: "2026-09-15",
          story: {
            asA: "resort guest",
            iWant: "to book activities through a simple flow",
            soThat: "I can reserve excursions without sending emails to the concierge",
          },
          acceptanceCriteria: [
            { text: "Guest can see available slots for the next 30 days.", isMet: true },
            { text: "Guest can complete a booking in under two minutes on desktop." },
            { text: "A confirmation email is sent within one minute of payment." },
          ],
          labels: ["booking", "frontend"],
          children: [
            {
              title: "Design booking wizard",
              type: "TASK",
              status: "DONE",
              priority: "HIGH",
              assignee: "mika.ross@workhub.test",
              completedBy: "mika.ross@workhub.test",
              dueDate: "2026-09-30",
              plannedStartDate: "2026-09-01",
              labels: ["design"],
              children: [
                {
                  title: "Design mobile layouts",
                  type: "SUB_TASK",
                  status: "DONE",
                  assignee: "mika.ross@workhub.test",
                  completedBy: "mika.ross@workhub.test",
                  priority: "MEDIUM",
                },
                {
                  title: "Design review and error states",
                  type: "SUB_TASK",
                  status: "IN_REVIEW",
                  assignee: "mika.ross@workhub.test",
                  priority: "MEDIUM",
                  plannedStartDate: "2026-10-06",
                  dueDate: "2026-10-18",
                },
              ],
            },
            {
              title: "Implement availability API",
              type: "TASK",
              status: "IN_PROGRESS",
              priority: "HIGHEST",
              assignee: "alex.noor@workhub.test",
              dueDate: "2026-10-10",
              plannedStartDate: "2026-10-01",
              labels: ["api"],
              children: [
                {
                  title: "Query provider calendars",
                  type: "SUB_TASK",
                  status: "IN_PROGRESS",
                  assignee: "alex.noor@workhub.test",
                  priority: "HIGH",
                },
                {
                  title: "Cache daily availability",
                  type: "SUB_TASK",
                  status: "TO_DO",
                  assignee: "alex.noor@workhub.test",
                  priority: "MEDIUM",
                },
              ],
            },
            {
              title: "QA booking happy path",
              type: "TASK",
              status: "TO_DO",
              priority: "MEDIUM",
              assignee: "emma.davis@workhub.test",
              dueDate: "2026-11-05",
              plannedStartDate: "2026-10-20",
              labels: ["qa"],
            },
          ],
        },
        {
          title: "Let guests cancel within policy",
          type: "USER_STORY",
          status: "TO_DO",
          priority: "MEDIUM",
          assignee: "sarah.kim@workhub.test",
          story: {
            asA: "resort guest",
            iWant: "to cancel a booking within the published window",
            soThat: "I can change plans without calling the front desk",
          },
          acceptanceCriteria: [
            { text: "Cancellation is offered only when the policy window is still open." },
            { text: "Refund status is shown on the booking receipt." },
          ],
          labels: ["booking"],
          children: [
            {
              title: "Encode cancellation policy rules",
              type: "TASK",
              status: "TO_DO",
              priority: "MEDIUM",
              assignee: "alex.noor@workhub.test",
            },
          ],
        },
      ],
    },
    {
      title: "Operations dashboard",
      type: "EPIC",
      status: "TO_DO",
      priority: "MEDIUM",
      assignee: "sarah.kim@workhub.test",
      description: "Give resort operations a live view of today's excursions.",
      labels: ["operations"],
      children: [
        {
          title: "See today's excursion roster",
          type: "USER_STORY",
          status: "IN_PROGRESS",
          priority: "HIGH",
          assignee: "emma.davis@workhub.test",
          dueDate: "2026-10-01",
          plannedStartDate: "2026-09-10",
          story: {
            asA: "operations coordinator",
            iWant: "to see every excursion happening today with headcount and guide",
            soThat: "I can staff boats before guests arrive",
          },
          acceptanceCriteria: [
            { text: "Roster lists every confirmed booking for the local calendar day." },
            { text: "Guide assignment can be changed until one hour before departure." },
          ],
          children: [
            {
              title: "Build roster query",
              type: "TASK",
              status: "IN_REVIEW",
              priority: "HIGH",
              assignee: "alex.noor@workhub.test",
            },
            {
              title: "Design roster empty and conflict states",
              type: "TASK",
              status: "DONE",
              priority: "LOW",
              assignee: "mika.ross@workhub.test",
              completedBy: "mika.ross@workhub.test",
            },
          ],
        },
      ],
    },
  ],
  SV: [
    {
      title: "Envelope signing reliability",
      type: "EPIC",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assignee: "alex.noor@workhub.test",
      children: [
        {
          title: "Complete signing on a phone",
          type: "USER_STORY",
          status: "IN_PROGRESS",
          priority: "HIGH",
          assignee: "mika.ross@workhub.test",
          story: {
            asA: "document signer",
            iWant: "to finish signing on a phone without pinching the PDF",
            soThat: "I can complete envelopes while away from a desk",
          },
          acceptanceCriteria: [
            { text: "Signature pad is usable in portrait orientation." },
            { text: "The document reflow does not hide required fields." },
          ],
          children: [
            {
              title: "Mobile signature pad",
              type: "TASK",
              status: "IN_PROGRESS",
              priority: "HIGH",
              assignee: "alex.noor@workhub.test",
              dueDate: "2026-10-20",
              children: [
                {
                  title: "Capture stroke as SVG",
                  type: "SUB_TASK",
                  status: "TO_DO",
                  assignee: "alex.noor@workhub.test",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  AIB: [
    {
      title: "Member registration",
      type: "EPIC",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      assignee: "alex.noor@workhub.test",
      children: [
        {
          title: "Renew membership online",
          type: "USER_STORY",
          status: "TO_DO",
          priority: "MEDIUM",
          assignee: "emma.davis@workhub.test",
          story: {
            asA: "practising member",
            iWant: "to renew my membership and pay the fee online",
            soThat: "I do not have to post a form to the institute",
          },
          acceptanceCriteria: [{ text: "Renewal records the payment reference against the member record." }],
          children: [
            {
              title: "Payment confirmation screen",
              type: "TASK",
              status: "TO_DO",
              priority: "LOW",
              assignee: "emma.davis@workhub.test",
            },
            {
              title: "Membership year rollover job",
              type: "TASK",
              status: "IN_PROGRESS",
              priority: "MEDIUM",
              assignee: "alex.noor@workhub.test",
            },
          ],
        },
      ],
    },
  ],
  PMS: [
    {
      title: "Internal delivery workspace",
      type: "EPIC",
      status: "TO_DO",
      priority: "MEDIUM",
      assignee: "alson.chen@workhub.test",
      children: [
        {
          title: "See my work across projects",
          type: "USER_STORY",
          status: "TO_DO",
          priority: "HIGH",
          assignee: "alex.noor@workhub.test",
          story: {
            asA: "delivery engineer",
            iWant: "to see the issues assigned to me across every project I belong to",
            soThat: "I know what to work on this week without opening each project",
          },
          acceptanceCriteria: [
            { text: "The list includes only issues the viewer is allowed to see." },
            { text: "Done items from more than 14 days ago are hidden by default." },
          ],
          children: [
            {
              title: "Assigned-to-me query",
              type: "TASK",
              status: "TO_DO",
              priority: "MEDIUM",
              assignee: "alex.noor@workhub.test",
              children: [
                {
                  title: "Exclude archived issues",
                  type: "SUB_TASK",
                  status: "TO_DO",
                  assignee: "emma.davis@workhub.test",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export interface IssueSeedSummary {
  issuesCreated: number;
  projectsSeeded: number;
}

export async function seedProjectIssueTrees(
  db: Database,
  input: {
    workspaceId: string;
    userIds: Map<string, string>;
  },
): Promise<IssueSeedSummary> {
  let issuesCreated = 0;
  let projectsSeeded = 0;

  for (const [projectKey, tree] of Object.entries(SEED_ISSUE_TREES)) {
    const project = await db.project.findUnique({
      where: { workspaceId_key: { workspaceId: input.workspaceId, key: projectKey } },
      select: { id: true, key: true },
    });
    if (!project) continue;
    const existing = await db.issue.count({ where: { projectId: project.id } });
    if (existing > 0) continue;

    projectsSeeded += 1;
    for (const node of tree) {
      issuesCreated += await insertNode(db, {
        workspaceId: input.workspaceId,
        projectId: project.id,
        projectKey: project.key,
        parentId: null,
        node,
        userIds: input.userIds,
      });
    }

    const aggregate = await db.issue.aggregate({ where: { projectId: project.id }, _max: { number: true } });
    await db.project.update({
      where: { id: project.id },
      data: { nextIssueNumber: (aggregate._max.number ?? 0) + 1 },
    });
  }

  await ensureWorkspaceDemo(db, input);
  return { issuesCreated, projectsSeeded };
}

async function insertNode(
  db: Database,
  args: {
    workspaceId: string;
    projectId: string;
    projectKey: string;
    parentId: string | null;
    node: SeedIssueNode;
    userIds: Map<string, string>;
  },
): Promise<number> {
  const { node } = args;
  const creatorEmail = node.creator ?? node.reporter ?? node.assignee ?? "sarah.kim@workhub.test";
  const reporterEmail = node.reporter ?? creatorEmail;
  const createdById = requireUser(args.userIds, creatorEmail);
  const reporterId = requireUser(args.userIds, reporterEmail);
  const assigneeId = node.assignee ? requireUser(args.userIds, node.assignee) : null;
  const completedById =
    node.status === "DONE" ? requireUser(args.userIds, node.completedBy ?? node.assignee ?? creatorEmail) : null;

  const allocated = await db.$queryRaw<Array<{ number: number }>>`
    UPDATE "projects"
    SET "next_issue_number" = "next_issue_number" + 1
    WHERE "id" = ${args.projectId}
    RETURNING "next_issue_number" - 1 AS "number"
  `;
  const number = Number(allocated[0]?.number);
  const siblingCount = await db.issue.count({ where: { projectId: args.projectId, parentId: args.parentId } });
  const now = new Date();

  const created = await db.issue.create({
    data: {
      projectId: args.projectId,
      number,
      type: node.type,
      parentId: args.parentId,
      title: node.title,
      description: node.description ?? null,
      status: node.status ?? "TO_DO",
      priority: node.priority ?? "MEDIUM",
      assigneeId,
      reporterId,
      createdById,
      dueDate: node.dueDate ? new Date(`${node.dueDate}T00:00:00.000Z`) : null,
      plannedStartDate: node.plannedStartDate ? new Date(`${node.plannedStartDate}T00:00:00.000Z`) : null,
      rank: siblingCount.toString(36).padStart(6, "0"),
      completedAt: node.status === "DONE" ? now : null,
      completedById,
    },
    select: { id: true, number: true, type: true, status: true, assigneeId: true },
  });

  if (node.story) {
    await db.userStoryDetails.create({
      data: { issueId: created.id, asA: node.story.asA, iWant: node.story.iWant, soThat: node.story.soThat },
    });
  }

  if (node.acceptanceCriteria?.length) {
    await db.acceptanceCriterion.createMany({
      data: node.acceptanceCriteria.map((criterion, position) => ({
        issueId: created.id,
        position,
        text: criterion.text,
        isMet: Boolean(criterion.isMet),
        metAt: criterion.isMet ? now : null,
        metById: criterion.isMet ? createdById : null,
      })),
    });
  }

  if (node.labels?.length) {
    for (const name of node.labels) {
      const label = await db.label.upsert({
        where: { projectId_name: { projectId: args.projectId, name } },
        create: { projectId: args.projectId, name, color: "#64748b" },
        update: {},
        select: { id: true },
      });
      await db.issueLabel.create({ data: { issueId: created.id, labelId: label.id } });
    }
  }

  await db.activityEvent.create({
    data: {
      workspaceId: args.workspaceId,
      actorType: "USER",
      actorUserId: createdById,
      action: "issue.created",
      entityType: "issue",
      entityId: created.id,
      projectId: args.projectId,
      issueId: created.id,
      after: {
        type: created.type,
        title: node.title,
        status: created.status,
        key: issueKey(args.projectKey, created.number),
      },
      metadata: { source: "development-seed", issueKey: issueKey(args.projectKey, created.number) },
    },
  });

  if (created.status === "DONE" && completedById) {
    await db.activityEvent.create({
      data: {
        workspaceId: args.workspaceId,
        actorType: "USER",
        actorUserId: completedById,
        action: "issue.completed",
        entityType: "issue",
        entityId: created.id,
        projectId: args.projectId,
        issueId: created.id,
        after: { status: "DONE", assigneeId: created.assigneeId },
        metadata: {
          source: "development-seed",
          issueKey: issueKey(args.projectKey, created.number),
          assigneeIdAtCompletion: created.assigneeId,
          completedById,
        },
      },
    });
  }

  let createdCount = 1;
  for (const child of node.children ?? []) {
    createdCount += await insertNode(db, { ...args, parentId: created.id, node: child });
  }
  return createdCount;
}

function requireUser(userIds: Map<string, string>, email: string): string {
  const id = userIds.get(email);
  if (!id) throw new Error(`Unknown seed user ${email}`);
  return id;
}

const DEMO_PLANS: Record<string, Record<string, { start?: string; due?: string }>> = {
  AQUA: {
    "Guest booking experience": { start: "2026-09-01" },
    "Streamline guest booking flow": { start: "2026-09-15" },
    "Design booking wizard": { start: "2026-09-01" },
    "Design review and error states": { start: "2026-10-06", due: "2026-10-18" },
    "Implement availability API": { start: "2026-10-01" },
    "QA booking happy path": { start: "2026-10-20" },
    "See today's excursion roster": { start: "2026-09-10" },
    "Build roster query": { start: "2026-09-20", due: "2026-10-22" },
  },
  SV: {
    "Complete signing on a phone": { start: "2026-10-01", due: "2026-11-15" },
    "Mobile signature pad": { start: "2026-10-06" },
  },
  AIB: {
    "Renew membership online": { start: "2026-10-01", due: "2026-11-20" },
  },
};

const PNG = Uint8Array.from(
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
);

/**
 * Fills planning dates and a few real attachments on databases that already had issues.
 * Null dates are filled once; existing values are left alone.
 */
async function ensureWorkspaceDemo(
  db: Database,
  input: { workspaceId: string; userIds: Map<string, string> },
): Promise<void> {
  for (const [projectKey, plans] of Object.entries(DEMO_PLANS)) {
    const project = await db.project.findUnique({
      where: { workspaceId_key: { workspaceId: input.workspaceId, key: projectKey } },
      select: { id: true },
    });
    if (!project) continue;
    for (const [title, plan] of Object.entries(plans)) {
      if (plan.start) {
        await db.issue.updateMany({
          where: { projectId: project.id, title, plannedStartDate: null },
          data: { plannedStartDate: new Date(`${plan.start}T00:00:00.000Z`) },
        });
      }
      if (plan.due) {
        await db.issue.updateMany({
          where: { projectId: project.id, title, dueDate: null },
          data: { dueDate: new Date(`${plan.due}T00:00:00.000Z`) },
        });
      }
    }
  }

  const aqua = await db.project.findUnique({
    where: { workspaceId_key: { workspaceId: input.workspaceId, key: "AQUA" } },
    select: { id: true, health: true },
  });
  if (!aqua) return;
  const sarahId = requireUser(input.userIds, "sarah.kim@workhub.test");
  if (!aqua.health) {
    const note = "Availability work is overdue and still in progress.";
    await db.project.update({
      where: { id: aqua.id },
      data: { health: "ATTENTION", healthNote: note, healthUpdatedAt: new Date(), healthUpdatedById: sarahId },
    });
    await db.activityEvent.create({
      data: {
        workspaceId: input.workspaceId,
        actorType: "USER",
        actorUserId: sarahId,
        action: "project.health_changed",
        entityType: "project",
        entityId: aqua.id,
        projectId: aqua.id,
        before: { health: null },
        after: { health: "ATTENTION", note },
        metadata: { source: "development-seed" },
      },
    });
  }

  const availability = await db.issue.findFirst({
    where: { projectId: aqua.id, title: "Implement availability API" },
    select: { id: true, number: true },
  });
  const cancellation = await db.issue.findFirst({
    where: { projectId: aqua.id, title: "Encode cancellation policy rules" },
    select: { id: true, number: true },
  });
  const roster = await db.issue.findFirst({
    where: { projectId: aqua.id, title: "Build roster query" },
    select: { id: true, number: true },
  });
  const alexId = requireUser(input.userIds, "alex.noor@workhub.test");
  const mikaId = requireUser(input.userIds, "mika.ross@workhub.test");
  if (availability) {
    await ensureSeedFile(db, {
      workspaceId: input.workspaceId,
      projectId: aqua.id,
      issue: availability,
      filename: "booking-flow.png",
      contentType: "image/png",
      bytes: PNG,
      uploaderId: alexId,
    });
    await ensureSeedFile(db, {
      workspaceId: input.workspaceId,
      projectId: aqua.id,
      issue: availability,
      filename: "booking-reference.txt",
      contentType: "text/plain",
      bytes: new TextEncoder().encode("Guest booking reference notes.\n"),
      uploaderId: mikaId,
    });
  }
  if (cancellation) {
    const comment = "Cancellation still needs the published policy window.";
    const existingComment = await db.issueComment.findFirst({
      where: { issueId: cancellation.id, body: comment, deletedAt: null },
      select: { id: true },
    });
    if (!existingComment) {
      const created = await db.issueComment.create({
        data: { issueId: cancellation.id, authorId: alexId, body: comment },
        select: { id: true },
      });
      await db.activityEvent.create({
        data: {
          workspaceId: input.workspaceId,
          actorType: "USER",
          actorUserId: alexId,
          action: "issue.comment_added",
          entityType: "issue_comment",
          entityId: created.id,
          projectId: aqua.id,
          issueId: cancellation.id,
          after: { excerpt: comment },
          metadata: { source: "development-seed", issueKey: issueKey("AQUA", cancellation.number) },
        },
      });
    }
  }
  if (roster) {
    await ensureSeedFile(db, {
      workspaceId: input.workspaceId,
      projectId: aqua.id,
      issue: roster,
      filename: "roster-sketch.png",
      contentType: "image/png",
      bytes: PNG,
      uploaderId: mikaId,
    });
  }
}

async function ensureSeedFile(
  db: Database,
  input: {
    workspaceId: string;
    projectId: string;
    issue: { id: string; number: number };
    filename: string;
    contentType: string;
    bytes: Uint8Array;
    uploaderId: string;
  },
): Promise<void> {
  const existing = await db.issueAttachment.findFirst({
    where: { issueId: input.issue.id, originalFilename: input.filename, deletedAt: null },
    select: { id: true, objectKey: true },
  });
  const objectKey = existing?.objectKey ?? `attachments/seed/${input.issue.id}/${input.filename.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  const storage = await getObjectStorage();
  if (!(await storage.head(objectKey))) {
    await storage.put(objectKey, input.bytes, { contentType: input.contentType, contentLength: input.bytes.byteLength });
  }
  if (existing) return;
  const created = await db.issueAttachment.create({
    data: {
      issueId: input.issue.id,
      uploadedById: input.uploaderId,
      originalFilename: input.filename,
      objectKey,
      contentType: input.contentType,
      sizeBytes: input.bytes.byteLength,
    },
    select: { id: true },
  });
  await db.activityEvent.create({
    data: {
      workspaceId: input.workspaceId,
      actorType: "USER",
      actorUserId: input.uploaderId,
      action: "issue.attachment_added",
      entityType: "issue_attachment",
      entityId: created.id,
      projectId: input.projectId,
      issueId: input.issue.id,
      after: { filename: input.filename, contentType: input.contentType, sizeBytes: input.bytes.byteLength },
      metadata: { source: "development-seed", issueKey: issueKey("AQUA", input.issue.number) },
    },
  });
}

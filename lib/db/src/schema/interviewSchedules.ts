import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { applicationsTable } from "./applications";
import { usersTable } from "./users";

export const interviewStatusEnum = pgEnum("interview_status", [
  "pending",
  "confirmed",
  "reschedule_requested",
  "cancelled",
]);

export const interviewSchedulesTable = pgTable("interview_schedules", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id")
    .notNull()
    .unique()
    .references(() => applicationsTable.id, { onDelete: "cascade" }),
  recruiterId: integer("recruiter_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  location: text("location"),
  notes: text("notes"),
  status: interviewStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InterviewSchedule = typeof interviewSchedulesTable.$inferSelect;

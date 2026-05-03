import { pgTable, serial, integer, text, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { jobsTable } from "./jobs";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const applicationStatusEnum = pgEnum("application_status", [
  "applied",
  "shortlisted",
  "rejected",
  "hired",
]);

export const applicationsTable = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    candidateId: integer("candidate_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    jobId: integer("job_id")
      .notNull()
      .references(() => jobsTable.id, { onDelete: "cascade" }),
    status: applicationStatusEnum("status").notNull().default("applied"),
    coverLetter: text("cover_letter"),
    resumeUrl: text("resume_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique("unique_application").on(t.candidateId, t.jobId)],
);

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;

import { pgTable, serial, integer, text, json, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { applicationsTable } from "./applications";

export const assessmentSubmissionStatusEnum = pgEnum("assessment_submission_status", [
  "pending",
  "submitted",
  "scored",
]);

export interface AssessmentQuestion {
  id: string;
  type: "multiple_choice" | "text";
  question: string;
  options?: string[];
  correctAnswer?: number; // index into options, for auto-scoring
}

export interface AssessmentAnswer {
  questionId: string;
  answer: string | number;
}

export const assessmentsTable = pgTable("assessments", {
  id: serial("id").primaryKey(),
  recruiterId: integer("recruiter_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  questions: json("questions").$type<AssessmentQuestion[]>().notNull().default([]),
  timeLimitMinutes: integer("time_limit_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assessmentSubmissionsTable = pgTable("assessment_submissions", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id")
    .notNull()
    .references(() => assessmentsTable.id, { onDelete: "cascade" }),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applicationsTable.id, { onDelete: "cascade" }),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  answers: json("answers").$type<AssessmentAnswer[]>(),
  score: integer("score"),
  maxScore: integer("max_score").notNull().default(0),
  status: assessmentSubmissionStatusEnum("status").notNull().default("pending"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Assessment = typeof assessmentsTable.$inferSelect;
export type AssessmentSubmission = typeof assessmentSubmissionsTable.$inferSelect;

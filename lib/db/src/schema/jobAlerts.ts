import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const jobAlertJobTypeEnum = pgEnum("job_alert_job_type", [
  "full-time",
  "part-time",
  "contract",
  "internship",
  "remote",
]);

export const jobAlertsTable = pgTable("job_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  keyword: text("keyword"),
  location: text("location"),
  jobType: jobAlertJobTypeEnum("job_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type JobAlert = typeof jobAlertsTable.$inferSelect;

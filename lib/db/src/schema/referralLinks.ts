import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { jobsTable } from "./jobs";

export const referralLinksTable = pgTable("referral_links", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobsTable.id, { onDelete: "cascade" }),
  recruiterId: integer("recruiter_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  label: text("label").notNull().default("Direct"),
  clickCount: integer("click_count").notNull().default(0),
  convertCount: integer("convert_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ReferralLink = typeof referralLinksTable.$inferSelect;

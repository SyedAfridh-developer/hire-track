import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const digestFrequencyEnum = pgEnum("digest_frequency", ["off", "daily", "weekly"]);

export const digestSettingsTable = pgTable("digest_settings", {
  id: serial("id").primaryKey(),
  recruiterId: integer("recruiter_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  frequency: digestFrequencyEnum("frequency").notNull().default("weekly"),
  digestEmail: text("digest_email").notNull(),
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DigestSettings = typeof digestSettingsTable.$inferSelect;

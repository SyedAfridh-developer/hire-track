import nodemailer from "nodemailer";
import { db, digestSettingsTable, jobsTable, applicationsTable, interviewSchedulesTable, usersTable, companiesTable } from "@workspace/db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";

// ── Transporter ───────────────────────────────────────────────────────────────

let _transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (_transporter) return _transporter;

  if (process.env["SMTP_HOST"]) {
    _transporter = nodemailer.createTransport({
      host: process.env["SMTP_HOST"],
      port: Number(process.env["SMTP_PORT"] ?? 587),
      secure: process.env["SMTP_SECURE"] === "true",
      auth: { user: process.env["SMTP_USER"], pass: process.env["SMTP_PASS"] },
    });
    logger.info("Email: using configured SMTP server");
  } else {
    // Auto-create a free Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    logger.info({ email: testAccount.user }, "Email: using Ethereal test account (dev mode)");
  }

  return _transporter;
}

// ── Data gathering ────────────────────────────────────────────────────────────

export async function buildDigestData(recruiterId: number, windowDays: number) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowDays * 86_400_000);
  const windowEnd = new Date(now.getTime() + windowDays * 86_400_000);

  // Recruiter's jobs
  const jobs = await db.select().from(jobsTable).where(eq(jobsTable.recruiterId, recruiterId));
  const jobIds = jobs.map((j) => j.id);

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.recruiterId, recruiterId)).limit(1);
  const [recruiterUser] = await db.select().from(usersTable).where(eq(usersTable.id, recruiterId)).limit(1);

  if (jobIds.length === 0) {
    return { recruiterUser, company, newApplications: [], upcomingInterviews: [], statusCounts: {}, windowDays };
  }

  // New applications in window
  const newApplications = await db
    .select({
      id: applicationsTable.id,
      status: applicationsTable.status,
      createdAt: applicationsTable.createdAt,
      candidateName: usersTable.name,
      jobTitle: jobsTable.title,
    })
    .from(applicationsTable)
    .innerJoin(usersTable, eq(usersTable.id, applicationsTable.candidateId))
    .innerJoin(jobsTable, eq(jobsTable.id, applicationsTable.jobId))
    .where(and(inArray(applicationsTable.jobId, jobIds), gte(applicationsTable.createdAt, windowStart)));

  // Upcoming interviews
  const upcomingInterviews = await db
    .select({
      id: interviewSchedulesTable.id,
      scheduledAt: interviewSchedulesTable.scheduledAt,
      location: interviewSchedulesTable.location,
      status: interviewSchedulesTable.status,
      candidateName: usersTable.name,
      jobTitle: jobsTable.title,
    })
    .from(interviewSchedulesTable)
    .innerJoin(applicationsTable, eq(applicationsTable.id, interviewSchedulesTable.applicationId))
    .innerJoin(usersTable, eq(usersTable.id, applicationsTable.candidateId))
    .innerJoin(jobsTable, eq(jobsTable.id, applicationsTable.jobId))
    .where(and(
      eq(interviewSchedulesTable.recruiterId, recruiterId),
      gte(interviewSchedulesTable.scheduledAt, now),
      lte(interviewSchedulesTable.scheduledAt, windowEnd),
    ));

  // Status breakdown across ALL applications
  const allApplications = await db
    .select({ status: applicationsTable.status })
    .from(applicationsTable)
    .where(inArray(applicationsTable.jobId, jobIds));

  const statusCounts = allApplications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return { recruiterUser, company, newApplications, upcomingInterviews, statusCounts, windowDays, jobs };
}

// ── HTML email template ───────────────────────────────────────────────────────

function renderDigestHtml(data: Awaited<ReturnType<typeof buildDigestData>>, appUrl: string): string {
  const { recruiterUser, company, newApplications, upcomingInterviews, statusCounts, windowDays } = data;
  const label = windowDays === 1 ? "Daily" : "Weekly";
  const periodLabel = windowDays === 1 ? "last 24 hours" : "last 7 days";

  const statusRows = Object.entries(statusCounts)
    .map(([s, n]) => `<tr><td style="padding:4px 8px;text-transform:capitalize;">${s}</td><td style="padding:4px 8px;font-weight:600;">${n}</td></tr>`)
    .join("");

  const appRows = newApplications.slice(0, 10)
    .map((a) => `
      <tr>
        <td style="padding:6px 8px;">${a.candidateName}</td>
        <td style="padding:6px 8px;color:#64748b;">${a.jobTitle}</td>
        <td style="padding:6px 8px;">
          <span style="background:${a.status==="applied"?"#dbeafe":a.status==="shortlisted"?"#fef3c7":a.status==="hired"?"#dcfce7":"#fee2e2"};color:${a.status==="applied"?"#1e40af":a.status==="shortlisted"?"#92400e":a.status==="hired"?"#166534":"#991b1b"};padding:2px 8px;border-radius:99px;font-size:12px;font-weight:500;">${a.status}</span>
        </td>
      </tr>`)
    .join("");

  const ivRows = upcomingInterviews.slice(0, 10)
    .map((iv) => {
      const dt = new Date(iv.scheduledAt).toLocaleString("en-US", { weekday:"short", month:"short", day:"numeric", hour:"numeric", minute:"2-digit" });
      return `
        <tr>
          <td style="padding:6px 8px;">${iv.candidateName}</td>
          <td style="padding:6px 8px;color:#64748b;">${iv.jobTitle}</td>
          <td style="padding:6px 8px;">${dt}</td>
          <td style="padding:6px 8px;color:#64748b;">${iv.location ?? "—"}</td>
          <td style="padding:6px 8px;">
            <span style="background:${iv.status==="confirmed"?"#dcfce7":iv.status==="reschedule_requested"?"#fee2e2":"#dbeafe"};color:${iv.status==="confirmed"?"#166534":iv.status==="reschedule_requested"?"#991b1b":"#1e40af"};padding:2px 8px;border-radius:99px;font-size:12px;font-weight:500;">${iv.status.replace("_"," ")}</span>
          </td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HireTrack ${label} Digest</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <!-- Header -->
    <div style="background:#1e3a5f;padding:32px 40px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <span style="font-size:22px;">💼</span>
        <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.3px;">HireTrack</span>
      </div>
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">${label} Digest</h1>
      <p style="color:#94a3b8;margin:4px 0 0;font-size:14px;">
        Hi ${recruiterUser?.name ?? "there"} 👋 — here's your hiring summary for the ${periodLabel}
        ${company?.name ? `at <strong style="color:#cbd5e1;">${company.name}</strong>` : ""}.
      </p>
    </div>

    <div style="padding:32px 40px;space-y:24px;">

      <!-- Stats row -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;">
        <div style="background:#f8fafc;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#1e3a5f;">${newApplications.length}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">New Applications</div>
        </div>
        <div style="background:#f8fafc;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#1e3a5f;">${upcomingInterviews.length}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Upcoming Interviews</div>
        </div>
        <div style="background:#f8fafc;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#1e3a5f;">${statusCounts["applied"] ?? 0}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Awaiting Review</div>
        </div>
      </div>

      ${newApplications.length > 0 ? `
      <!-- New applications -->
      <div style="margin-bottom:32px;">
        <h2 style="font-size:16px;font-weight:700;margin:0 0 12px;color:#1e293b;">🆕 New Applications (${periodLabel})</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:8px;text-align:left;font-weight:600;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Candidate</th>
            <th style="padding:8px;text-align:left;font-weight:600;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Job</th>
            <th style="padding:8px;text-align:left;font-weight:600;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Status</th>
          </tr></thead>
          <tbody>${appRows}</tbody>
        </table>
        ${newApplications.length > 10 ? `<p style="font-size:12px;color:#94a3b8;margin:8px 0 0;">…and ${newApplications.length - 10} more</p>` : ""}
      </div>` : `
      <div style="background:#f8fafc;border-radius:8px;padding:16px;text-align:center;margin-bottom:32px;color:#94a3b8;font-size:14px;">
        No new applications in the ${periodLabel}.
      </div>`}

      ${upcomingInterviews.length > 0 ? `
      <!-- Upcoming interviews -->
      <div style="margin-bottom:32px;">
        <h2 style="font-size:16px;font-weight:700;margin:0 0 12px;color:#1e293b;">📅 Upcoming Interviews</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:8px;text-align:left;font-weight:600;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Candidate</th>
            <th style="padding:8px;text-align:left;font-weight:600;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Job</th>
            <th style="padding:8px;text-align:left;font-weight:600;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Date</th>
            <th style="padding:8px;text-align:left;font-weight:600;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Location</th>
            <th style="padding:8px;text-align:left;font-weight:600;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Status</th>
          </tr></thead>
          <tbody>${ivRows}</tbody>
        </table>
      </div>` : ""}

      ${Object.keys(statusCounts).length > 0 ? `
      <!-- Pipeline breakdown -->
      <div style="margin-bottom:32px;">
        <h2 style="font-size:16px;font-weight:700;margin:0 0 12px;color:#1e293b;">📊 Full Pipeline Breakdown</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tbody>${statusRows}</tbody>
        </table>
      </div>` : ""}

      <!-- CTA -->
      <div style="text-align:center;margin-top:8px;">
        <a href="${appUrl}/recruiter/jobs" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
          Open HireTrack →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        You're receiving this because you have digest notifications enabled in HireTrack.<br>
        <a href="${appUrl}/recruiter/company" style="color:#64748b;">Manage digest settings</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Send digest for one recruiter ─────────────────────────────────────────────

export async function sendDigestForRecruiter(recruiterId: number, digestEmail: string, windowDays: number): Promise<string | null> {
  const appUrl = process.env["APP_URL"] ?? `https://${process.env["REPLIT_DEV_DOMAIN"] ?? "localhost"}`;
  const data = await buildDigestData(recruiterId, windowDays);
  const html = renderDigestHtml(data, appUrl);
  const label = windowDays === 1 ? "Daily" : "Weekly";

  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: `"HireTrack" <noreply@hiretrack.app>`,
    to: digestEmail,
    subject: `HireTrack ${label} Digest — ${new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}`,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info({ recruiterId, previewUrl }, "Digest email sent — open preview URL to view it");
  } else {
    logger.info({ recruiterId, messageId: info.messageId }, "Digest email sent via configured SMTP");
  }

  return previewUrl || null;
}

// ── Scheduled job (runs at server startup) ────────────────────────────────────

export async function runScheduledDigests() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
  const isMonday = dayOfWeek === 1;

  const settings = await db.select().from(digestSettingsTable);

  for (const s of settings) {
    if (s.frequency === "off") continue;
    if (s.frequency === "weekly" && !isMonday) continue;

    try {
      const windowDays = s.frequency === "daily" ? 1 : 7;
      await sendDigestForRecruiter(s.recruiterId, s.digestEmail, windowDays);
      await db.update(digestSettingsTable)
        .set({ lastSentAt: new Date(), updatedAt: new Date() })
        .where(eq(digestSettingsTable.id, s.id));
    } catch (err) {
      logger.error({ err, recruiterId: s.recruiterId }, "Failed to send digest");
    }
  }
}

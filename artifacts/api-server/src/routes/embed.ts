import { Router } from "express";
import { db, jobsTable, companiesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getActiveJobs(recruiterId: number) {
  const jobs = await db
    .select({
      id: jobsTable.id,
      title: jobsTable.title,
      location: jobsTable.location,
      jobType: jobsTable.jobType,
      salaryMin: jobsTable.salaryMin,
      salaryMax: jobsTable.salaryMax,
    })
    .from(jobsTable)
    .where(and(eq(jobsTable.recruiterId, recruiterId), eq(jobsTable.isActive, true)))
    .orderBy(jobsTable.id);

  return jobs;
}

async function getCompanyInfo(recruiterId: number) {
  const [company] = await db.select({ name: companiesTable.name }).from(companiesTable).where(eq(companiesTable.recruiterId, recruiterId)).limit(1);
  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, recruiterId)).limit(1);
  return { companyName: company?.name ?? user?.name ?? "Company" };
}

function formatSalary(min?: number | null, max?: number | null) {
  if (!min && !max) return "";
  const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function formatJobType(t: string) {
  return t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── GET /api/embed/:recruiterId — JSON ───────────────────────────────────────

router.get("/:recruiterId", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const recruiterId = Number(req.params["recruiterId"]);
  if (Number.isNaN(recruiterId)) { res.status(400).json({ error: "Invalid recruiter ID" }); return; }

  const [jobs, { companyName }] = await Promise.all([getActiveJobs(recruiterId), getCompanyInfo(recruiterId)]);
  res.json({ companyName, jobs });
});

// ── GET /api/embed/:recruiterId/iframe — standalone HTML ─────────────────────

router.get("/:recruiterId/iframe", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Frame-Options", "ALLOWALL");

  const recruiterId = Number(req.params["recruiterId"]);
  const accent = String(req.query["accent"] ?? "#1e3a5f");
  const maxJobs = Math.min(Number(req.query["max"] ?? 10), 50);
  const appUrl = process.env["APP_URL"] ??
    (process.env["REPLIT_DEV_DOMAIN"] ? `https://${process.env["REPLIT_DEV_DOMAIN"]}` : "");

  if (Number.isNaN(recruiterId)) { res.status(400).send("Invalid recruiter ID"); return; }

  const [jobs, { companyName }] = await Promise.all([getActiveJobs(recruiterId), getCompanyInfo(recruiterId)]);
  const shown = jobs.slice(0, maxJobs);

  const jobCards = shown.length === 0
    ? `<p style="text-align:center;color:#94a3b8;padding:32px 0;font-size:14px;">No open positions at the moment.</p>`
    : shown.map((j) => {
        const salary = formatSalary(j.salaryMin, j.salaryMax);
        const applyUrl = `${appUrl}/jobs/${j.id}`;
        return `
          <a href="${applyUrl}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;color:inherit;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:10px;background:#fff;transition:box-shadow .15s;cursor:pointer;" onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow='none'">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div>
                <div style="font-size:15px;font-weight:600;color:#1e293b;margin-bottom:4px;">${j.title}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <span style="font-size:12px;color:#64748b;">📍 ${j.location}</span>
                  <span style="font-size:12px;color:#64748b;">· ${formatJobType(j.jobType)}</span>
                  ${salary ? `<span style="font-size:12px;color:#64748b;">· ${salary}</span>` : ""}
                </div>
              </div>
              <span style="flex-shrink:0;font-size:12px;font-weight:600;color:${accent};background:${accent}18;border:1px solid ${accent}30;padding:5px 12px;border-radius:99px;white-space:nowrap;">Apply →</span>
            </div>
          </a>`;
      }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${companyName} — Open Positions</title>
  <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;padding:16px;}</style>
</head>
<body>
  <div style="max-width:680px;margin:0 auto;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h2 style="font-size:16px;font-weight:700;color:#1e293b;">Open Positions at ${companyName}</h2>
      <span style="font-size:12px;color:#94a3b8;">${shown.length} role${shown.length !== 1 ? "s" : ""}</span>
    </div>
    ${jobCards}
    <div style="text-align:center;margin-top:16px;">
      <a href="${appUrl}/jobs" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:${accent};text-decoration:none;font-weight:500;">View all on HireTrack →</a>
    </div>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// ── GET /api/embed/:recruiterId/widget.js — injectable script ────────────────

router.get("/:recruiterId/widget.js", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60");

  const recruiterId = Number(req.params["recruiterId"]);
  if (Number.isNaN(recruiterId)) { res.status(400).send('console.error("HireTrack: invalid recruiter ID")'); return; }

  const appUrl = process.env["APP_URL"] ??
    (process.env["REPLIT_DEV_DOMAIN"] ? `https://${process.env["REPLIT_DEV_DOMAIN"]}` : "");

  const script = `
(function() {
  var containerId = "hiretrack-jobs-${recruiterId}";
  var container = document.getElementById(containerId) || (function() {
    // Auto-inject before current script tag
    var s = document.currentScript || (function() {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();
    var d = document.createElement('div');
    d.id = containerId;
    s.parentNode.insertBefore(d, s);
    return d;
  })();

  var accent = container.getAttribute('data-accent') || '#1e3a5f';
  var maxJobs = parseInt(container.getAttribute('data-max') || '5', 10);

  container.innerHTML = '<p style="color:#94a3b8;font-size:13px;text-align:center;padding:16px;">Loading open positions…</p>';

  fetch("${appUrl}/api/embed/${recruiterId}")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var jobs = (data.jobs || []).slice(0, maxJobs);
      if (!jobs.length) {
        container.innerHTML = '<p style="color:#94a3b8;font-size:13px;text-align:center;padding:16px;">No open positions at the moment.</p>';
        return;
      }

      var html = '<div style="font-family:-apple-system,BlinkMacSystemFont,\\'Segoe UI\\',Roboto,sans-serif;">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
      html += '<strong style="font-size:15px;color:#1e293b;">Open Positions at ' + data.companyName + '</strong>';
      html += '<span style="font-size:12px;color:#94a3b8;">' + jobs.length + ' role' + (jobs.length !== 1 ? 's' : '') + '</span>';
      html += '</div>';

      jobs.forEach(function(j) {
        var salary = '';
        if (j.salaryMin && j.salaryMax) salary = '· $' + Math.round(j.salaryMin/1000) + 'k – $' + Math.round(j.salaryMax/1000) + 'k';
        var type = j.jobType.replace(/-/g, ' ').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); });
        html += '<a href="${appUrl}/jobs/' + j.id + '" target="_blank" rel="noopener noreferrer" ';
        html += 'style="display:block;text-decoration:none;color:inherit;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:8px;background:#fff;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">';
        html += '<div>';
        html += '<div style="font-size:14px;font-weight:600;color:#1e293b;margin-bottom:3px;">' + j.title + '</div>';
        html += '<div style="font-size:12px;color:#64748b;">📍 ' + j.location + ' · ' + type + ' ' + salary + '</div>';
        html += '</div>';
        html += '<span style="flex-shrink:0;font-size:12px;font-weight:600;color:' + accent + ';background:' + accent + '18;padding:4px 10px;border-radius:99px;">Apply →</span>';
        html += '</div>';
        html += '</a>';
      });

      html += '<div style="text-align:center;margin-top:10px;">';
      html += '<a href="${appUrl}/jobs" target="_blank" style="font-size:12px;color:' + accent + ';font-weight:500;">View all on HireTrack →</a>';
      html += '</div>';
      html += '</div>';
      container.innerHTML = html;
    })
    .catch(function() {
      container.innerHTML = '<p style="color:#ef4444;font-size:13px;text-align:center;padding:16px;">Could not load positions.</p>';
    });
})();
`;

  res.send(script);
});

export default router;

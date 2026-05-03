import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Code2, Copy, Check, Globe, Layers, Eye, ExternalLink, Info } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAppBase() {
  // In dev: uses the proxied domain; in prod: the deployed domain
  return window.location.origin;
}

function iframeSnippet(recruiterId: number, accent: string, max: number, base: string) {
  const src = `${base}/api/embed/${recruiterId}/iframe?accent=${encodeURIComponent(accent)}&max=${max}`;
  return `<!-- HireTrack Job Listings Widget -->
<iframe
  src="${src}"
  width="100%"
  height="460"
  frameborder="0"
  style="border:none;border-radius:12px;overflow:hidden;"
  title="Open Positions"
></iframe>`;
}

function scriptSnippet(recruiterId: number, accent: string, max: number, base: string) {
  return `<!-- HireTrack Job Listings Widget -->
<div id="hiretrack-jobs-${recruiterId}" data-accent="${accent}" data-max="${max}"></div>
<script src="${base}/api/embed/${recruiterId}/widget.js"><\/script>`;
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <Button variant="outline" size="sm" onClick={copy} className="gap-1.5 shrink-0">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}

// ── Code block ────────────────────────────────────────────────────────────────

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="bg-muted rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
        {code}
      </pre>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EmbedPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accent, setAccent] = useState("#1e3a5f");
  const [maxJobs, setMaxJobs] = useState(5);
  const [activeTab, setActiveTab] = useState<"iframe" | "script">("iframe");
  const [showPreview, setShowPreview] = useState(false);

  const recruiterId = user?.id ?? 0;
  const base = getAppBase();

  const iframeCode = iframeSnippet(recruiterId, accent, maxJobs, base);
  const scriptCode = scriptSnippet(recruiterId, accent, maxJobs, base);
  const previewSrc = `${base}/api/embed/${recruiterId}/iframe?accent=${encodeURIComponent(accent)}&max=${maxJobs}`;
  const jsonUrl = `${base}/api/embed/${recruiterId}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Code2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Job Embed Widget</h1>
          <p className="text-muted-foreground text-sm">Display your open positions on any external website</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Paste one of the code snippets below into any HTML page — your company blog, career page, or website — and it will automatically display your active job listings with links back to HireTrack.</p>
      </div>

      {/* Customisation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Customise
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="accent" className="text-sm">Accent colour</Label>
            <div className="flex items-center gap-2">
              <input
                id="accent"
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="w-10 h-9 rounded border border-input cursor-pointer bg-background p-0.5"
              />
              <Input
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="font-mono text-sm"
                placeholder="#1e3a5f"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max-jobs" className="text-sm">Max jobs to show</Label>
            <div className="flex items-center gap-3">
              <Input
                id="max-jobs"
                type="number"
                min={1}
                max={20}
                value={maxJobs}
                onChange={(e) => setMaxJobs(Math.max(1, Math.min(20, Number(e.target.value))))}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">(1–20)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Snippet tabs */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Embed Code
            </CardTitle>
            <div className="flex rounded-lg border overflow-hidden text-xs">
              <button
                onClick={() => setActiveTab("iframe")}
                className={`px-3 py-1.5 font-medium transition-colors ${activeTab === "iframe" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
              >
                iframe
              </button>
              <button
                onClick={() => setActiveTab("script")}
                className={`px-3 py-1.5 font-medium transition-colors ${activeTab === "script" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
              >
                Script tag
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {activeTab === "iframe" ? (
            <>
              <p className="text-xs text-muted-foreground">Recommended — works on any website including Wordpress, Squarespace, and Webflow.</p>
              <CodeBlock code={iframeCode} />
              <div className="flex justify-end">
                <CopyButton text={iframeCode} />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">For custom websites where you control the HTML. Renders inline with your page styles.</p>
              <CodeBlock code={scriptCode} />
              <div className="flex justify-end">
                <CopyButton text={scriptCode} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Live preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Live Preview
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => window.open(previewSrc, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open full page
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? "Hide preview" : "Show preview"}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showPreview && (
          <CardContent className="p-0 overflow-hidden rounded-b-xl">
            <div className="border-t bg-muted/30 p-3 text-center">
              <span className="text-xs text-muted-foreground">↓ This is how the widget looks on an external page</span>
            </div>
            <iframe
              key={`${accent}-${maxJobs}`}
              src={previewSrc}
              className="w-full border-0 block"
              style={{ height: "460px" }}
              title="Widget preview"
            />
          </CardContent>
        )}
      </Card>

      {/* Developer JSON */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Code2 className="h-4 w-4 text-primary" />
            Developer API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Fetch your active jobs as JSON to build a fully custom integration.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono truncate">{jsonUrl}</code>
            <CopyButton text={jsonUrl} />
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => window.open(jsonUrl, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </Button>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Returns: <code className="bg-muted px-1 rounded">{"{ companyName, jobs: [{ id, title, location, jobType, salaryMin, salaryMax }] }"}</code></p>
            <p>No authentication required. CORS enabled for all origins.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

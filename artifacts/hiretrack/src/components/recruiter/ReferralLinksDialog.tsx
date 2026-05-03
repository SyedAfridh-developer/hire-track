import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Trash2, Plus, Link2, MousePointerClick, UserCheck, TrendingUp } from "lucide-react";

interface ReferralLink {
  id: number;
  code: string;
  label: string;
  clickCount: number;
  convertCount: number;
  createdAt: string;
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getBase() {
  return window.location.origin;
}

function buildUrl(code: string, jobId: number) {
  return `${getBase()}/jobs/${jobId}?ref=${code}`;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function ConvRate({ clicks, converts }: { clicks: number; converts: number }) {
  const rate = clicks > 0 ? Math.round((converts / clicks) * 100) : 0;
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${rate >= 20 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : rate > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
      {rate}%
    </span>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobId: number;
  jobTitle: string;
}

export function ReferralLinksDialog({ open, onOpenChange, jobId, jobTitle }: Props) {
  const { toast } = useToast();
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function fetchLinks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/referral/links?jobId=${jobId}`, { headers: authHeader() });
      if (res.ok) setLinks(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) fetchLinks();
  }, [open, jobId]);

  async function createLink() {
    if (!newLabel.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/referral/links", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ jobId, label: newLabel.trim() }),
      });
      if (res.ok) {
        const link: ReferralLink = await res.json();
        setLinks((prev) => [link, ...prev]);
        setNewLabel("");
        setShowForm(false);
        toast({ title: "Referral link created", description: `Share it to track ${newLabel} applicants` });
      } else {
        toast({ title: "Failed to create link", variant: "destructive" });
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteLink(id: number) {
    const res = await fetch(`/api/referral/links/${id}`, {
      method: "DELETE",
      headers: authHeader(),
    });
    if (res.ok) {
      setLinks((prev) => prev.filter((l) => l.id !== id));
      toast({ title: "Referral link deleted" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Referral Links — {jobTitle}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-1">
          Create shareable links for this job. Each link tracks clicks and conversions independently so you can see which channels drive the most applicants.
        </p>

        {/* Stats summary */}
        {links.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Link2, label: "Links", value: links.length },
              { icon: MousePointerClick, label: "Total clicks", value: links.reduce((s, l) => s + l.clickCount, 0) },
              { icon: UserCheck, label: "Conversions", value: links.reduce((s, l) => s + l.convertCount, 0) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-muted/50 rounded-lg p-3 text-center">
                <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Create form */}
        {showForm ? (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <Label className="text-sm">Label (e.g. LinkedIn, Twitter, Email)</Label>
            <Input
              placeholder="e.g. LinkedIn post"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createLink()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setNewLabel(""); }}>Cancel</Button>
              <Button size="sm" onClick={createLink} disabled={creating || !newLabel.trim()}>
                {creating ? "Creating…" : "Create link"}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" />
            New referral link
          </Button>
        )}

        {/* Links list */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
          ) : links.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Link2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No referral links yet.</p>
              <p>Create one to start tracking your traffic sources.</p>
            </div>
          ) : (
            links.map((link) => {
              const url = buildUrl(link.code, jobId);
              return (
                <div key={link.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-foreground truncate">{link.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <ConvRate clicks={link.clickCount} converts={link.convertCount} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteLink(link.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted rounded px-2 py-1">
                    <code className="text-xs text-muted-foreground flex-1 truncate">{url}</code>
                    <CopyBtn text={url} />
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" />{link.clickCount} clicks</span>
                    <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" />{link.convertCount} applied</span>
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />
                      {link.clickCount > 0 ? Math.round((link.convertCount / link.clickCount) * 100) : 0}% conv.
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

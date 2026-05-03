import { useState, useEffect } from "react";
import {
  useGetDigestSettings,
  useUpdateDigestSettings,
  useSendDigestNow,
  getGetDigestSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Clock, Send, CheckCircle, ExternalLink, Loader2 } from "lucide-react";

const FREQ_OPTIONS = [
  { value: "off",    label: "Off",    desc: "No digest emails" },
  { value: "daily",  label: "Daily",  desc: "Every morning at 8am" },
  { value: "weekly", label: "Weekly", desc: "Every Monday at 8am" },
] as const;

type Frequency = "off" | "daily" | "weekly";

export function DigestSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = getGetDigestSettingsQueryKey();

  const { data: settings, isLoading } = useGetDigestSettings({ query: { queryKey } });

  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [email, setEmail] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setFrequency((settings.frequency as Frequency) ?? "weekly");
      setEmail(settings.digestEmail ?? "");
    }
  }, [settings]);

  const update = useUpdateDigestSettings();
  const sendNow = useSendDigestNow();

  function handleSave() {
    if (!email) { toast({ title: "Email required", variant: "destructive" }); return; }
    update.mutate(
      { data: { frequency, digestEmail: email } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey });
          toast({ title: "Digest settings saved" });
        },
        onError: () => toast({ title: "Save failed", variant: "destructive" }),
      }
    );
  }

  function handleSendNow() {
    setPreviewUrl(null);
    sendNow.mutate(undefined, {
      onSuccess: (data) => {
        const url = (data as { message: string; previewUrl?: string | null }).previewUrl ?? null;
        setPreviewUrl(url);
        toast({
          title: "Digest sent!",
          description: url ? "Check the preview link below." : `Email sent to ${email}.`,
        });
      },
      onError: () => toast({ title: "Failed to send digest", variant: "destructive" }),
    });
  }

  const lastSent = settings?.lastSentAt
    ? new Date(settings.lastSentAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4 text-primary" />
          Email Digest
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Get a hiring summary delivered to your inbox — new applications, upcoming interviews, and pipeline stats.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-10 rounded bg-muted animate-pulse" />
            <div className="h-10 rounded bg-muted animate-pulse" />
          </div>
        ) : (
          <>
            {/* Frequency selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5" />
                Frequency
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {FREQ_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFrequency(opt.value)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      frequency === opt.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className={`text-sm font-medium ${frequency === opt.value ? "text-primary" : "text-foreground"}`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Email input */}
            <div className="space-y-1.5">
              <Label htmlFor="digest-email" className="flex items-center gap-1.5 text-sm">
                <Mail className="h-3.5 w-3.5" />
                Send to
              </Label>
              <Input
                id="digest-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={frequency === "off"}
              />
            </div>

            {/* Last sent */}
            {lastSent && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                Last digest sent {lastSent}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button onClick={handleSave} disabled={update.isPending} size="sm">
                {update.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Save settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendNow}
                disabled={sendNow.isPending || !email}
                className="gap-1.5"
              >
                {sendNow.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Send className="h-3.5 w-3.5" />}
                Send test digest now
              </Button>
            </div>

            {/* Preview URL — shown in dev mode when ethereal email is used */}
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline bg-primary/5 border border-primary/20 rounded-lg px-3 py-2"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span className="truncate">Open email preview (dev mode) →</span>
              </a>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

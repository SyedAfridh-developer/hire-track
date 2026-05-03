import { useState, useEffect } from "react";
import {
  useGetInterview,
  useScheduleInterview,
  getGetInterviewQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, MapPin, MessageSquare, CheckCircle, RefreshCw } from "lucide-react";

interface Props {
  applicationId: number;
  candidateName: string;
  jobTitle: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const STATUS_CONFIG = {
  pending:              { label: "Awaiting response", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200" },
  confirmed:            { label: "Confirmed by candidate", color: "text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200" },
  reschedule_requested: { label: "Reschedule requested", color: "text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200" },
  cancelled:            { label: "Cancelled", color: "text-muted-foreground bg-muted border-border" },
};

export function ScheduleInterviewDialog({ applicationId, candidateName, jobTitle, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = getGetInterviewQueryKey(applicationId);

  const { data: existing } = useGetInterview(applicationId, {
    query: { queryKey, enabled: open },
  });

  // Default to tomorrow 10am local
  const defaultDatetime = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  })();

  const [scheduledAt, setScheduledAt] = useState(defaultDatetime);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  // Pre-fill from existing interview
  useEffect(() => {
    if (existing) {
      setScheduledAt(new Date(existing.scheduledAt).toISOString().slice(0, 16));
      setLocation(existing.location ?? "");
      setNotes(existing.notes ?? "");
    }
  }, [existing]);

  const scheduleInterview = useScheduleInterview();

  function handleSubmit() {
    if (!scheduledAt) return;
    scheduleInterview.mutate(
      { applicationId, data: { scheduledAt: new Date(scheduledAt).toISOString(), location: location || undefined, notes: notes || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey });
          toast({ title: existing ? "Interview rescheduled" : "Interview scheduled", description: `${candidateName} will be notified.` });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Failed to schedule interview", variant: "destructive" }),
      }
    );
  }

  const statusCfg = existing ? STATUS_CONFIG[existing.status as keyof typeof STATUS_CONFIG] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            {existing ? "Reschedule Interview" : "Schedule Interview"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            for <span className="font-medium text-foreground">{candidateName}</span> — {jobTitle}
          </p>
        </DialogHeader>

        {/* Existing interview status */}
        {statusCfg && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${statusCfg.color}`}>
            {existing?.status === "confirmed" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <RefreshCw className="h-4 w-4 shrink-0" />}
            {statusCfg.label}
          </div>
        )}

        <div className="space-y-4">
          {/* Date & time */}
          <div className="space-y-1.5">
            <Label htmlFor="scheduledAt" className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              Date & Time <span className="text-destructive">*</span>
            </Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="location" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Location / Link
            </Label>
            <Input
              id="location"
              placeholder="e.g., Zoom, Google Meet, or office address"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="interviewNotes" className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Message to candidate
            </Label>
            <Textarea
              id="interviewNotes"
              placeholder="Any preparation tips, agenda, or instructions…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!scheduledAt || scheduleInterview.isPending}>
            <CalendarClock className="h-4 w-4 mr-2" />
            {existing ? "Reschedule & Notify" : "Schedule & Notify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

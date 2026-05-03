import { useState } from "react";
import {
  useGetInterview,
  useRespondToInterview,
  getGetInterviewQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, CheckCircle, RefreshCw, MapPin, MessageSquare, Clock } from "lucide-react";

interface Props {
  applicationId: number;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function InterviewStatusBadge({ applicationId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = getGetInterviewQueryKey(applicationId);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleMsg, setRescheduleMsg] = useState("");

  const { data: interview, isLoading } = useGetInterview(applicationId, {
    query: {
      queryKey,
      retry: false,
      // 404 means no interview — treat as null
    },
  });

  const respond = useRespondToInterview();

  function handleConfirm() {
    respond.mutate(
      { applicationId, data: { status: "confirmed" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey });
          toast({ title: "Interview confirmed!", description: "The recruiter will be notified." });
        },
        onError: () => toast({ title: "Failed to confirm", variant: "destructive" }),
      }
    );
  }

  function handleRescheduleSubmit() {
    respond.mutate(
      { applicationId, data: { status: "reschedule_requested", message: rescheduleMsg || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey });
          setRescheduleOpen(false);
          setRescheduleMsg("");
          toast({ title: "Reschedule requested", description: "The recruiter will be notified." });
        },
        onError: () => toast({ title: "Failed to send request", variant: "destructive" }),
      }
    );
  }

  if (isLoading || !interview) return null;

  const isPending = interview.status === "pending";
  const isConfirmed = interview.status === "confirmed";
  const isReschedule = interview.status === "reschedule_requested";

  return (
    <>
      <div className={`mt-3 rounded-lg border p-3 space-y-2 ${
        isConfirmed ? "bg-green-50 dark:bg-green-900/15 border-green-200 dark:border-green-800/40"
        : isReschedule ? "bg-red-50 dark:bg-red-900/15 border-red-200 dark:border-red-800/40"
        : "bg-blue-50 dark:bg-blue-900/15 border-blue-200 dark:border-blue-800/40"
      }`}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <CalendarClock className={`h-4 w-4 shrink-0 ${isConfirmed ? "text-green-600" : isReschedule ? "text-red-500" : "text-blue-600"}`} />
          <span className={`text-sm font-semibold ${isConfirmed ? "text-green-700 dark:text-green-400" : isReschedule ? "text-red-600 dark:text-red-400" : "text-blue-700 dark:text-blue-300"}`}>
            {isConfirmed ? "Interview Confirmed" : isReschedule ? "Reschedule Requested" : "Interview Invitation"}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-1 text-sm text-muted-foreground pl-6">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium text-foreground">{formatDateTime(interview.scheduledAt)}</span>
          </div>
          {interview.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{interview.location}</span>
            </div>
          )}
          {interview.notes && (
            <div className="flex items-start gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="italic">{interview.notes}</span>
            </div>
          )}
        </div>

        {/* Actions (only when pending) */}
        {isPending && (
          <div className="flex gap-2 pl-6 pt-1">
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
              onClick={handleConfirm}
              disabled={respond.isPending}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => setRescheduleOpen(true)}
              disabled={respond.isPending}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Request reschedule
            </Button>
          </div>
        )}
      </div>

      {/* Reschedule message dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Request a Reschedule</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Optionally add a message for the recruiter explaining your availability.</p>
          <Textarea
            placeholder="e.g., I'm unavailable that day — could we do Thursday instead?"
            value={rescheduleMsg}
            onChange={(e) => setRescheduleMsg(e.target.value)}
            className="resize-none min-h-[80px]"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
            <Button onClick={handleRescheduleSubmit} disabled={respond.isPending}>
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

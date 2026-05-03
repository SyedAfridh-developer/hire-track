import { useState } from "react";
import { useGetMyAlerts, getGetMyAlertsQueryKey, useDeleteAlert } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, BellPlus, MapPin, Briefcase, Search, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CreateAlertDialog } from "@/components/alerts/CreateAlertDialog";

const jobTypeColors: Record<string, string> = {
  "full-time": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "part-time": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "contract": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "internship": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "remote": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
};

export default function AlertsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: alerts, isLoading } = useGetMyAlerts({
    query: { queryKey: getGetMyAlertsQueryKey() },
  });

  const deleteAlert = useDeleteAlert();

  function handleDelete(alertId: number) {
    deleteAlert.mutate(
      { alertId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyAlertsQueryKey() });
          toast({ title: "Alert deleted" });
        },
        onError: () => toast({ title: "Failed to delete alert", variant: "destructive" }),
      }
    );
  }

  function describeAlert(alert: { keyword?: string | null; location?: string | null; jobType?: string | null }) {
    const parts: string[] = [];
    if (alert.keyword) parts.push(`"${alert.keyword}"`);
    if (alert.location) parts.push(alert.location);
    if (alert.jobType) parts.push(alert.jobType);
    return parts.length > 0 ? parts.join(" · ") : "All jobs";
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Job Alerts</h1>
          <p className="text-muted-foreground mt-0.5">
            Get notified when new jobs match your saved searches
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <BellPlus className="h-4 w-4" />
          New Alert
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : !alerts?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium mb-1">No alerts set up yet</p>
            <p className="text-sm mb-4">
              Create an alert to be notified when new matching jobs are posted.
            </p>
            <Button onClick={() => setCreateOpen(true)} variant="outline" size="sm" className="gap-2">
              <BellPlus className="h-4 w-4" />
              Create your first alert
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bell className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {describeAlert(alert)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {alert.keyword && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Search className="h-3 w-3" />
                            {alert.keyword}
                          </span>
                        )}
                        {alert.location && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {alert.location}
                          </span>
                        )}
                        {alert.jobType && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${jobTypeColors[alert.jobType] || ""}`}>
                            {alert.jobType}
                          </span>
                        )}
                        {!alert.keyword && !alert.location && !alert.jobType && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Briefcase className="h-3 w-3" />
                            All new jobs
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {new Date(alert.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(alert.id)}
                    disabled={deleteAlert.isPending}
                    title="Delete alert"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateAlertDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => queryClient.invalidateQueries({ queryKey: getGetMyAlertsQueryKey() })}
      />
    </div>
  );
}

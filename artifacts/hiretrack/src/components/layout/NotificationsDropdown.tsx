import { useState } from "react";
import { Bell, Check, CheckCheck, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function statusBadgeClass(title: string): string {
  if (title.includes("hired") || title.includes("Congratulations")) return "bg-green-100 text-green-800";
  if (title.includes("shortlisted")) return "bg-blue-100 text-blue-800";
  if (title.includes("update") || title.includes("rejected")) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetNotifications({
    query: {
      refetchInterval: 30000,
    },
  });

  const markAllRead = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
    },
  });

  const markOneRead = useMarkNotificationRead({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
    },
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  function handleMarkOne(id: number) {
    markOneRead.mutate({ notificationId: id });
  }

  function handleMarkAll() {
    markAllRead.mutate();
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-red-500 hover:bg-red-500 text-white border-0"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={handleMarkAll}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">You'll be notified when recruiters update your applications.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "px-4 py-3 flex gap-3 hover:bg-muted/50 transition-colors",
                    !n.isRead && "bg-blue-50/60 dark:bg-blue-950/20"
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-sm", statusBadgeClass(n.title))}>
                      <Briefcase className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium leading-snug", !n.isRead && "text-foreground", n.isRead && "text-muted-foreground")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {timeAgo(n.createdAt as unknown as string)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkOne(n.id)}
                      className="flex-shrink-0 mt-1 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t text-center">
            <span className="text-xs text-muted-foreground">
              Showing last {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { Link } from "wouter";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetUnreadMessageCount } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";

export function MessagesNavBadge() {
  const { role } = useAuth();

  const { data } = useGetUnreadMessageCount({
    query: {
      refetchInterval: 20000,
    },
  });

  const unreadCount = data?.unreadCount ?? 0;
  const href = role === "recruiter" ? "/recruiter/jobs" : "/applications";

  return (
    <Button variant="ghost" size="icon" className="relative" title="Messages" asChild>
      <Link href={href}>
        <MessageCircle className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-blue-500 hover:bg-blue-500 text-white border-0">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Link>
    </Button>
  );
}

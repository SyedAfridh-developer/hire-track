import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { BriefcaseBusiness, LayoutDashboard, User, LogOut, Settings } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";

export function Navbar() {
  const { isAuthenticated, role, logout, user } = useAuth();
  const [location] = useLocation();

  const isCandidate = role === "candidate";
  const isRecruiter = role === "recruiter";

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2 text-primary">
              <BriefcaseBusiness className="h-6 w-6" />
              <span className="font-bold text-xl tracking-tight">HireTrack</span>
            </Link>
            
            {isAuthenticated && (
              <div className="hidden md:flex ml-10 space-x-8">
                <Link 
                  href="/dashboard" 
                  className={`flex items-center gap-2 text-sm font-medium ${location === "/dashboard" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                
                {isCandidate && (
                  <>
                    <Link 
                      href="/jobs" 
                      className={`flex items-center gap-2 text-sm font-medium ${location.startsWith("/jobs") ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <BriefcaseBusiness className="h-4 w-4" />
                      Browse Jobs
                    </Link>
                    <Link 
                      href="/applications" 
                      className={`flex items-center gap-2 text-sm font-medium ${location === "/applications" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <User className="h-4 w-4" />
                      Applications
                    </Link>
                  </>
                )}

                {isRecruiter && (
                  <>
                    <Link 
                      href="/recruiter/jobs" 
                      className={`flex items-center gap-2 text-sm font-medium ${location.startsWith("/recruiter/jobs") ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <BriefcaseBusiness className="h-4 w-4" />
                      My Jobs
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <>
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Log in
                </Link>
                <Button asChild size="sm">
                  <Link href="/register">Sign up</Link>
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium hidden sm:block mr-2">
                  {user?.name}
                </div>
                {isCandidate && <NotificationsDropdown />}
                {isCandidate && (
                  <Button variant="ghost" size="icon" asChild>
                    <Link href="/profile" title="Profile">
                      <User className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {isRecruiter && (
                  <Button variant="ghost" size="icon" asChild>
                    <Link href="/recruiter/company" title="Company Profile">
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => logout()} title="Log out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

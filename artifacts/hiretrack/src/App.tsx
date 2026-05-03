import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Landing from "@/pages/Landing";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import CandidateDashboard from "@/pages/candidate/Dashboard";
import RecruiterDashboard from "@/pages/recruiter/Dashboard";
import JobsPage from "@/pages/candidate/JobsPage";
import JobDetailPage from "@/pages/candidate/JobDetailPage";
import ApplicationsPage from "@/pages/candidate/ApplicationsPage";
import ProfilePage from "@/pages/candidate/ProfilePage";
import RecruiterJobsListPage from "@/pages/recruiter/JobsListPage";
import JobFormPage from "@/pages/recruiter/JobFormPage";
import ApplicantsPage from "@/pages/recruiter/ApplicantsPage";
import AnalyticsPage from "@/pages/recruiter/AnalyticsPage";
import CompanyPage from "@/pages/recruiter/CompanyPage";
import InterviewCalendarPage from "@/pages/recruiter/InterviewCalendarPage";
import EmbedPage from "@/pages/recruiter/EmbedPage";
import KanbanPage from "@/pages/recruiter/KanbanPage";
import ResumePage from "@/pages/candidate/ResumePage";
import SavedJobsPage from "@/pages/candidate/SavedJobsPage";
import AlertsPage from "@/pages/candidate/AlertsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function DashboardRouter() {
  const { role } = useAuth();
  if (role === "candidate") return <CandidateDashboard />;
  if (role === "recruiter") return <RecruiterDashboard />;
  return <Redirect to="/" />;
}

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      {/* Public routes — no layout chrome for auth pages */}
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <LoginPage />}
      </Route>
      <Route path="/register">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <RegisterPage />}
      </Route>

      {/* Landing - full-width, no max-width container */}
      <Route path="/">
        {isAuthenticated ? <Redirect to="/dashboard" /> : (
          <div className="min-h-screen bg-background">
            <Landing />
          </div>
        )}
      </Route>

      {/* App routes with layout */}
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/dashboard">
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            </Route>

            {/* Candidate routes */}
            <Route path="/jobs">
              <JobsPage />
            </Route>
            <Route path="/jobs/:jobId">
              {(params) => <JobDetailPage />}
            </Route>
            <Route path="/applications">
              <ProtectedRoute allowedRoles={["candidate"]}>
                <ApplicationsPage />
              </ProtectedRoute>
            </Route>
            <Route path="/profile">
              <ProtectedRoute allowedRoles={["candidate"]}>
                <ProfilePage />
              </ProtectedRoute>
            </Route>
            <Route path="/resume">
              <ProtectedRoute allowedRoles={["candidate"]}>
                <ResumePage />
              </ProtectedRoute>
            </Route>
            <Route path="/saved-jobs">
              <ProtectedRoute allowedRoles={["candidate"]}>
                <SavedJobsPage />
              </ProtectedRoute>
            </Route>
            <Route path="/alerts">
              <ProtectedRoute allowedRoles={["candidate"]}>
                <AlertsPage />
              </ProtectedRoute>
            </Route>

            {/* Recruiter routes */}
            <Route path="/recruiter/jobs/new">
              <ProtectedRoute allowedRoles={["recruiter"]}>
                <JobFormPage />
              </ProtectedRoute>
            </Route>
            <Route path="/recruiter/jobs/:jobId/edit">
              {(params) => (
                <ProtectedRoute allowedRoles={["recruiter"]}>
                  <JobFormPage />
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/recruiter/jobs/:jobId/applicants">
              {(params) => (
                <ProtectedRoute allowedRoles={["recruiter"]}>
                  <ApplicantsPage />
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/recruiter/jobs">
              <ProtectedRoute allowedRoles={["recruiter"]}>
                <RecruiterJobsListPage />
              </ProtectedRoute>
            </Route>
            <Route path="/recruiter/analytics">
              <ProtectedRoute allowedRoles={["recruiter"]}>
                <AnalyticsPage />
              </ProtectedRoute>
            </Route>
            <Route path="/recruiter/company">
              <ProtectedRoute allowedRoles={["recruiter"]}>
                <CompanyPage />
              </ProtectedRoute>
            </Route>
            <Route path="/recruiter/interviews">
              <ProtectedRoute allowedRoles={["recruiter"]}>
                <InterviewCalendarPage />
              </ProtectedRoute>
            </Route>
            <Route path="/recruiter/embed">
              <ProtectedRoute allowedRoles={["recruiter"]}>
                <EmbedPage />
              </ProtectedRoute>
            </Route>
            <Route path="/recruiter/kanban">
              <ProtectedRoute allowedRoles={["recruiter"]}>
                <KanbanPage />
              </ProtectedRoute>
            </Route>

            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

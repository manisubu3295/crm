import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./lib/auth.js";
import { queryClient } from "./lib/queryClient.js";

import { LoginPage }      from "./pages/Login.js";
import { DashboardPage }  from "./pages/Dashboard.js";
import { LeadsPage }      from "./pages/Leads.js";
import { LeadDetailPage } from "./pages/LeadDetail.js";
import { FollowUpsPage }  from "./pages/FollowUps.js";
import { CampaignsPage }  from "./pages/Campaigns.js";
import { AutomationPage } from "./pages/Automation.js";
import { ReportsPage }    from "./pages/Reports.js";
import { SettingsPage }   from "./pages/Settings.js";
import { ReEngagementPage } from "./pages/ReEngagement.js";
import { StudentsPage }     from "./pages/Students.js";
import { PipelinePage }     from "./pages/Pipeline.js";
import { DevWhatsAppPage }    from "./pages/DevWhatsApp.js";
import { DevE2EPage }         from "./pages/DevE2E.js";
import { DevMetaConsolePage } from "./pages/DevMetaConsole.js";
import { PaymentsPage }       from "./pages/Payments.js";
import { CompaniesPage }      from "./pages/Companies.js";
import { BatchesPage }        from "./pages/Batches.js";
import { LeaderboardPage }    from "./pages/Leaderboard.js";
import { QuotationsPage }     from "./pages/Quotations.js";
import { AttendancePage }     from "./pages/Attendance.js";
import { CoursesPage }        from "./pages/Courses.js";
import { PlacementsPage }    from "./pages/Placements.js";
import { NPSPage }           from "./pages/NPS.js";

const IS_DEV = import.meta.env.DEV;

function AppRoutes() {
  const { user } = useAuth();

  if (!user) return <LoginPage />;

  return (
    <Switch>
      <Route path="/"             component={DashboardPage} />
      <Route path="/leads"        component={LeadsPage} />
      <Route path="/leads/:id"    component={LeadDetailPage} />
      <Route path="/followups"    component={FollowUpsPage} />
      <Route path="/campaigns"    component={CampaignsPage} />
      <Route path="/automation"   component={AutomationPage} />
      <Route path="/reports"      component={ReportsPage} />
      <Route path="/reengagement" component={ReEngagementPage} />
      <Route path="/students"     component={StudentsPage} />
      <Route path="/pipeline"     component={PipelinePage} />
      <Route path="/settings"     component={SettingsPage} />
      <Route path="/payments"     component={PaymentsPage} />
      <Route path="/companies"    component={CompaniesPage} />
      <Route path="/batches"      component={BatchesPage} />
      <Route path="/leaderboard"  component={LeaderboardPage} />
      <Route path="/quotations"   component={QuotationsPage} />
      <Route path="/attendance"   component={AttendancePage} />
      <Route path="/courses"      component={CoursesPage} />
      <Route path="/placements"   component={PlacementsPage} />
      <Route path="/nps"          component={NPSPage} />
      {IS_DEV && (
        <Route path="/dev/whatsapp"     component={DevWhatsAppPage} />
      )}
      {IS_DEV && (
        <Route path="/dev/meta-console" component={DevMetaConsolePage} />
      )}
      {IS_DEV && (
        <Route path="/dev/e2e" component={DevE2EPage} />
      )}
      <Route path="/login">{() => { window.location.replace("/"); return null; }}</Route>
      <Route>
        <div className="flex min-h-screen items-center justify-center text-gray-500">
          Page not found
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
        <Toaster richColors position="top-right" closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}

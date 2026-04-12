import { useState } from "react";
import { X, ChevronRight, ChevronLeft, LayoutDashboard, Users, GraduationCap,
  CheckSquare, TrendingUp, Megaphone, Zap, RefreshCw, BarChart2, Trophy,
  CreditCard, Building2, FileText, BookMarked, BookOpen, ClipboardCheck,
  Settings, Search, Phone, MessageSquare, Target, Layers,
  Star, AlertTriangle, ArrowRight, PlayCircle, Info } from "lucide-react";
import { Button } from "../ui/button.js";
import { Badge } from "../ui/badge.js";
import { cn } from "../../lib/utils.js";

// ─── Guide Data ───────────────────────────────────────────────

const SECTIONS = [
  {
    id: "overview",
    title: "Welcome to Aadhirai CRM",
    icon: Star,
    color: "from-indigo-500 to-cyan-500",
    badge: "Start Here",
    badgeColor: "bg-indigo-100 text-indigo-700",
    content: {
      summary: "Aadhirai CRM is an all-in-one lead management platform built for training institutions. It helps your team capture enquiries, nurture leads, track admissions, and analyse performance — all in one place.",
      steps: [
        { icon: Phone,       title: "Capture",   text: "Leads arrive from Meta Ads, website forms, walk-ins, or Excel import. Every enquiry is automatically saved." },
        { icon: MessageSquare, title: "Nurture", text: "Counsellors follow up by call, WhatsApp, or SMS. Automation sends messages without manual effort." },
        { icon: Target,      title: "Convert",   text: "Track each lead through stages from New → Contacted → Demo → Payment → Admitted." },
        { icon: BarChart2,   title: "Analyse",   text: "Reports show counsellor performance, funnel health, campaign ROI, and revenue." },
      ],
      roles: [
        { role: "Admin",      color: "bg-purple-100 text-purple-700", desc: "Full access — users, settings, all reports, all leads." },
        { role: "Manager",    color: "bg-blue-100 text-blue-700",     desc: "Can create campaigns, automation rules, set targets. Sees all counsellors." },
        { role: "Counsellor", color: "bg-green-100 text-green-700",   desc: "Sees and manages only their own assigned leads and tasks." },
      ],
    },
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    color: "from-blue-500 to-indigo-500",
    badge: "Home",
    badgeColor: "bg-blue-100 text-blue-700",
    content: {
      summary: "Your daily overview. The Dashboard shows the health of your entire pipeline at a glance — how many leads are in each stage, how many tasks are due, and how much revenue has been collected.",
      items: [
        { label: "KPI Cards (top row)",    text: "Total Leads, Conversion Rate, Tasks Due Today, Overdue Tasks. Numbers update in real-time." },
        { label: "Lead Funnel chart",       text: "Bar chart showing how many leads are in each stage (New, Contacted, Qualified…). Tall bars in early stages = needs more follow-up." },
        { label: "Lead Trend line chart",   text: "Daily new leads vs admissions over the last 7 days. Use this to spot busy and slow periods." },
        { label: "Revenue & Payment KPIs", text: "Today's collection, this month's revenue, and pending payments." },
        { label: "Recent Leads",            text: "The 5 most recently added leads. Click any to open the detail view." },
        { label: "Recent Tasks",            text: "Upcoming tasks due today for a quick action list." },
      ],
      tip: "If 'Overdue Tasks' is high, go to Follow-Ups and mark tasks done or reschedule them.",
    },
  },
  {
    id: "leads",
    title: "Leads",
    icon: Users,
    color: "from-violet-500 to-purple-600",
    badge: "Core",
    badgeColor: "bg-violet-100 text-violet-700",
    content: {
      summary: "The central records of every person who has enquired about your courses. A lead is anyone who has shown interest — from a Facebook form fill to a walk-in enquiry.",
      items: [
        { label: "Add a Lead",          text: "Click '+ New Lead'. Fill name, phone (required), email, city, course, and source. The system auto-generates a lead ID (e.g. ACA-2025-0001)." },
        { label: "Import from Excel",   text: "Click the upload icon. Download the template first, fill it in, then upload. Duplicates are detected automatically." },
        { label: "Search & Filter",     text: "Search by name/phone/email. Filter by Stage or Source to find specific groups." },
        { label: "List / Kanban view",  text: "Toggle between a table list and a Kanban board showing leads in columns by stage." },
        { label: "Bulk Actions",        text: "Check multiple leads → assign them all to one counsellor or move them to a new stage at once." },
        { label: "Lead Score",          text: "Each lead gets a score 0–100 based on engagement (responded, tasks done, messages sent). Higher = warmer lead." },
      ],
      stages: [
        { s: "New",       c: "bg-gray-100 text-gray-700",  d: "Just enquired, not yet contacted." },
        { s: "Contacted", c: "bg-blue-100 text-blue-700",  d: "First call or message made." },
        { s: "Qualified", c: "bg-indigo-100 text-indigo-700", d: "Confirmed interest, budget, and timeline." },
        { s: "Demo",      c: "bg-purple-100 text-purple-700", d: "Attending or scheduled a demo/trial class." },
        { s: "Interested",c: "bg-amber-100 text-amber-700", d: "Wants to join but hasn't paid yet." },
        { s: "Payment",   c: "bg-orange-100 text-orange-700", d: "Payment link sent, waiting for payment." },
        { s: "Admitted",  c: "bg-green-100 text-green-700", d: "Paid and enrolled. Becomes a Student record." },
        { s: "Lost",      c: "bg-red-100 text-red-700",     d: "Not interested or chose another institute." },
      ],
      tip: "Change a lead's stage by opening the lead detail and clicking the stage badge at the top right.",
    },
  },
  {
    id: "lead-detail",
    title: "Lead Detail Page",
    icon: Search,
    color: "from-purple-500 to-violet-600",
    badge: "Deep Dive",
    badgeColor: "bg-purple-100 text-purple-700",
    content: {
      summary: "Click any lead from the list to open its full profile. This is where counsellors spend most of their time — it shows all contact info, conversation history, tasks, and the full timeline.",
      items: [
        { label: "Stage changer (top right)", text: "Click the coloured stage badge to open a dropdown and move the lead to a new stage. Every change is recorded in the timeline." },
        { label: "Message button",            text: "Opens a dialog to send a WhatsApp / SMS / Email directly from the CRM. The message is logged automatically." },
        { label: "Add Task button",           text: "Create a follow-up call, demo, or meeting reminder with a due date and priority." },
        { label: "Contact Details panel",     text: "Phone, email, city, qualification, course interest, lead score, and source are shown here." },
        { label: "Activity Timeline",         text: "A chronological log of everything — stage changes, messages sent, tasks created, notes added." },
        { label: "Tasks panel",               text: "All pending and completed tasks for this lead. Overdue tasks are shown in red." },
        { label: "Communications panel",      text: "Every WhatsApp, SMS and email message sent through the CRM, with timestamps." },
      ],
      tip: "Add a task immediately after calling a lead so you never forget to follow up.",
    },
  },
  {
    id: "students",
    title: "Students",
    icon: GraduationCap,
    color: "from-emerald-500 to-teal-600",
    badge: "Admitted",
    badgeColor: "bg-emerald-100 text-emerald-700",
    content: {
      summary: "A focused view of all leads that reached the 'Admitted' stage. Once a lead is admitted, they appear here as a Student record — useful for batch assignment, attendance, and certificates.",
      items: [
        { label: "Student Stats",         text: "Total students, admitted this month, top courses, top counsellors by admissions." },
        { label: "Search",                text: "Find any student by name, phone, or email." },
        { label: "Lead Score indicator",  text: "Still visible — high-score students engaged more during the sales process." },
        { label: "Last message / tasks",  text: "See when the student was last communicated with and how many tasks were completed for them." },
        { label: "Click to open",         text: "Each row links back to the full Lead Detail page for that student." },
      ],
      tip: "Use the Students page to prepare lists for batch enrollment. Go to Batches → select batch → Enroll to link students to a batch.",
    },
  },
  {
    id: "followups",
    title: "Follow-Ups",
    icon: CheckSquare,
    color: "from-amber-500 to-orange-500",
    badge: "Daily Use",
    badgeColor: "bg-amber-100 text-amber-700",
    content: {
      summary: "Your personal to-do list. Every task (call, demo, meeting, WhatsApp) appears here. Counsellors should check this page every morning and every evening.",
      items: [
        { label: "Due Today / Overdue / Done tabs", text: "Switch between All, Pending, Overdue, and Done tasks. Start with 'Overdue' to clear backlog." },
        { label: "Due Today filter",               text: "Toggle to see only today's tasks — great for morning planning." },
        { label: "Summary cards",                  text: "Shows count of tasks due today, overdue tasks, and tasks completed today." },
        { label: "Mark Done button",               text: "Click the ✓ button on any task to mark it complete. The lead's score goes up." },
        { label: "Priority colours",               text: "Left border colour: Red = Urgent, Orange = High, Blue = Medium, Gray = Low." },
        { label: "Lead link",                      text: "Click the lead name on any task to open that lead's full detail page." },
      ],
      tip: "Aim for zero overdue tasks daily. If a task can't be done, open the lead and reschedule the task with new due date.",
    },
  },
  {
    id: "pipeline",
    title: "Pipeline",
    icon: TrendingUp,
    color: "from-sky-500 to-blue-600",
    badge: "Action",
    badgeColor: "bg-sky-100 text-sky-700",
    content: {
      summary: "A smart action board that highlights leads needing immediate attention. Unlike the full leads list, Pipeline shows only the leads that are at risk — stuck, cold, or overdue.",
      items: [
        { label: "Payment Pending tab",    text: "Leads in 'Payment' stage — they were interested and got a payment link but haven't paid. Prioritise these for daily calls." },
        { label: "Interested – No Response", text: "Leads stuck in 'Interested' stage with no contact in 24+ hours. They're warm but going cold." },
        { label: "Stale Pipeline",         text: "Leads in Contacted / Qualified / Demo stages not updated in 7+ days. These need a nudge or should be moved to Lost." },
        { label: "Overdue Tasks",          text: "Tasks that were due but not completed. This is the engine of your follow-up discipline." },
        { label: "Quick Action buttons",    text: "Each row has buttons to jump straight to WhatsApp, or mark a task done without opening the full lead." },
        { label: "Badge counts",           text: "The numbers on each tab tell you exactly how big each problem is." },
      ],
      tip: "Check Pipeline at 11 AM daily after the morning follow-up session. Any lead with 3+ overdue tasks should be assigned to the manager.",
    },
  },
  {
    id: "campaigns",
    title: "Campaigns",
    icon: Megaphone,
    color: "from-rose-500 to-pink-600",
    badge: "Marketing",
    badgeColor: "bg-rose-100 text-rose-700",
    content: {
      summary: "Ad Campaigns track the ROI of your paid marketing spend — Meta Ads, Google Ads, etc. Each campaign record links to the leads it generated so you can calculate cost per admission.",
      items: [
        { label: "Create Campaign",        text: "Add a campaign with name, source (meta_ads / google_ads), start date, and budget. Link it to a Meta Campaign ID if using API integration." },
        { label: "Campaign cards",         text: "Each card shows total leads generated, admissions closed, and total spend — giving you an instant ROI view." },
        { label: "Active / Paused toggle", text: "Click the badge to pause a campaign. Paused campaigns still show in the list (they don't disappear)." },
        { label: "Campaign stats detail",  text: "Click a card to expand it and see a daily breakdown of leads, admissions, and spend." },
        { label: "Source field",           text: "Always set the correct source (meta_ads, google_ads, etc.) so leads from this campaign are tagged correctly." },
      ],
      tip: "Cost per Admission (CPA) = Campaign Spend ÷ Admissions. A CPA under ₹2,000 is generally healthy for a training institute.",
    },
  },
  {
    id: "automation",
    title: "Automation",
    icon: Zap,
    color: "from-yellow-500 to-amber-600",
    badge: "Power Feature",
    badgeColor: "bg-yellow-100 text-yellow-700",
    content: {
      summary: "Automation rules run actions automatically based on what happens in the CRM — no manual work needed. For example: every time a new lead is created, automatically send a WhatsApp welcome message and create a call task.",
      items: [
        { label: "Trigger Events",   text: "The 'when' — New Lead Created, Stage Changed, No Response 24h, Demo Scheduled, Payment Pending 24h, SLA Breach, etc." },
        { label: "Actions",          text: "The 'then' — Send WhatsApp/SMS/Email using a message template, Assign a Task, Change Stage, or Escalate to manager." },
        { label: "Delay",            text: "Add a delay (e.g. run 30 minutes after trigger) so messages don't fire instantly." },
        { label: "Active / Paused",  text: "Toggle any rule on or off without deleting it." },
        { label: "Execution Log",    text: "See exactly which rules ran for which leads and when — useful for debugging." },
        { label: "Message Templates",text: "Automation uses pre-written templates. Create templates in Settings → Integrations before setting up rules." },
      ],
      currentRules: [
        "New Lead Created → Send WhatsApp welcome + Create urgent call task",
        "No Response 24h → Send SMS follow-up reminder + Create high priority task",
        "Demo Scheduled → Send WhatsApp demo reminder",
        "Payment Pending 24h → Send WhatsApp payment nudge + Escalate to manager",
      ],
      tip: "Start with the 4 default rules. Add new rules only after you've run the system for 2 weeks and see what's being missed.",
    },
  },
  {
    id: "reengagement",
    title: "Re-engagement",
    icon: RefreshCw,
    color: "from-teal-500 to-cyan-600",
    badge: "Revival",
    badgeColor: "bg-teal-100 text-teal-700",
    content: {
      summary: "Re-engagement campaigns target cold leads who stopped responding. For example: leads that were 'Interested' but went silent for 30 days. Instead of losing them, send a targeted revival message.",
      items: [
        { label: "Create Campaign",   text: "Set a name, dormant period (e.g. 30 days of no contact), target stage (optional), and channel (WhatsApp/SMS/Email)." },
        { label: "Preview Leads",     text: "Before firing, click 'Preview' to see exactly which leads will be targeted — check the list is sensible." },
        { label: "Send Campaign",     text: "Click the ▶ play button to send the campaign now. Messages are queued and sent via the selected channel." },
        { label: "Send History",      text: "Click the ⏱ history button to see which leads got the message and who responded." },
        { label: "Max Attempts",      text: "Set how many times a lead can be re-engaged by this campaign (default: 3) to avoid spam." },
        { label: "Re-engagement eligible", text: "A lead must have the 're_engagement_eligible' flag to be targeted. New leads are eligible by default." },
      ],
      tip: "Best practice: run a 30-day dormant campaign for 'Interested' stage leads every Monday morning.",
    },
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    icon: BarChart2,
    color: "from-blue-500 to-indigo-600",
    badge: "Insights",
    badgeColor: "bg-blue-100 text-blue-700",
    content: {
      summary: "Four analytics tabs giving you deep visibility into the performance of your leads, counsellors, campaigns, and SLA compliance. Use Reports weekly for management review.",
      items: [
        { label: "Lead Funnel tab",       text: "Stage distribution bar chart + total counts. Shows where leads are dropping off. If many are stuck in 'Interested', your follow-up may be too slow." },
        { label: "Lead Trend chart",      text: "Daily new leads vs admissions over 7 / 30 / 90 days. Use to spot seasonal patterns." },
        { label: "Counsellors tab",       text: "Per-counsellor table: total leads, admissions, calls made, overdue tasks, average lead score, and conversion rate. Identify top performers and who needs coaching." },
        { label: "Campaign ROI tab",      text: "Per-campaign: leads generated, admissions, spend, Cost Per Lead, Cost Per Admission, and conversion %. Delete campaigns with CPA > ₹5,000." },
        { label: "SLA / Response tab",    text: "How many leads are being responded to within the SLA policy time. Counsellors with low SLA compliance need attention." },
        { label: "Export (Excel / PDF)",  text: "Use the Export buttons at the top to download any report. Share the PDF in weekly review meetings." },
      ],
      tip: "Run the Counsellors report every Monday. Share it with the team — positive peer pressure improves follow-up rates.",
    },
  },
  {
    id: "leaderboard",
    title: "Leaderboard",
    icon: Trophy,
    color: "from-amber-500 to-yellow-500",
    badge: "Motivation",
    badgeColor: "bg-amber-100 text-amber-700",
    content: {
      summary: "A monthly performance ranking of all counsellors and managers based on revenue collected and admissions. Use it in team meetings to celebrate top performers and motivate the team.",
      items: [
        { label: "Month / Year selector", text: "View leaderboard for any past month to review historical performance." },
        { label: "Set Targets button",    text: "(Admin/Manager only) Set each counsellor's monthly revenue and admission targets. Targets must be set before the achievement % is meaningful." },
        { label: "Achievement bar",       text: "Green bar = ≥100% of target met. Amber = 70–99%. Red = below 70%." },
        { label: "Revenue Collected",     text: "Sum of all payments recorded against leads assigned to that counsellor during the month." },
        { label: "Admissions",            text: "Count of leads moved to 'Admitted' stage during the selected month." },
        { label: "Tasks Done",            text: "Total tasks completed by the counsellor that month — reflects activity level." },
        { label: "Summary KPIs (top)",    text: "Total team target, total collected, total admissions, and average team achievement %." },
      ],
      tip: "Set targets on the 1st of every month. Review the leaderboard in the Friday team huddle.",
    },
  },
  {
    id: "payments",
    title: "Payments & Revenue",
    icon: CreditCard,
    color: "from-green-500 to-emerald-600",
    badge: "Finance",
    badgeColor: "bg-green-100 text-green-700",
    content: {
      summary: "Record and track all fee payments from students. Every payment is linked to a lead, so counsellors get credit in the Leaderboard automatically.",
      items: [
        { label: "Record Payment",         text: "Click '+ Record Payment'. Select the lead, enter amount, choose method (Cash / UPI / Bank Transfer / Card), and set status (Completed / Pending)." },
        { label: "KPI cards",              text: "Today's collection, this month's total, all-time total, and pending payments — all calculated instantly." },
        { label: "Revenue Trend chart",    text: "Bar chart of daily collections over the last 7 / 30 / 90 days. Useful for spotting batch admission spikes." },
        { label: "Payment list",           text: "Full history of all payments with lead name, amount, method, receipt number, and recorded-by counsellor." },
        { label: "Filter by method/status", text: "Find all UPI payments, or all pending payments, quickly using the filter dropdowns." },
        { label: "Receipt number",         text: "Auto-generated on every payment. Share with the student as confirmation." },
      ],
      tip: "Always mark a payment as 'Completed' only when the money is actually received. Use 'Pending' for payment link sent but not yet paid.",
    },
  },
  {
    id: "companies",
    title: "Companies / SME",
    icon: Building2,
    color: "from-slate-500 to-gray-600",
    badge: "B2B",
    badgeColor: "bg-slate-100 text-slate-700",
    content: {
      summary: "Manage corporate clients and B2B deals. If a company sends 10 staff for a training program, track that deal here instead of creating 10 individual leads.",
      items: [
        { label: "Add Company",     text: "Create a company record with name, industry, contact person, phone, email, and city." },
        { label: "Company detail",  text: "Click a company to see all contacts, corporate deals, and deal pipeline." },
        { label: "Deals",           text: "Each deal has stage (Prospect → Proposal → Negotiation → Won / Lost), total value, and trainee count." },
        { label: "Contacts",        text: "Multiple contacts per company. Each contact can be linked to a Lead record." },
        { label: "Won Value",       text: "KPI showing total revenue from won corporate deals." },
        { label: "Active Deals",    text: "Count of deals currently in the pipeline (not yet won or lost)." },
      ],
      tip: "Use Quotations (see next section) to generate a professional PDF quote for a corporate deal before the Proposal stage.",
    },
  },
  {
    id: "quotations",
    title: "Quotations",
    icon: FileText,
    color: "from-indigo-500 to-blue-600",
    badge: "B2B & Individual",
    badgeColor: "bg-indigo-100 text-indigo-700",
    content: {
      summary: "Generate professional fee quotations for individual leads or corporate clients. Each quotation gets a unique reference number (e.g. QT-2025-0001) and can be printed or shared as PDF.",
      items: [
        { label: "New Quote",         text: "Select a Lead or Company, add line items (course name, fee, quantity), apply discount, and set validity date." },
        { label: "Quote number",      text: "Auto-generated sequence. Cannot be changed — used for financial tracking." },
        { label: "Status workflow",   text: "Draft → Sent → Accepted / Rejected / Expired. Change status by clicking the status badge on the quote." },
        { label: "Print view",        text: "Click the print icon on any quote to open a print-friendly view. Use browser Print → Save as PDF." },
        { label: "Discount field",    text: "Apply a flat rupee discount. The total is recalculated automatically." },
        { label: "Valid Until date",  text: "Set an expiry date. After this date, status automatically moves to 'Expired'." },
      ],
      tip: "Create a quotation as soon as a lead reaches 'Interested' stage. A written quote makes the decision easier for the student.",
    },
  },
  {
    id: "courses",
    title: "Courses",
    icon: BookMarked,
    color: "from-violet-500 to-purple-600",
    badge: "Master Data",
    badgeColor: "bg-violet-100 text-violet-700",
    content: {
      summary: "The master list of all courses your institution offers. Courses are used across the entire CRM — linked to leads, batches, enrollments, and certificates.",
      items: [
        { label: "Add Course",           text: "(Admin only) Add course name, category, duration, fee, and syllabus. Set 'Certificate Offered' if students get a certificate." },
        { label: "Archive Course",       text: "If a course has linked leads or batches, it gets archived (hidden) rather than deleted, preserving data integrity." },
        { label: "Active / Archived toggle", text: "Switch between viewing active courses and archived ones." },
        { label: "Course stats (top)",   text: "Total courses, active courses, total batches running, total enrollments, and total revenue from course fees." },
        { label: "Sort Order",           text: "Set a number to control which order courses appear in dropdowns. Lower number = appears first." },
        { label: "Related data",         text: "Each course card shows how many batches are running, how many students are enrolled, and how many leads are interested." },
      ],
      tip: "Create all your courses first before adding batches or enrolling students. Course data is the foundation of the Training module.",
    },
  },
  {
    id: "batches",
    title: "Batches & Enrollment",
    icon: BookOpen,
    color: "from-cyan-500 to-teal-600",
    badge: "Training",
    badgeColor: "bg-cyan-100 text-cyan-700",
    content: {
      summary: "Batches are scheduled runs of a course. One course can have many batches (e.g. Morning Batch, Weekend Batch). Admitted students are enrolled into a batch for attendance tracking.",
      items: [
        { label: "Create Batch",        text: "Select course, give the batch a name, set type (Regular / Weekend / Fast Track / Online), mode (Offline / Online / Hybrid), timing, start date, end date, and capacity." },
        { label: "Capacity & Seats",    text: "Each batch has a maximum capacity. The card shows enrolled count, total seats, and seats remaining. Red = almost full." },
        { label: "Enroll Student",      text: "Click a batch card → 'Enroll Student' → search and select an admitted lead → add fee amount → confirm." },
        { label: "Enrollment list",     text: "Click a batch to see everyone enrolled — name, phone, fee paid status." },
        { label: "Active / Inactive",   text: "Toggle a batch off when all classes are done or it was cancelled." },
        { label: "Filter by Course",    text: "Use the course dropdown to filter batches belonging to a specific course." },
      ],
      tip: "Always set the capacity correctly. When a batch fills up, the system prevents new enrollments so you don't overbook.",
    },
  },
  {
    id: "attendance",
    title: "Attendance",
    icon: ClipboardCheck,
    color: "from-green-500 to-teal-600",
    badge: "Training",
    badgeColor: "bg-green-100 text-green-700",
    content: {
      summary: "Mark daily attendance for any batch. The system records present, absent, late, and excused for each enrolled student. Trainers use this page daily.",
      items: [
        { label: "Select Batch",         text: "Choose the batch from the dropdown. The enrolled students load automatically." },
        { label: "Select Date",          text: "Defaults to today. Change to mark attendance for a past date (e.g. you forgot yesterday)." },
        { label: "Mark All buttons",     text: "Use 'Mark All Present' before class starts, then individually mark absentees — faster than marking one by one." },
        { label: "Status options",       text: "Present (green), Absent (red), Late (amber), Excused (gray). Each has a different colour in the grid." },
        { label: "Save Attendance",      text: "Click Save at the bottom. If you re-save the same date, it overwrites the previous record." },
        { label: "Attendance %",         text: "Each student's attendance percentage is shown. Below 75% is usually a warning threshold." },
      ],
      certificates: "The Certificates sub-tab lets you issue course completion certificates. Enter the student's name, course, and dispatch mode (Email / Post / In-person). The system generates a unique certificate number (e.g. CERT-2025-0001).",
      tip: "Mark attendance at the start of each session, not at the end. If students leave early, update to 'Late' or back to 'Absent'.",
    },
  },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    color: "from-gray-500 to-slate-600",
    badge: "Admin",
    badgeColor: "bg-gray-100 text-gray-700",
    content: {
      summary: "Configuration for the entire CRM. Only Admins can access the Users, Courses, and SLA tabs. All users can manage their push notifications.",
      items: [
        { label: "General tab",       text: "Set institution name, lead number prefix (e.g. 'ACA' → ACA-2025-0001), timezone, and support email." },
        { label: "Users tab",         text: "(Admin only) Add / edit / deactivate counsellor and manager accounts. Change passwords. Set roles." },
        { label: "Courses tab",       text: "Same as the Courses page — create and archive courses. Available here for convenience." },
        { label: "SLA Policies tab",  text: "Set maximum response time in hours per stage. E.g. 'New' leads must be contacted within 1 hour. Breached SLAs appear in Reports." },
        { label: "Integrations tab",  text: "Configure WhatsApp (WABA), SMS (MSG91), Meta Webhook token, and VAPID keys for push notifications." },
        { label: "Push Notifications",text: "Enable browser push notifications so you get alerts for new leads, overdue tasks, and SLA breaches even when the CRM tab is not visible." },
      ],
      tip: "Complete the General tab first (set institution name and lead number prefix) before doing anything else in the CRM.",
    },
  },
];

// ─── Component ────────────────────────────────────────────────

interface UserGuideProps {
  onClose: () => void;
  initialSection?: string;
}

export function UserGuide({ onClose, initialSection }: UserGuideProps) {
  const [activeId, setActiveId] = useState(initialSection ?? "overview");
  const [searchQ, setSearchQ] = useState("");

  const active = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0]!;
  const Icon = active.icon;

  const filtered = searchQ
    ? SECTIONS.filter((s) =>
        s.title.toLowerCase().includes(searchQ.toLowerCase()) ||
        s.badge?.toLowerCase().includes(searchQ.toLowerCase())
      )
    : SECTIONS;

  const activeIdx = filtered.findIndex((s) => s.id === activeId);
  const prevSection = activeIdx > 0 ? filtered[activeIdx - 1] : null;
  const nextSection = activeIdx < filtered.length - 1 ? filtered[activeIdx + 1] : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-5xl h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">

        {/* ── Left Sidebar ── */}
        <div className="w-[240px] shrink-0 flex flex-col border-r border-gray-100 bg-gray-50">
          {/* Header */}
          <div className="flex h-[60px] items-center gap-2 px-4 border-b border-gray-100">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500">
              <PlayCircle className="h-4 w-4 text-white" />
            </div>
            <span className="text-[13px] font-bold text-slate-800">User Guide</span>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search topics…"
                className="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Nav list */}
          <div className="flex-1 overflow-y-auto py-2">
            {filtered.map((s) => {
              const SIcon = s.icon;
              const isActive = s.id === activeId;
              return (
                <button
                  key={s.id}
                  onClick={() => { setActiveId(s.id); setSearchQ(""); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <SIcon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-indigo-600" : "text-gray-400")} />
                  <span className="text-xs font-medium truncate">{s.title}</span>
                  {isActive && <ChevronRight className="ml-auto h-3 w-3 text-indigo-400" />}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 text-center">{SECTIONS.length} topics · Aadhirai CRM</p>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-gray-100 px-6">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", active.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">{active.title}</h2>
                {active.badge && (
                  <span className={cn("text-[10px] font-semibold rounded-full px-2 py-0.5", active.badgeColor)}>{active.badge}</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Summary */}
            <div className={cn("rounded-xl p-4 bg-gradient-to-r text-white", active.color)}>
              <p className="text-sm leading-relaxed">{active.content.summary}</p>
            </div>

            {/* Overview: Steps + Roles */}
            {active.id === "overview" && (
              <>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">How it Works</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(active.content as any).steps?.map((step: any, i: number) => {
                      const SIcon = step.icon;
                      return (
                        <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
                              <SIcon className="h-3.5 w-3.5 text-indigo-600" />
                            </div>
                            <span className="text-xs font-bold text-gray-800">{step.title}</span>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">{step.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">User Roles</h3>
                  <div className="space-y-2">
                    {(active.content as any).roles?.map((r: any) => (
                      <div key={r.role} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm">
                        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold", r.color)}>{r.role}</span>
                        <p className="text-xs text-gray-600">{r.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Standard pages: items list */}
            {(active.content as any).items && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">What Each Part Does</h3>
                <div className="space-y-2">
                  {(active.content as any).items.map((item: any, i: number) => (
                    <div key={i} className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lead stages */}
            {(active.content as any).stages && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Lead Stages Explained</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(active.content as any).stages.map((st: any) => (
                    <div key={st.s} className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", st.c)}>{st.s}</span>
                      <p className="text-[11px] text-gray-500 leading-relaxed">{st.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Automation current rules */}
            {(active.content as any).currentRules && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Active Rules (Default Setup)</h3>
                <div className="space-y-2">
                  {(active.content as any).currentRules.map((rule: string, i: number) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-lg border border-amber-100 bg-amber-50 px-3.5 py-2.5">
                      <Zap className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <p className="text-xs text-amber-800">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certificates note for Attendance */}
            {(active.content as any).certificates && (
              <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                <div className="flex items-start gap-2">
                  <ClipboardCheck className="h-4 w-4 shrink-0 text-cyan-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-cyan-800 mb-1">Certificates Sub-tab</p>
                    <p className="text-xs text-cyan-700 leading-relaxed">{(active.content as any).certificates}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Pro Tip */}
            {(active.content as any).tip && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-200">
                    <Info className="h-3 w-3 text-indigo-700" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide mb-1">Pro Tip</p>
                    <p className="text-xs text-indigo-800 leading-relaxed">{(active.content as any).tip}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Prev / Next footer */}
          <div className="flex h-[52px] shrink-0 items-center justify-between border-t border-gray-100 px-6">
            {prevSection ? (
              <button
                onClick={() => setActiveId(prevSection.id)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {prevSection.title}
              </button>
            ) : <div />}
            {nextSection ? (
              <button
                onClick={() => setActiveId(nextSection.id)}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                {nextSection.title}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="text-xs text-gray-400 italic">You've read all topics 🎉</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Compact Login Guide ──────────────────────────────────────
// A lighter "What is this?" panel shown on the login page

const LOGIN_HIGHLIGHTS = [
  { icon: Users,      color: "bg-indigo-100 text-indigo-600", title: "Lead Management",   desc: "Capture & nurture every enquiry from Meta Ads, walk-ins, calls, and website forms." },
  { icon: Zap,        color: "bg-yellow-100 text-yellow-600", title: "Smart Automation",  desc: "Auto WhatsApp, SMS follow-ups and task creation — zero manual effort." },
  { icon: BarChart2,  color: "bg-blue-100 text-blue-600",     title: "Analytics",         desc: "Funnel reports, counsellor scorecard, campaign ROI, and SLA tracking." },
  { icon: Trophy,     color: "bg-amber-100 text-amber-600",   title: "Leaderboard",       desc: "Monthly revenue targets and admission goals for every counsellor." },
  { icon: GraduationCap, color: "bg-green-100 text-green-600", title: "Training Module",  desc: "Batches, enrollment, daily attendance, and auto-generated certificates." },
  { icon: Megaphone,  color: "bg-rose-100 text-rose-600",     title: "Campaigns & Re-engagement", desc: "Track ad spend ROI and revive cold leads with targeted campaigns." },
];

interface LoginGuideProps {
  onClose: () => void;
  onOpenFull: () => void;
}

export function LoginGuide({ onClose, onOpenFull }: LoginGuideProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-cyan-500 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-white">What is Aadhirai CRM?</h2>
            <p className="text-sm text-indigo-100 mt-0.5">An all-in-one platform to grow admissions for training institutes</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-3 p-5">
          {LOGIN_HIGHLIGHTS.map(({ icon: HIcon, color, title, desc }) => (
            <div key={title} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg mb-3", color)}>
                <HIcon className="h-4 w-4" />
              </div>
              <p className="text-[13px] font-bold text-gray-800 mb-1">{title}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Workflow */}
        <div className="mx-5 mb-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Lead Journey</p>
          <div className="flex items-center gap-1 flex-wrap">
            {["New Enquiry","Contacted","Qualified","Demo","Interested","Payment","Admitted ✓"].map((s, i, arr) => (
              <div key={s} className="flex items-center gap-1">
                <span className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                  i === arr.length - 1 ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                )}>{s}</span>
                {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3.5">
          <p className="text-[11px] text-gray-400">Login to access the full platform</p>
          <Button size="sm" variant="outline" onClick={onOpenFull} className="text-xs gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Detailed Guide (18 topics)
          </Button>
        </div>
      </div>
    </div>
  );
}

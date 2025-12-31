
"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  Heart, 
  Calendar,
  UserPlus,
  ClipboardCheck,
  Award
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HRDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeJobPostings: 0,
    pendingLeaveRequests: 0,
    upcomingEvaluations: 0,
  });

  useEffect(() => {
    const fetchHRStats = async () => {
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/hr/stats`,
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
            const data = await response.json();
            if (data.success) {
              setStats(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch HR stats", error);
        }
    };

    fetchHRStats();
  }, []);

  const hrModules = [
    {
      title: "Recruitment",
      description: "Manage job postings, applicants, and interviews.",
      icon: Briefcase,
      href: "/dashboard/hr/recruitment",
      color: "bg-blue-500",
      stats: `${stats.activeJobPostings} Active Postings`
    },
    {
      title: "Performance",
      description: "Track employee goals and record evaluations.",
      icon: TrendingUp,
      href: "/dashboard/hr/performance",
      color: "bg-green-500",
      stats: `${stats.upcomingEvaluations} Pending Reviews`
    },
    {
      title: "Benefits",
      description: "Manage employee benefit programs and enrollments.",
      icon: Heart,
      href: "/dashboard/hr/benefits",
      color: "bg-rose-500",
      stats: "5 Active Plans"
    },
    {
      title: "Leave Management",
      description: "Approve time-off requests and track balances.",
      icon: Calendar,
      href: "/dashboard/hr/leave",
      color: "bg-amber-500",
      stats: `${stats.pendingLeaveRequests} Pending Requests`
    },
    {
      title: "Employee Directory",
      description: "View and manage employee profiles and documents.",
      icon: Users,
      href: "/dashboard/employees",
      color: "bg-purple-500",
      stats: `${stats.totalEmployees} Total Staff`
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HR Management</h1>
          <p className="text-muted-foreground mt-1">
            Oversee your organization's human resources and talent.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild>
            <Link href="/dashboard/hr/recruitment">
              <UserPlus className="mr-2 h-4 w-4" />
              New Job Posting
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLeaveRequests}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobPostings}</div>
            <p className="text-xs text-muted-foreground">Across 3 departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Reviews</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingEvaluations}</div>
            <p className="text-xs text-muted-foreground">Due this week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hrModules.map((module) => (
          <Link key={module.href} href={module.href}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader>
                <div className={`w-12 h-12 ${module.color} rounded-lg flex items-center justify-center mb-4 text-white shadow-sm group-hover:scale-110 transition-transform`}>
                  <module.icon className="h-6 w-6" />
                </div>
                <CardTitle>{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full inline-block">
                  {module.stats}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

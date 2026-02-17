
"use client";

import { useState } from "react";
import { 
  BarChart3, 
  FileText, 
  Download, 
  Filter,
  PieChart,
  LineChart,
  Calendar,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function HRReportsPage() {
  const [reportType, setReportType] = useState("employees");

  const reports = [
    {
      id: "employees",
      name: "Employee Census",
      description: "Full list of active employees and their core details.",
      icon: Users
    },
    {
      id: "leave",
      name: "Leave Utilization",
      description: "Analysis of leave taken vs balance across departments.",
      icon: Calendar
    },
    {
      id: "recruitment",
      name: "Hiring Pipeline",
      description: "Metrics on applicants, time-to-hire, and source efficacy.",
      icon: FileText
    },
    {
      id: "performance",
      name: "Performance Distribution",
      description: "Summary of ratings and goal completion rates.",
      icon: BarChart3
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Generate insights and download documents for HR management.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {reports.map((report) => (
          <Card 
            key={report.id} 
            className={`cursor-pointer transition-all ${reportType === report.id ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'hover:border-slate-300'}`}
            onClick={() => setReportType(report.id)}
          >
            <CardHeader className="p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${reportType === report.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <report.icon className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">{report.name}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Report Preview</CardTitle>
            <CardDescription>Configure and preview the {reports.find(r => r.id === reportType)?.name} report.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-xl bg-slate-50 dark:bg-slate-900/50">
            <div className="text-center space-y-4">
              <BarChart3 className="h-12 w-12 text-slate-300 mx-auto" />
              <div className="text-slate-500 max-w-xs">
                Data visualization for <strong>{reports.find(r => r.id === reportType)?.name}</strong> will appear here based on selected parameters.
              </div>
              <div className="flex justify-center gap-4">
                <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Department Distribution</CardTitle>
            <CardDescription>Headcount breakdown across organization units.</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
             <PieChart className="h-16 w-16 text-slate-200" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hiring Trends</CardTitle>
            <CardDescription>Monthly applicant and hire volume over time.</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
             <LineChart className="h-16 w-16 text-slate-200" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

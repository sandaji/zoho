"use client";

import { useEffect, useState } from "react";
import { frontendEnv } from "@/lib/env";
import {
  Award,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { toast } from "sonner";

interface Goal {
  id: string;
  title: string;
  status: string;
  progress: number;
  targetDate?: string;
}

export default function PerformancePage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(
          `${frontendEnv.NEXT_PUBLIC_API_URL}/v1/hr/performance/goals`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const data = await response.json();
        if (data.success) {
          setGoals(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch goals", error);
        toast.error("Failed to load goals");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoals();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "OVERDUE":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Performance</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track objectives, key results, and employee growth.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            < Award className="mr-2 h-4 w-4" />
            Launch Evaluation
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            New Goal
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Core Objectives</CardTitle>
                <CardDescription>Active goals and key results for this period.</CardDescription>
              </div>
              <Target className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="animate-pulse space-y-2">
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4" />
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                    </div>
                  ))
                ) : goals.length > 0 ? (
                  goals.map((goal) => (
                    <div key={goal.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(goal.status)}
                          <span className="font-medium">{goal.title}</span>
                        </div>
                        <span className="text-sm font-medium">{goal.progress}%</span>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Due: {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'No date'}</span>
                        <Button variant="ghost" size="sm" className="h-auto p-0 text-blue-600 hover:text-blue-700">Update progress</Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-500 italic">
                    No active goals found. Use the "New Goal" button to start tracking progress.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Evaluations</CardTitle>
              <CardDescription>Completed performance check-ins and formal reviews.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Review Period</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                      No evaluations recorded yet.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-blue-600 text-white border-none shadow-blue-500/20 shadow-lg">
            <CardHeader>
              <CardTitle className="text-white">Growth & Development</CardTitle>
              <CardDescription className="text-blue-100">Your personalized learning path and skill acquisition plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white/10 p-4 rounded-xl space-y-2">
                <p className="text-sm font-medium">Current Focus: Technical Leadership</p>
                <p className="text-xs text-blue-100">3 of 5 milestones achieved</p>
                <Progress value={60} className="h-1 bg-white/20" />
              </div>
              <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 border-none">
                View Learning Plan
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600">
                      ?
                    </div>
                    <div>
                      <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">Quarterly Review</p>
                      <p className="text-xs text-slate-500">Due in 5 days</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { frontendEnv } from "@/lib/env";
import {
  Heart,
  ShieldCheck,
  Stethoscope,
  PiggyBank,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function BenefitsPage() {
  const [benefits, setBenefits] = useState<Array<{
    id: string;
    name: string;
    type: string;
    provider: string;
    description: string;
  }>>([]);
  const [enrollments, setEnrollments] = useState<Array<{
    benefitId: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const [benefitsRes, enrollmentsRes] = await Promise.all([
          fetch(`${frontendEnv.NEXT_PUBLIC_API_URL}/v1/hr/benefits`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${frontendEnv.NEXT_PUBLIC_API_URL}/v1/hr/benefits/my-enrollments`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const benefitsData = await benefitsRes.json();
        const enrollmentsData = await enrollmentsRes.json();

        if (benefitsData.success) setBenefits(benefitsData.data);
        if (enrollmentsData.success) setEnrollments(enrollmentsData.data);
      } catch (error) {
        console.error("Failed to fetch benefits data", error);
        toast.error("Failed to load benefits information");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getBenefitIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "health":
      case "medical":
        return <Stethoscope className="h-6 w-6" />;
      case "insurance":
        return <ShieldCheck className="h-6 w-6" />;
      case "retirement":
      case "pension":
        return <PiggyBank className="h-6 w-6" />;
      default:
        return <Heart className="h-6 w-6" />;
    }
  };

  const isEnrolled = (benefitId: string) => {
    return enrollments.some(e => e.benefitId === benefitId);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Benefits</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Explore and manage your employee health and wellness programs.
          </p>
        </div>
        <Button variant="outline">
          <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
          Back to HR
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-rose-500 text-white border-none md:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Annual Open Enrollment</CardTitle>
            <CardDescription className="text-rose-100 italic">Open until December 31st, 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <p className="text-lg">This is your time to update coverage for yourself and your dependents.</p>
              <Button className="bg-white text-rose-500 hover:bg-rose-50 border-none font-bold whitespace-nowrap">
                Start Enrollment
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent Claims</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-6 text-slate-500 italic text-sm">
              No recent claims to display.
            </div>
            <Button variant="ghost" className="w-full text-blue-600 text-xs">View Claim History</Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Available Benefit Plans</h2>
          <Button variant="outline" size="sm">Compare Plans</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse h-48" />
            ))
          ) : benefits.length > 0 ? (
            benefits.map((benefit) => (
              <Card key={benefit.id} className="hover:shadow-md transition-shadow relative overflow-hidden group">
                {isEnrolled(benefit.id) && (
                  <div className="absolute top-0 right-0 p-2">
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Enrolled
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 mb-2">
                    {getBenefitIcon(benefit.type)}
                  </div>
                  <CardTitle className="text-lg">{benefit.name}</CardTitle>
                  <CardDescription>{benefit.provider}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-500 line-clamp-2">{benefit.description}</p>
                  <div className="pt-4 flex items-center justify-between border-t border-slate-50 dark:border-slate-800">
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-blue-600 hover:text-blue-700">
                      Learn More <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                    {!isEnrolled(benefit.id) && (
                      <Button size="sm">Enroll Now</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-20 text-center space-y-4 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <Heart className="h-12 w-12 text-slate-300 mx-auto" />
              <div className="text-slate-500">No benefit plans currently available.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

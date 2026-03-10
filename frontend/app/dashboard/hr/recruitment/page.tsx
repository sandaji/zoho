"use client";

import { useEffect, useState } from "react";
import { frontendEnv } from "@/lib/env";
import Link from "next/link";
import {
  Briefcase,
  Users,
  Plus,
  Search,
  MoreVertical,
  MapPin,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface JobPosting {
  id: string;
  title: string;
  department: string;
  status: string;
  location?: string;
  type?: string;
  _count?: {
    applicants: number;
  };
}

export default function RecruitmentPage() {
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPostings = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(
          `${frontendEnv.NEXT_PUBLIC_API_URL}/v1/hr/recruitment/postings`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const data = await response.json();
        if (data.success) {
          setPostings(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch job postings", error);
        toast.error("Failed to load job postings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostings();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return <Badge className="bg-green-500">Active</Badge>;
      case "DRAFT":
        return <Badge variant="secondary">Draft</Badge>;
      case "CLOSED":
        return <Badge variant="destructive">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPostings = postings.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Recruitment</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your hiring pipeline and attract top talent.
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Create Job Posting
        </Button>
      </div>

      <Tabs defaultValue="postings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="postings">Job Postings</TabsTrigger>
          <TabsTrigger value="applicants">Recent Applicants</TabsTrigger>
        </TabsList>

        <TabsContent value="postings" className="mt-6 space-y-6">
          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search jobs or departments..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-t-xl" />
                  <CardContent className="p-6 space-y-4">
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))
            ) : filteredPostings.length > 0 ? (
              filteredPostings.map((posting) => (
                <Card key={posting.id} className="hover:shadow-lg transition-all border-slate-200 dark:border-slate-800 h-full flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      {getStatusBadge(posting.status)}
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="mt-4">{posting.title}</CardTitle>
                    <CardDescription>{posting.department}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <div className="flex flex-col gap-2 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> {posting.location || "Remote"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" /> {posting.type || "Full-time"}
                      </div>
                    </div>
                    <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">{posting._count?.applicants || 0} Applicants</span>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/hr/recruitment/${posting.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-20 text-center space-y-4 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Briefcase className="h-12 w-12 text-slate-300 mx-auto" />
                <div className="text-slate-500">No job postings found. Create one to get started!</div>
                <Button variant="outline">Create Your First Job</Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="applicants">
          <Card>
            <CardHeader>
              <CardTitle>Recent Applicants</CardTitle>
              <CardDescription>A list of candidates who recently applied for open positions.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Job Applied</TableHead>
                    <TableHead>Applied Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Real data will be mapped here from the API */}
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                      No recent applications found.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

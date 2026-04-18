"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { format } from "date-fns";

interface AttendanceRecord {
  id: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  workHours: number;
  status: "present" | "absent" | "late" | "half-day" | "excused";
  notes?: string;
}

interface AttendanceSummary {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalHalfDays: number;
  averageWorkHours: number;
  attendancePercentage: number;
  currentMonth: string;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const { showToast } = useToast();

  const fetchAttendanceData = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.request<{
        records: AttendanceRecord[];
        summary: AttendanceSummary;
      }>(`/v1/hr/attendance?month=${selectedMonth}`, "GET");

      if (response.success && response.data) {
        setRecords(response.data.records);
        setSummary(response.data.summary);
      } else {
        showToast("Error", response.error?.message || "Failed to fetch attendance data", "error");
      }
    } catch (error) {
      showToast("Error", "Failed to fetch attendance data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      const response = await apiClient.request("/v1/hr/attendance/clock-in", "POST", {});

      if (response.success) {
        showToast("Success", "Clocked in successfully", "success");
        await fetchAttendanceData();
      } else {
        showToast("Error", response.error?.message || "Failed to clock in", "error");
      }
    } catch (error) {
      showToast("Error", "Failed to clock in", "error");
    }
  };

  const handleClockOut = async () => {
    try {
      const response = await apiClient.request("/v1/hr/attendance/clock-out", "POST", {});

      if (response.success) {
        showToast("Success", "Clocked out successfully", "success");
        await fetchAttendanceData();
      } else {
        showToast("Error", response.error?.message || "Failed to clock out", "error");
      }
    } catch (error) {
      showToast("Error", "Failed to clock out", "error");
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedMonth]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800";
      case "absent":
        return "bg-red-100 text-red-800";
      case "late":
        return "bg-yellow-100 text-yellow-800";
      case "half-day":
        return "bg-blue-100 text-blue-800";
      case "excused":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Attendance Tracking</h1>
          <div className="flex gap-2">
            <Button onClick={handleClockIn} className="bg-green-600 hover:bg-green-700">
              <Clock className="mr-2 h-4 w-4" />
              Clock In
            </Button>
            <Button onClick={handleClockOut} variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Clock Out
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Present</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summary.totalPresent}</div>
                <p className="text-xs text-gray-500 mt-1">Days present</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Absent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summary.totalAbsent}</div>
                <p className="text-xs text-gray-500 mt-1">Days absent</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Late</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{summary.totalLate}</div>
                <p className="text-xs text-gray-500 mt-1">Late arrivals</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.averageWorkHours.toFixed(1)}</div>
                <p className="text-xs text-gray-500 mt-1">Per day</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Attendance %</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {summary.attendancePercentage.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-1">Overall</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Month Selector */}
        <div className="flex items-center gap-4">
          <label className="font-medium">Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </div>

        {/* Attendance Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>
              {selectedMonth &&
                `Showing records for ${format(new Date(selectedMonth + "-01"), "MMMM yyyy")}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading attendance records...</div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No attendance records found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">Clock In</th>
                      <th className="text-left py-3 px-4 font-medium">Clock Out</th>
                      <th className="text-left py-3 px-4 font-medium">Hours</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          {format(new Date(record.date), "MMM dd, yyyy")}
                        </td>
                        <td className="py-3 px-4">{record.clockIn || "-"}</td>
                        <td className="py-3 px-4">{record.clockOut || "-"}</td>
                        <td className="py-3 px-4">{record.workHours.toFixed(2)}h</td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(record.status)}>{record.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{record.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

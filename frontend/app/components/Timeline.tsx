"use client";

import { MdLocalShipping, MdDeliveryDining, MdCheckCircle, MdError } from "react-icons/md";
import clsx from "clsx";

export type TimelineEventStatus = "created" | "picked_up" | "delivered" | "failed";

export interface TimelineEvent {
  id: string;
  status: TimelineEventStatus;
  timestamp: string | Date;
  notes?: string;
}

function statusIcon(status: TimelineEventStatus) {
  switch (status) {
    case "created":
      return <MdLocalShipping className="h-5 w-5 text-slate-600" />;
    case "picked_up":
      return <MdDeliveryDining className="h-5 w-5 text-amber-600" />;
    case "delivered":
      return <MdCheckCircle className="h-5 w-5 text-emerald-600" />;
    case "failed":
      return <MdError className="h-5 w-5 text-rose-600" />;
    default:
      return null;
  }
}

function statusClasses(status: TimelineEventStatus) {
  switch (status) {
    case "created":
      return { dot: "bg-slate-400", line: "bg-slate-200" };
    case "picked_up":
      return { dot: "bg-amber-500", line: "bg-amber-200" };
    case "delivered":
      return { dot: "bg-emerald-600", line: "bg-emerald-200" };
    case "failed":
      return { dot: "bg-rose-600", line: "bg-rose-200" };
  }
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  const normalized = events
    .map((e) => ({
      ...e,
      timestamp:
        typeof e.timestamp === "string" ? new Date(e.timestamp) : (e.timestamp as Date),
    }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return (
    <div className="relative">
      <ol className="space-y-6">
        {normalized.map((e, idx) => {
          const classes = statusClasses(e.status);
          const isLast = idx === normalized.length - 1;
          return (
            <li key={e.id} className="relative flex gap-3">
              {/* Left rail */}
              <div className="flex flex-col items-center">
                <span className={clsx("h-2 w-2 rounded-full", classes.dot)} />
                {!isLast && <span className={clsx("mt-1 h-full w-px", classes.line)} />}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {statusIcon(e.status)}
                  <p className="text-sm font-medium capitalize">{e.status.replace("_", " ")}</p>
                  <span className="text-xs text-slate-500">
                    {e.timestamp.toLocaleString()}
                  </span>
                </div>
                {e.notes && <p className="text-xs text-slate-600 mt-1">{e.notes}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

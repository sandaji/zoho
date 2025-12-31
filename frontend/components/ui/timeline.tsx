import React from "react";
import { cn } from "@/lib/utils";

/**
 * Timeline Event Interface
 */
export interface TimelineEvent {
  id: string;
  status: string;
  timestamp: string;
  notes?: string;
  icon?: React.ReactNode;
}

/**
 * Timeline Component
 * Displays a vertical timeline of events
 */
export interface TimelineProps {
  events: TimelineEvent[];
  currentStatus?: string;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ events, currentStatus, className }) => {
  const statusColors: Record<string, { dot: string; line: string; bg: string }> = {
    pending: {
      dot: "bg-gray-400",
      line: "bg-gray-300",
      bg: "bg-gray-50",
    },
    assigned: {
      dot: "bg-blue-400",
      line: "bg-blue-300",
      bg: "bg-blue-50",
    },
    in_transit: {
      dot: "bg-yellow-400",
      line: "bg-yellow-300",
      bg: "bg-yellow-50",
    },
    picked_up: {
      dot: "bg-yellow-400",
      line: "bg-yellow-300",
      bg: "bg-yellow-50",
    },
    delivered: {
      dot: "bg-green-400",
      line: "bg-green-300",
      bg: "bg-green-50",
    },
    failed: {
      dot: "bg-red-400",
      line: "bg-red-300",
      bg: "bg-red-50",
    },
    rescheduled: {
      dot: "bg-orange-400",
      line: "bg-orange-300",
      bg: "bg-orange-50",
    },
    created: {
      dot: "bg-slate-400",
      line: "bg-slate-300",
      bg: "bg-slate-50",
    },
  };

  const formatTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  };

  return (
    <div className={cn("space-y-0", className)}>
      {events.length === 0 ? (
        <div className="text-center py-8 text-slate-500">No timeline events yet</div>
      ) : (
        events.map((event, index) => {
          const colors = statusColors[event.status] || statusColors.pending;
          const isLast = index === events.length - 1;
          const isCurrentStatus = currentStatus === event.status;

          return (
            <div key={event.id} className="flex gap-4 pb-8 last:pb-0">
              {/* Timeline Line & Dot */}
              <div className="flex flex-col items-center">
                {/* Connecting Line (above dot) */}
                {index > 0 && <div className={cn("w-0.5 h-6 mb-2", colors!.line)} />}

                {/* Dot */}
                <div
                  className={cn(
                    "w-4 h-4 rounded-full ring-4 ring-white shrink-0",
                    colors!.dot,
                    isCurrentStatus && "ring-4 ring-slate-200 scale-125"
                  )}
                />

                {/* Connecting Line (below dot) */}
                {!isLast && <div className={cn("w-0.5 grow mt-2", colors!.line)} />}
              </div>

              {/* Event Content */}
              <div className="flex-1 pt-0.5">
                <div className={cn("rounded-lg p-3 transition-colors", colors!.bg)}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm text-slate-900">
                      {getStatusLabel(event.status)}
                    </h4>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {formatTime(event.timestamp)}
                    </span>
                  </div>

                  {event.notes && <p className="text-sm text-slate-700">{event.notes}</p>}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

/**
 * Vertical Stepper Timeline
 * Shows progress through delivery stages
 */
export interface StepperTimelineProps {
  steps: {
    id: string;
    label: string;
    description?: string;
    status: "completed" | "current" | "upcoming";
    timestamp?: string;
  }[];
  className?: string;
}

export const StepperTimeline: React.FC<StepperTimelineProps> = ({ steps, className }) => {
  const statusConfig = {
    completed: {
      dotClass: "bg-green-500",
      lineClass: "bg-green-300",
      textClass: "text-slate-700",
      icon: "✓",
    },
    current: {
      dotClass: "bg-blue-500 animate-pulse",
      lineClass: "bg-blue-300",
      textClass: "text-slate-900 font-semibold",
      icon: "●",
    },
    upcoming: {
      dotClass: "bg-gray-300",
      lineClass: "bg-gray-200",
      textClass: "text-slate-500",
      icon: "○",
    },
  };

  return (
    <div className={cn("space-y-0", className)}>
      {steps.map((step, index) => {
        const config = statusConfig[step.status];
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex gap-4 pb-6 last:pb-0">
            {/* Timeline Dot & Line */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ring-4 ring-white",
                  config.dotClass
                )}
              >
                {config.icon}
              </div>

              {!isLast && <div className={cn("w-1 grow mt-2", config.lineClass)} />}
            </div>

            {/* Step Content */}
            <div className="flex-1 pt-1">
              <h4 className={cn("font-semibold text-sm", config.textClass)}>{step.label}</h4>
              {step.description && (
                <p className="text-xs text-slate-600 mt-1">{step.description}</p>
              )}
              {step.timestamp && (
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(step.timestamp).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;

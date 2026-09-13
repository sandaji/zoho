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

export interface TimelineProps {
  events: TimelineEvent[];
  currentStatus?: string;
  className?: string;
}

// All colours expressed as semantic token classes — works in light and dark mode
const statusColors: Record<string, { dot: string; line: string; bg: string }> = {
  pending:     { dot: "bg-muted-foreground/60",  line: "bg-muted-foreground/30",  bg: "bg-muted" },
  assigned:    { dot: "bg-info",                  line: "bg-info/40",              bg: "bg-info-muted" },
  in_transit:  { dot: "bg-warning",               line: "bg-warning/40",           bg: "bg-warning-muted" },
  picked_up:   { dot: "bg-warning",               line: "bg-warning/40",           bg: "bg-warning-muted" },
  delivered:   { dot: "bg-success",               line: "bg-success/40",           bg: "bg-success/10" },
  failed:      { dot: "bg-destructive",           line: "bg-destructive/40",       bg: "bg-destructive/10" },
  rescheduled: { dot: "bg-primary/60",            line: "bg-primary/30",           bg: "bg-primary/5" },
  created:     { dot: "bg-muted-foreground/50",   line: "bg-muted-foreground/20",  bg: "bg-muted" },
};

const defaultColors = statusColors.pending;

const formatTime = (isoString: string): string => {
  try {
    return new Date(isoString).toLocaleString("en-KE", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return isoString;
  }
};

const getStatusLabel = (status: string): string =>
  status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");

export const Timeline: React.FC<TimelineProps> = ({ events, currentStatus, className }) => (
  <div className={cn("space-y-0", className)}>
    {events.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground text-sm">No timeline events yet</div>
    ) : (
      events.map((event, index) => {
        const colors = statusColors[event.status] ?? defaultColors;
        const isLast = index === events.length - 1;
        const isCurrentStatus = currentStatus === event.status;

        return (
          <div key={event.id} className="flex gap-4 pb-8 last:pb-0">
            {/* Line & Dot */}
            <div className="flex flex-col items-center">
              {index > 0 && <div className={cn("w-0.5 h-6 mb-2", colors.line)} />}
              <div
                className={cn(
                  "w-4 h-4 rounded-full ring-2 ring-background shrink-0 transition-transform",
                  colors.dot,
                  isCurrentStatus && "scale-125 ring-4"
                )}
              />
              {!isLast && <div className={cn("w-0.5 grow mt-2", colors.line)} />}
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5">
              <div className={cn("rounded-lg p-3 transition-colors", colors.bg)}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-foreground">
                    {getStatusLabel(event.status)}
                  </h4>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                {event.notes && <p className="text-sm text-muted-foreground">{event.notes}</p>}
              </div>
            </div>
          </div>
        );
      })
    )}
  </div>
);

/**
 * Vertical Stepper Timeline
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

const stepperConfig = {
  completed: {
    dotClass:  "bg-success text-success-foreground",
    lineClass: "bg-success/40",
    textClass: "text-foreground",
    icon: "✓",
  },
  current: {
    dotClass:  "bg-primary text-primary-foreground animate-pulse",
    lineClass: "bg-primary/40",
    textClass: "text-foreground font-semibold",
    icon: "●",
  },
  upcoming: {
    dotClass:  "bg-muted text-muted-foreground",
    lineClass: "bg-muted-foreground/20",
    textClass: "text-muted-foreground",
    icon: "○",
  },
};

export const StepperTimeline: React.FC<StepperTimelineProps> = ({ steps, className }) => (
  <div className={cn("space-y-0", className)}>
    {steps.map((step, index) => {
      const config = stepperConfig[step.status];
      const isLast = index === steps.length - 1;

      return (
        <div key={step.id} className="flex gap-4 pb-6 last:pb-0">
          <div className="flex flex-col items-center shrink-0">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ring-2 ring-background",
                config.dotClass
              )}
            >
              {config.icon}
            </div>
            {!isLast && <div className={cn("w-1 grow mt-2", config.lineClass)} />}
          </div>

          <div className="flex-1 pt-1">
            <h4 className={cn("font-semibold text-sm", config.textClass)}>{step.label}</h4>
            {step.description && (
              <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
            )}
            {step.timestamp && (
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(step.timestamp).toLocaleString("en-KE", {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

export default Timeline;

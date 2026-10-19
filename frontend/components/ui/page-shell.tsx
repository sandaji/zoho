import type { ComponentType, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Standard page chrome, extracted from the Payroll page so every screen shares
 * the same header bar, content width, spacing and rhythm.
 *
 *   <PageShell
 *     icon={Wallet}
 *     breadcrumb="Human Resources / Payroll"
 *     title="Payroll"
 *     description="Prepare, review, approve, and record employee payments."
 *     actions={<Button>New payroll</Button>}
 *   >
 *     ...sections (spaced with space-y-6)...
 *   </PageShell>
 */
export interface PageShellProps {
  title: string;
  description?: string;
  /** Small line above the title, e.g. "Finance / General Ledger". */
  breadcrumb?: string;
  icon?: ComponentType<{ className?: string }>;
  /** Buttons / filters aligned to the right of the header. */
  actions?: ReactNode;
  children: ReactNode;
  /** Tailwind max-width class for the content area. Defaults to max-w-7xl. */
  maxWidth?: string;
  className?: string;
}

export function PageShell({
  title,
  description,
  breadcrumb,
  icon: Icon,
  actions,
  children,
  maxWidth = "max-w-7xl",
  className,
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-5 sm:px-6 lg:px-8">
        <div className={cn("mx-auto flex flex-wrap items-center justify-between gap-4", maxWidth)}>
          <div>
            {(breadcrumb || Icon) && (
              <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                {Icon && <Icon className="h-4 w-4 text-primary" />}
                {breadcrumb}
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </header>

      <main className={cn("mx-auto space-y-6 px-4 py-6 sm:px-6 lg:px-8", maxWidth, className)}>
        {children}
      </main>
    </div>
  );
}

/** Metric tile used on the Payroll page (title, big value, detail, tinted icon). */
export function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail?: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
        </div>
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Responsive grid for MetricCards (2 cols on tablet, 4 on wide screens). */
export function MetricGrid({ children }: { children: ReactNode }) {
  return <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</section>;
}

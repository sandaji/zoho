import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { getStatusColor } from "@/lib/statusColors"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 transition-all overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive",
        warning:
          "border-warning-border bg-warning-muted text-warning-foreground",
        success:
          "border-success/20 bg-success/10 text-success",
        info:
          "border-info-border bg-info-muted text-info",
        outline:
          "text-foreground border-border",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  status?: string;
}

function Badge({
  className,
  variant,
  status,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span";
  const statusStyle = status ? getStatusColor(status) : null;

  return (
    <Comp
      data-slot="badge"
      className={cn(
        badgeVariants({ variant }),
        statusStyle ? statusStyle.badge : "",
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants }

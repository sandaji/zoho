"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const TableSectionContext = React.createContext<"header" | "body" | null>(null);

function hasColSpanChild(children: React.ReactNode) {
  const rows = React.Children.toArray(children);
  return rows.length === 1 && React.isValidElement(rows[0]) &&
    typeof rows[0].props === "object" && rows[0].props !== null &&
    "colSpan" in rows[0].props;
}

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <TableSectionContext.Provider value="header">
      <thead
        data-slot="table-header"
        className={cn("bg-muted/60 [&_tr]:border-b [&_tr]:border-border/50", className)}
        {...props}
      />
    </TableSectionContext.Provider>
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <TableSectionContext.Provider value="body">
      <tbody
        data-slot="table-body"
        className={cn("[&_tr:last-child]:border-0", className)}
        {...props}
      />
    </TableSectionContext.Provider>
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  const section = React.useContext(TableSectionContext);
  const addIndex = section !== null && !hasColSpanChild(props.children);
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border/50 transition-colors hover:bg-muted/45 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-primary/8",
        className
      )}
      {...props}
    >
      {addIndex && (section === "header" ? (
        <TableHead aria-label="Row number" className="w-12 px-3 text-center text-muted-foreground">#</TableHead>
      ) : (
        <TableCell className="w-12 px-3 text-center text-muted-foreground tabular-nums">
          <span className="table-row-number" aria-label="Row number" />
        </TableCell>
      ))}
      {props.children}
    </tr>
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-11 px-3 text-left align-middle text-xs font-semibold tracking-wide whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };

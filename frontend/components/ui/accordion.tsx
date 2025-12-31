/**
 * Accordion Component for Expandable Content
 * Perfect for payslip details, expense breakdown, etc.
 */

"use client";

import React, { useState } from "react";
import { FaChevronDown } from "react-icons/fa";

interface AccordionItemProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItemProps[];
  allowMultiple?: boolean;
  className?: string;
}

/**
 * Accordion Container Component
 */
export function Accordion({ items, allowMultiple = true, className = "" }: AccordionProps) {
  const [openIndices, setOpenIndices] = useState<number[]>(
    items.map((item, i) => (item.defaultOpen ? i : -1)).filter((i) => i !== -1)
  );

  const handleToggle = (index: number) => {
    if (allowMultiple) {
      setOpenIndices((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    } else {
      setOpenIndices((prev) => (prev.includes(index) ? [] : [index]));
    }
  };

  return (
    <div className={className}>
      {items.map((item, i) => (
        <div key={i} className="mb-2 last:mb-0">
          <button
            onClick={() => handleToggle(i)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition border border-gray-200 rounded-lg"
          >
            <div className="flex items-center gap-3 text-left">
              {item.icon && <span className="text-gray-400">{item.icon}</span>}
              <div>
                <h4 className="font-semibold text-gray-900">{item.title}</h4>
                {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
              </div>
            </div>
            <FaChevronDown
              className={`text-gray-400 transition-transform ${
                openIndices.includes(i) ? "rotate-180" : ""
              }`}
              size={18}
            />
          </button>

          {openIndices.includes(i) && (
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 border-t-0 rounded-b-lg">
              {item.children}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * PayslipAccordion - Specialized accordion for payslip details
 */
interface PayslipDetails {
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  taxes?: number;
  notes?: string;
}

interface PayslipAccordionProps {
  payroll_no: string;
  employee_name: string;
  period: string;
  details: PayslipDetails;
}

export function PayslipAccordion({
  payroll_no,
  employee_name,
  period,
  details,
}: PayslipAccordionProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">{payroll_no}</h3>
        <p className="text-sm text-gray-600">{employee_name}</p>
        <p className="text-xs text-gray-500">{period}</p>
      </div>

      <Accordion
        items={[
          {
            title: "Earnings",
            description: `Base + Allowances = $${(details.baseSalary + details.allowances).toLocaleString()}`,
            defaultOpen: true,
            icon: "💰",
            children: (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Salary</span>
                  <span className="font-semibold">${details.baseSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span className="text-gray-600">Allowances</span>
                  <span className="font-semibold">+${details.allowances.toLocaleString()}</span>
                </div>
              </div>
            ),
          },
          {
            title: "Deductions",
            description: `Taxes + Deductions = $${(details.deductions + (details.taxes ?? 0)).toLocaleString()}`,
            icon: "📉",
            children: (
              <div className="space-y-2">
                {details.taxes && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taxes</span>
                    <span className="font-semibold text-red-600">
                      -${details.taxes.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Other Deductions</span>
                  <span className="font-semibold text-red-600">
                    -${details.deductions.toLocaleString()}
                  </span>
                </div>
              </div>
            ),
          },
          {
            title: "Net Salary",
            description: `Take-home pay`,
            icon: "✓",
            children: (
              <div className="flex justify-between items-center bg-green-50 p-3 rounded border border-green-200">
                <span className="font-semibold text-gray-900">Total Net Salary</span>
                <span className="text-2xl font-bold text-green-600">
                  ${details.netSalary.toLocaleString()}
                </span>
              </div>
            ),
          },
        ]}
        allowMultiple={true}
      />

      {details.notes && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            <strong>Notes:</strong> {details.notes}
          </p>
        </div>
      )}
    </div>
  );
}

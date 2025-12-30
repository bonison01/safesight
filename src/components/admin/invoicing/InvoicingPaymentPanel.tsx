// src/components/admin/invoicing/InvoicingPaymentPanel.tsx
// @ts-nocheck
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

/* ---------- SAFE NUMBER ---------- */
const n = (v) => Number(v || 0);

const InvoicingPaymentPanel = ({
  form,
  setForm,
  subtotal = 0,
  totalDiscount = 0,
  taxableAmount = 0,
  cgst = 0,
  sgst = 0,
  igst = 0,
  grandTotal = 0,
  remainingAmount = 0,
  numberToWords
}) => {

  /* PAYMENT STATUS */
  const handlePaymentStatusChange = (status) => {
    setForm(prev => {
      let paid = prev.paid_amount || 0;
      if (status === "unpaid") paid = 0;
      if (status === "paid") paid = n(grandTotal);
      if (status === "partial" && paid > n(grandTotal)) paid = 0;
      return { ...prev, payment_status: status, paid_amount: paid };
    });
  };

  /* PARTIAL PAYMENT */
  const handlePaidAmountChange = (value) => {
    const amt = n(value);
    setForm(prev => {
      const capped = Math.min(n(grandTotal), Math.max(0, amt));
      let status = "partial";
      if (capped === 0) status = "unpaid";
      if (capped === n(grandTotal)) status = "paid";
      return { ...prev, paid_amount: capped, payment_status: status };
    });
  };

  return (
    <Card className="shadow-sm border">
      <CardHeader>
        <CardTitle>Payment & Tax</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* STATUS */}
        <select
          className="border rounded p-3 w-48"
          value={form.payment_status}
          onChange={(e) => handlePaymentStatusChange(e.target.value)}
        >
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partially Paid</option>
          <option value="paid">Paid</option>
        </select>

        {form.payment_status === "partial" && (
          <input
            type="number"
            className="border rounded p-3 w-48"
            value={form.paid_amount}
            onChange={(e) => handlePaidAmountChange(e.target.value)}
          />
        )}

        {/* TAX */}
        <div className="flex gap-3 items-center">
          <label>Tax Type</label>
          <select
            className="border rounded p-2"
            value={form.taxType}
            onChange={(e) =>
              setForm(prev => ({ ...prev, taxType: e.target.value }))
            }
          >
            <option value="CGST_SGST">CGST + SGST</option>
            <option value="IGST">IGST</option>
            <option value="NONE">No Tax</option>
          </select>

          <label>Tax %</label>
          <input
            type="number"
            className="border rounded p-2 w-20"
            value={form.taxPercent}
            onChange={(e) =>
              setForm(prev => ({ ...prev, taxPercent: n(e.target.value) }))
            }
          />
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="p-3 border rounded">
            <div className="text-xs">Subtotal</div>
            <div className="font-semibold">₹{n(subtotal).toFixed(2)}</div>
          </div>

          <div className="p-3 border rounded">
            <div className="text-xs">Discount</div>
            <div className="font-semibold">- ₹{n(totalDiscount).toFixed(2)}</div>
          </div>

          <div className="p-3 border rounded">
            <div className="text-xs">Taxable</div>
            <div className="font-semibold">₹{n(taxableAmount).toFixed(2)}</div>
          </div>

          <div className="p-3 border rounded">
            <div className="text-xs">Tax</div>
            <div className="font-semibold">
              {form.taxType === "CGST_SGST" && (
                <>
                  CGST ₹{n(cgst).toFixed(2)} <br />
                  SGST ₹{n(sgst).toFixed(2)}
                </>
              )}
              {form.taxType === "IGST" && <>IGST ₹{n(igst).toFixed(2)}</>}
              {form.taxType === "NONE" && <>₹0.00</>}
            </div>
          </div>
        </div>

        {/* GRAND TOTAL */}
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs">Amount in words</div>
            <div className="font-medium">{numberToWords(n(grandTotal))}</div>
          </div>

          <div className="text-right">
            <div className="text-sm">Grand Total</div>
            <div className="text-2xl font-bold">
              ₹{n(grandTotal).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">
              Remaining ₹{n(remainingAmount).toFixed(2)}
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default InvoicingPaymentPanel;

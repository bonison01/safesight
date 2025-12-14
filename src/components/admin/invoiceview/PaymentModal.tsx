"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

type PaymentModalProps = {
  visible: boolean;
  invoice: any | null;

  newPaymentAmount: number;
  paymentMethod: "cash" | "upi" | "card";
  useDiscount: boolean;
  discountAmount: number;
  discountReason: string;

  setNewPaymentAmount: (v: number) => void;
  setPaymentMethod: (v: "cash" | "upi" | "card") => void;
  setUseDiscount: (v: boolean) => void;
  setDiscountAmount: (v: number) => void;
  setDiscountReason: (v: string) => void;

  onClose: () => void;
  onConfirm: () => Promise<void>; // Must be async
};

export default function PaymentModal({
  visible,
  invoice,

  newPaymentAmount,
  paymentMethod,
  useDiscount,
  discountAmount,
  discountReason,

  setNewPaymentAmount,
  setPaymentMethod,
  setUseDiscount,
  setDiscountAmount,
  setDiscountReason,

  onClose,
  onConfirm,
}: PaymentModalProps) {
  const [saving, setSaving] = useState(false); // Prevent double click

  if (!invoice) return null;

  const totalAmount = Number(invoice.grand_total ?? invoice.total_amount ?? 0);
  const totalPaid = Number(invoice.paid_amount ?? 0);
  const remaining = Math.max(0, totalAmount - totalPaid);

  const afterPayment = totalPaid + Number(newPaymentAmount || 0);
  const remainingAfterPayment =
    totalAmount -
    afterPayment -
    (useDiscount ? Number(discountAmount || 0) : 0);

  const invalid =
    newPaymentAmount > remaining ||
    (useDiscount && discountAmount > remaining) ||
    remainingAfterPayment < 0 ||
    (useDiscount && discountAmount > 0 && discountReason.trim().length === 0);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >

          {/* CARD ANIMATION */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Card className="w-full max-w-sm border shadow-xl bg-white">
              <CardHeader>
                <CardTitle>Add Payment</CardTitle>
              </CardHeader>

              <CardContent>
                {/* Info */}
                <div className="mb-2 text-sm">
                  <strong>Invoice:</strong> {invoice.invoice_number}
                </div>
                <div className="mb-2 text-sm">
                  <strong>Total:</strong> ₹{totalAmount.toFixed(2)}
                </div>
                <div className="mb-2 text-sm">
                  <strong>Paid:</strong> ₹{totalPaid.toFixed(2)}
                </div>
                <div className="mb-4 text-sm">
                  <strong>Remaining:</strong> ₹{remaining.toFixed(2)}
                </div>

                {/* PAYMENT AMOUNT */}
                <label className="block text-xs mb-1">Payment amount</label>
                <input
                  type="number"
                  className="border p-2 rounded w-full mb-3"
                  value={newPaymentAmount}
                  onChange={(e) => {
                    const val = Number(e.target.value || 0);
                    if (val > remaining) {
                      alert(`Cannot exceed remaining ₹${remaining}`);
                      return;
                    }
                    setNewPaymentAmount(val);
                  }}
                />

                {/* METHOD */}
                <div className="mb-3">
                  <label className="text-xs block mb-1">Payment Method</label>
                  <select
                    className="border p-2 rounded w-full"
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as "cash" | "upi" | "card"
                      )
                    }
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                {/* DISCOUNT */}
                <div className="mb-4 border rounded p-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useDiscount}
                      onChange={(e) => setUseDiscount(e.target.checked)}
                    />
                    <span className="text-sm font-medium">Add Discount</span>
                  </label>

                  {useDiscount && (
                    <div className="mt-2 space-y-2">
                      <div>
                        <label className="text-xs block mb-1">
                          Discount amount
                        </label>
                        <input
                          type="number"
                          className="border p-2 rounded w-full"
                          value={discountAmount}
                          onChange={(e) => {
                            const val = Number(e.target.value || 0);
                            if (val > remaining) {
                              alert(
                                `Discount cannot exceed ₹${remaining} remaining`
                              );
                              return;
                            }
                            setDiscountAmount(val);
                          }}
                        />
                      </div>

                      <div>
                        <label className="text-xs block mb-1">
                          Reason (required)
                        </label>
                        <textarea
                          className="border p-2 rounded w-full"
                          rows={2}
                          value={discountReason}
                          onChange={(e) =>
                            setDiscountReason(e.target.value)
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* SUMMARY */}
                <div className="mb-2 text-sm">
                  <strong>New paid:</strong> ₹{afterPayment.toFixed(2)}
                </div>
                <div className="mb-4 text-sm">
                  <strong>New remaining:</strong>{" "}
                  ₹{remainingAfterPayment.toFixed(2)}
                </div>

                {/* BUTTONS */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" disabled={saving} onClick={onClose}>
                    Cancel
                  </Button>

                  <Button
                    disabled={invalid || saving}
                    onClick={async () => {
                      if (invalid || saving) return;
                      setSaving(true); // Prevent double click
                      await onConfirm();
                      setSaving(false);
                    }}
                  >
                    {saving ? "Saving..." : "Add Payment"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

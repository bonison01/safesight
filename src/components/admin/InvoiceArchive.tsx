// src/components/admin/InvoiceArchive.tsx
// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * InvoiceArchive.tsx
 *
 * - Filters / Presets / CSV export
 * - Payment modal (Option A): when changing status -> Partial or Paid, open payment modal to enter new payment amount
 * - Changing from Paid -> other requires reason (modal)
 * - Uses invoice_payments.amount column (not paid_amount on payments)
 * - Removed Edit button (per latest user instruction)
 */

export default function InvoiceArchive() {
  // data
  const [invoices, setInvoices] = useState<any[]>([]);
  const [company, setCompany] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);

  // filters
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "partial" | "paid">("all");
  const [customerFilter, setCustomerFilter] = useState<string | "all">("all");
  const [minAmount, setMinAmount] = useState<number | "">("");
  const [maxAmount, setMaxAmount] = useState<number | "">("");
  const [startDate, setStartDate] = useState<string | "">("");
  const [endDate, setEndDate] = useState<string | "">("");

  // modals & edit/payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
  const [statusChangeTarget, setStatusChangeTarget] = useState<"paid" | "partial" | "unpaid" | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: inv }, { data: comp }, { data: cust }] = await Promise.all([
        supabase.from("invoices").select("*").order("created_at", { ascending: false }),
        supabase.from("company_name").select("*").limit(1),
        supabase.from("customers").select("*"),
      ]);

      setInvoices(inv ?? []);
      setCompany((comp ?? [])[0] ?? {});
      setCustomers(cust ?? []);
    } catch (err) {
      console.error(err);
      alert("Failed to load invoices or supporting data");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Preset date helpers
  // -------------------------
  const setPresetRange = (preset: "today" | "week" | "month" | "last30") => {
    const now = new Date();
    let s = new Date(now);
    let e = new Date(now);

    if (preset === "today") {
      // same day (s and e already set)
    } else if (preset === "week") {
      // week starting Monday
      const day = now.getDay(); // 0 - Sun ... 6 - Sat
      const diffToMonday = (day + 6) % 7;
      s.setDate(now.getDate() - diffToMonday);
      e = new Date(s);
      e.setDate(s.getDate() + 6);
    } else if (preset === "month") {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === "last30") {
      s.setDate(now.getDate() - 29);
    }

    const toISODate = (d: Date) => d.toISOString().substring(0, 10);
    setStartDate(toISODate(s));
    setEndDate(toISODate(e));
  };

  // -------------------------
  // Filtering (client-side)
  // -------------------------
  const filteredInvoices = useMemo(() => {
    const sDate = startDate ? new Date(startDate) : null;
    const eDate = endDate ? new Date(endDate) : null;

    return invoices.filter((inv) => {
      // search
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        if (
          !(String(inv.invoice_number || "").toLowerCase().includes(q) ||
            String(inv.customer_name || "").toLowerCase().includes(q))
        ) {
          return false;
        }
      }

      // status
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;

      // customer
      if (customerFilter !== "all" && inv.customer_name !== customerFilter) return false;

      // amounts
      const tot = Number(inv.total_amount || 0);
      if (minAmount !== "" && tot < Number(minAmount)) return false;
      if (maxAmount !== "" && tot > Number(maxAmount)) return false;

      // date range (inclusive)
      if (sDate || eDate) {
        if (!inv.created_at) return false;
        const invDate = new Date(inv.created_at);
        if (sDate && invDate < sDate) return false;
        if (eDate) {
          const endOfDay = new Date(eDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (invDate > endOfDay) return false;
        }
      }

      return true;
    });
  }, [invoices, searchText, statusFilter, customerFilter, minAmount, maxAmount, startDate, endDate]);

  // -------------------------
  // Sales summary for filtered set
  // -------------------------
  const salesSummary = useMemo(() => {
    const totalSold = filteredInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const totalPaid = filteredInvoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
    const totalRemaining = totalSold - totalPaid;
    return { totalSold, totalPaid, totalRemaining, count: filteredInvoices.length };
  }, [filteredInvoices]);

  // -------------------------
  // CSV Export
  // -------------------------
  const exportCsv = () => {
    if (!filteredInvoices.length) {
      alert("No invoices to export for current filters");
      return;
    }
    const rows = filteredInvoices.map((inv) => ({
      invoice_number: inv.invoice_number,
      date: inv.created_at ? inv.created_at.substring(0, 10) : "",
      customer: inv.customer_name,
      total_amount: Number(inv.total_amount || 0).toFixed(2),
      paid_amount: Number(inv.paid_amount || 0).toFixed(2),
      status: inv.status,
      reference_by: inv.reference_by || "",
    }));

    const header = Object.keys(rows[0]);
    const csvContent =
      header.join(",") +
      "\n" +
      rows
        .map((r) => header.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices_export_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // -------------------------
  // Download single invoice PDF
  // -------------------------
  const downloadInvoicePdf = async (invoice: any) => {
    const { data: items, error } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id);

    if (error) {
      console.error(error);
      alert("Failed to load invoice items");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    let y = 20;

    // Company header
    doc.setFontSize(18);
    doc.setFont("Helvetica", "bold");
    doc.text(company.name || "Company Name", 14, y);

    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    y += 6;
    if (company.address) {
      const lines = doc.splitTextToSize(company.address, 80);
      doc.text(lines, 14, y);
      y += lines.length * 5;
    }
    if (company.phone) {
      doc.text(`Phone: ${company.phone}`, 14, y);
      y += 5;
    }
    if (company.email) {
      doc.text(`Email: ${company.email}`, 14, y);
      y += 5;
    }
    if (company.website) {
      doc.text(company.website, 14, y);
      y += 5;
    }

    // Invoice header
    doc.setFontSize(16);
    doc.setFont("Helvetica", "bold");
    doc.text("INVOICE", 150, 20);

    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    const dateStr = invoice.created_at ? invoice.created_at.substring(0, 10) : "";
    doc.text(`Invoice No: ${invoice.invoice_number}`, 150, 30);
    doc.text(`Date: ${dateStr}`, 150, 36);
    if (invoice.reference_by) {
      doc.text(`Reference: ${invoice.reference_by}`, 150, 42);
    }

    // Bill to
    let billY = 60;
    doc.setFontSize(11);
    doc.setFont("Helvetica", "bold");
    doc.text("Bill To:", 14, billY);

    billY += 5;
    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    doc.text(invoice.customer_name || "", 14, billY);
    billY += 5;
    if (invoice.customer_phone) {
      doc.text(`Phone: ${invoice.customer_phone}`, 14, billY);
      billY += 5;
    }

    // Items table
    const startY = billY + 10;
    const rows = items?.map((it) => [it.description || "", it.quantity || 0, it.unit_price || 0, it.total || 0]) ?? [];

    autoTable(doc, {
      startY,
      head: [["Description", "Qty", "Price", "Total"]],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || startY + 10;

    // Totals
    const total = Number(invoice.total_amount || 0);
    const paid = Number(invoice.paid_amount || 0);
    const remaining = total - paid;

    doc.setFontSize(11);
    doc.setFont("Helvetica", "bold");
    doc.text("Total:", 140, finalY + 8);
    doc.text(`₹${total.toFixed(2)}`, 180, finalY + 8, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    doc.text("Paid:", 140, finalY + 14);
    doc.text(`₹${paid.toFixed(2)}`, 180, finalY + 14, { align: "right" });

    doc.text("Balance:", 140, finalY + 20);
    doc.text(`₹${remaining.toFixed(2)}`, 180, finalY + 20, { align: "right" });

    doc.setFontSize(9);
    doc.text("This is a computer-generated invoice.", 14, 285);

    doc.save(`${invoice.invoice_number}.pdf`);
  };

  // -------------------------
  // Status change handling
  // -------------------------
  const handleStatusChange = async (invoice: any, newStatus: "unpaid" | "partial" | "paid") => {
    // If newStatus === 'paid' or 'partial' we open payment modal (Option A)
    // If invoice currently 'paid' and changing away -> require reason modal
    if (invoice.status === "paid" && newStatus !== "paid") {
      setSelectedInvoice(invoice);
      setStatusChangeTarget(newStatus);
      setReasonText("");
      setShowReasonModal(true);
      return;
    }

    if (newStatus === "paid" || newStatus === "partial") {
      setSelectedInvoice(invoice);
      const remaining = Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0);
      setNewPaymentAmount(remaining > 0 ? remaining : 0);
      setStatusChangeTarget(newStatus);
      setShowPaymentModal(true);
      return;
    }

    // newStatus === 'unpaid' (and invoice wasn't paid) or simple change
    try {
      let paid_amount = Number(invoice.paid_amount || 0);
      if (newStatus === "unpaid") paid_amount = 0;
      if (newStatus === "partial" && paid_amount > Number(invoice.total_amount || 0)) paid_amount = Number(invoice.total_amount || 0);

      await supabase.from("invoices").update({ status: newStatus, paid_amount }).eq("id", invoice.id);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to update invoice status");
    }
  };

  // user confirms reason for changing paid -> other
  const confirmReasonForStatusChange = async () => {
    if (!selectedInvoice || !statusChangeTarget) return;
    if (!reasonText.trim()) {
      alert("Reason is required to change a paid invoice");
      return;
    }
    try {
      // log reason
      await supabase.from("invoice_edit_history").insert([{
        invoice_id: selectedInvoice.id,
        reason: reasonText.trim(),
        changes: { note: `Status changed from paid to ${statusChangeTarget}`, old_status: "paid", new_status: statusChangeTarget }
      }]);

      // update
      let paid_amount = Number(selectedInvoice.paid_amount || 0);
      if (statusChangeTarget === "unpaid") paid_amount = 0;
      if (statusChangeTarget === "partial" && paid_amount > Number(selectedInvoice.total_amount || 0)) paid_amount = Number(selectedInvoice.total_amount || 0);

      await supabase.from("invoices").update({ status: statusChangeTarget, paid_amount }).eq("id", selectedInvoice.id);
      setShowReasonModal(false);
      setSelectedInvoice(null);
      setStatusChangeTarget(null);
      setReasonText("");
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to change status with reason");
    }
  };

  // -------------------------
  // Payment modal: add payment then mark as paid/partial
  // -------------------------
  const confirmPayment = async () => {
    if (!selectedInvoice) return;
    if (!newPaymentAmount || Number(newPaymentAmount) <= 0) {
      alert("Enter a valid payment amount");
      return;
    }

    try {
      // Insert payment into invoice_payments using `amount` column (your schema)
      const { error: insErr } = await supabase.from("invoice_payments").insert([{
        invoice_id: selectedInvoice.id,
        amount: Number(newPaymentAmount),
        payment_method: "cash",
        recorded_by: "system",
        created_at: new Date().toISOString()
      }]);

      if (insErr) throw insErr;

      // Recompute total paid
      const { data: allPayments, error: fetchErr } = await supabase.from("invoice_payments").select("amount").eq("invoice_id", selectedInvoice.id);
      if (fetchErr) throw fetchErr;
      const totalPaid = (allPayments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0);

      const remaining = Number(selectedInvoice.total_amount || 0) - totalPaid;
      let newStatus: "unpaid" | "partial" | "paid" = "partial";
      if (totalPaid <= 0) newStatus = "unpaid";
      else if (remaining <= 0) newStatus = "paid";

      await supabase.from("invoices").update({ paid_amount: totalPaid, status: newStatus }).eq("id", selectedInvoice.id);

      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setNewPaymentAmount(0);
      await loadData();
      alert("Payment recorded");
    } catch (err) {
      console.error(err);
      alert("Failed to record payment");
    }
  };

  // Quick helper: mark overdue badge (user requested unpaid/partial show overdue)
  const isOverdue = (inv: any) => {
    return inv.status !== "paid";
  };

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-semibold">Invoice Archive</h2>
      </div>

      {/* FILTERS */}
      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Filters & Export</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs block mb-1">Search (invoice / customer)</label>
              <input className="border p-2 rounded w-full text-sm" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search..." />
            </div>

            <div>
              <label className="text-xs block mb-1">Customer</label>
              <select className="border p-2 rounded w-full text-sm" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value as any)}>
                <option value="all">All customers</option>
                {[...new Set(invoices.map(i => i.customer_name))].filter(Boolean).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs block mb-1">Status</label>
              <select className="border p-2 rounded w-full text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="all">All</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div>
              <label className="text-xs block mb-1">Amount range</label>
              <div className="flex gap-2">
                <input type="number" className="border p-2 rounded w-1/2 text-sm" placeholder="Min" value={minAmount as any} onChange={(e) => setMinAmount(e.target.value === "" ? "" : Number(e.target.value))} />
                <input type="number" className="border p-2 rounded w-1/2 text-sm" placeholder="Max" value={maxAmount as any} onChange={(e) => setMaxAmount(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
            </div>

            <div>
              <label className="text-xs block mb-1">Date range</label>
              <div className="flex gap-2">
                <input type="date" className="border p-2 rounded w-1/2 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <input type="date" className="border p-2 rounded w-1/2 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs block mb-1">Presets</label>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setPresetRange("today")}>Today</Button>
                <Button size="sm" variant="outline" onClick={() => setPresetRange("week")}>This Week</Button>
                <Button size="sm" variant="outline" onClick={() => setPresetRange("month")}>This Month</Button>
                <Button size="sm" variant="outline" onClick={() => setPresetRange("last30")}>Last 30 Days</Button>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <Button size="sm" onClick={() => { setStartDate(""); setEndDate(""); setMinAmount(""); setMaxAmount(""); setSearchText(""); setStatusFilter("all"); setCustomerFilter("all"); }}>
                Reset
              </Button>

              <Button size="sm" onClick={exportCsv}>⭐ Export CSV</Button>

              <Button size="sm" variant="outline" onClick={() => loadData()}>Refresh</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SUMMARY */}
      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Sales Summary (filtered)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div>Total invoices: <strong>{salesSummary.count}</strong></div>
            <div>Total sold: <strong>₹{Number(salesSummary.totalSold || 0).toFixed(2)}</strong></div>
            <div>Total paid: <strong>₹{Number(salesSummary.totalPaid || 0).toFixed(2)}</strong></div>
            <div>Remaining: <strong>₹{Number(salesSummary.totalRemaining || 0).toFixed(2)}</strong></div>
          </div>
        </CardContent>
      </Card>

      {/* TABLE */}
      {loading ? (
        <div className="text-center text-gray-500">Loading invoices…</div>
      ) : (
        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Invoices</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-gray-100 border-b text-left">
                <tr>
                  <th className="p-2">Invoice</th>
                  <th className="p-2">Customer</th>
                  <th className="p-2">Total</th>
                  <th className="p-2">Paid</th>
                  <th className="p-2">Remaining</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const remaining = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
                  return (
                    <tr key={inv.id} className="border-b">
                      <td className="p-2">{inv.invoice_number}</td>
                      <td className="p-2">{inv.customer_name}</td>
                      <td className="p-2">₹{Number(inv.total_amount || 0).toFixed(2)}</td>
                      <td className="p-2">₹{Number(inv.paid_amount || 0).toFixed(2)}</td>
                      <td className="p-2">₹{Number(remaining).toFixed(2)}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {/* Overdue badge for unpaid/partial */}
                          {isOverdue(inv) && <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">⚠️ Overdue</span>}
                          <select
                            className="border p-1 rounded text-sm"
                            value={inv.status}
                            onChange={(e) => handleStatusChange(inv, e.target.value as any)}
                          >
                            <option value="unpaid">Unpaid</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-2">{inv.created_at ? inv.created_at.substring(0, 10) : ""}</td>
                      <td className="p-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => downloadInvoicePdf(inv)}>PDF</Button>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedInvoice(inv); setNewPaymentAmount(0); setShowPaymentModal(true); }}>Pay</Button>
                        {/* Edit removed per request */}
                      </td>
                    </tr>
                  );
                })}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan={8}>
                      No invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm border shadow-xl bg-white">
            <CardHeader><CardTitle>Add Payment</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-2 text-sm"><strong>Invoice:</strong> {selectedInvoice.invoice_number}</div>
              <div className="mb-2 text-sm"><strong>Total:</strong> ₹{Number(selectedInvoice.total_amount).toFixed(2)}</div>
              <div className="mb-2 text-sm"><strong>Paid so far:</strong> ₹{Number(selectedInvoice.paid_amount || 0).toFixed(2)}</div>
              <div className="mb-4 text-sm"><strong>Remaining:</strong> ₹{(Number(selectedInvoice.total_amount || 0) - Number(selectedInvoice.paid_amount || 0)).toFixed(2)}</div>

              <label className="block text-xs mb-1">Payment amount</label>
              <input
                type="number"
                className="border p-2 rounded w-full mb-4"
                placeholder="Payment amount"
                value={newPaymentAmount}
                onChange={(e) => {
                  const v = Number(e.target.value || 0);
                  setNewPaymentAmount(v);
                }}
              />

              <div className="mb-3 text-sm">
                <strong>New total paid will be:</strong> ₹{(Number(selectedInvoice.paid_amount || 0) + Number(newPaymentAmount || 0)).toFixed(2)}
              </div>
              <div className="mb-4 text-sm">
                <strong>New remaining:</strong> ₹{(Number(selectedInvoice.total_amount || 0) - (Number(selectedInvoice.paid_amount || 0) + Number(newPaymentAmount || 0))).toFixed(2)}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowPaymentModal(false); setSelectedInvoice(null); setNewPaymentAmount(0); }}>Cancel</Button>
                <Button onClick={confirmPayment}>Add Payment</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* REASON MODAL */}
      {showReasonModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <Card className="w-full max-w-md border shadow-xl bg-white">
            <CardHeader><CardTitle>Reason required</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-2 text-sm">Changing status of a fully paid invoice requires a reason. Please provide a reason to continue.</div>
              <textarea className="border p-2 w-full mb-4" rows={4} value={reasonText} onChange={(e) => setReasonText(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowReasonModal(false); setSelectedInvoice(null); setReasonText(""); }}>Cancel</Button>
                <Button onClick={confirmReasonForStatusChange}>Confirm</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

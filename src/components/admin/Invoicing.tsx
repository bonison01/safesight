// src/components/admin/Invoicing.tsx
// @ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PaymentStatus = "unpaid" | "partial" | "paid";

interface Customer { id: string; name: string; phone?: string | null; address?: string | null; }
interface Product { id: string; name: string; item_code?: string | null; price?: number | null; offer_price?: number | null; }
interface Variant { id: string; product_id: string; color?: string | null; size?: string | null; stock_quantity?: number | null; }

interface InvoiceItemDraft {
  id?: string;
  type: "product" | "manual";
  product_id?: string | null;
  variant_id?: string | null;
  item_code?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceFormState {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  reference_by: string;
  total_amount: number;
  payment_status: PaymentStatus;
  paid_amount: number;
}

const Invoicing: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [items, setItems] = useState<InvoiceItemDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<InvoiceFormState>({
    customer_id: "",
    customer_name: "",
    customer_phone: "",
    reference_by: "",
    total_amount: 0,
    payment_status: "unpaid",
    paid_amount: 0,
  });

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "" });

  useEffect(() => { void loadBaseData(); }, []);

  const loadBaseData = async () => {
    const { data: cs } = await supabase.from("customers").select("*");
    const { data: pr } = await supabase.from("products").select("*");
    const { data: pv } = await supabase.from("product_variants").select("*");
    setCustomers(cs ?? []);
    setProducts(pr ?? []);
    setVariants(pv ?? []);
  };

  // helpers
  const getTotalProductStock = (productId?: string | null) => {
    if (!productId) return 0;
    const rel = variants.filter(v => v.product_id === productId);
    return rel.reduce((s, v) => s + Number(v.stock_quantity ?? 0), 0);
  };
  const getVariantStock = (variantId?: string | null) => {
    if (!variantId) return 0;
    const v = variants.find(x => x.id === variantId);
    return Number(v?.stock_quantity ?? 0);
  };

  // customer
  const handleCustomerSelect = (id: string) => {
    const c = customers.find(x => x.id === id);
    setForm(prev => ({ ...prev, customer_id: id, customer_name: c?.name ?? "", customer_phone: c?.phone ?? "" }));
  };

  const saveNewCustomer = async () => {
    if (!newCustomer.name.trim()) return alert("Customer name is required");
    const { data, error } = await supabase.from("customers").insert([{
      name: newCustomer.name.trim(), phone: newCustomer.phone || null, address: newCustomer.address || null
    }]).select();
    if (error) { console.error(error); return alert("Failed to save customer"); }
    const created = (data ?? [])[0];
    setCustomers(prev => [...prev, created]);
    setShowCustomerModal(false);
    setNewCustomer({ name: "", phone: "", address: "" });
    handleCustomerSelect(created.id);
  };

  // items & totals
  const recalcTotal = (list: InvoiceItemDraft[]) => {
    const total = list.reduce((s, it) => s + Number(it.total || 0), 0);
    setForm(prev => {
      let paid = prev.paid_amount;
      if (prev.payment_status === "paid") paid = total;
      if (prev.payment_status === "unpaid") paid = 0;
      if (prev.payment_status === "partial" && paid > total) paid = total;
      return { ...prev, total_amount: total, paid_amount: paid };
    });
  };

  const addProductLine = () => { const l = [...items, { type: "product", product_id: null, variant_id: null, item_code: "", description: "", quantity: 1, unit_price: 0, total: 0 }]; setItems(l); recalcTotal(l); };
  const addManualLine = () => { const l = [...items, { type: "manual", product_id: null, variant_id: null, item_code: "", description: "", quantity: 1, unit_price: 0, total: 0 }]; setItems(l); recalcTotal(l); };
  const removeItem = (i: number) => { const l = items.filter((_, idx) => idx !== i); setItems(l); recalcTotal(l); };

  const updateItem = (index: number, field: keyof InvoiceItemDraft, value: any) => {
    const list = [...items];
    const cur = { ...list[index] };
    if (field === "quantity" || field === "unit_price") cur[field] = Number(value || 0);
    else (cur as any)[field] = value;
    cur.total = Number(cur.quantity || 0) * Number(cur.unit_price || 0);
    list[index] = cur;
    setItems(list);
    recalcTotal(list);
  };

  const handleProductSelect = (index: number, product_id: string) => {
    const prod = products.find(p => p.id === product_id);
    if (!prod) return;
    const price = Number(prod.offer_price ?? prod.price ?? 0);
    const list = [...items];
    const cur = { ...list[index] };
    cur.product_id = product_id;
    cur.item_code = prod.item_code ?? "";
    cur.description = prod.name ?? "";
    cur.unit_price = price;
    cur.total = price * Number(cur.quantity || 1);
    cur.variant_id = null;
    list[index] = cur;
    setItems(list);
    recalcTotal(list);
  };

  const handleVariantSelect = (index: number, variant_id: string) => {
    const variant = variants.find(v => v.id === variant_id);
    const list = [...items];
    const cur = { ...list[index] };
    cur.variant_id = variant_id || null;
    if (variant) {
      const base = (cur.description || "").split(" (")[0];
      cur.description = `${base} (${variant.color ?? ""} ${variant.size ?? ""})`;
    }
    list[index] = cur;
    setItems(list);
    recalcTotal(list);
  };

  // payment helpers
  const handlePaymentStatusChange = (status: PaymentStatus) => {
    setForm(prev => {
      let paid = prev.paid_amount;
      if (status === "unpaid") paid = 0;
      if (status === "paid") paid = prev.total_amount;
      if (status === "partial" && (paid <= 0 || paid > prev.total_amount)) paid = 0;
      return { ...prev, payment_status: status, paid_amount: paid };
    });
  };
  const handlePaidAmountChange = (value: string) => {
    const amt = Number(value || 0);
    setForm(prev => {
      const capped = Math.max(0, Math.min(prev.total_amount, amt));
      let status: PaymentStatus = "partial";
      if (capped === 0) status = "unpaid";
      else if (capped === prev.total_amount) status = "paid";
      return { ...prev, paid_amount: capped, payment_status: status };
    });
  };

  const remainingAmount = form.total_amount - (form.payment_status === "paid" ? form.total_amount : form.payment_status === "partial" ? form.paid_amount : 0);

  // STOCK VALIDATION
  const checkStockBeforeSave = (): boolean => {
    for (const it of items) {
      if (it.type !== "product" || !it.product_id) continue;
      if (it.variant_id) {
        const avail = getVariantStock(it.variant_id);
        if (avail < it.quantity) { alert(`Not enough stock for ${it.description}. Available: ${avail}, requested: ${it.quantity}`); return false; }
      } else {
        const avail = getTotalProductStock(it.product_id);
        if (avail < it.quantity) { const p = products.find(x => x.id === it.product_id); alert(`Not enough stock for ${p?.name ?? "product"}. Available: ${avail}, requested: ${it.quantity}`); return false; }
      }
    }
    return true;
  };

  // SAVE INVOICE (insert invoice -> insert items -> deduct stock)
  const handleSaveInvoice = async () => {
    if (!form.customer_name.trim()) return alert("Please enter customer name");
    if (items.length === 0) return alert("Please add at least one item");
    if (!checkStockBeforeSave()) return;

    setSaving(true);
    try {
      const invoiceNumber = "INV-" + Date.now();
      const payload: any = {
        invoice_number: invoiceNumber,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone || null,
        reference_by: form.reference_by || null,
        total_amount: form.total_amount,
        status: form.payment_status,
        paid_amount: form.payment_status === "paid" ? form.total_amount : form.payment_status === "partial" ? form.paid_amount : 0,
        payment_status: form.payment_status,
      };

      // 1) create invoice
      const { data: invData, error: invErr } = await supabase.from("invoices").insert([payload]).select();
      if (invErr || !invData || !invData[0]) throw invErr || new Error("Failed to create invoice");
      const createdInvoice = invData[0];

      // 2) insert items
      for (const it of items) {
        const { error: iiErr } = await supabase.from("invoice_items").insert([{
          invoice_id: createdInvoice.id,
          item_code: it.item_code ?? null,
          product_id: it.product_id ?? null,
          variant_id: it.variant_id ?? null,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total: it.total,
        }]);
        if (iiErr) throw iiErr;
      }

      // 3) deduct stock (DB RPCs) — do AFTER items inserted
      for (const it of items) {
        if (it.type !== "product" || !it.product_id) continue;
        if (it.variant_id) {
          const { error: rpcErr } = await supabase.rpc("deduct_variant_stock", { p_variant_id: it.variant_id, p_quantity: Math.floor(Number(it.quantity)) });
          if (rpcErr) throw rpcErr;
        } else {
          const { error: rpcErr } = await supabase.rpc("deduct_product_stock", { p_product_id: it.product_id, p_quantity: Math.floor(Number(it.quantity)) });
          if (rpcErr) throw rpcErr;
        }
      }

      alert("Invoice saved successfully");
      setItems([]); setForm({ customer_id: "", customer_name: "", customer_phone: "", reference_by: "", total_amount: 0, payment_status: "unpaid", paid_amount: 0 });
      await loadBaseData();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  // render
  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center border-b pb-4"><h2 className="text-xl font-semibold">Create Invoice</h2></div>

      <Card className="shadow-sm border">
        <CardHeader><CardTitle className="text-base md:text-lg">Customer & Reference</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row gap-2">
            <select className="p-2 border rounded flex-1 text-sm" value={form.customer_id} onChange={(e) => handleCustomerSelect(e.target.value)}>
              <option value="">Select existing customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>)}
            </select>
            <Button variant="outline" onClick={() => setShowCustomerModal(true)}>+ Add Customer</Button>
          </div>

          <input className="border p-2 rounded w-full text-sm" placeholder="Customer Name" value={form.customer_name} onChange={(e) => setForm(prev => ({ ...prev, customer_name: e.target.value }))} />
          <input className="border p-2 rounded w-full text-sm" placeholder="Customer Phone" value={form.customer_phone} onChange={(e) => setForm(prev => ({ ...prev, customer_phone: e.target.value }))} />
          <input className="border p-2 rounded w-full text-sm" placeholder="Reference By (salesperson / referred by)" value={form.reference_by} onChange={(e) => setForm(prev => ({ ...prev, reference_by: e.target.value }))} />
        </CardContent>
      </Card>

      <Card className="shadow-sm border">
        <CardHeader><CardTitle className="text-base md:text-lg">Items</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-end gap-2 mb-2">
            <Button size="sm" onClick={addProductLine}>+ Add Product Line</Button>
            <Button size="sm" variant="outline" onClick={addManualLine}>+ Add Manual Item</Button>
          </div>

          <div className="border rounded overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-gray-100 border-b"><tr><th className="p-2">Type</th><th className="p-2">Product / Description</th><th className="p-2">Variant</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Unit</th><th className="p-2 text-right">Total</th><th className="p-2"/></tr></thead>
              <tbody>
  {items.map((it, idx) => {
    const product = it.product_id ? products.find(p => p.id === it.product_id) : undefined;
    const productVariants = variants.filter(v => v.product_id === it.product_id);
    const productStock = getTotalProductStock(it.product_id);
    const variantStock = getVariantStock(it.variant_id);

    const remainingVariant = it.variant_id ? variantStock - it.quantity : null;
    const remainingProduct = !it.variant_id && it.product_id ? productStock - it.quantity : null;

    return (
      <tr key={idx} className="border-b align-top">
        {/* TYPE */}
        <td className="p-2">{it.type === "product" ? "Product" : "Manual"}</td>

        {/* PRODUCT / DESCRIPTION */}
        <td className="p-2">
          {it.type === "product" ? (
            <>
              <select
                className="border rounded p-1 w-full mb-1"
                value={it.product_id ?? ""}
                onChange={(e) => handleProductSelect(idx, e.target.value)}
              >
                <option value="">Select product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Stock: {getTotalProductStock(p.id)}
                  </option>
                ))}
              </select>

              <input
                className="border rounded p-1 w-full"
                placeholder="Item description"
                value={it.description}
                onChange={(e) => updateItem(idx, "description", e.target.value)}
              />

              {/* TOTAL PRODUCT STOCK */}
              {it.product_id && (
                <div className="mt-1 text-[10px] text-gray-500">
                  Total product stock:{" "}
                  <span className={productStock > 0 ? "text-green-600" : "text-red-600"}>
                    {productStock}
                  </span>
                </div>
              )}

              {/* REMAINING PRODUCT STOCK */}
              {remainingProduct !== null && (
                <div className="text-[10px] text-gray-500">
                  Remaining after sale:{" "}
                  <span className={remainingProduct >= 0 ? "text-green-600" : "text-red-600"}>
                    {remainingProduct}
                  </span>
                </div>
              )}
            </>
          ) : (
            <input
              className="border rounded p-1 w-full"
              placeholder="Manual item description"
              value={it.description}
              onChange={(e) => updateItem(idx, "description", e.target.value)}
            />
          )}
        </td>

        {/* VARIANT COLUMN */}
        <td className="p-2">
          {it.type === "product" && (
            <>
              <select
                className="border rounded p-1 w-full"
                value={it.variant_id ?? ""}
                disabled={!it.product_id}
                onChange={(e) => handleVariantSelect(idx, e.target.value)}
              >
                <option value="">Select Variant</option>
                {productVariants.map(v => {
                  const stock = Number(v.stock_quantity ?? 0);
                  return (
                    <option key={v.id} value={v.id} disabled={stock <= 0}>
                      {v.color ?? ""} {v.size ?? ""} — Stock: {stock > 0 ? stock : "OUT"}
                    </option>
                  );
                })}
              </select>

              {/* VARIANT LIST WITH STOCK */}
              {productVariants.length > 0 && (
                <div className="mt-1 text-[10px] text-gray-500 space-y-0.5">
                  {productVariants.map(v => {
                    const stock = Number(v.stock_quantity ?? 0);
                    return (
                      <div key={v.id}>
                        {v.color ?? ""} {v.size ?? ""}:{" "}
                        <span
                          className={
                            stock > 0
                              ? stock <= 3
                                ? "text-orange-500 font-medium"
                                : "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {stock > 0 ? `Stock: ${stock}` : "OUT OF STOCK"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SELECTED VARIANT STOCK */}
              {it.variant_id && (
                <div className="mt-1 text-[10px] text-gray-500">
                  Selected variant stock:{" "}
                  <span className={variantStock > 0 ? "text-green-600" : "text-red-600"}>
                    {variantStock}
                  </span>
                </div>
              )}

              {/* REMAINING VARIANT STOCK */}
              {it.variant_id && (
                <div className="text-[10px] text-gray-500">
                  Remaining after sale:{" "}
                  <span className={remainingVariant >= 0 ? "text-green-600" : "text-red-600"}>
                    {remainingVariant}
                  </span>
                </div>
              )}
            </>
          )}
        </td>

        {/* QUANTITY */}
        <td className="p-2">
          <input
            type="number"
            min={1}
            className="border rounded p-1 w-full text-right"
            value={it.quantity}
            onChange={(e) => updateItem(idx, "quantity", e.target.value)}
          />
        </td>

        {/* UNIT PRICE */}
        <td className="p-2">
          <input
            type="number"
            className="border rounded p-1 w-full text-right"
            value={it.unit_price}
            onChange={(e) => updateItem(idx, "unit_price", e.target.value)}
          />
        </td>

        {/* TOTAL */}
        <td className="p-2 text-right font-semibold">
          ₹{Number(it.total || 0).toFixed(2)}
        </td>

        {/* REMOVE BUTTON */}
        <td className="p-2 text-center">
          <button className="text-red-500 text-xs" onClick={() => removeItem(idx)}>
            ✕
          </button>
        </td>
      </tr>
    );
  })}

  {items.length === 0 && (
    <tr>
      <td className="p-4 text-center text-gray-500" colSpan={7}>
        No items yet. Add a product line or a manual item.
      </td>
    </tr>
  )}
</tbody>

            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border">
        <CardHeader><CardTitle className="text-base md:text-lg">Payment</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <select className="border rounded p-2 w-full md:w-48" value={form.payment_status} onChange={(e) => handlePaymentStatusChange(e.target.value as PaymentStatus)}>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial Paid</option>
              <option value="paid">Paid</option>
            </select>

            {form.payment_status === "partial" && (<input type="number" className="border rounded p-2 w-full md:w-48" placeholder="Paid amount" value={form.paid_amount} onChange={(e) => handlePaidAmountChange(e.target.value)} />)}
          </div>

          <div className="flex justify-between text-sm text-gray-700"><span>Total Amount:</span><span className="font-semibold">₹{form.total_amount.toFixed(2)}</span></div>
          {form.payment_status !== "unpaid" && (<div className="flex justify-between text-sm text-gray-700"><span>Paid Amount:</span><span className="font-semibold">₹{form.paid_amount.toFixed(2)}</span></div>)}
          {form.payment_status !== "unpaid" && (<div className="flex justify-between text-sm text-gray-700"><span>Remaining:</span><span className="font-semibold">₹{remainingAmount.toFixed(2)}</span></div>)}
          {form.payment_status === "paid" && (<div className="text-right text-xs font-semibold text-green-600">Marked as PAID IN FULL ✔</div>)}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2"><Button onClick={handleSaveInvoice} disabled={saving}>{saving ? "Saving..." : "Save Invoice"}</Button></div>

      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <Card className="w-full max-w-md shadow-lg border bg-white">
            <CardHeader><CardTitle>Add New Customer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <input className="border rounded p-2 w-full text-sm" placeholder="Customer Name" value={newCustomer.name} onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))} />
              <input className="border rounded p-2 w-full text-sm" placeholder="Phone" value={newCustomer.phone} onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))} />
              <input className="border rounded p-2 w-full text-sm" placeholder="Address" value={newCustomer.address} onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))} />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowCustomerModal(false)}>Cancel</Button>
                <Button size="sm" onClick={saveNewCustomer}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Invoicing;

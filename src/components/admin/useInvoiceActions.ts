// src/components/admin/invoicing/useInvoiceActions.ts
// @ts-nocheck

import { supabase } from "@/integrations/supabase/client";

export const useInvoiceActions = ({
  form,
  items,
  products,
  variants,
  showToast,
  resetFormCompletely,
  onCustomerNameChange,
}) => {
  /* ---------------- STOCK HELPERS ---------------- */
  const getVariantStock = (variantId) => {
    const v = variants.find((x) => x.id === variantId);
    return Number(v?.stock_quantity ?? 0);
  };

  const getTotalProductStock = (productId) =>
    variants
      .filter((v) => v.product_id === productId)
      .reduce((s, v) => s + Number(v.stock_quantity ?? 0), 0);

  const checkStockBeforeSave = () => {
    for (const it of items) {
      if (it.type !== "product" || !it.product_id) continue;

      const qty = Math.floor(it.quantity);

      if (it.variant_id) {
        const avail = getVariantStock(it.variant_id);
        if (avail < qty) {
          showToast(
            "error",
            `Not enough stock for ${it.description}. Available: ${avail}`
          );
          return false;
        }
      } else {
        const avail = getTotalProductStock(it.product_id);
        const p = products.find((x) => x.id === it.product_id);
        if (avail < qty) {
          showToast(
            "error",
            `Not enough stock for ${p?.name}. Available: ${avail}`
          );
          return false;
        }
      }
    }
    return true;
  };

  /* ---------------- SAVE INVOICE ---------------- */
  const saveInvoice = async (setSaving, setSavingOverlay) => {
    if (!form.customer_name?.trim())
      return showToast("error", "Please select a customer");

    if (!items.length)
      return showToast("error", "Add at least one item");

    if (!checkStockBeforeSave()) return;

    setSaving(true);
    setSavingOverlay(true);

    try {
      const subtotal = items.reduce(
        (s, it) => s + it.unit_price * it.quantity,
        0
      );

      const totalDiscount = items.reduce((s, it) => {
        const disc =
          it.discount_amount > 0
            ? it.discount_amount
            : it.discount_percent > 0
            ? it.unit_price * (it.discount_percent / 100)
            : 0;
        return s + disc * it.quantity;
      }, 0);

      const taxable = subtotal - totalDiscount;

      let cgst = 0,
        sgst = 0,
        igst = 0;

      if (form.taxType === "CGST_SGST") {
        cgst = taxable * (form.taxPercent / 200);
        sgst = cgst;
      } else {
        igst = taxable * (form.taxPercent / 100);
      }

      const grandTotal = taxable + cgst + sgst + igst;

      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert([
          {
            invoice_number: "INV-" + Date.now(),
            ...form,
            subtotal,
            total_discount: totalDiscount,
            taxable_amount: taxable,
            cgst,
            sgst,
            igst,
            total_amount: grandTotal,
            grand_total: grandTotal,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      await supabase.from("invoice_items").insert(
        items.map((it) => ({
          invoice_id: invoice.id,
          item_code: it.item_code,
          product_id: it.product_id,
          variant_id: it.variant_id,
          description: it.description,
          hsn_code: it.hsn_code,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount_percent: it.discount_percent,
          discount_amount: it.discount_amount,
          total: it.total,
        }))
      );

      /* INVENTORY DEDUCTION (OLD WORKING LOGIC) */
      for (const it of items) {
        if (it.type !== "product") continue;

        if (it.variant_id) {
          await supabase.rpc("deduct_variant_stock", {
            p_variant_id: it.variant_id,
            p_quantity: Math.floor(it.quantity),
          });
        } else {
          await supabase.rpc("deduct_product_stock", {
            p_product_id: it.product_id,
            p_quantity: Math.floor(it.quantity),
          });
        }
      }

      try {
        onCustomerNameChange(form.customer_name);
      } catch {}

      showToast("success", "Invoice saved");
      resetFormCompletely();
    } catch (e) {
      showToast("error", e?.message || "Failed to save invoice");
    }

    setSaving(false);
    setSavingOverlay(false);
  };

  return { saveInvoice };
};

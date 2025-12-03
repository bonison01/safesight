// src/components/admin/InventoryManagement.tsx
// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/**
 * InventoryManagement (updated)
 *
 * - Combines sales from both `order_items` (online) and `invoice_items` (offline).
 * - Uses product_variants.stock_quantity exclusively for stock math.
 * - Calculates sold units and revenue using product offer_price/price.
 * - Renders a daily revenue bar chart, product table and CSV download.
 *
 * Notes:
 * - You selected Option A (online orders already handle stock deduction).
 * - This component only reads/order-items + invoice-items and shows combined effects.
 */

const formatDate = (d: Date) => d.toISOString().substring(0, 10);

const InventoryManagement: React.FC = () => {
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(formatDate(sevenDaysAgo));
  const [endDate, setEndDate] = useState(formatDate(today));

  const [products, setProducts] = useState<any[]>([]);
  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, any[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // load on mount and on date change
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Run base queries in parallel
      const [
        { data: productRows = [] } = {},
        { data: variantRows = [] } = {},
        { data: onlineSales = [] } = {},
        { data: offlineSales = [] } = {},
      ] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("product_variants").select("*"),
        supabase
          .from("order_items")
          .select("product_id, quantity, created_at")
          .gte("created_at", `${startDate} 00:00:00`)
          .lte("created_at", `${endDate} 23:59:59`),
        supabase
          .from("invoice_items")
          .select("product_id, quantity, created_at")
          .gte("created_at", `${startDate} 00:00:00`)
          .lte("created_at", `${endDate} 23:59:59`),
      ]);

      // Map variants to products
      const vMap: Record<string, any[]> = {};
      (variantRows || []).forEach((v: any) => {
        if (!v || !v.product_id) return;
        if (!vMap[v.product_id]) vMap[v.product_id] = [];
        vMap[v.product_id].push(v);
      });
      setVariantsByProduct(vMap);

      // Variant stock totals per product (only use stock_quantity)
      const variantStockSum: Record<string, number> = {};
      (variantRows || []).forEach((v: any) => {
        if (!v || !v.product_id) return;
        const stock = Number(v.stock_quantity ?? 0);
        variantStockSum[v.product_id] = (variantStockSum[v.product_id] ?? 0) + stock;
      });

      // Build product lookup map
      const productsById: Record<string, any> = {};
      (productRows || []).forEach((p: any) => {
        if (!p || !p.id) return;
        productsById[p.id] = p;
      });

      // Combine sales from both sources
      const salesRows = [
        ...(onlineSales ?? []),
        ...(offlineSales ?? []),
      ];

      // Aggregations
      const soldByProduct: Record<string, number> = {};
      const daily: Record<string, { date: string; revenue: number; units: number }> = {};

      (salesRows || []).forEach((s: any) => {
        if (!s) return;
        const pid = s.product_id;
        const qty = Number(s.quantity ?? 0);
        if (!pid || !qty) return;

        // sold per product
        soldByProduct[pid] = (soldByProduct[pid] ?? 0) + qty;

        // daily aggregation
        const day = (s.created_at || "").substring(0, 10) || new Date().toISOString().substring(0, 10);
        if (!daily[day]) daily[day] = { date: day, revenue: 0, units: 0 };
        daily[day].units += qty;

        // revenue uses product price (offer_price preferred)
        const prod = productsById[pid];
        const unitPrice = Number(prod?.offer_price ?? prod?.price ?? 0);
        daily[day].revenue += qty * unitPrice;
      });

      const dailyList = Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
      setDailyData(dailyList);

      // Build final products list with stats
      const productsWithStats = (productRows || []).map((p: any) => {
        const variantTotal = variantStockSum[p.id] ?? 0;
        const soldQty = soldByProduct[p.id] ?? 0;
        const unitPrice = Number(p.offer_price ?? p.price ?? 0);
        const revenue = soldQty * unitPrice;

        return {
          ...p,
          variant_total: variantTotal,
          sold_units: soldQty,
          revenue,
          unit_price_used: unitPrice,
          available_stock: variantTotal - soldQty,
        };
      });

      setProducts(productsWithStats);
    } catch (err) {
      console.error("Failed to load inventory data", err);
      alert("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = useMemo(
    () => products.reduce((sum, p) => sum + (Number(p.revenue) || 0), 0),
    [products]
  );
  const totalUnits = useMemo(
    () => products.reduce((sum, p) => sum + (Number(p.sold_units) || 0), 0),
    [products]
  );

  const handleToggleExpand = (productId: string) => {
    setExpanded((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleDownloadCsv = () => {
    const headers = [
      "Product Name",
      "Unit Price Used",
      "Total Sold Units",
      "Total Revenue",
      "Available Stock",
      "Date From",
      "Date To",
    ];

    const rows = products.map((p) => [
      `"${(p.name || "").replace(/"/g, '""')}"`,
      p.unit_price_used ?? 0,
      p.sold_units ?? 0,
      p.revenue ?? 0,
      p.available_stock ?? 0,
      startDate,
      endDate,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sales_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory & Sales</h2>
          <p className="text-sm text-gray-600">
            Combined sales from online orders (order_items) and offline invoices (invoice_items).
          </p>
        </div>

        <Button onClick={handleDownloadCsv} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>

      {/* Date range filter */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="ml-auto flex gap-6 text-sm">
            <div>
              <div className="text-xs text-gray-500">Total Units Sold</div>
              <div className="text-lg font-semibold">{totalUnits}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Revenue</div>
              <div className="text-lg font-semibold">₹{totalRevenue.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales graph */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Revenue (₹) by Day</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 280 }}>
          {dailyData.length === 0 ? (
            <div className="text-sm text-gray-500">No sales found for this date range.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: any) => `₹${Number(value).toFixed(2)}`} />
                <Bar dataKey="revenue" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Product inventory */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory by Product & Variants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-t">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-left">Variant Stock Sum</th>
                    <th className="p-2 text-left">Sold (range)</th>
                    <th className="p-2 text-left">Available</th>
                    <th className="p-2 text-left">Price (₹)</th>
                    <th className="p-2 text-left">Revenue (₹)</th>
                    <th className="p-2 text-left">Variants</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <React.Fragment key={p.id}>
                      <tr className="border-b">
                        <td className="p-2 font-medium">{p.name}</td>
                        <td className="p-2">{p.variant_total}</td>
                        <td className="p-2 text-red-600">{p.sold_units}</td>
                        <td className="p-2 text-green-700">{p.available_stock}</td>
                        <td className="p-2 font-semibold">₹{p.unit_price_used}</td>
                        <td className="p-2">₹{Number(p.revenue || 0).toFixed(2)}</td>
                        <td className="p-2">
                          {variantsByProduct[p.id]?.length ? (
                            <button
                              className="text-blue-600 underline text-xs"
                              onClick={() => handleToggleExpand(p.id)}
                            >
                              {expanded[p.id] ? "Hide" : "View"} ({variantsByProduct[p.id].length})
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>

                      {expanded[p.id] && variantsByProduct[p.id] && (
                        <tr className="bg-gray-50 border-b">
                          <td colSpan={7} className="p-0">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-100 border-b">
                                <tr>
                                  <th className="p-2 text-left">Color</th>
                                  <th className="p-2 text-left">Size</th>
                                  <th className="p-2 text-left">Stock</th>
                                  <th className="p-2 text-left">Price</th>
                                </tr>
                              </thead>
                              <tbody>
                                {variantsByProduct[p.id].map((v) => (
                                  <tr key={v.id} className="border-b">
                                    <td className="p-2">{v.color}</td>
                                    <td className="p-2">{v.size}</td>
                                    <td className="p-2">{Number(v.stock_quantity ?? 0)}</td>
                                    <td className="p-2 text-gray-500 italic">(uses product price)</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}

                  {products.length === 0 && (
                    <tr>
                      <td className="p-4 text-center text-gray-500" colSpan={7}>
                        No products found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryManagement;

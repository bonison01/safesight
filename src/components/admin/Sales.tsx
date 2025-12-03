// src/components/admin/Sales.tsx
// @ts-nocheck

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const formatDate = (d: Date) => d.toISOString().substring(0, 10);

const Sales = () => {
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(formatDate(sevenDaysAgo));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [sales, setSales] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);

  useEffect(() => {
    loadSales();
  }, [startDate, endDate]);

  const loadSales = async () => {
    const { data: rows, error } = await supabase
      .from("order_items")
      .select(
        "id, product_id, quantity, created_at, products(name, price, offer_price)"
      )
      .gte("created_at", `${startDate} 00:00:00`)
      .lte("created_at", `${endDate} 23:59:59`);

    if (error) {
      console.error("Sales fetch error:", error);
      setSales([]);
      setDailyData([]);
      return;
    }

    const salesWithPrice = (rows || []).map((row: any) => {
      const unitPrice = Number(
        row.products?.offer_price ?? row.products?.price ?? 0
      );
      const total = unitPrice * Number(row.quantity ?? 0);
      return {
        ...row,
        unitPrice,
        total,
      };
    });

    setSales(salesWithPrice);

    const byDay: Record<string, { date: string; units: number; revenue: number }> =
      {};
    salesWithPrice.forEach((s) => {
      const day = (s.created_at || "").substring(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, units: 0, revenue: 0 };
      byDay[day].units += Number(s.quantity ?? 0);
      byDay[day].revenue += s.total;
    });

    const daily = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
    setDailyData(daily);
  };

  const totalUnits = useMemo(
    () => sales.reduce((sum, s) => sum + Number(s.quantity ?? 0), 0),
    [sales]
  );
  const totalRevenue = useMemo(
    () => sales.reduce((sum, s) => sum + Number(s.total ?? 0), 0),
    [sales]
  );

  const handleDownloadCsv = () => {
    const headers = [
      "Date",
      "Product",
      "Quantity",
      "Unit Price",
      "Total",
      "Start Date",
      "End Date",
    ];
    const rows = sales.map((s) => [
      (s.created_at || "").substring(0, 10),
      `"${s.products?.name ?? ""}"`,
      s.quantity ?? 0,
      s.unitPrice ?? 0,
      s.total ?? 0,
      startDate,
      endDate,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `sales_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-4 items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales</h2>
          <p className="text-sm text-gray-600">
            Orders by product within a given date range.
          </p>
        </div>
        <Button onClick={handleDownloadCsv} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-4 py-4 items-center">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              className="border rounded px-2 py-1 text-sm"
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              className="border rounded px-2 py-1 text-sm"
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="ml-auto flex gap-6 text-sm">
            <div>
              <div className="text-xs text-gray-500">Total Units</div>
              <div className="text-lg font-semibold">{totalUnits}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Revenue</div>
              <div className="text-lg font-semibold">
                ₹{totalRevenue.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue (₹)</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 280 }}>
          {dailyData.length === 0 ? (
            <div className="text-sm text-gray-500">
              No sales in this date range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sales Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-t">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Product</th>
                  <th className="p-2 text-left">Qty</th>
                  <th className="p-2 text-left">Unit Price (₹)</th>
                  <th className="p-2 text-left">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-2">
                      {(s.created_at || "").substring(0, 10)}
                    </td>
                    <td className="p-2">{s.products?.name ?? "-"}</td>
                    <td className="p-2">{s.quantity ?? 0}</td>
                    <td className="p-2">{s.unitPrice ?? 0}</td>
                    <td className="p-2">{s.total ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Sales;

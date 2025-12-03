import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Row {
  day: string;
  total_orders: number;
  total_revenue: number;
}

const Reports = () => {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: orders } = await supabase.from('orders').select('id, total_amount, created_at');

    const daily: Record<string, { revenue: number; count: number }> = {};

    orders?.forEach((o) => {
      const d = o.created_at.substring(0, 10);
      if (!daily[d]) daily[d] = { revenue: 0, count: 0 };
      daily[d].revenue += Number(o.total_amount ?? 0);
      daily[d].count += 1;
    });

    const result = Object.entries(daily).map(([day, v]) => ({
      day,
      total_orders: v.count,
      total_revenue: v.revenue,
    }));

    setRows(result);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Reports</h2>

      <table className="min-w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Date</th>
            <th className="p-2">Orders</th>
            <th className="p-2">Sales (₹)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day} className="border-b">
              <td className="p-2">{r.day}</td>
              <td className="p-2">{r.total_orders}</td>
              <td className="p-2">₹{r.total_revenue.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Reports;

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { mockApi } from "../utils/mockApi";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";

export default function TweetAnalytics() {
  const [data, setData] = useState([]);

  useEffect(() => { mockApi.analyticsSnapshot().then(setData); }, []);

  const chartData = data.map(d => ({
    day: format(parseISO(d.date), "MMM d"),
    impressions: d.impressions,
    engagementRate: d.engagementRate,
  }));

  return (
    <div className="bg-white rounded-xl p-4 border shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Analytics</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="impressions" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="engagementRate" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

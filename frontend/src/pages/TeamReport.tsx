import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/api';

type MemberRow = {
  email: string;
  name: string;
  entries: number;
  totalHours: number;
  avgHoursPerEntry: number;
};

type PodBlock = {
  podName: string;
  podTotalHours: number;
  memberCount: number;
  members: MemberRow[];
};

const TeamReport: React.FC<any> = () => {
  const [pods, setPods] = useState<PodBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        const qs = params.toString();
        const res = await fetchWithAuth(`/api/team-report${qs ? `?${qs}` : ''}`);
        if (!res.ok) throw new Error('Failed');
        const js = await res.json();
        setPods(Array.isArray(js.data) ? js.data : []);
      } catch (err) {
        console.error(err);
        setPods([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [startDate, endDate]);

  return (
    <div>
      <h2 className="text-2xl font-black mb-2">POD Resource Report</h2>
      <p className="text-sm text-gray-500 mb-6">
        Hours and activity counts from the daily tracker, grouped by POD and team member (respects your access level).
      </p>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
        <div>
          <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200"
          />
        </div>
        <div>
          <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200"
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-6">Leave both dates empty to view all available data.</p>

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : pods.length === 0 ? (
        <div className="text-gray-500 bg-white rounded-2xl p-8 border shadow-sm">No data for this range.</div>
      ) : (
        <div className="space-y-8">
          {pods.map((pod) => (
            <div key={pod.podName} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-gray-50/80">
                <div>
                  <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">POD</div>
                  <div className="text-xl font-black text-gray-900">{pod.podName}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {pod.memberCount} team member{pod.memberCount === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">POD total hours</div>
                  <div className="text-2xl font-black text-purple-700">{pod.podTotalHours}h</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3 text-right">Entries</th>
                      <th className="px-6 py-3 text-right">Total hours</th>
                      <th className="px-6 py-3 text-right">Avg / entry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pod.members.map((m) => (
                      <tr key={`${pod.podName}-${m.email}`} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-6 py-3 font-bold text-gray-900">{m.name}</td>
                        <td className="px-6 py-3 text-gray-500">{m.email}</td>
                        <td className="px-6 py-3 text-right tabular-nums">{m.entries}</td>
                        <td className="px-6 py-3 text-right font-black tabular-nums">{m.totalHours}h</td>
                        <td className="px-6 py-3 text-right text-gray-600 tabular-nums">{m.avgHoursPerEntry}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamReport;

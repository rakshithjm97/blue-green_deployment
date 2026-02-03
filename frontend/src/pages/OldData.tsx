import React, { useEffect, useMemo, useState } from "react";
import { PerfRecord } from "../types";
import { fetchWithAuth } from "../utils/api";

type Filters = {
  product: string;
  project: string;
  nature: string;
  task: string;
  pod: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
};

const OldData: React.FC<any> = ({ currentUser, onEdit }) => {
  const [data, setData] = useState<PerfRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<Filters>({
    product: "",
    project: "",
    nature: "",
    task: "",
    pod: "",
    fromDate: "",
    toDate: "",
  });

  useEffect(() => {
    const fetchOldData = async () => {
      setLoading(true);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("access_token")
            : null;

        if (!token) {
          console.error("No auth token found");
          setData([]);
          return;
        }

        // Request: scope to current user for non-admins so regular users don't see other people's entries
        let url = `/api/daily_activity`;
        const nonAdminRoles = ['Admin', 'Internal Admin'];
        if (!nonAdminRoles.includes(currentUser?.role || '')) {
          const qs = new URLSearchParams();
          if (currentUser?.email) qs.append('email', currentUser.email);
          const q = qs.toString();
          if (q) url = url + `?${q}`;
        }

        const res = await fetchWithAuth(url);
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`API error ${res.status}:`, errorText);
          setData([]);
          return;
        }

        const result = await res.json();
        setData(result?.data || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOldData();
  }, [currentUser]);

  const normalizeDate = (iso?: string) => {
    if (!iso) return "";
    // expects ISO like 2026-01-30T...
    return iso.split("T")[0] || "";
  };

  const uniqueProducts = useMemo(
    () => [...new Set(data.map((i) => i.product).filter(Boolean))].sort(),
    [data]
  );
  const uniqueProjects = useMemo(
    () => [...new Set(data.map((i) => i.projectName).filter(Boolean))].sort(),
    [data]
  );
  const uniquePods = useMemo(
    () => [...new Set(data.map((i) => i.podName).filter(Boolean))].sort(),
    [data]
  );
  const uniqueNatures = useMemo(
    () => [...new Set(data.map((i) => i.natureOfWork).filter(Boolean))].sort(),
    [data]
  );
  const uniqueTasks = useMemo(
    () => [...new Set(data.map((i) => i.task).filter(Boolean))].sort(),
    [data]
  );

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // dropdowns => exact match (better UX)
      if (filters.product && item.product !== filters.product) return false;
      if (filters.project && item.projectName !== filters.project) return false;
      if (filters.pod && item.podName !== filters.pod) return false;
      if (filters.nature && item.natureOfWork !== filters.nature) return false;
      if (filters.task && item.task !== filters.task) return false;

      const itemDate = normalizeDate(item.submittedAt);

      if (filters.fromDate && itemDate && itemDate < filters.fromDate) return false;
      if (filters.toDate && itemDate && itemDate > filters.toDate) return false;

      return true;
    });
  }, [data, filters]);

  // If any filter is active (including date range), show the full filtered set.
  // Otherwise, show only the first 50 rows for performance/UX.
  const hasActiveFilters = useMemo(() => {
    return Boolean(
      filters.product ||
      filters.project ||
      filters.nature ||
      filters.task ||
      filters.pod ||
      filters.fromDate ||
      filters.toDate
    );
  }, [filters]);

  const displayedData = useMemo(() => {
    if (hasActiveFilters) return filteredData;
    return filteredData.slice(0, 50);
  }, [filteredData, hasActiveFilters]);

  const clearFilters = () =>
    setFilters({
      product: "",
      project: "",
      nature: "",
      task: "",
      pod: "",
      fromDate: "",
      toDate: "",
    });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-6 py-6 border-b bg-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-black text-gray-900">Old Data</h2>

          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-bold hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-7 gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-600 mb-2 uppercase">
              From Date
            </label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              className="px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-600 mb-2 uppercase">
              To Date
            </label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-600 mb-2 uppercase">
              Product
            </label>
            <select
              value={filters.product}
              onChange={(e) => setFilters({ ...filters, product: e.target.value })}
              className="px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Products</option>
              {uniqueProducts.map((p) => (
                <option key={p as string} value={p as string}>
                  {p as string}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-600 mb-2 uppercase">
              Project
            </label>
            <select
              value={filters.project}
              onChange={(e) => setFilters({ ...filters, project: e.target.value })}
              className="px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Projects</option>
              {uniqueProjects.map((p) => (
                <option key={p as string} value={p as string}>
                  {p as string}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-600 mb-2 uppercase">
              POD
            </label>
            <select
              value={filters.pod}
              onChange={(e) => setFilters({ ...filters, pod: e.target.value })}
              className="px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All PODs</option>
              {uniquePods.map((p) => (
                <option key={p as string} value={p as string}>
                  {p as string}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-600 mb-2 uppercase">
              Nature
            </label>
            <select
              value={filters.nature}
              onChange={(e) => setFilters({ ...filters, nature: e.target.value })}
              className="px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All</option>
              {uniqueNatures.map((n) => (
                <option key={n as string} value={n as string}>
                  {n as string}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-600 mb-2 uppercase">
              Task
            </label>
            <select
              value={filters.task}
              onChange={(e) => setFilters({ ...filters, task: e.target.value })}
              className="px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All</option>
              {uniqueTasks.map((t) => (
                <option key={t as string} value={t as string}>
                  {t as string}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden bg-white flex flex-col border-t border-gray-300">
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-50">
              <tr className="bg-blue-500">
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-white whitespace-nowrap">Row</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-white whitespace-nowrap min-w-[140px]">Start Time</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-white whitespace-nowrap min-w-[140px]">Completion Time</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-white whitespace-nowrap min-w-[180px]">Email</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-white whitespace-nowrap min-w-[150px]">Name</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-white whitespace-nowrap min-w-[160px]">Mode Of Functioning</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-white whitespace-nowrap min-w-[160px]">Project Name</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-white whitespace-nowrap min-w-[140px]">Nature Of Work</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-white whitespace-nowrap min-w-[120px]">Task</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-white whitespace-nowrap min-w-[100px]">POD</th>
                <th className="border border-gray-400 px-3 py-2 text-center font-bold text-white whitespace-nowrap min-w-[80px]">Hours</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-bold text-white whitespace-nowrap min-w-[150px]">Remarks</th>
                {(currentUser?.role === "Admin" || currentUser?.role === "Internal Admin") && (
                  <th className="border border-gray-400 px-3 py-2 text-center font-bold text-white whitespace-nowrap min-w-[80px]">
                    Action
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={(currentUser?.role === "Admin" || currentUser?.role === "Internal Admin") ? 13 : 12}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Loading data...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={(currentUser?.role === "Admin" || currentUser?.role === "Internal Admin") ? 13 : 12}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    <div>
                      <p className="font-medium">No data found</p>
                      {!currentUser?.email && (
                        <p className="text-xs mt-1 text-red-500">
                          Please log in to view data
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedData.map((item: any, idx: number) => {
                  const submittedAt = item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "-";
                  const key = item.id || `${item.email}-${item.submittedAt}-${idx}`;

                  return (
                    <tr
                      key={key}
                      className={`border-b border-gray-300 hover:bg-blue-100 transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-blue-50"
                      }`}
                    >
                      <td className="border border-gray-300 px-3 py-2 text-gray-800 whitespace-nowrap font-medium">
                        {idx + 1}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-700 whitespace-nowrap">
                        {submittedAt}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-700 whitespace-nowrap">
                        -
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-700">
                        {item.email || "-"}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-700">
                        {item.name || "-"}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-700">
                        {item.modeOfFunctioning || "-"}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-700">
                        {item.projectName || "-"}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-700">
                        {item.natureOfWork || "-"}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-700">
                        {item.task || "-"}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-700 font-medium">
                        {item.podName || "-"}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-800">
                        {Number(item.dedicatedHours || 0)}
                      </td>
                      <td
                        className="border border-gray-300 px-3 py-2 text-gray-700 truncate"
                        title={item.remarks || ""}
                      >
                        {item.remarks || "-"}
                      </td>
                      {(currentUser?.role === "Admin" || currentUser?.role === "Internal Admin") && (
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <button
                            onClick={() => onEdit(item)}
                            className="px-2 py-1 rounded bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition"
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OldData;

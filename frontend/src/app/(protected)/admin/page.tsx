"use client";

import { useEffect, useState } from "react";
import { FaCrown, FaSearch, FaChevronLeft, FaChevronRight, FaChartLine, FaServer, FaMapMarkerAlt, FaUsers, FaEdit } from "react-icons/fa";
import ReactECharts from "echarts-for-react";

type User = {
  id: number;
  username: string;
  email: string;
  name: string | null;
  is_active: boolean;
  is_staff: boolean;
  rate_limit: string;
  uuid: string;
  homepage: string | null;
};

type UsageDay = { day: string; count: number };
type UsageUser = { username: string; count: number };
type UsageEndpoint = Record<string, number>;

type OverviewMetrics = {
  total_requests: number;
  unique_users_count: number;
  unique_endpoints_count: number;
  application_scope_count: number;
};

type UsageData = UsageDay[] | UsageUser[] | UsageEndpoint | OverviewMetrics | any;

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"users" | "analytics">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showRateModal, setShowBlockRateModal] = useState(false);
  const [rateValue, setRateValue] = useState<number>(10);
  const [rateUnit, setRateUnit] = useState<"s" | "m" | "d">("s");

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [groupBy, setGroupBy] = useState<"endpoint" | "day" | "user" | "">("");
  const [endpointFilter, setEndpointFilter] = useState<string>("");
  const [appFilter, setAppFilter] = useState<string>("");

  useEffect(() => {
    async function verifyAdminRole() {
      try {
        const meRes = await fetch("/api/me");
        if (!meRes.ok) {
          window.location.href = "/";
          return;
        }
        const meData = await meRes.json();
        if (!meData.is_staff && !meData.is_superuser) {
          window.location.href = "/";
          return;
        }
        setIsAuthorized(true);
        fetchUsers();
      } catch (err) {
        window.location.href = "/";
      }
    }
    verifyAdminRole();

    const determineTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    determineTheme();

    const observer = new MutationObserver(determineTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (activeTab === "analytics" && isAuthorized) {
      fetchUsage();
    }
  }, [activeTab, startDate, groupBy, appFilter, endpointFilter, isAuthorized]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/log/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsage = async () => {
    try {
      const params = new URLSearchParams({
        start: startDate,
        group_by: groupBy,
      });
      if (endpointFilter) params.append("endpoint", endpointFilter);
      if (appFilter) params.append("app", appFilter);

      const res = await fetch(`/api/log/usage?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsageData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openBlockConfirmation = (user: User) => {
    setSelectedUser(user);
    setShowBlockModal(true);
  };

  const openRateLimitModal = (user: User) => {
    setSelectedUser(user);
    const [val, unit] = user.rate_limit.split("/");
    setRateValue(parseInt(val) || 10);
    setRateUnit((unit as "s" | "m" | "d") || "s");
    setShowBlockRateModal(true);
  };

  const handleUpdateUserStatus = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/log/users/${selectedUser.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !selectedUser.is_active }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? { ...u, is_active: updated.is_active } : u))
        );
        setShowBlockModal(false);
        setSelectedUser(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRateLimit = async () => {
    if (!selectedUser) return;
    try {
      const formattedLimit = `${rateValue}/${rateUnit}`;
      const res = await fetch(`/api/log/users/${selectedUser.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate_limit: formattedLimit }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? { ...u, rate_limit: updated.rate_limit } : u))
        );
        setShowBlockRateModal(false);
        setSelectedUser(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      (user.name && user.name.toLowerCase().includes(query)) ||
      (user.email && user.email.toLowerCase().includes(query))
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex items-center justify-center text-sm font-semibold text-slate-400">
        Loading context configuration...
      </div>
    );
  }

  const themeColors = {
    text: isDarkMode ? "#f8fafc" : "#0f172a",
    subText: isDarkMode ? "#94a3b8" : "#64748b",
    line: isDarkMode ? "#334155" : "#e2e8f0",
    primary: "#3b82f6",
    secondary: "#10b981",
    accent: "#f59e0b",
  };

  const getOverviewTimelineOption = () => {
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "line" } },
      grid: { left: "4%", right: "4%", bottom: "10%", top: "12%", containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: usageData && groupBy === "day" && Array.isArray(usageData) ? usageData.map((d: any) => d.day) : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        axisLine: { lineStyle: { color: themeColors.line } },
        axisLabel: { color: themeColors.subText }
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisLabel: { color: themeColors.subText },
        splitLine: { lineStyle: { color: themeColors.line } }
      },
      series: [
        {
          name: "API Requests",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: usageData && groupBy === "day" && Array.isArray(usageData) ? usageData.map((d: any) => d.count) : [120, 132, 101, 134, 90, 230, 210],
          itemStyle: { color: themeColors.primary },
          lineStyle: { width: 3.5 },
          areaStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(59, 130, 246, 0.24)" },
                { offset: 1, color: "rgba(59, 130, 246, 0)" }
              ]
            }
          }
        }
      ]
    };
  };

  const getOverviewDistributionOption = () => {
    let rawData: { name: string; value: number }[] = [];
    if (usageData) {
      if (groupBy === "endpoint" && !Array.isArray(usageData)) {
        rawData = Object.entries(usageData).map(([k, v]) => ({ name: k, value: v as number }));
      } else if (groupBy === "user" && Array.isArray(usageData)) {
        rawData = usageData.map((u: any) => ({ name: u.username || "Anonymous", value: u.count }));
      }
    }

    if (rawData.length === 0) {
      rawData = [
        { value: 1048, name: "Datastore" },
        { value: 735, name: "Users Base" },
        { value: 580, name: "Analytics" },
        { value: 484, name: "Auth Token Gateway" }
      ];
    }

    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "item" },
      legend: { bottom: "0%", left: "center", textStyle: { color: themeColors.subText } },
      series: [
        {
          name: "Share Metrics",
          type: "pie",
          radius: ["45%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 8, borderColor: isDarkMode ? "#020617" : "#ffffff", borderWidth: 2 },
          label: { show: false, position: "center" },
          emphasis: { label: { show: true, fontSize: 16, fontWeight: "bold", color: themeColors.text } },
          labelLine: { show: false },
          data: rawData.slice(0, 7),
          color: [themeColors.primary, themeColors.secondary, themeColors.accent, "#8b5cf6", "#ec4899", "#38bdf8", "#a855f7"]
        }
      ]
    };
  };

  const overviewMetrics: OverviewMetrics = groupBy === "" && usageData && !Array.isArray(usageData)
    ? (usageData as OverviewMetrics)
    : { total_requests: 0, unique_users_count: 0, unique_endpoints_count: 0, application_scope_count: 0 };

  return (
    <div className="min-h-screen bg-slate-50/50 p-8 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 dark:border-slate-800 pb-5 gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Admin Control Panel</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage system configurations, adjust user scopes, and view API metrics.</p>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/60 self-start">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "users"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "analytics"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
            >
              API Analytics
            </button>
          </div>
        </div>

        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
              <div className="w-full max-w-md relative">
                <input
                  type="text"
                  placeholder="Search by username, name, or email..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-950 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="absolute left-3 top-3 text-slate-400 dark:text-slate-600">
                  <FaSearch className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Found {filteredUsers.length} users
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 tracking-wider text-xs uppercase">Username</th>
                      <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 tracking-wider text-xs uppercase">Email Address</th>
                      <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 tracking-wider text-xs uppercase">Rate Limit</th>
                      <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 tracking-wider text-xs uppercase">Status</th>
                      <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 tracking-wider text-xs uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                    {displayedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                            <span>{user.username}</span>
                            {user.is_staff && (
                              <FaCrown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 animate-pulse" />
                            )}
                          </div>
                          {user.name && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{user.name}</div>}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          {user.email || <span className="text-slate-300 dark:text-slate-600 italic">No email linked</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700/40">
                              {user.rate_limit}
                            </span>
                            {!user.is_staff && (
                              <button
                                onClick={() => openRateLimitModal(user)}
                                className="p-1 text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-colors"
                              >
                                <FaEdit className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${user.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40"
                              : "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40"
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />
                            {user.is_active ? "Active" : "Blocked"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openBlockConfirmation(user)}
                            disabled={user.is_staff}
                            className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${user.is_active
                              ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
                              : "border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-900/50 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                              }`}
                          >
                            {user.is_active ? "Block User" : "Unblock User"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {displayedUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-sm text-slate-400 dark:text-slate-500 italic">
                          No users found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 px-6 py-4 bg-slate-50/30 dark:bg-slate-800/10">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Showing <span className="font-medium text-slate-700 dark:text-slate-300">{startIndex + 1}</span> to{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {Math.min(startIndex + itemsPerPage, filteredUsers.length)}
                    </span>{" "}
                    of <span className="font-medium text-slate-700 dark:text-slate-300">{filteredUsers.length}</span> users
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1.5 justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold shadow-sm transition-all text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <FaChevronLeft className="h-2.5 w-2.5" />
                      <span>Previous</span>
                    </button>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center gap-1.5 justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold shadow-sm transition-all text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>Next</span>
                      <FaChevronRight className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Group By</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as any)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Overview</option>
                  <option value="user">User Requests</option>
                  <option value="day">Daily Activity</option>
                  <option value="endpoint">Endpoints</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Filter Endpoint</label>
                <input
                  type="text"
                  placeholder="e.g. /api/datastore/"
                  value={endpointFilter}
                  onChange={(e) => setEndpointFilter(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Application Scope</label>
                <select
                  value={appFilter}
                  onChange={(e) => setAppFilter(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">All Scopes</option>
                  <option value="datastore">Datastore</option>
                </select>
              </div>
            </div>

            {groupBy === "" ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                      <FaChartLine className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Total Volume</div>
                      <div className="text-xl font-bold mt-0.5">{overviewMetrics.total_requests.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                      <FaServer className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Active Endpoints</div>
                      <div className="text-xl font-bold mt-0.5">{overviewMetrics.unique_endpoints_count}</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
                      <FaMapMarkerAlt className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Gateway Apps</div>
                      <div className="text-xl font-bold mt-0.5">{overviewMetrics.application_scope_count}</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg">
                      <FaUsers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Active Consumers</div>
                      <div className="text-xl font-bold mt-0.5">{overviewMetrics.unique_users_count}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Request Traffic Timeline</h3>
                    <div className="h-80 w-full">
                      <ReactECharts option={getOverviewTimelineOption()} style={{ height: "100%", width: "100%" }} />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Traffic Volume Share</h3>
                    <div className="h-80 w-full">
                      <ReactECharts option={getOverviewDistributionOption()} style={{ height: "100%", width: "100%" }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Metrics Stream Breakdown</h2>
                </div>

                <div className="p-6">
                  {usageData && groupBy === "user" && Array.isArray(usageData) && (
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-medium">
                          <th className="pb-3">Username</th>
                          <th className="pb-3 text-right">Request Volume</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {(usageData as UsageUser[]).map((row, index) => (
                          <tr key={index} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                            <td className="py-3.5 font-medium text-slate-900 dark:text-white">{row.username || "Anonymous"}</td>
                            <td className="py-3.5 text-right font-mono font-semibold text-slate-900 dark:text-white">{row.count.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {usageData && groupBy === "day" && Array.isArray(usageData) && (
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-medium">
                          <th className="pb-3">Timeline Date</th>
                          <th className="pb-3 text-right">Total Hits</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {(usageData as UsageDay[]).map((row, index) => (
                          <tr key={index} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                            <td className="py-3.5 font-mono text-slate-900 dark:text-white">{row.day}</td>
                            <td className="py-3.5 text-right font-mono font-semibold text-slate-900 dark:text-white">{row.count.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {usageData && groupBy === "endpoint" && !Array.isArray(usageData) && (
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-medium">
                          <th className="pb-3">Registered Gateway Endpoint</th>
                          <th className="pb-3 text-right">Access Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {Object.entries(usageData as UsageEndpoint).map(([endpoint, count]) => (
                          <tr key={endpoint} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                            <td className="py-3.5 font-mono text-xs text-blue-600 dark:text-blue-400">{endpoint}</td>
                            <td className="py-3.5 text-right font-mono font-semibold text-slate-900 dark:text-white">{count.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showBlockModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedUser.is_active ? "Block User Account?" : "Unblock User Account?"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to change the access profile status for <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedUser.username}</span>?
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <button
                onClick={() => { setShowBlockModal(false); setSelectedUser(null); }}
                className="rounded-lg border px-4 py-2 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUserStatus}
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm ${selectedUser.is_active
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {showRateModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Modify Rate Limit</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Set custom request metrics constraint settings for <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedUser.username}</span>.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Max Requests</label>
                <input
                  type="number"
                  min={1}
                  value={rateValue}
                  onChange={(e) => setRateValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Time Windows</label>
                <select
                  value={rateUnit}
                  onChange={(e) => setRateUnit(e.target.value as any)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950 focus:outline-none"
                >
                  <option value="s">Second</option>
                  <option value="m">Minute</option>
                  <option value="d">Day</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
              <button
                onClick={() => { setShowBlockRateModal(false); setSelectedUser(null); }}
                className="rounded-lg border px-4 py-2 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRateLimit}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Apply Constraints
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

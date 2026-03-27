import type { FC } from "react";
import { useState } from "react";
import StatCard from "@/components/gym/StatCard";
import BarChart from "@/components/gym/BarChart";
import QRPattern from "@/components/gym/QRPattern";
import { PlanBadge, StatusBadge } from "@/components/gym/BadgeVariants";
import { SCANS } from "@/components/gym/mock-data";
import { ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";

const hourlyData = [
  { label: "6am", h: 28 }, { label: "7am", h: 60 }, { label: "8am", h: 88, today: true },
  { label: "9am", h: 72 }, { label: "10am", h: 42 }, { label: "11am", h: 30 },
  { label: "12pm", h: 18 }, { label: "5pm", h: 75 }, { label: "6pm", h: 95, today: true },
  { label: "7pm", h: 68 }, { label: "8pm", h: 38 },
];

const steps = [
  { n: "1", title: "Member pays FitPal",    sub: "Pro/Elite plan on the app. You never handle payment." },
  { n: "2", title: "Platform grants access", sub: "Pass marked valid for gyms matching the plan tier." },
  { n: "3", title: "Member scans your QR",  sub: "Open FitPal → tap Check-in → scan your door QR." },
  { n: "4", title: "Platform validates",    sub: "Checks: valid pass? correct tier? not expired?" },
  { n: "5", title: "Logged to you",         sub: "Check-in appears here: name, plan, time, result." },
];

const card = "rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5";

const ITEMS_PER_PAGE = 8;

const GymQRPage: FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter scans
  const filteredScans = SCANS.filter(scan => {
    const matchesStatus = filterStatus === "all" || scan.result === filterStatus;
    const matchesPlan = filterPlan === "all" || scan.plan === filterPlan;
    const matchesSearch = searchQuery === "" || 
      scan.member.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPlan && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredScans.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedScans = filteredScans.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Stats from filtered data
  const successfulScans = filteredScans.filter(s => s.result === "Success").length;
  const failedScans = filteredScans.filter(s => s.result === "Failed").length;
  const deniedScans = filteredScans.filter(s => s.result === "Denied").length;

  return (
  <div className="max-w-[1600px] animate-fade-in">
    {/* Header */}
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">
          QR and <span className="text-gradient-fire">Check-Ins</span>
        </h1>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
          Member Access Management
        </p>
      </div>
      <div className="flex gap-2">
        <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Download QR</button>
        <button className="rounded-lg bg-orange-500 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-[0_3px_14px_rgba(249,115,22,0.22)] hover:bg-orange-600">Regenerate QR</button>
      </div>
    </div>

    {/* 5-Step Flow */}
    <div className={`${card} mb-4`}>
      <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">How Member Access Works</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {steps.map((s, i, arr) => (
          <div key={i} className="flex min-w-[130px] flex-1 items-stretch">
            <div className="flex-1 rounded-xl border border-orange-500/[0.08] bg-orange-500/[0.03] p-3">
              <div className="mb-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-orange-500">Step {s.n}</div>
              <div className="mb-1 text-xs font-bold">{s.title}</div>
              <div className="text-[10px] leading-relaxed text-zinc-600">{s.sub}</div>
            </div>
            {i < arr.length - 1 && <div className="flex flex-shrink-0 items-center px-0.5 text-sm text-zinc-600">›</div>}
          </div>
        ))}
      </div>
    </div>

    {/* Stats */}
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Total Scans" value={filteredScans.length.toString()} accent />
      <StatCard label="Successful" value={successfulScans.toString()} sub={`${((successfulScans/filteredScans.length)*100).toFixed(1)}%`} up />
      <StatCard label="Failed" value={failedScans.toString()} sub="badge errors" down={failedScans > 0} />
      <StatCard label="Denied" value={deniedScans.toString()} sub="access denied" down={deniedScans > 0} />
    </div>

    {/* QR + Hourly Chart */}
    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Active QR Code</p>
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex h-[130px] w-[130px] items-center justify-center rounded-2xl border-[1.5px] border-dashed border-orange-500/30 bg-white/[0.03]">
            <QRPattern />
          </div>
          <div className="text-center">
            <div className="mb-1 text-xs font-bold">FitZone Kathmandu</div>
            <div className="mb-2.5 text-[10px] text-zinc-600">Regenerated today 06:00 AM</div>
            <span className="inline-flex items-center gap-1 rounded-full border border-green-400/20 bg-green-400/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-green-400">● Active</span>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Print</button>
            <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Download</button>
            <button className="rounded-lg border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-red-400 hover:bg-red-400/20">Deactivate</button>
          </div>
        </div>
      </div>
      <div className={card}>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Entry by Hour</p>
        <BarChart data={hourlyData} />
        <div className="mt-2.5 text-[10px] text-zinc-600">Peak: <strong className="text-orange-500">8–9 AM &amp; 6–7 PM</strong></div>
      </div>
    </div>

    {/* Scan Log Table */}
    <div className={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.13em] text-orange-500">Recent Scan Log</p>
          <p className="mt-0.5 text-[10px] text-zinc-600">
            Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredScans.length)} of {filteredScans.length} entries
          </p>
        </div>
        <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-white">Export CSV</button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            type="text"
            placeholder="Search member..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-white/[0.07] bg-white/[0.04] py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 focus:border-orange-500/30 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-white/[0.07] bg-white/[0.04] py-2 pl-9 pr-8 text-xs font-bold text-white focus:border-orange-500/30 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
          >
            <option value="all">All Status</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
            <option value="Denied">Denied</option>
          </select>
        </div>

        {/* Plan Filter */}
        <select
          value={filterPlan}
          onChange={(e) => {
            setFilterPlan(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border border-white/[0.07] bg-white/[0.04] py-2 px-3 text-xs font-bold text-white focus:border-orange-500/30 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
        >
          <option value="all">All Plans</option>
          <option value="Basic">Basic</option>
          <option value="Pro">Pro</option>
          <option value="Elite">Elite</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Time", "Member", "Plan", "Result", ""].map(h => (
                <th key={h} className="border-b border-white/[0.05] pb-3 text-left text-[9px] font-black uppercase tracking-[0.09em] text-zinc-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedScans.length > 0 ? (
              paginatedScans.map((s, i) => (
                <tr key={i} className="group transition-colors hover:bg-white/[0.02]">
                  <td className="border-t border-white/[0.03] py-3 font-mono text-[11px] text-zinc-500">{s.time}</td>
                  <td className="border-t border-white/[0.03] py-3 text-xs font-semibold">{s.member}</td>
                  <td className="border-t border-white/[0.03] py-3">{s.plan !== "—" ? <PlanBadge plan={s.plan} /> : <span className="text-zinc-600">—</span>}</td>
                  <td className="border-t border-white/[0.03] py-3"><StatusBadge status={s.result} /></td>
                  <td className="border-t border-white/[0.03] py-3">
                    <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 opacity-0 transition-opacity hover:text-white group-hover:opacity-100">
                      Detail
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="border-t border-white/[0.03] py-8 text-center">
                  <div className="text-sm text-zinc-600">No entries match your filters</div>
                  <button 
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterPlan("all");
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="mt-2 text-xs font-bold text-orange-500 hover:text-orange-400"
                  >
                    Clear filters
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-4">
          <div className="text-[10px] text-zinc-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-white/[0.07] bg-white/[0.04] p-1.5 text-zinc-500 transition-colors hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                return page === 1 || 
                       page === totalPages || 
                       Math.abs(page - currentPage) <= 1;
              })
              .map((page, idx, arr) => (
                <>
                  {idx > 0 && arr[idx - 1] !== page - 1 && (
                    <span key={`ellipsis-${page}`} className="px-2 py-1.5 text-xs text-zinc-600">...</span>
                  )}
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      currentPage === page
                        ? "bg-orange-500 text-white"
                        : "border border-white/[0.07] bg-white/[0.04] text-zinc-500 hover:text-white"
                    }`}
                  >
                    {page}
                  </button>
                </>
              ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-white/[0.07] bg-white/[0.04] p-1.5 text-zinc-500 transition-colors hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};

export default GymQRPage;

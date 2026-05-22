/**
 * Broker Admin Page — view all leads
 * Route: /reports
 */

import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  FileText, Phone, Mail, Calendar, Loader2,
  CheckCircle, User, AlertCircle, Search,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import type { Lead } from "../../../drizzle/schema";

// ── Booking Calendar ─────────────────────────────────────────────────────────
function BookingCalendar({ leads }: { leads: Lead[] }) {
  const today = new Date();
  // Start of current week (Monday)
  const getWeekStart = (d: Date) => {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(d);
    start.setDate(d.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return start;
  };
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);
  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToday = () => setWeekStart(getWeekStart(today));
  const weekEnd = weekDays[6];
  const weekLabel = `${weekStart.getDate()} ${weekStart.toLocaleString("en-AU", { month: "short" })} – ${weekEnd.getDate()} ${weekEnd.toLocaleString("en-AU", { month: "short" })} ${weekEnd.getFullYear()}`;
  // Hours to display: 8am–7pm
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  // ── Blocked slots from DB ──────────────────────────────────────────────────
  const utils = trpc.useUtils();
  const { data: blockedData } = trpc.blockedSlots.getAll.useQuery();

  // Derive a Set<string> directly from the cache — no separate optimistic state needed
  const blockedSet = useMemo(() => {
    const s = new Set<string>();
    (blockedData ?? []).forEach(b => s.add(b.slotKey));
    return s;
  }, [blockedData]);

  // Update the cache directly so the UI changes atomically with zero flash
  const toggleInCache = (key: string, isWholeDay: boolean) => {
    utils.blockedSlots.getAll.setData(undefined, prev => {
      const current = prev ?? [];
      const exists = current.some(s => s.slotKey === key);
      if (exists) {
        return current.filter(s => s.slotKey !== key);
      } else {
        return [...current, { slotKey: key, isWholeDay }];
      }
    });
  };

  const toggleSlotMutation = trpc.blockedSlots.toggle.useMutation({
    onError: (_err, vars) => {
      // Rollback on error by re-toggling in cache
      toggleInCache(vars.slotKey, vars.isWholeDay);
    },
  });
  // Batch mutation — used for drag: one request for all dragged cells
  const batchToggleMutation = trpc.blockedSlots.batchToggle.useMutation({
    onError: (_err, vars) => {
      // Rollback all dragged cells on error
      vars.slots.forEach(s => toggleInCache(s.slotKey, s.isWholeDay));
    },
  });
  const clearAllMutation = trpc.blockedSlots.clearAll.useMutation({
    onSuccess: () => {
      utils.blockedSlots.getAll.setData(undefined, []);
    },
  });

  // Drag-to-block state
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<"block" | "unblock">("block");
  // Collect all cells touched during a drag — sent as one batch on mouse-up
  const draggedCellsRef = useRef<string[]>([]);

  const slotKeyForCell = (d: Date, hour: number) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${yyyy}-${mm}-${dd}-${String(hour).padStart(2, "0")}:00`;
  };
  const dayKeyForDate = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  };
  const isDayBlocked = (d: Date) => blockedSet.has(dayKeyForDate(d));

  const handleCellMouseDown = (d: Date, hour: number) => {
    const key = slotKeyForCell(d, hour);
    const currentlyBlocked = blockedSet.has(key);
    const action = currentlyBlocked ? "unblock" : "block";
    setDragAction(action);
    setIsDragging(true);
    draggedCellsRef.current = [key]; // start fresh drag batch
    toggleInCache(key, false); // instant UI — update cache directly
    // Single click: fire immediately so it feels instant
    toggleSlotMutation.mutate({ slotKey: key, isWholeDay: false });
  };
  const handleCellMouseEnter = (d: Date, hour: number) => {
    if (!isDragging) return;
    const key = slotKeyForCell(d, hour);
    const isBlocked = blockedSet.has(key);
    const alreadyDragged = draggedCellsRef.current.includes(key);
    if (alreadyDragged) return;
    if (dragAction === "block" && !isBlocked) {
      toggleInCache(key, false); // instant visual — update cache directly
      draggedCellsRef.current = [...draggedCellsRef.current, key]; // collect, don't fire yet
    } else if (dragAction === "unblock" && isBlocked) {
      toggleInCache(key, false); // instant visual — update cache directly
      draggedCellsRef.current = [...draggedCellsRef.current, key];
    }
  };
  const handleMouseUp = () => {
    if (isDragging) {
      const cells = draggedCellsRef.current;
      // If more than 1 cell was dragged, send the extras as a batch (first was already sent)
      if (cells.length > 1) {
        const batchSlots = cells.slice(1).map(k => ({ slotKey: k, isWholeDay: false }));
        batchToggleMutation.mutate({ slots: batchSlots });
      }
      draggedCellsRef.current = [];
    }
    setIsDragging(false);
  };

  const handleDayHeaderClick = (d: Date) => {
    const key = dayKeyForDate(d);
    const currentlyBlocked = blockedSet.has(key);
    toggleInCache(key, true); // instant UI — update cache directly
    toggleSlotMutation.mutate({ slotKey: key, isWholeDay: true });
  };

  // Format a slotKey for display in the tags list
  const formatSlotKeyLabel = (key: string) => {
    // Day key: "YYYY-MM-DD"
    // Slot key: "YYYY-MM-DD-HH:MM"
    const parts = key.split("-");
    if (parts.length === 3) {
      // whole day
      const d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
      return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }) + " (All day)";
    } else if (parts.length === 4) {
      const d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
      const timePart = parts[3]; // "HH:MM"
      const [hStr] = timePart.split(":");
      const h = parseInt(hStr, 10);
      const label = h < 12 ? `${h}:00 AM` : h === 12 ? "12:00 PM" : `${h - 12}:00 PM`;
      return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }) + ` · ${label}`;
    }
    return key;
  };

  // Parse bookingDate like "Wed, 7 May" and bookingTime like "3:00 PM – 3:30 PM"
  const parseBookingDate = (dateStr: string): Date | null => {
    try {
      const withYear = `${dateStr} ${today.getFullYear()}`;
      const d = new Date(withYear);
      if (isNaN(d.getTime())) return null;
      return d;
    } catch { return null; }
  };
  const parseStartHour = (timeStr: string): number | null => {
    try {
      const start = timeStr.split("–")[0].trim();
      const [timePart, meridiem] = start.split(" ");
      const [h, m] = timePart.split(":").map(Number);
      let hour = h;
      if (meridiem === "PM" && h !== 12) hour += 12;
      if (meridiem === "AM" && h === 12) hour = 0;
      return hour + (m ?? 0) / 60;
    } catch { return null; }
  };

  // Build event map: key = "YYYY-M-D-HH" → lead[]
  const eventMap = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const lead of leads) {
      if (!lead.bookingDate || !lead.bookingTime) continue;
      const d = parseBookingDate(lead.bookingDate);
      if (!d) continue;
      const startHour = parseStartHour(lead.bookingTime);
      if (startHour === null) continue;
      const hourKey = Math.floor(startHour);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${hourKey}`;
      if (!map[key]) map[key] = [];
      map[key].push(lead);
    }
    return map;
  }, [leads]);

  const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const blockedList = Array.from(blockedSet).sort();

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-8 overflow-hidden"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Calendar header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Calendar className="w-5 h-5 text-[#0D9E8F]" />
            <h2
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }}
              className="text-xl text-[#0D1A18] uppercase tracking-tight"
            >
              Booking Calendar
            </h2>
          </div>
          <p className="text-xs text-gray-400">Click a day header to block the whole day · Click or drag slots to block/unblock</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:border-[#0D9E8F] hover:text-[#0D9E8F] transition-colors"
          >
            Today
          </button>
          <button onClick={prevWeek} className="p-1.5 rounded-lg border border-gray-200 hover:border-[#0D9E8F] hover:text-[#0D9E8F] transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[180px] text-center">{weekLabel}</span>
          <button onClick={nextWeek} className="p-1.5 rounded-lg border border-gray-200 hover:border-[#0D9E8F] hover:text-[#0D9E8F] transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 px-5 pb-3">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-[#0D5C55] inline-block" /> Booking
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-rose-200 inline-block" /> Blocked
        </span>
        <span className="text-xs text-gray-400 ml-auto">Click day header to block whole day · Click or drag slots to block/unblock</span>
      </div>
      {/* Grid */}
      <div className="overflow-x-auto" style={{ userSelect: "none" }}>
        <div className="min-w-[640px]">
          {/* Day headers */}
          <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}>
            <div className="border-r border-gray-100" />
            {weekDays.map((d, i) => {
              const dayBlocked = isDayBlocked(d);
              return (
                <div
                  key={i}
                  onClick={() => handleDayHeaderClick(d)}
                  className={`text-center py-2 border-r border-gray-100 last:border-r-0 cursor-pointer transition-colors ${
                    dayBlocked ? "bg-rose-50 hover:bg-rose-100" : isToday(d) ? "bg-gray-50 hover:bg-rose-50" : "hover:bg-rose-50"
                  }`}
                  title={dayBlocked ? "Click to unblock this day" : "Click to block this whole day"}
                >
                  <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400">{DAY_NAMES[i]}</p>
                  <p className={`text-lg font-bold leading-tight ${
                    dayBlocked ? "text-rose-400" : isToday(d) ? "text-[#0D9E8F]" : "text-gray-700"
                  }`}>{d.getDate()}</p>
                  <p className="text-[10px] text-gray-400">{d.toLocaleString("en-AU", { month: "short" })}</p>
                  {dayBlocked && <p className="text-[9px] text-rose-400 font-semibold uppercase tracking-wide">Blocked</p>}
                </div>
              );
            })}
          </div>
          {/* Time rows */}
          <div className="overflow-y-auto" style={{ maxHeight: "480px" }}>
            {hours.map(hour => {
              const label = hour < 12 ? `${hour}:00 AM` : hour === 12 ? "12:00 PM" : `${hour - 12}:00 PM`;
              return (
                <div key={hour} className="grid border-b border-gray-100 last:border-b-0" style={{ gridTemplateColumns: "64px repeat(7, 1fr)", minHeight: "52px" }}>
                  {/* Time label */}
                  <div className="border-r border-gray-100 flex items-start justify-end pr-2 pt-1">
                    <span className="text-[10px] text-gray-400 font-medium">{label}</span>
                  </div>
                  {/* Day cells */}
                  {weekDays.map((d, di) => {
                    const slotKey = slotKeyForCell(d, hour);
                    const dayKey = dayKeyForDate(d);
                    const isSlotBlocked = blockedSet.has(slotKey);
                    const isDayBl = blockedSet.has(dayKey);
                    const isBlocked = isSlotBlocked || isDayBl;
                    const eventKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${hour}`;
                    const events = eventMap[eventKey] ?? [];
                    return (
                      <div
                        key={di}
                        onMouseDown={() => !isDayBl && handleCellMouseDown(d, hour)}
                        onMouseEnter={() => !isDayBl && handleCellMouseEnter(d, hour)}
                        className={`border-r border-gray-100 last:border-r-0 p-0.5 transition-colors ${
                          isDayBl
                            ? "bg-rose-50 cursor-not-allowed"
                            : isSlotBlocked
                            ? "bg-rose-100 cursor-pointer hover:bg-rose-200"
                            : isToday(d)
                            ? "bg-gray-50/50 cursor-pointer hover:bg-rose-50"
                            : "cursor-pointer hover:bg-rose-50"
                        }`}
                        title={isBlocked ? "Click to unblock" : "Click to block"}
                      >
                        {isSlotBlocked && !isDayBl && events.length === 0 && (
                          <div className="flex items-center justify-center h-full min-h-[44px]">
                            <span className="text-rose-300 text-lg select-none">⊘</span>
                          </div>
                        )}
                        {events.map((ev, ei) => (
                          <div
                            key={ei}
                            className={`bg-[#0D5C55] text-white text-xs font-semibold rounded px-1.5 py-1 mb-0.5 truncate cursor-default flex items-center gap-1 ${
                              isBlocked ? "ring-2 ring-red-500" : ""
                            }`}
                            title={isBlocked
                              ? `⚠ Conflict — ${ev.name} is booked in a blocked slot · ${ev.bookingTime}`
                              : `${ev.name} · ${ev.bookingTime}`}
                            onMouseDown={e => e.stopPropagation()}
                          >
                            {isBlocked && <AlertCircle className="w-3 h-3 text-red-200 flex-shrink-0" />}
                            <span className="truncate">{ev.name}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Blocked slots tags */}
      {blockedList.length > 0 && (
        <div className="px-5 py-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Blocked Slots ({blockedList.length})</span>
            <button
              onClick={() => clearAllMutation.mutate()}
              className="text-xs text-rose-400 hover:text-rose-600 font-semibold transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {blockedList.map(key => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium rounded-full px-3 py-1"
              >
                {formatSlotKeyLabel(key)}
                <button
                  onClick={() => toggleSlotMutation.mutate({ slotKey: key, isWholeDay: key.split("-").length === 3 })}
                  className="text-rose-400 hover:text-rose-700 transition-colors ml-0.5"
                  title="Unblock"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lead Card ────────────────────────────────────────────────────────────────
function LeadCard({ lead }: { lead: Lead }) {
  const createdAt = new Date(lead.createdAt);
  const hasBooking = !!lead.bookingDate;

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl overflow-hidden shadow-sm transition-all border border-gray-100"
    >
      {/* Dark teal booking header — only when booked */}
      {hasBooking && (
        <div className="bg-[#0D5C55] px-4 py-2.5 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />
          <span
            className="text-white text-sm font-semibold"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.02em" }}
          >
            {lead.bookingDate} · {lead.bookingTime}
          </span>
        </div>
      )}

      {/* Card body */}
      <div className="px-4 py-4">
        {/* Top row: avatar + name/status + date */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-[#0D5C55]/10 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-[#0D5C55]" />
          </div>

          {/* Name + status + contact */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-800 text-sm">{lead.name}</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                <CheckCircle className="w-3 h-3" /> Ready
              </span>
              {!hasBooking && (
                <span className="text-xs text-gray-400 font-medium">No booking</span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Phone className="w-3 h-3 text-gray-400" /> {lead.phone}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Mail className="w-3 h-3 text-gray-400" /> {lead.email}
              </span>
            </div>
          </div>

          {/* Date */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <p className="text-xs text-gray-300">
              {createdAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* 4-field grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4 pl-12">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-0.5">SMSF</p>
            <p className="text-sm text-gray-700 font-medium">
              {lead.hasSmsf === "yes" ? "Yes" : lead.hasSmsf === "no" ? "No" : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-0.5">Owns Property</p>
            <p className="text-sm text-gray-700 font-medium">
              {lead.ownsProperty === "yes" ? "Yes" : lead.ownsProperty === "no" ? "No" : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-0.5">Timeline</p>
            <p className="text-sm text-gray-700 font-medium">{lead.timeline || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-0.5">Booking</p>
            <p className="text-sm text-gray-700 font-medium">
              {hasBooking ? `${lead.bookingDate} · ${lead.bookingTime}` : "No booking"}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BrokerAdmin() {
  const { data: leads, isLoading, error } = trpc.survey.getAllLeads.useQuery();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "today" | "week" | "upcoming" | "past">("all");
  const [expanded, setExpanded] = useState(false);

  // Reset to collapsed whenever the user changes filter or search — feels more predictable
  // than persisting a long expanded list across context switches.
  const onFilterChange = (next: typeof filter) => { setFilter(next); setExpanded(false); };
  const onSearchChange = (next: string) => { setSearch(next); setExpanded(false); };

  // Parse a lead's bookingDate ("Wed, 7 May") to a YYYY-MM-DD string we can compare to today.
  // Uses current year since the stored string has no year component.
  const parseBookingDateKey = (lead: Lead): string | null => {
    if (!lead.bookingDate) return null;
    try {
      const withYear = `${lead.bookingDate} ${new Date().getFullYear()}`;
      const d = new Date(withYear);
      if (isNaN(d.getTime())) return null;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    } catch { return null; }
  };

  // Today and end-of-week (Sunday) as YYYY-MM-DD for chip comparisons.
  const todayKey = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  })();
  const endOfWeekKey = (() => {
    const t = new Date();
    const dayOfWeek = t.getDay(); // 0=Sun
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const end = new Date(t);
    end.setDate(t.getDate() + daysUntilSunday);
    return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  })();

  // Sort newest first, then apply search + filter.
  const sortedLeads = useMemo(() => {
    if (!leads) return [];
    return [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leads]);

  // Counts per filter — computed against the searched set so chip numbers stay in sync
  // with what the user is actually looking at.
  const searchedLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedLeads;
    return sortedLeads.filter(l => {
      return (
        (l.name ?? "").toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q) ||
        (l.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [sortedLeads, search]);

  const filterCounts = useMemo(() => {
    const counts = { all: searchedLeads.length, today: 0, week: 0, upcoming: 0, past: 0 };
    for (const lead of searchedLeads) {
      const key = parseBookingDateKey(lead);
      if (!key) continue;
      if (key === todayKey) counts.today++;
      if (key >= todayKey && key <= endOfWeekKey) counts.week++;
      if (key > todayKey) counts.upcoming++;
      if (key < todayKey) counts.past++;
    }
    return counts;
  }, [searchedLeads, todayKey, endOfWeekKey]);

  const visibleLeads = useMemo(() => {
    return searchedLeads.filter(lead => {
      if (filter === "all") return true;
      const key = parseBookingDateKey(lead);
      if (!key) return false;
      if (filter === "today") return key === todayKey;
      if (filter === "week") return key >= todayKey && key <= endOfWeekKey;
      if (filter === "upcoming") return key > todayKey;
      if (filter === "past") return key < todayKey;
      return true;
    });
  }, [searchedLeads, filter, todayKey, endOfWeekKey]);

  const COLLAPSE_LIMIT = 15;
  const shownLeads = expanded ? visibleLeads : visibleLeads.slice(0, COLLAPSE_LIMIT);
  const hiddenCount = visibleLeads.length - shownLeads.length;

  const filterChips: { id: typeof filter; label: string; count: number }[] = [
    { id: "all",      label: "All",       count: filterCounts.all },
    { id: "today",    label: "Today",     count: filterCounts.today },
    { id: "week",     label: "This week", count: filterCounts.week },
    { id: "upcoming", label: "Upcoming",  count: filterCounts.upcoming },
    { id: "past",     label: "Past",      count: filterCounts.past },
  ];

  return (
    <div className="min-h-screen bg-[#F0F0EE]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/finchecker-logo-transparent_e7a5e4b3.png"
            alt="Finchecker"
            className="h-8"
          />
          <span className="text-gray-300 text-sm">·</span>
          <span className="text-sm font-semibold text-gray-500">Q9 Finance</span>
        </div>
        <a href="/" className="text-xs text-gray-400 hover:text-[#0D5C55] transition-colors font-medium">
          ← Back to Survey
        </a>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Title + stats */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }}
              className="text-3xl text-[#0D1A18] uppercase tracking-tight"
            >
              All Leads
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {leads?.length ?? 0} total
            </p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#0D9E8F]" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
            Failed to load leads. Please refresh.
          </div>
        )}

        {/* Empty — no leads at all */}
        {leads && leads.length === 0 && (
          <div className="text-center py-20">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No leads yet. Share the survey to start receiving enquiries.</p>
          </div>
        )}

        {/* Booking Calendar */}
        {leads && leads.length > 0 && (
          <BookingCalendar leads={leads} />
        )}

        {/* Search + filter chips */}
        {leads && leads.length > 0 && (
          <div className="mb-6">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#0D9E8F] transition-colors"
              />
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-2">
              {filterChips.map(chip => {
                const isActive = filter === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => onFilterChange(chip.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      isActive
                        ? "bg-[#0D5C55] border-[#0D5C55] text-white"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {chip.label}
                    <span className={`ml-1.5 ${isActive ? "text-white/70" : "text-gray-300"}`}>
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Leads list */}
        {leads && leads.length > 0 && visibleLeads.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No leads match this filter or search.</p>
            <button
              onClick={() => { onSearchChange(""); onFilterChange("all"); }}
              className="text-xs text-[#0D9E8F] hover:text-[#0D5C55] font-semibold mt-3 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}

        {visibleLeads.length > 0 && (
          <div>
            <div className="space-y-3">
              {shownLeads.map(lead => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>

            {/* Show more / Collapse */}
            {visibleLeads.length > COLLAPSE_LIMIT && (
              <div className="text-center mt-5">
                {!expanded ? (
                  <button
                    onClick={() => setExpanded(true)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:border-[#0D5C55] hover:text-[#0D5C55] transition-colors"
                  >
                    Show {hiddenCount} more lead{hiddenCount === 1 ? "" : "s"}
                  </button>
                ) : (
                  <button
                    onClick={() => setExpanded(false)}
                    className="text-xs text-gray-400 hover:text-[#0D5C55] font-semibold transition-colors"
                  >
                    Collapse
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

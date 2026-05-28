/**
 * DESIGN: Bold Conversion-Focused Survey — King Kong style
 * Palette: Light grey bg (#F0F0EE), Dark Teal (#0D5C55), Teal CTA (#0D9E8F)
 * Fonts: Barlow Condensed 900 (headlines), DM Sans (body/UI)
 *
 * Flow: Intro → Name → Bank → Loan → Interest → Timeline → Contact → Analysing (AI) → Report Ready → Book Call
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { trackSurveyStep, trackLead, trackBooking } from "@/lib/pixel";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Check, Phone, Mail, Calendar,
  ArrowRight, Star, ChevronRight as ChevronRightIcon,
  TrendingDown, FileText, Clock, AlertCircle, Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { BrokerReport, LenderOption } from "../../../server/routers";

// ── Bank data ─────────────────────────────────────────────────────────────────
const BANKS = [
  { id: "anz",       name: "ANZ",               logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/anz-logo_a7096508.png" },
  { id: "cba",       name: "Commonwealth Bank", logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/cba-logo_256a1ba4.png" },
  { id: "westpac",   name: "Westpac",           logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/westpac-logo_9bddfc0e.png" },
  { id: "nab",       name: "NAB",               logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/nab-logo_da9dc348.png" },
  { id: "ing",       name: "ING",               logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/ing-logo_beb42b4f.png" },
  { id: "macquarie", name: "Macquarie",         logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/macquarie-logo_92d536eb.png" },
  { id: "stgeorge",  name: "St. George",        logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/stgeorge-logo_b84fdece.png" },
  { id: "suncorp",   name: "Suncorp",           logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/suncorp-logo_dfaee248.jpg" },
  { id: "bendigo",   name: "Bendigo Bank",      logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/bendigo-logo_f206e6d1.png" },
  { id: "other",     name: "Other",             logo: "" },
];

const LOAN_SIZES = [
  "Under $250,000", "$250,000 – $500,000", "$500,000 – $750,000",
  "$750,000 – $1,000,000", "Over $1,000,000",
];

const INTEREST_RANGES = [
  "Under 5%", "5% – 5.5%", "5.5% – 6%", "6% – 6.5%", "6.5% – 7%", "Over 7%",
];

const TIMELINES = [
  "As soon as possible", "Within 1–3 months", "Within 3–6 months",
  "Within 6–12 months", "Just exploring options",
];

// 3–6pm AEST time slots
const TIME_SLOTS = [
  "3:00 PM – 3:30 PM", "3:30 PM – 4:00 PM", "4:00 PM – 4:30 PM",
  "4:30 PM – 5:00 PM", "5:00 PM – 5:30 PM", "5:30 PM – 6:00 PM",
];
const SMSF_TIMELINES = [
  "As soon as possible",
  "Within 1–3 months",
  "Just exploring options",
];

// AI analysis steps shown live to user
const AI_STEPS = [
  { text: "Analysing your current rate...", icon: "🔍" },
  { text: "Searching 30+ Australian lenders...", icon: "🏦" },
  { text: "Comparing variable & fixed rates...", icon: "📊" },
  { text: "Calculating potential savings...", icon: "💰" },
  { text: "Generating your personalised report...", icon: "📋" },
];

const RATE_MESSAGES: Record<string, { style: "success" | "caution"; emoji: string; headline: string; body: string }> = {
  "Under 5%":    { style: "success", emoji: "✅", headline: "You're a strong candidate",        body: "Based on what you've shared, you look like a great fit for an SMSF loan. Book a free 10-minute call with one of our specialists to walk through your options and what's possible." },
  "5% – 5.5%":  { style: "success", emoji: "👍", headline: "Looking good",                     body: "You've answered everything we need to get the conversation started. Book a free 10-minute call with one of our SMSF specialists — they'll talk you through the next steps." },
  "5.5% – 6%":  { style: "success", emoji: "💡", headline: "You're ready to chat",             body: "Thanks for sharing your details. The next step is a quick call with one of our SMSF loan specialists — book a free 10 minutes below and we'll take it from there." },
  "6% – 6.5%":  { style: "success", emoji: "🎯", headline: "Let's get you sorted",             body: "Everything we need to start the conversation is in. Pick a time that suits — one of our SMSF specialists will call to walk through your situation and what's possible." },
  "6.5% – 7%":  { style: "success", emoji: "🚀", headline: "Ready when you are",               body: "We've got what we need to start. Book a free 10-minute call below and one of our SMSF loan specialists will talk you through your options." },
  "Over 7%":    { style: "success", emoji: "🔥", headline: "Let's move quickly",               body: "Given your timeline, the fastest next step is a call. Book a free 10-minute slot below and one of our SMSF specialists will get you on track." },
};

const TOTAL_STEPS = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────
// Walk forward from tomorrow until we've found `count` business days that aren't blocked.
// Cap the search at MAX_LOOKAHEAD days so we don't loop forever if every day's blocked.
function getNextAvailableBusinessDays(count: number, blockedSet: Set<string>): Date[] {
  const days: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const MAX_LOOKAHEAD = 60; // ~12 weeks; plenty of headroom
  let walked = 0;
  while (days.length < count && walked < MAX_LOOKAHEAD) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dayKey = `${d.getFullYear()}-${mm}-${dd}`;
      if (!blockedSet.has(dayKey)) {
        days.push(new Date(d));
      }
    }
    d.setDate(d.getDate() + 1);
    walked++;
  }
  return days;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

// Proper-case the user's first name: "henry" → "Henry", "HENRY" → "Henry", "henry smith" → "Henry"
function capitalizeFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  if (!first) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

// ── Calendar helpers ──────────────────────────────────────────────────────────
// All booking slots are defined in AEST. Each helper below converts that to a
// platform-appropriate format so users can add the event regardless of which
// calendar app they use.
const AEST_OFFSET_HOURS = 10;
const CAL_EVENT_TITLE = "SMSF loan call with Q9 Finance";

function buildCalEventTimes(date: Date, slot: string): { startUtc: Date; endUtc: Date } {
  const parseSlotStartAEST = (s: string): { hour: number; minute: number } => {
    const start = s.split("–")[0].trim();
    const m = start.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!m) return { hour: 9, minute: 0 };
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return { hour: h, minute: min };
  };
  const { hour: hAEST, minute } = parseSlotStartAEST(slot);
  const startUtc = new Date(Date.UTC(
    date.getFullYear(), date.getMonth(), date.getDate(),
    hAEST - AEST_OFFSET_HOURS, minute, 0,
  ));
  const endUtc = new Date(startUtc.getTime() + 30 * 60 * 1000);
  return { startUtc, endUtc };
}

function formatCalUtcStamp(d: Date): string {
  return (
    d.getUTCFullYear().toString().padStart(4, "0") +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0") +
    "T" +
    String(d.getUTCHours()).padStart(2, "0") +
    String(d.getUTCMinutes()).padStart(2, "0") +
    String(d.getUTCSeconds()).padStart(2, "0") +
    "Z"
  );
}

function buildCalDescription(name: string, phone: string): string {
  return `A specialist from Q9 Finance will call ${name} on ${phone} to walk through your SMSF loan options.\n\nTip: have your SMSF trust deed and most recent member balance handy if you can — it helps us give you accurate numbers on the call.`;
}

// ICS file — Apple Calendar, Outlook desktop, generic fallback
function buildIcsFile(args: { date: Date; slot: string; name: string; phone: string }): string {
  const { startUtc, endUtc } = buildCalEventTimes(args.date, args.slot);
  const esc = (s: string): string =>
    s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}@q9finance`;
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Q9 Finance//SMSF Loan Call//EN",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatCalUtcStamp(new Date())}`,
    `DTSTART:${formatCalUtcStamp(startUtc)}`,
    `DTEND:${formatCalUtcStamp(endUtc)}`,
    `SUMMARY:${esc(CAL_EVENT_TITLE)}`,
    `DESCRIPTION:${esc(buildCalDescription(args.name, args.phone))}`,
    "BEGIN:VALARM", "TRIGGER:-PT15M", "ACTION:DISPLAY",
    `DESCRIPTION:${esc("SMSF loan call in 15 minutes")}`,
    "END:VALARM", "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

function downloadIcsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Google Calendar — opens pre-filled compose tab
function buildGoogleCalendarUrl(args: { date: Date; slot: string; name: string; phone: string }): string {
  const { startUtc, endUtc } = buildCalEventTimes(args.date, args.slot);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: CAL_EVENT_TITLE,
    dates: `${formatCalUtcStamp(startUtc)}/${formatCalUtcStamp(endUtc)}`,
    details: buildCalDescription(args.name, args.phone),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Outlook — opens pre-filled compose page
function buildOutlookCalendarUrl(args: { date: Date; slot: string; name: string; phone: string }): string {
  const { startUtc, endUtc } = buildCalEventTimes(args.date, args.slot);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: CAL_EVENT_TITLE,
    startdt: startUtc.toISOString().replace(/\.\d{3}Z$/, "Z"),
    enddt: endUtc.toISOString().replace(/\.\d{3}Z$/, "Z"),
    body: buildCalDescription(args.name, args.phone),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

// ── Slide variants ────────────────────────────────────────────────────────────
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};
const transition = { duration: 0.3 };

const revealVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

interface FormData {
  name: string;
  phone: string;
  email: string;
  hasSmsf: string;      // "yes" | "no"
  ownsProperty: string; // "yes" | "no"
  timeline: string;
  bookingDate: Date | null;
  bookingTime: string;
  bookingConfirmed: boolean;
}

// ── Bouncing Arrow Prompt ─────────────────────────────────────────────────────
function BouncingArrow() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-1.5 mt-3 ml-1"
    >
      <motion.div
        animate={{ x: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }}
      >
        <ArrowRight className="w-4 h-4 text-[#0D9E8F]" strokeWidth={2.5} />
      </motion.div>
      <span className="text-xs font-medium text-[#0D9E8F]">Fill this in to continue</span>
    </motion.div>
  );
}

// ── Connected Dot Progress Bar ────────────────────────────────────────────────
function DotProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {Array.from({ length: total }).map((_, i) => {
        const isCompleted = i + 1 < step;
        const isActive    = i + 1 === step;
        return (
          <div key={i} className="flex items-center">
            <motion.div
              animate={{
                backgroundColor: isCompleted || isActive ? "#0D5C55" : "#D1D5DB",
                scale: isActive ? 1.25 : 1,
              }}
              transition={{ duration: 0.3 }}
              className="w-3.5 h-3.5 rounded-full z-10 relative flex-shrink-0"
              style={{ boxShadow: isActive ? "0 0 0 4px rgba(13,92,85,0.18)" : "none" }}
            />
            {i < total - 1 && (
              <div className="w-6 sm:w-10 h-0.5 flex-shrink-0 relative overflow-hidden bg-gray-200">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-[#0D5C55]"
                  animate={{ width: isCompleted ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Brand Header ──────────────────────────────────────────────────────────────
function BrandHeader() {
  return (
    <header className="w-full flex justify-center pt-5 pb-2">
      <img
        src="https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/finchecker-logo-nobg_fd93207b.png"
        alt="Finchecker"
        decoding="async"
        height={44}
        className="h-11 w-auto object-contain"
      />
    </header>
  );
}

// ── Compliance Footer ─────────────────────────────────────────────────────────
const TRUST_BANK_LOGOS = [
  { name: "ANZ",               logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/anz-logo_a7096508.png" },
  { name: "Commonwealth Bank", logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/cba-logo_256a1ba4.png" },
  { name: "Westpac",           logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/westpac-logo_9bddfc0e.png" },
  { name: "NAB",               logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/nab-logo_da9dc348.png" },
  { name: "ING",               logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/ing-logo_beb42b4f.png" },
  { name: "Macquarie",         logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/macquarie-logo_92d536eb.png" },
  { name: "St. George",        logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/stgeorge-logo_b84fdece.png" },
  { name: "Suncorp",           logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/suncorp-logo_dfaee248.jpg" },
  { name: "Bendigo Bank",      logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663412142004/MqkHRp8irWn8dMYsECtkoh/bendigo-logo_f206e6d1.png" },
];

function ComplianceFooter() {
  return (
    <footer className="w-full bg-white border-t border-gray-100 mt-auto">
      {/* Lenders we compare */}
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-4">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 text-center mb-4">Lenders We Compare</p>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-6">
          {TRUST_BANK_LOGOS.map(b => (
            <img key={b.name} src={b.logo} alt={b.name} loading="lazy" decoding="async" height={24} className="h-6 w-auto object-contain opacity-50 grayscale hover:opacity-80 hover:grayscale-0 transition-all duration-200" />
          ))}
        </div>
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <p className="text-[10px] text-gray-400 leading-relaxed text-center">
            <strong className="text-gray-500">General Information Only.</strong> Finchecker is a home loan comparison service, not a financial product provider, credit provider, or financial adviser. We do not hold an Australian Credit Licence (ACL) or Australian Financial Services Licence (AFSL). The information on this website is general in nature and does not take into account your personal financial situation, objectives, or needs. It should not be relied upon as financial, legal, or credit advice.
          </p>
          <p className="text-[10px] text-gray-400 leading-relaxed text-center">
            Finchecker compares a select range of home loan products from participating lenders. We may receive a referral fee from lenders when you connect with them through our service. This does not affect the objectivity of our comparisons. Always consider the Product Disclosure Statement (PDS) and Target Market Determination (TMD) before making any financial decision. Past rates are not indicative of future rates.
          </p>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            © {new Date().getFullYear()} Finchecker. All rights reserved. | <a href="#" className="underline hover:text-gray-600">Privacy Policy</a> | <a href="#" className="underline hover:text-gray-600">Terms of Use</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

// ── Bank Card ─────────────────────────────────────────────────────────────────
function BankCard({ bank, selected, onClick }: { bank: (typeof BANKS)[0]; selected: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2, boxShadow: "0 6px 20px rgba(13,92,85,0.15)" }}
      whileTap={{ scale: 0.97 }}
      className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 bg-white
        ${selected ? "border-[#0D5C55] shadow-md" : "border-gray-100 hover:border-gray-200"}`}
    >
      {selected && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0D5C55] flex items-center justify-center">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </motion.div>
      )}
      {bank.logo ? (
        <div className="w-full h-10 flex items-center justify-center">
          <img src={bank.logo} alt={bank.name} className="max-h-10 max-w-full object-contain" />
        </div>
      ) : (
        <div className="w-full h-10 flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-400">Other</span>
        </div>
      )}
      <span className="text-xs font-medium text-gray-400 text-center leading-tight">{bank.name}</span>
    </motion.button>
  );
}

// ── Option Pill ───────────────────────────────────────────────────────────────
function OptionPill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`w-full text-left px-5 py-3.5 rounded-xl border-2 font-medium text-sm transition-all duration-200
        ${selected
          ? "border-[#0D5C55] bg-[#0D5C55]/5 text-[#0D5C55]"
          : "border-gray-100 bg-white text-gray-700 hover:border-gray-200"
        }`}
    >
      <div className="flex items-center justify-between">
        <span>{label}</span>
        {selected && <Check className="w-4 h-4 text-[#0D5C55]" strokeWidth={2.5} />}
      </div>
    </motion.button>
  );
}

// ── Nav Buttons ───────────────────────────────────────────────────────────────
function NavButtons({
  onBack, onNext, canNext, nextLabel = "Continue →", isFirst = false,
}: {
  onBack: () => void; onNext: () => void; canNext: boolean; nextLabel?: string; isFirst?: boolean;
}) {
  return (
    <div className="flex gap-3 mt-8">
      {!isFirst && (
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-400 font-medium text-sm hover:border-gray-300 hover:text-gray-600 transition-all">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      )}
      <motion.button
        onClick={onNext}
        disabled={!canNext}
        whileHover={canNext ? { scale: 1.02 } : {}}
        whileTap={canNext ? { scale: 0.98 } : {}}
        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200
          ${canNext
            ? "bg-[#0D9E8F] text-white hover:bg-[#0D5C55] shadow-lg shadow-teal-200"
            : "bg-gray-100 text-gray-300 cursor-not-allowed"
          }`}
      >
        {nextLabel}
      </motion.button>
    </div>
  );
}

// ── AI Analysing Screen ───────────────────────────────────────────────────────
function AIAnalysingScreen({
  interest, name, leadId, onReportReady,
}: {
  interest: string;
  name: string;
  leadId: number | null;
  onReportReady: (report: BrokerReport) => void;
}) {
  const [aiPhase, setAiPhase] = useState(0);
  const reportedRef = useRef(false);

  // Advance AI steps every ~1.2s for visual effect
  useEffect(() => {
    if (aiPhase >= AI_STEPS.length - 1) return;
    const t = setTimeout(() => setAiPhase(p => p + 1), 1200);
    return () => clearTimeout(t);
  }, [aiPhase]);

  // Poll for report completion
  const { data: reportData } = trpc.survey.getReport.useQuery(
    { leadId: leadId ?? 0 },
    {
      enabled: leadId !== null,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (status === "ready" || status === "failed") return false;
        return 2000;
      },
    }
  );

  useEffect(() => {
    if (reportedRef.current) return;
    if (reportData?.status === "ready" && reportData.report) {
      reportedRef.current = true;
      // Ensure all AI steps are shown as complete first
      setAiPhase(AI_STEPS.length - 1);
      setTimeout(() => onReportReady(reportData.report as BrokerReport), 800);
    }
  }, [reportData, onReportReady]);

  const msg = RATE_MESSAGES[interest] ?? RATE_MESSAGES["5.5% – 6%"];
  const firstName = capitalizeFirstName(name);
  const isGenerating = !reportData || reportData.status === "generating" || reportData.status === "pending";

  return (
    <div className="flex flex-col items-center justify-center py-4 text-center min-h-[320px]">
      <p className="text-xs font-semibold tracking-widest uppercase text-[#0D9E8F] mb-3">AI Analysis</p>
      <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }}
        className="text-4xl sm:text-5xl text-[#0D1A18] uppercase leading-none mb-6">
        Analysing Your Results
      </h2>

      {/* Live AI steps */}
      <div className="space-y-2.5 w-full mb-6">
        {AI_STEPS.map((s, i) => {
          const isDone = i < aiPhase || (!isGenerating && i <= aiPhase);
          const isActive = i === aiPhase && isGenerating;
          if (i > aiPhase && isGenerating) return null;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="flex items-center gap-3 bg-gray-50 rounded-xl px-5 py-3.5"
            >
              <span className="text-xl">{s.icon}</span>
              <span className="text-sm font-medium text-gray-600 text-left">{s.text}</span>
              {isActive && (
                <motion.div
                  className="ml-auto flex gap-1"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                >
                  {[0, 1, 2].map(d => (
                    <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#0D9E8F]" />
                  ))}
                </motion.div>
              )}
              {isDone && (
                <div className="ml-auto w-5 h-5 rounded-full bg-[#0D9E8F] flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Waiting for AI */}
      {isGenerating && aiPhase >= AI_STEPS.length - 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-gray-400"
        >
          <Loader2 className="w-4 h-4 animate-spin text-[#0D9E8F]" />
          <span>AI is cross-checking lenders...</span>
        </motion.div>
      )}

      {/* Rate result banner (shown while waiting) */}
      {aiPhase >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`w-full rounded-2xl px-6 py-5 text-left mt-4 ${
            msg.style === "caution"
              ? "bg-amber-50 border border-amber-200"
              : "bg-[#0D5C55]"
          }`}
        >
          <div className="text-2xl mb-2">{msg.emoji}</div>
          <p className={`font-bold text-base mb-1.5 ${msg.style === "caution" ? "text-amber-800" : "text-white"}`}>
            {firstName ? `${firstName} — ${msg.headline}` : msg.headline}
          </p>
          <p className={`text-sm leading-relaxed ${msg.style === "caution" ? "text-amber-700" : "text-white/85"}`}>
            {msg.body}
          </p>
          <p className={`text-xs mt-3 leading-relaxed ${msg.style === "caution" ? "text-amber-600/70" : "text-white/45"}`}>
            This is just a guidance, final results may vary depending on your exact situation and different lender requirements.
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ── Report Ready Screen ───────────────────────────────────────────────────────
function ReportReadyScreen({
  report, name, interest, onBookCall,
}: {
  report: BrokerReport;
  name: string;
  interest: string;
  onBookCall: () => void;
}) {
  const firstName = capitalizeFirstName(name);
  const msg = RATE_MESSAGES[interest] ?? RATE_MESSAGES["5.5% – 6%"];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="py-2"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-full bg-[#0D9E8F] flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <p className="text-xs font-semibold tracking-widest uppercase text-[#0D9E8F]">Your Report Is Ready</p>
      </div>
      <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }}
        className="text-4xl sm:text-5xl text-[#0D1A18] uppercase leading-none mb-4">
        {firstName}, here's what we found
      </h2>

      {/* Summary banner */}
      <div className={`rounded-2xl px-5 py-4 mb-5 ${msg.style === "caution" ? "bg-amber-50 border border-amber-200" : "bg-[#0D5C55]"}`}>
        <p className={`text-2xl mb-2`}>{msg.emoji}</p>
        <p className={`font-bold text-sm mb-1 ${msg.style === "caution" ? "text-amber-800" : "text-white"}`}>
          {msg.headline}
        </p>
        <p className={`text-sm leading-relaxed ${msg.style === "caution" ? "text-amber-700" : "text-white/85"}`}>
          {report.summary}
        </p>
        {report.potentialSaving && (
          <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
            msg.style === "caution" ? "bg-amber-100 text-amber-800" : "bg-white/15 text-white"
          }`}>
            <TrendingDown className="w-3.5 h-3.5" />
            Potential saving: {report.potentialSaving}
          </div>
        )}
        <p className={`text-xs mt-3 ${msg.style === "caution" ? "text-amber-600/70" : "text-white/45"}`}>
          This is just a guidance, final results may vary depending on your exact situation and different lender requirements.
        </p>
      </div>

      {/* Top lender options */}
      <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">Top Lender Options Found</p>
      <p className="text-sm text-gray-500 leading-relaxed mb-3">
        You have <strong className="text-gray-800">{report.recommendedLenders.length} lender options</strong> — book a time with a specialist over a free 10-minute call to go over your current options.
      </p>
      <div className="relative mb-5">
        {/* Blurred lender cards */}
        <div className="space-y-2.5 select-none" style={{ filter: "blur(6px)", pointerEvents: "none" }}>
          {report.recommendedLenders.slice(0, 3).map((lender, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3"
            >
              <div className="w-7 h-7 rounded-full bg-[#0D5C55] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{lender.lenderName}</p>
                <p className="text-xs text-gray-400">{lender.rateType}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-[#0D5C55]">{lender.estimatedRate}</p>
                <p className="text-xs text-green-600 font-medium">{lender.estimatedMonthlySaving}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/60 backdrop-blur-[2px] px-4 text-center">
          <div className="text-2xl mb-2">🔒</div>
          <p className="text-sm font-bold text-gray-800 leading-snug">
            Book a free call with a specialist to get accurate insights on your options
          </p>
        </div>
      </div>

      {/* CTA — orange with pulse ring */}
      <div className="relative mt-2">
        {/* Pulsing ring layers */}
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ backgroundColor: "#F97316", zIndex: 0 }}
        />
        <motion.div
          animate={{ scale: [1, 1.14, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ backgroundColor: "#F97316", zIndex: 0 }}
        />
        <motion.button
          onClick={onBookCall}
          whileHover={{ scale: 1.02, backgroundColor: "#EA6C00" }}
          whileTap={{ scale: 0.98 }}
          className="relative w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl font-bold text-white shadow-xl transition-colors"
          style={{ backgroundColor: "#F97316", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, letterSpacing: "0.06em", fontSize: "1.25rem", zIndex: 1, boxShadow: "0 8px 32px rgba(249,115,22,0.45)" }}
        >
          BOOK MY FREE 10-MINUTE CALL
          <ChevronRightIcon className="w-6 h-6" strokeWidth={2.5} />
        </motion.button>
      </div>
      <p className="text-xs text-center text-gray-400 mt-2.5">Free, no obligation — takes less than 10 minutes</p>
    </motion.div>
  );
}

// ── Step Contact ──────────────────────────────────────────────────────────────
function StepContact({
  form, setForm, onBack, onNext,
}: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  onBack: () => void;
  onNext: () => void;
}) {
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const phoneRaw = form.phone.trim().replace(/\s/g, '');
  const phoneValid = /^04\d{8}$/.test(phoneRaw);
  const phoneError = phoneTouched && !phoneValid && phoneRaw.length > 0
    ? "Please enter a valid Australian mobile number (e.g. 0412 345 678)"
    : phoneTouched && !phoneValid && phoneRaw.length === 0
    ? "Mobile number is required"
    : null;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const canNext = phoneValid && emailValid;

  const showPhoneArrow = phoneTouched && !phoneValid;
  const showEmailArrow = phoneValid && emailTouched && !emailValid;

  return (
    <div>
      <p className="text-xs font-semibold tracking-widest uppercase text-[#0D9E8F] mb-3">Contact details</p>
      <h2
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }}
        className="text-4xl sm:text-5xl text-[#0D1A18] uppercase leading-none mb-2"
      >
        Last Step! Where can we send your results?
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        We'll send your results here and follow up to finalise your savings.
      </p>

      {/* Phone */}
      <div className="mb-3">
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            type="tel"
            placeholder="Phone number"
            value={form.phone}
            onChange={e => { setPhoneTouched(true); setForm(f => ({ ...f, phone: e.target.value })); }}
            onBlur={() => setPhoneTouched(true)}
            autoFocus
            className={`w-full pl-11 pr-10 py-3.5 rounded-xl border-2 bg-gray-50 font-medium text-base placeholder:text-gray-300 focus:outline-none focus:bg-white transition-all
              ${phoneValid ? "border-[#0D9E8F] text-gray-800" : "border-gray-100 text-gray-800 focus:border-[#0D9E8F]"}`}
          />
          {phoneValid && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#0D9E8F] flex items-center justify-center">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          )}
        </div>
        {phoneError && (
          <p className="text-xs text-red-500 mt-1 ml-1">{phoneError}</p>
        )}
        <AnimatePresence>{showPhoneArrow && <BouncingArrow />}</AnimatePresence>
      </div>

      {/* Email */}
      <div className="mb-2">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={e => { setEmailTouched(true); setForm(f => ({ ...f, email: e.target.value })); }}
            onBlur={() => setEmailTouched(true)}
            className={`w-full pl-11 pr-10 py-3.5 rounded-xl border-2 bg-gray-50 font-medium text-base placeholder:text-gray-300 focus:outline-none focus:bg-white transition-all
              ${emailValid ? "border-[#0D9E8F] text-gray-800" : "border-gray-100 text-gray-800 focus:border-[#0D9E8F]"}`}
          />
          {emailValid && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#0D9E8F] flex items-center justify-center">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          )}
        </div>
        <AnimatePresence>{showEmailArrow && <BouncingArrow />}</AnimatePresence>
      </div>

      <p className="text-xs text-gray-300 mt-3">🔒 Your details are safe with us. No spam, ever.</p>

      <NavButtons onBack={onBack} onNext={onNext} canNext={canNext} />
    </div>
  );
}

// ── Step Booking ──────────────────────────────────────────────────────────────
function StepBooking({
  form, setForm, onBack, onSubmit, isSubmitting,
}: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  // Fetch blocked slots from admin calendar
  const { data: blockedData } = trpc.blockedSlots.getAll.useQuery();
  const blockedSet = useMemo(
    () => new Set((blockedData ?? []).map(b => b.slotKey)),
    [blockedData]
  );

  const slotKeyForDateHour = (d: Date, hour: number) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}-${String(hour).padStart(2, "0")}:00`;
  };
  const dayKeyForDate = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  };
  const isDateBlocked = (d: Date) => blockedSet.has(dayKeyForDate(d));
  const isTimeSlotBlocked = (d: Date | null, slot: string) => {
    if (!d) return false;
    // Parse slot hour from e.g. "3:00 PM – 3:30 PM"
    const start = slot.split("–")[0].trim();
    const [timePart, meridiem] = start.split(" ");
    const [h] = timePart.split(":").map(Number);
    let hour = h;
    if (meridiem === "PM" && h !== 12) hour += 12;
    if (meridiem === "AM" && h === 12) hour = 0;
    return blockedSet.has(slotKeyForDateHour(d, hour));
  };

  const businessDays = useMemo(
    () => getNextAvailableBusinessDays(2, blockedSet),
    [blockedSet]
  );
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const phoneRaw = form.phone.trim().replace(/\s/g, '');
  const phoneValid = /^04\d{8}$/.test(phoneRaw) || /^\+614\d{8}$/.test(phoneRaw) || /^\d{8,15}$/.test(phoneRaw);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const datePicked = !!form.bookingDate;
  const timePicked = !!form.bookingTime;
  const canSubmit  = phoneValid && emailValid && datePicked && timePicked && form.bookingConfirmed;

  const showDateArrow = !datePicked;
  const showTimeArrow = datePicked && !timePicked;

  const handleDateSelect = (d: Date) => {
    setForm(f => ({ ...f, bookingDate: d, bookingTime: "", bookingConfirmed: false }));
  };

  const handleTimeSelect = (t: string) => {
    setForm(f => ({ ...f, bookingTime: t, bookingConfirmed: false }));
  };

  const handleConfirm = (yes: boolean) => {
    if (yes) {
      setForm(f => ({ ...f, bookingConfirmed: true }));
    } else {
      setForm(f => ({ ...f, bookingDate: null, bookingTime: "", bookingConfirmed: false }));
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <h2
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }}
          className="text-3xl sm:text-4xl text-[#0D1A18] uppercase leading-tight mb-2"
        >
          You're One Step Away From<br />Fasttracking Your SMSF Loan
        </h2>
        <p className="text-base font-semibold text-[#0D9E8F] tracking-wide">Required: Book Your Call Below</p>
      </div>

      {/* ── STEP 1: Contact Details ── */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0D9E8F] text-white text-xs font-bold flex-shrink-0">1</div>
          <p className="text-xs font-bold tracking-widest uppercase text-[#0D5C55]">Add Your Details</p>
          {phoneValid && emailValid && (
            <span className="ml-auto flex items-center gap-1 text-xs text-[#0D9E8F] font-semibold">
              <Check className="w-3.5 h-3.5" /> Done
            </span>
          )}
        </div>
        <div className="space-y-3 pl-8">
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              type="tel"
              placeholder="Phone number"
              value={form.phone}
              onChange={e => { setPhoneTouched(true); setForm(f => ({ ...f, phone: e.target.value })); }}
              onBlur={() => setPhoneTouched(true)}
              className={`w-full pl-11 pr-4 py-3.5 rounded-xl border-2 bg-gray-50 text-gray-800 font-medium text-base placeholder:text-gray-300 focus:outline-none focus:bg-white transition-all
                ${phoneValid ? "border-[#0D9E8F]" : "border-gray-100 focus:border-[#0D9E8F]"}`}
            />
            {phoneTouched && !phoneValid && form.phone.length > 0 && (
              <p className="text-xs text-red-500 mt-1 ml-1">Please enter a valid phone number</p>
            )}
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={e => { setEmailTouched(true); setForm(f => ({ ...f, email: e.target.value })); }}
              onBlur={() => setEmailTouched(true)}
              className={`w-full pl-11 pr-4 py-3.5 rounded-xl border-2 bg-gray-50 text-gray-800 font-medium text-base placeholder:text-gray-300 focus:outline-none focus:bg-white transition-all
                ${emailValid ? "border-[#0D9E8F]" : "border-gray-100 focus:border-[#0D9E8F]"}`}
            />
            {emailTouched && !emailValid && form.email.length > 0 && (
              <p className="text-xs text-red-500 mt-1 ml-1">Please enter a valid email address</p>
            )}
          </div>
        </div>
      </div>

      {/* Arrow 1 → 2 */}
      {phoneValid && emailValid && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 my-4 pl-8"
        >
          <div className="flex-1 border-t-2 border-dashed border-[#0D9E8F]/30" />
          <span className="text-[#0D9E8F] text-lg">↓</span>
          <div className="flex-1 border-t-2 border-dashed border-[#0D9E8F]/30" />
        </motion.div>
      )}

      {/* ── STEP 2: Pick Date ── */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-3">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 transition-colors ${phoneValid && emailValid ? "bg-[#0D9E8F] text-white" : "bg-gray-200 text-gray-400"}`}>2</div>
          <p className={`text-xs font-bold tracking-widest uppercase transition-colors ${phoneValid && emailValid ? "text-[#0D5C55]" : "text-gray-300"}`}>Pick a Date</p>
          {datePicked && (
            <span className="ml-auto flex items-center gap-1 text-xs text-[#0D9E8F] font-semibold">
              <Check className="w-3.5 h-3.5" /> {form.bookingDate?.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
            </span>
          )}
        </div>
        {phoneValid && emailValid && (
          <div className="pl-8">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {businessDays.map((d, i) => {
                const isSelected = form.bookingDate?.toDateString() === d.toDateString();
                if (isDateBlocked(d)) return null;
                return (
                  <motion.button
                    key={i}
                    onClick={() => handleDateSelect(d)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`px-3 py-2.5 rounded-xl border-2 text-center transition-all duration-200
                      ${isSelected
                        ? "border-[#0D5C55] bg-[#0D5C55]/5 text-[#0D5C55]"
                        : "border-gray-100 bg-white text-gray-600 hover:border-gray-200"
                      }`}
                  >
                    <p className="text-xs font-semibold">{d.toLocaleDateString("en-AU", { weekday: "short" })}</p>
                    <p className="text-sm font-bold">{d.getDate()}</p>
                    <p className="text-xs text-gray-400">{d.toLocaleDateString("en-AU", { month: "short" })}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Arrow 2 → 3 */}
      {datePicked && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 my-4 pl-8"
        >
          <div className="flex-1 border-t-2 border-dashed border-[#0D9E8F]/30" />
          <span className="text-[#0D9E8F] text-lg">↓</span>
          <div className="flex-1 border-t-2 border-dashed border-[#0D9E8F]/30" />
        </motion.div>
      )}

      {/* ── STEP 3: Pick Time ── */}
      <AnimatePresence>
        {datePicked && !form.bookingConfirmed && (
          <motion.div key="time-section" variants={revealVariants} initial="hidden" animate="visible" className="mb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0D9E8F] text-white text-xs font-bold flex-shrink-0">3</div>
              <p className="text-xs font-bold tracking-widest uppercase text-[#0D5C55]">Pick a Time</p>
              <span className="text-xs text-gray-400 ml-1">on {formatDate(form.bookingDate!)}</span>
              {timePicked && (
                <span className="ml-auto flex items-center gap-1 text-xs text-[#0D9E8F] font-semibold">
                  <Check className="w-3.5 h-3.5" /> {form.bookingTime}
                </span>
              )}
            </div>
            <div className="pl-8 grid grid-cols-2 gap-2">
              {TIME_SLOTS.map(slot => {
                const isSelected = form.bookingTime === slot;
                const blocked = isTimeSlotBlocked(form.bookingDate, slot);
                return (
                  <motion.button
                    key={slot}
                    onClick={() => { if (!blocked) handleTimeSelect(slot); }}
                    disabled={blocked}
                    whileHover={blocked ? undefined : { scale: 1.02 }}
                    whileTap={blocked ? undefined : { scale: 0.98 }}
                    className={`px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-all duration-200
                      ${blocked
                        ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                        : isSelected
                        ? "border-[#0D5C55] bg-[#0D5C55]/5 text-[#0D5C55]"
                        : "border-gray-100 bg-white text-gray-600 hover:border-gray-200"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      {blocked
                        ? <span className="line-through">Unavailable</span>
                        : <span>{slot}</span>}
                      {isSelected && !blocked && <Check className="w-3.5 h-3.5 text-[#0D5C55]" strokeWidth={2.5} />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Arrow 3 → Confirm */}
      {timePicked && !form.bookingConfirmed && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 my-4 pl-8"
        >
          <div className="flex-1 border-t-2 border-dashed border-[#0D9E8F]/30" />
          <span className="text-[#0D9E8F] text-lg">↓</span>
          <div className="flex-1 border-t-2 border-dashed border-[#0D9E8F]/30" />
        </motion.div>
      )}

      {/* ── CONFIRM ── */}
      <AnimatePresence>
        {datePicked && timePicked && !form.bookingConfirmed && (
          <motion.div key="confirm-section" variants={revealVariants} initial="hidden" animate="visible" className="mb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0D9E8F] text-white text-xs font-bold flex-shrink-0">✓</div>
              <p className="text-xs font-bold tracking-widest uppercase text-[#0D5C55]">Confirm Your Booking</p>
            </div>
            <div className="pl-8">
              <div className="bg-[#0D5C55]/6 border border-[#0D5C55]/20 rounded-xl px-5 py-4">
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-semibold">{formatDate(form.bookingDate!)}</span> at{" "}
                  <span className="font-semibold">{form.bookingTime}</span>
                  <br />
                  <span className="text-gray-400 text-xs">A specialist will call you at this time.</span>
                </p>
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => handleConfirm(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0D9E8F] text-white font-bold text-sm hover:bg-[#0D5C55] transition-colors shadow-md shadow-teal-100"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.04em" }}
                  >
                    <Check className="w-4 h-4" />
                    YES, THAT WORKS
                  </motion.button>
                  <motion.button
                    onClick={() => handleConfirm(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-medium text-sm hover:border-gray-300 transition-all"
                  >
                     Change
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmed summary */}
      <AnimatePresence>
        {form.bookingConfirmed && (
          <motion.div key="confirmed-summary" variants={revealVariants} initial="hidden" animate="visible" className="mt-6">
            <div className="bg-[#0D5C55] rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">Booking confirmed</p>
                <p className="text-white/80 text-xs mt-0.5">
                  {formatDate(form.bookingDate!)} · {form.bookingTime}
                </p>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, bookingDate: null, bookingTime: "", bookingConfirmed: false }))}
                className="text-white/60 hover:text-white text-xs underline transition-colors"
              >
                Change
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-400 font-medium text-sm hover:border-gray-300 hover:text-gray-600 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <motion.button
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
          whileHover={canSubmit && !isSubmitting ? { scale: 1.02, backgroundColor: "#0D5C55" } : {}}
          whileTap={canSubmit && !isSubmitting ? { scale: 0.98 } : {}}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold tracking-wide transition-all duration-200
            ${canSubmit && !isSubmitting
              ? "bg-[#0D9E8F] text-white shadow-lg shadow-teal-200"
              : "bg-[#0D9E8F]/40 text-white cursor-not-allowed"
            }`}
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.05em", fontSize: "1rem" }}
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> SUBMITTING...</>
          ) : (
            <> SUBMIT MY ENQUIRY <ChevronRightIcon className="w-4 h-4" /></>
          )}
        </motion.button>
      </div>
    </div>
  );
}

// ── Disqualified Screen ──────────────────────────────────────────────────────
function DisqualifiedScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="text-center py-4"
    >
      <div className="text-4xl mb-4">😔</div>
      <h2
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }}
        className="text-3xl sm:text-4xl text-[#0D1A18] uppercase leading-none mb-3"
      >
        Unfortunately, we can't help right now
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed mb-6">
        Our SMSF loan service is available to clients who already have a Self-Managed Super Fund (SMSF) set up.
        If you're looking to establish one, we recommend speaking to a financial adviser first.
      </p>
      <button
        onClick={onRestart}
        className="text-sm text-[#0D9E8F] underline hover:text-[#0D5C55] transition-colors"
      >
        Start again
      </button>
    </motion.div>
  );
}
// ── Main ──────────────────────────────────────────────────────────────────────
// Step names for partial submission tracking
const STEP_NAMES: Record<number, string> = {
  1: "Name",
  2: "SMSF Check",
  3: "Timeline",
  4: "Property Ownership",
  5: "Booking",
};

export default function Home() {
  const [phase, setPhase] = useState<"intro" | "survey" | "disqualified" | "booking">("intro");
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: "", phone: "", email: "",
    hasSmsf: "", ownsProperty: "", timeline: "",
    bookingDate: null, bookingTime: "", bookingConfirmed: false,
  });
  const submitMutation = trpc.survey.submit.useMutation();
  const go = useCallback((next: number) => {
    if (next > step && STEP_NAMES[step]) {
      trackSurveyStep(STEP_NAMES[step], step);
    }
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }, [step]);
  const canProceed: Record<number, boolean> = {
    1: form.name.trim().length > 1,
    2: !!form.hasSmsf,
    3: !!form.timeline,
    4: !!form.ownsProperty,
    5: /^04\d{8}$/.test(form.phone.trim().replace(/\s/g, "")) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) && form.bookingConfirmed,
  };
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      trackLead({ phone: form.phone, email: form.email, bank: "", loanSize: "", interestRate: "" });
      if (form.bookingDate && form.bookingTime) {
        trackBooking({ date: formatDate(form.bookingDate), time: form.bookingTime, name: form.name });
      }
      await submitMutation.mutateAsync({
        name: form.name,
        phone: form.phone,
        email: form.email,
        hasSmsf: form.hasSmsf,
        ownsProperty: form.ownsProperty,
        timeline: form.timeline,
        bookingDate: form.bookingDate ? formatDate(form.bookingDate) : undefined,
        bookingTime: form.bookingTime || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };
  // ── Submitted ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F0F0EE] flex flex-col items-center justify-center px-4">
        <div className="mb-10"><BrandHeader /></div>
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="w-16 h-16 rounded-full bg-[#0D9E8F] flex items-center justify-center mx-auto mb-6"
          >
            <Check className="w-8 h-8 text-white" strokeWidth={2.5} />
          </motion.div>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }} className="text-4xl text-[#0D5C55] uppercase mb-3">
            You're all set!
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Thanks, <strong>{capitalizeFirstName(form.name)}</strong>. We'll call you on{" "}
            <strong>{form.phone}</strong>
            {form.bookingDate && (
              <> on <strong>{formatDate(form.bookingDate)}</strong> at <strong>{form.bookingTime}</strong></>
            )}.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Has SMSF</span>
              <span className="font-semibold text-gray-700">{form.hasSmsf === "yes" ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Owns property</span>
              <span className="font-semibold text-gray-700">{form.ownsProperty === "yes" ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Timeline</span>
              <span className="font-semibold text-gray-700">{form.timeline}</span>
            </div>
            {form.bookingDate && (
              <div className="flex justify-between">
                <span className="text-gray-400">Booking</span>
                <span className="font-semibold text-gray-700">
                  {formatDate(form.bookingDate)} · {form.bookingTime}
                </span>
              </div>
            )}
          </div>

          {/* Quick tip — helps the call go smoothly */}
          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left flex gap-3">
            <span className="text-xl flex-shrink-0">💡</span>
            <div>
              <p className="text-xs font-bold tracking-wide uppercase text-amber-800 mb-1">Quick tip</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Have your SMSF trust deed and most recent member balance handy if you can — it helps us give you accurate numbers on the call.
              </p>
            </div>
          </div>

          {/* Calendar buttons — only when a date+time is booked */}
          {form.bookingDate && form.bookingTime && (
            <div className="mt-5">
              <p className="text-xs font-semibold tracking-wide uppercase text-gray-400 text-center mb-3">Add to your calendar</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <a
                  href={buildGoogleCalendarUrl({
                    date: form.bookingDate, slot: form.bookingTime, name: form.name, phone: form.phone,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-[#0D9E8F] hover:text-[#0D5C55] transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Google
                </a>
                <a
                  href={buildOutlookCalendarUrl({
                    date: form.bookingDate, slot: form.bookingTime, name: form.name, phone: form.phone,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-[#0D9E8F] hover:text-[#0D5C55] transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Outlook
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const ics = buildIcsFile({
                      date: form.bookingDate!, slot: form.bookingTime, name: form.name, phone: form.phone,
                    });
                    downloadIcsFile(ics, "q9-finance-smsf-call.ics");
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-[#0D9E8F] hover:text-[#0D5C55] transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Apple / iCal
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }
  // ── Disqualified ──
  if (phase === "disqualified") {
    return (
      <div className="min-h-screen bg-[#F0F0EE] flex flex-col">
        <BrandHeader />
        <main className="flex-1 flex items-start justify-center px-4 pb-16 pt-8">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-xl overflow-hidden">
            <div className="p-8 sm:p-10">
              <DisqualifiedScreen onRestart={() => {
                setForm({ name: "", phone: "", email: "", hasSmsf: "", ownsProperty: "", timeline: "", bookingDate: null, bookingTime: "", bookingConfirmed: false });
                setStep(1);
                setPhase("intro");
              }} />
            </div>
          </div>
        </main>
        <ComplianceFooter />
      </div>
    );
  }
  // ── Intro ──
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-[#F0F0EE] flex flex-col">
        <BrandHeader />
        <div className="flex items-center justify-center gap-0 mt-6 mb-0">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex items-center">
              <div className="w-3.5 h-3.5 rounded-full bg-gray-300 flex-shrink-0" />
              {i < TOTAL_STEPS - 1 && <div className="w-6 sm:w-10 h-0.5 bg-gray-200 flex-shrink-0" />}
            </div>
          ))}
        </div>
        <main className="flex-1 flex flex-col items-center justify-center px-4 text-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl w-full"
          >
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400 mb-4">
              Servicing clients across Australia 🇦🇺
            </p>
            <h1
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, lineHeight: 0.95, letterSpacing: "-0.01em" }}
              className="text-5xl sm:text-6xl md:text-7xl text-[#0D1A18] uppercase mb-6"
            >
              WE'LL HELP YOU GET A LOAN WITH YOUR SMSF
            </h1>
            <p className="text-gray-500 text-base sm:text-lg leading-relaxed max-w-lg mx-auto mb-8">
              Find out how much you can save in 15 seconds across 30+ lenders with our 100% free interest rate checking tool.
            </p>
            <div className="flex flex-col items-center gap-3 relative">
              {/* Hand-drawn curvy doodle arrow pointing at the button */}
              <motion.div
                animate={{ y: [0, 8, 0], rotate: [0, -3, 3, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
                aria-hidden="true"
                style={{ filter: "drop-shadow(0 2px 4px rgba(13,158,143,0.3))" }}
              >
                <svg width="72" height="64" viewBox="0 0 72 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Curvy hand-drawn style path */}
                  <path
                    d="M 8 6 C 12 6, 28 4, 36 14 C 44 24, 40 38, 36 50"
                    stroke="#0D9E8F"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    style={{ strokeDasharray: "none" }}
                  />
                  {/* Arrowhead */}
                  <path
                    d="M 28 46 C 30 50, 34 54, 36 50 C 38 46, 44 44, 46 46"
                    stroke="#0D9E8F"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </motion.div>
              <motion.button
                onClick={() => setPhase("survey")}
                whileHover={{ scale: 1.03, backgroundColor: "#0D5C55" }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-xl font-bold text-lg text-white transition-colors duration-200"
                style={{ backgroundColor: "#0D9E8F", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.04em" }}
              >
                GET STARTED
                <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
              </motion.button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-6">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`w-4 h-4 ${i <= 4 ? "fill-yellow-400 text-yellow-400" : "fill-yellow-200 text-yellow-200"}`} />
                ))}
              </div>
              <span className="text-sm text-gray-400 font-medium">4.8 stars from 1,200+ Australians helped</span>
            </div>
          </motion.div>
        </main>
        <ComplianceFooter />
      </div>
    );
  }

  // ── Analysing interstitial ──
  // ── Survey ──
  return (
    <div className="min-h-screen bg-[#F0F0EE] flex flex-col">
      <BrandHeader />
      <div className="mt-6">
        <DotProgress step={step} total={TOTAL_STEPS} />
      </div>
      <main className="flex-1 flex items-start justify-center px-4 pb-8">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-xl overflow-hidden">
          <div className="p-8 sm:p-10">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={transition}
              >
                {/* Step 1: Name */}
                {step === 1 && (
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase text-[#0D9E8F] mb-3">Let's get started</p>
                    <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }} className="text-4xl sm:text-5xl text-[#0D1A18] uppercase leading-none mb-2">
                      What's your name?
                    </h2>
                    <p className="text-gray-400 text-sm mb-6">We'll personalise your experience.</p>
                    <input
                      type="text"
                      placeholder="Your full name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && canProceed[1] && go(2)}
                      className="w-full px-5 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-800 font-medium text-base placeholder:text-gray-300 focus:outline-none focus:border-[#0D9E8F] focus:bg-white transition-all"
                      autoFocus
                    />
                    <NavButtons onBack={() => {}} onNext={() => go(2)} canNext={canProceed[1]} isFirst />
                  </div>
                )}
                {/* Step 2: Do you have SMSF? */}
                {step === 2 && (
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase text-[#0D9E8F] mb-3">Eligibility</p>
                    <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }} className="text-4xl sm:text-5xl text-[#0D1A18] uppercase leading-none mb-2">
                      Do you have an SMSF set up?
                    </h2>
                    <p className="text-gray-400 text-sm mb-6">A Self-Managed Super Fund (SMSF) is required to access this type of loan.</p>
                    <div className="space-y-2.5">
                      {[
                        { value: "yes", label: "Yes, I have an SMSF" },
                        { value: "no",  label: "No, I don't have one yet" },
                      ].map(opt => (
                        <OptionPill
                          key={opt.value}
                          label={opt.label}
                          selected={form.hasSmsf === opt.value}
                          onClick={() => {
                            setForm(f => ({ ...f, hasSmsf: opt.value }));
                            if (opt.value === "no") {
                              setTimeout(() => setPhase("disqualified"), 320);
                            } else {
                              setTimeout(() => go(3), 320);
                            }
                          }}
                        />
                      ))}
                    </div>
                    <NavButtons onBack={() => go(1)} onNext={() => go(3)} canNext={canProceed[2]} />
                  </div>
                )}
                {/* Step 3: Timeline */}
                {step === 3 && (
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase text-[#0D9E8F] mb-3">Timing</p>
                    <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }} className="text-4xl sm:text-5xl text-[#0D1A18] uppercase leading-none mb-2">
                      How soon are you needing to get the loan?
                    </h2>
                    <p className="text-gray-400 text-sm mb-6">We'll tailor our approach to your timeline.</p>
                    <div className="space-y-2.5">
                      {SMSF_TIMELINES.map(t => (
                        <OptionPill key={t} label={t} selected={form.timeline === t} onClick={() => {
                          setForm(f => ({ ...f, timeline: t }));
                          setTimeout(() => go(4), 320);
                        }} />
                      ))}
                    </div>
                    <NavButtons onBack={() => go(2)} onNext={() => go(4)} canNext={canProceed[3]} />
                  </div>
                )}
                {/* Step 4: Do you currently own a property? */}
                {step === 4 && (
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase text-[#0D9E8F] mb-3">Property</p>
                    <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }} className="text-4xl sm:text-5xl text-[#0D1A18] uppercase leading-none mb-2">
                      Do you currently own a property?
                    </h2>
                    <p className="text-gray-400 text-sm mb-6">This helps us understand your situation better.</p>
                    <div className="space-y-2.5">
                      {[
                        { value: "yes", label: "Yes, I own a property" },
                        { value: "no",  label: "No, I don't own one yet" },
                      ].map(opt => (
                        <OptionPill
                          key={opt.value}
                          label={opt.label}
                          selected={form.ownsProperty === opt.value}
                          onClick={() => {
                            setForm(f => ({ ...f, ownsProperty: opt.value }));
                            setTimeout(() => go(5), 320);
                          }}
                        />
                      ))}
                    </div>
                    <NavButtons onBack={() => go(3)} onNext={() => go(5)} canNext={canProceed[4]} />
                  </div>
                )}
                {/* Step 5: Book a call (Calendly-style) */}
                {step === 5 && (
                  <StepBooking
                    form={form}
                    setForm={setForm}
                    onBack={() => go(4)}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="border-t border-gray-50 px-8 sm:px-10 py-3 bg-gray-50/60 flex items-center justify-between">
            <p className="text-xs text-gray-300">Secure · Confidential · Free</p>
            <p className="text-xs text-gray-400 font-medium">Step {step} of {TOTAL_STEPS}</p>
          </div>
        </div>
      </main>
      <ComplianceFooter />
    </div>
  );
}

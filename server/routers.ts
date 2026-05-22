import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { createLead, updateLeadReport, updateLeadStatus, getLeadById, getAllLeads, deleteLead, getAllBlockedSlots, toggleBlockedSlot, clearAllBlockedSlots } from "./db";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  survey: router({
    // Submit survey and create a lead record
    submit: publicProcedure
      .input(z.object({
        name: z.string(),
        phone: z.string(),
        email: z.string(),
        hasSmsf: z.string(),
        ownsProperty: z.string(),
        timeline: z.string(),
        bookingDate: z.string().optional(),
        bookingTime: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const leadId = await createLead({
          name: input.name,
          phone: input.phone,
          email: input.email,
          hasSmsf: input.hasSmsf,
          ownsProperty: input.ownsProperty,
          bank: "",
          bankName: "",
          loanSize: "",
          interest: "",
          timeline: input.timeline,
          bookingDate: input.bookingDate,
          bookingTime: input.bookingTime,
          reportStatus: "pending",
        });
        // Fire Make.com webhook — send all lead details to WhatsApp group
        const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/a88a8svvkiu7md1phmr41vpgnsdd36wa";
        fetch(MAKE_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId,
            name: input.name,
            phone: input.phone,
            email: input.email,
            hasSmsf: input.hasSmsf,
            ownsProperty: input.ownsProperty,
            timeline: input.timeline,
            bookingDate: input.bookingDate ?? "TBC",
            bookingTime: input.bookingTime ?? "",
            submittedAt: new Date().toISOString(),
          }),
        }).catch(err => console.error("[Make.com webhook] Failed:", err));

        // Notify owner
        await notifyOwner({
          title: `New SMSF loan enquiry from ${input.name}`,
          content: `Phone: ${input.phone}\nEmail: ${input.email}\nHas SMSF: ${input.hasSmsf}\nOwns Property: ${input.ownsProperty}\nTimeline: ${input.timeline}\nBooking: ${input.bookingDate ?? "TBC"} ${input.bookingTime ?? ""}`,
        }).catch(() => {});
        return { leadId };
      }),

    // Poll report status
    getReport: publicProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        const lead = await getLeadById(input.leadId);
        if (!lead) return { status: "not_found" as const, report: null };
        return {
          status: lead.reportStatus,
          report: lead.aiReport as BrokerReport | null,
        };
      }),

    // Admin: get all leads
    getAllLeads: publicProcedure.query(async () => {
      return getAllLeads();
    }),

    // Admin: delete a lead
    deleteLead: publicProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteLead(input.leadId);
        return { success: true };
      }),
  }),

  // ── Blocked slots ──────────────────────────────────────────────────────────
  blockedSlots: router({
    // Get all blocked slot keys (used by both admin calendar and survey picker)
    getAll: publicProcedure.query(async () => {
      const slots = await getAllBlockedSlots();
      return slots.map(s => ({ slotKey: s.slotKey, isWholeDay: s.isWholeDay === 1 }));
    }),

    // Toggle a single slot or whole day on/off
    toggle: publicProcedure
      .input(z.object({
        slotKey: z.string(),
        isWholeDay: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        return toggleBlockedSlot(input.slotKey, input.isWholeDay);
      }),

    // Batch toggle multiple slots at once (used by drag-to-block)
    batchToggle: publicProcedure
      .input(z.object({
        slots: z.array(z.object({
          slotKey: z.string(),
          isWholeDay: z.boolean(),
        })),
      }))
      .mutation(async ({ input }) => {
        await Promise.all(input.slots.map(s => toggleBlockedSlot(s.slotKey, s.isWholeDay)));
        return { success: true };
      }),

    // Clear all blocked slots
    clearAll: publicProcedure.mutation(async () => {
      await clearAllBlockedSlots();
      return { success: true };
    }),
  }),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LenderOption {
  lenderName: string;
  estimatedRate: string;
  rateType: string;
  estimatedMonthlySaving: string;
  annualSaving: string;
  features: string[];
  suitability: string;
}

export interface BrokerReport {
  summary: string;
  currentSituation: string;
  potentialSaving: string;
  recommendedLenders: LenderOption[];
  nextSteps: string[];
  riskNotes: string;
  generatedAt: string;
}

// ── AI Report Generator ────────────────────────────────────────────────────────

async function generateBrokerReport(
  leadId: number,
  data: {
    name: string;
    bank: string;
    bankName: string;
    loanSize: string;
    interest: string;
    timeline: string;
  }
) {
  try {
    await updateLeadStatus(leadId, "generating");

    const prompt = `You are an expert Australian mortgage broker assistant. Analyse the following client's home loan situation and generate a detailed broker report.

CLIENT DETAILS:
- Name: ${data.name}
- Current Bank: ${data.bankName}
- Loan Size: ${data.loanSize}
- Current Interest Rate: ${data.interest}
- Timeline to Switch: ${data.timeline}

Generate a comprehensive broker report with:
1. A brief summary of the client's situation
2. An assessment of their current situation vs market rates
3. Estimated potential savings
4. 4-5 specific lender recommendations with realistic current Australian market rates (as of 2025-2026)
5. Clear next steps for the client
6. Any risk notes or considerations

Use realistic Australian lenders such as: ANZ, Commonwealth Bank, Westpac, NAB, ING, Macquarie, St. George, Suncorp, Bendigo Bank, Bank of Melbourne, HSBC Australia, Athena, Reduce Home Loans, Unloan, etc.

Return ONLY valid JSON matching this exact schema with no extra text.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert Australian mortgage broker. Always return valid JSON only, no markdown, no extra text." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "broker_report",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              currentSituation: { type: "string" },
              potentialSaving: { type: "string" },
              recommendedLenders: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    lenderName: { type: "string" },
                    estimatedRate: { type: "string" },
                    rateType: { type: "string" },
                    estimatedMonthlySaving: { type: "string" },
                    annualSaving: { type: "string" },
                    features: { type: "array", items: { type: "string" } },
                    suitability: { type: "string" },
                  },
                  required: ["lenderName", "estimatedRate", "rateType", "estimatedMonthlySaving", "annualSaving", "features", "suitability"],
                  additionalProperties: false,
                },
              },
              nextSteps: { type: "array", items: { type: "string" } },
              riskNotes: { type: "string" },
              generatedAt: { type: "string" },
            },
            required: ["summary", "currentSituation", "potentialSaving", "recommendedLenders", "nextSteps", "riskNotes", "generatedAt"],
            additionalProperties: false,
          },
        },
      },
    } as any);

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No content from LLM");

    const report: BrokerReport = typeof content === "string" ? JSON.parse(content) : content;
    report.generatedAt = new Date().toISOString();

    await updateLeadReport(leadId, report, "ready");
    console.log(`[AI Report] Generated successfully for lead ${leadId}`);
  } catch (err) {
    console.error("[AI Report] Failed:", err);
    await updateLeadReport(leadId, null, "failed");
  }
}

export type AppRouter = typeof appRouter;

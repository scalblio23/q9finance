# Finchecker Project TODO

## Migration (from uploaded zip)

- [x] Transplant Home.tsx (multi-step mortgage refinancing survey landing page)
- [x] Transplant BrokerAdmin.tsx (broker admin dashboard at /harborviewreports)
- [x] Merge server/routers.ts — survey.submit, survey.getReport, survey.getAllLeads, survey.deleteLead procedures
- [x] Merge server/db.ts — lead helpers (createLead, updateLeadReport, updateLeadStatus, getLeadById, getAllLeads, deleteLead)
- [x] Apply drizzle/schema.ts — leads table added, migration run
- [x] Copy shared/types.ts, shared/const.ts, shared/_core/errors.ts (already matched scaffold)
- [x] Update client/src/App.tsx — BrokerAdmin route registered at /harborviewreports
- [x] Copy client/src/lib/pixel.ts — Meta Pixel tracking helper
- [x] Apply client/src/index.css — Finchecker design system (dark teal, light grey, Barlow Condensed + DM Sans)
- [x] Update client/index.html — Barlow Condensed + DM Sans fonts, Meta Pixel base code
- [x] Fix server/_core/storageProxy.ts TypeScript error
- [x] Verified TypeScript compiles with zero errors
- [x] Dev server renders landing page correctly

## Pending / Suggested Next Steps

- [ ] Connect Make.com webhook — auto-SMS/email leads on submission
- [ ] Replace fake time slots with Calendly embed for real bookings
- [ ] Password-protect /harborviewreports with a PIN gate
- [ ] Add "Mark as Contacted" status on lead cards
- [ ] CSV export of all leads
- [ ] Add scarcity copy on booking CTA ("Only 4 spots left this week")
- [ ] Microsoft Clarity or Hotjar session recording
- [ ] CompleteRegistration pixel event on final confirmation screen

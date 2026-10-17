import type { FaqEntry } from "../src/faq-match.js";
import type { Chunk } from "../src/pipeline.js";

/** The course's running example: Harbor Bikes, a fictional bike-share programme. */
export const FAQ: FaqEntry[] = [
  {
    id: "reset-password",
    questions: ["How do I reset my password?", "I forgot my password", "I can't log in to my account"],
    answer: "Use “Forgot password” on the sign-in screen. The reset link expires after 30 minutes.",
    source: "https://help.harbor.example/account/password",
  },
  {
    id: "lost-card",
    questions: ["I lost my membership card", "My card is missing", "How do I replace a lost card?"],
    answer: "Report it in the app under Membership → Card. A replacement costs $10 and ships in 3–5 days.",
    source: "https://help.harbor.example/membership/card",
  },
  {
    id: "refund",
    questions: ["Can I get a refund?", "What is the refund policy?", "Cancel my membership and get my money back"],
    answer: "Annual memberships are refundable within 14 days of purchase. Day passes are not refundable.",
    source: "https://help.harbor.example/billing/refunds",
  },
  {
    id: "hours",
    questions: ["What are the station hours?", "When can I rent a bike?"],
    answer: "Stations are open 24/7. The support line runs 7am–9pm.",
    source: "https://help.harbor.example/riding/hours",
  },
  {
    id: "ebike",
    questions: ["Do you have e-bikes?", "Where are the electric bikes?"],
    answer: "E-bikes dock at Riverside and Old Town stations. Annual members get a 20% e-bike discount.",
    source: "https://help.harbor.example/riding/ebikes",
  },
];

export const CHUNKS: Chunk[] = [
  { id: "plans-1", title: "Plans", url: "https://help.harbor.example/plans", text: "Harbor offers three plans: Day Pass, Monthly Membership and Annual Membership. The Annual Membership includes unlimited 45-minute rides and an e-bike discount." },
  { id: "support-1", title: "Support channels", url: "https://help.harbor.example/support", text: "Annual members use the priority phone line (7am–9pm). Monthly members get email support within one business day. Day pass riders can use chat support in the app." },
  { id: "terms-1", title: "Membership terms", url: "https://help.harbor.example/terms.pdf", text: "A late fee of $0.25 per minute applies to Day Pass and Monthly Membership rides over the limit. A lost card fee of $10 applies to Monthly and Annual Memberships. Annual Memberships may be refunded within 14 days." },
];

export const TRIPLES = `
Annual Membership | includes | E-bike discount | plans-page
Annual Membership | includes | Priority phone line | support-page
Annual Membership | includes | Unlimited 45-minute rides | plans-page
Monthly Membership | includes | Unlimited 45-minute rides | plans-page
Monthly Membership | includes | Email support | support-page
Day Pass | includes | Free first 30 minutes | plans-page
Day Pass | includes | Chat support | support-page
Late fee | applies to | Day Pass | terms-pdf
Late fee | applies to | Monthly Membership | terms-pdf
Lost card fee | applies to | Monthly Membership | terms-pdf
Lost card fee | applies to | Annual Membership | terms-pdf
14-day refund | applies to | Annual Membership | terms-pdf
E-bike discount | valid at | Riverside Station | plans-page
E-bike discount | valid at | Old Town Station | plans-page
Riverside Station | has | E-bike dock | stations-page
Old Town Station | has | E-bike dock | stations-page
Priority phone line | hours | 7am-9pm | support-page
Email support | response time | 1 business day | support-page
`;

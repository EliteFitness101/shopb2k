// Static program catalog powering /programs and /programs/$slug.
export interface Program {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  overview: string;
  benefits: string[];
  audience: string[];
  outcomes: string[];
  faqs: Array<{ q: string; a: string }>;
  relatedProductTags?: string[];
  relatedArticles?: string[];
}

export const PROGRAMS: Program[] = [
  {
    slug: "strength-foundations",
    title: "Strength Foundations",
    eyebrow: "12-Week Program",
    summary:
      "Build a resilient, capable body with progressive strength training coached by ChatB2K™.",
    overview:
      "A twelve-week strength arc designed for everyday humans who want to feel powerful, mobile and confident. Every session is personalized to your equipment, schedule and recovery.",
    benefits: [
      "Progressive strength across squat, hinge, push and pull",
      "Better posture, joint health and daily energy",
      "Custom load recommendations from ChatB2K™",
      "Weekly check-ins and adaptive programming",
    ],
    audience: [
      "New to structured training",
      "Returning after a break",
      "Anyone building a home gym",
    ],
    outcomes: [
      "Measurable strength gains in 8 weeks",
      "Improved mobility and posture",
      "Habit consistency and confidence",
    ],
    faqs: [
      {
        q: "Do I need a full gym?",
        a: "No. A barbell, a rack and plates cover 95% of the program.",
      },
      { q: "How much time per session?", a: "45–60 minutes, three to four times a week." },
    ],
    relatedProductTags: ["barbell", "rack", "plate"],
  },
  {
    slug: "longevity",
    title: "Longevity & Healthy Ageing",
    eyebrow: "Candera Program",
    summary: "Move well for the next 40 years — strength, mobility, sleep and metabolic health.",
    overview:
      "A holistic longevity arc blending zone-2 conditioning, mobility, strength and nutrition. Designed for adults 35+ who want energy, resilience and confidence in the decades ahead.",
    benefits: [
      "Metabolic and cardiovascular resilience",
      "Joint health and daily mobility",
      "Sleep, stress and recovery routines",
      "Nutrition guidance rooted in whole foods",
    ],
    audience: ["Adults 35+", "Executives and busy parents", "Anyone prioritizing healthspan"],
    outcomes: [
      "Higher resting energy",
      "Better mobility and sleep quality",
      "Sustainable habits you actually keep",
    ],
    faqs: [
      {
        q: "Is this a weight-loss program?",
        a: "No. It is a healthspan program — body composition improves as a side effect of consistent training and nutrition.",
      },
    ],
  },
  {
    slug: "mobility-recovery",
    title: "Mobility & Recovery",
    eyebrow: "6-Week Program",
    summary: "Move freely, recover faster, sleep deeper — a body-confidence reset.",
    overview:
      "Short daily mobility flows plus a structured recovery protocol: breathwork, stretching, soft tissue and sleep hygiene.",
    benefits: [
      "Reduced stiffness and pain",
      "Better sleep quality",
      "Faster training recovery",
      "Mind-body reconnection",
    ],
    audience: ["Desk workers", "Post-injury returnees", "High-stress professionals"],
    outcomes: ["Freer hips and shoulders", "Deeper sleep", "Calmer nervous system"],
    faqs: [{ q: "How long each day?", a: "15–20 minutes, six days a week." }],
  },
  {
    slug: "nutrition-reset",
    title: "Nutrition Reset",
    eyebrow: "21-Day Reset",
    summary: "Whole-food nutrition tailored to your African kitchen and lifestyle by ChatB2K™.",
    overview:
      "A 21-day guided reset that rebuilds your relationship with food. Real African meals, sustainable habits, no crash dieting.",
    benefits: [
      "Better energy and digestion",
      "Craving control without restriction",
      "Meal templates for busy weeks",
      "ChatB2K™ personalized food swaps",
    ],
    audience: ["Anyone wanting food clarity", "Busy professionals", "Families cooking together"],
    outcomes: ["Steady energy", "Improved body confidence", "Sustainable habits"],
    faqs: [
      {
        q: "Is anything banned?",
        a: "No banned foods — just smarter defaults and portion literacy.",
      },
    ],
  },
  {
    slug: "resoluxe",
    title: "ResoLuxe Privé",
    eyebrow: "Members Only",
    summary: "Concierge wellness for high-performers — coaching, recovery and body confidence.",
    overview:
      "An invite-first membership blending 1:1 coaching, recovery science and premium ResoFit hardware. Delivered nationwide with white-glove support.",
    benefits: [
      "1:1 CoachB2K™ programming",
      "Priority WhatsApp support",
      "Quarterly hardware allowance",
      "Members-only events",
    ],
    audience: ["Founders, executives, athletes"],
    outcomes: ["Sustainable performance", "Body confidence", "Longevity ROI"],
    faqs: [{ q: "How do I join?", a: "Members are onboarded by invitation after an intake call." }],
  },
];

export const getProgram = (slug: string) => PROGRAMS.find((p) => p.slug === slug);

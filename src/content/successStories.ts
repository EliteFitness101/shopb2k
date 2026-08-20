export interface SuccessStory {
  id: string;
  name: string;
  location: string;
  program: string;
  quote: string;
  outcome: string;
}

export const SUCCESS_STORIES: SuccessStory[] = [
  {
    id: "1",
    name: "Ada — Lagos",
    location: "Lagos, NG",
    program: "Strength Foundations",
    quote: "I stopped chasing weight loss and started chasing capability. Everything changed.",
    outcome: "Deadlifted bodyweight × 1.5 in 14 weeks.",
  },
  {
    id: "2",
    name: "Kunle — Abuja",
    location: "Abuja, NG",
    program: "Longevity & Healthy Ageing",
    quote:
      "At 52, I have more energy than I did at 40. My sleep is better. My knees stopped talking.",
    outcome: "Resting heart rate down 11 bpm; sleep score up 22%.",
  },
  {
    id: "3",
    name: "Chidinma — Port Harcourt",
    location: "Port Harcourt, NG",
    program: "Nutrition Reset",
    quote: "I learned my kitchen was never the problem. I just needed a smarter plate.",
    outcome: "Stable energy through 21 days without cutting jollof.",
  },
];

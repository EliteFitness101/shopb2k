// Static Journal / Blog content.
export interface Article {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  body: string; // simple markdown-lite (paragraphs separated by \n\n)
  publishedAt: string;
  readingMinutes: number;
  featured?: boolean;
}

export const ARTICLES: Article[] = [
  {
    slug: "personalized-wellness-africa",
    title: "Why Personalized Wellness Is Africa's Next Chapter",
    category: "Healthy Living",
    excerpt:
      "Generic fitness plans fail because bodies, kitchens and cultures aren't generic. Here's what personalization actually means.",
    body: `Africa's wellness moment isn't about copying Western fat-loss templates. It's about honoring the meals, movement patterns and rhythms that already live in our communities — and personalizing on top of them.

ChatB2K™ was built to translate your lifestyle into a plan that fits: your goals, your kitchen, your schedule, your recovery capacity.

Personalization isn't a feature. It's the whole point.`,
    publishedAt: "2025-11-04",
    readingMinutes: 4,
    featured: true,
  },
  {
    slug: "healthy-ageing-strength",
    title: "Strength Is the Longevity Drug You're Missing",
    category: "Healthy Ageing",
    excerpt: "Muscle is metabolic currency. Here's how to bank it for the next 40 years.",
    body: `Every decade after 30, we lose muscle unless we deliberately train for it. Muscle is the organ of longevity — it drives metabolism, stabilizes joints and protects independence.

You don't need to become a bodybuilder. You need consistent, progressive strength training two to three times a week, matched to your recovery.

Start with the Strength Foundations program.`,
    publishedAt: "2025-10-22",
    readingMinutes: 5,
  },
  {
    slug: "mobility-daily-habit",
    title: "The 15-Minute Mobility Habit That Changes Everything",
    category: "Mobility",
    excerpt: "You don't need an hour. You need consistency and the right sequence.",
    body: `Fifteen minutes a day, five days a week, beats one 90-minute session per weekend every time. Mobility is a nervous system skill — it responds to frequency.

Try the Mobility & Recovery program's opening sequence: 3 minutes breath, 6 minutes hips, 6 minutes shoulders.`,
    publishedAt: "2025-10-11",
    readingMinutes: 3,
    featured: true,
  },
  {
    slug: "nutrition-nigerian-kitchen",
    title: "Whole-Food Nutrition, Nigerian Kitchen Edition",
    category: "Nutrition",
    excerpt: "Egusi, jollof and beans aren't the problem. Portion literacy is.",
    body: `African cuisine is naturally nutrient-dense. The question isn't what to remove — it's how to balance protein, fibre and starch on the plate you already love.

Our Nutrition Reset walks you through 21 days of practical templates using foods you already buy.`,
    publishedAt: "2025-09-30",
    readingMinutes: 4,
  },
  {
    slug: "recovery-sleep-first",
    title: "Sleep First, Everything Else Second",
    category: "Recovery",
    excerpt: "You cannot out-supplement, out-train or out-diet poor sleep.",
    body: `Sleep is the highest-leverage recovery input we have. Before you buy another supplement, audit your sleep environment, light exposure and evening habits.

The Mobility & Recovery program includes a two-week sleep protocol.`,
    publishedAt: "2025-09-14",
    readingMinutes: 4,
  },
  {
    slug: "body-confidence-training",
    title: "Body Confidence Is a Training Outcome",
    category: "Body Confidence",
    excerpt: "Confidence is built in reps, not mirrors.",
    body: `Body confidence rarely arrives from losing weight — it arrives from doing hard things consistently. Strength training reliably delivers both.

Start where you are. Track how you feel, not just how you look.`,
    publishedAt: "2025-08-28",
    readingMinutes: 3,
  },
];

export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);
export const ARTICLE_CATEGORIES = Array.from(new Set(ARTICLES.map((a) => a.category)));

import plate from "@/assets/product-plate.jpg";
import barbell from "@/assets/product-barbell.jpg";
import dumbbell from "@/assets/product-dumbbell.jpg";
import rack from "@/assets/product-rack.jpg";

export type Product = {
  id: string;
  name: string;
  category: string;
  priceNGN: number;
  priceUSD: number;
  image: string;
  spec: string;
};

export const products: Product[] = [
  {
    id: "bumper-20",
    name: "Bumper Plate 20kg",
    category: "Plates",
    priceNGN: 95000,
    priceUSD: 119,
    image: plate,
    spec: "Competition-grade virgin rubber. Steel insert. Pair.",
  },
  {
    id: "ob-bar",
    name: "Olympic Barbell — 20kg",
    category: "Bars",
    priceNGN: 185000,
    priceUSD: 229,
    image: barbell,
    spec: "190k PSI tensile. Bronze bushings. Dual knurl marks.",
  },
  {
    id: "hex-db",
    name: "Hex Dumbbell — per kg",
    category: "Dumbbells",
    priceNGN: 4200,
    priceUSD: 5.5,
    image: dumbbell,
    spec: "Rubber-coated hex. Chrome handle. Sold individually.",
  },
  {
    id: "power-rack",
    name: "P-1 Power Rack",
    category: "Racks",
    priceNGN: 985000,
    priceUSD: 1199,
    image: rack,
    spec: "11-gauge steel. 1000kg static rating. Westside hole spacing.",
  },
];

export const formatNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

export const formatUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

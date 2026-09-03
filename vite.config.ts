// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Keep TanStack Start's server entry explicit while splitting large client-side vendor
// dependencies out of the application chunk. This reduces initial JS without changing
// route behavior or application code.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/scheduler/")
            ) {
              return "vendor-react";
            }

            if (
              id.includes("@tanstack/react-router") ||
              id.includes("@tanstack/react-query") ||
              id.includes("@tanstack/router-core") ||
              id.includes("@tanstack/query-core")
            ) {
              return "vendor-tanstack";
            }

            if (id.includes("@supabase/") || id.includes("@lovable.dev/")) {
              return "vendor-platform";
            }

            if (id.includes("recharts") || id.includes("victory")) {
              return "vendor-charts";
            }

            if (
              id.includes("@radix-ui/") ||
              id.includes("lucide-react") ||
              id.includes("cmdk") ||
              id.includes("vaul")
            ) {
              return "vendor-ui";
            }

            if (
              id.includes("react-hook-form") ||
              id.includes("@hookform/") ||
              id.includes("react-day-picker") ||
              id.includes("date-fns")
            ) {
              return "vendor-forms";
            }

            return "vendor-misc";
          },
        },
      },
    },
  },
});

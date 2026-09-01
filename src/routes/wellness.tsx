import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/wellness")({
  head: () => ({
    meta: [
      { title: "ResoFit Wellness Network" },
      { name: "description", content: "Discover wellness services and hubs across Nigeria through ResoFit." },
    ],
  }),
  component: WellnessLayout,
});

function WellnessLayout() {
  return <Outlet />;
}

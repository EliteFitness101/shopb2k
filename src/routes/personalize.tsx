import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/personalize")({
  beforeLoad: () => {
    throw redirect({ to: "/me" });
  },
});

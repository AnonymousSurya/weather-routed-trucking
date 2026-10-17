import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        risk: {
          low: "#22c55e",
          moderate: "#eab308",
          high: "#f97316",
          severe: "#ef4444",
          "no-travel": "#7c3aed",
        },
        brand: {
          teal: "#0d9488",
          dark: "#0f172a",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Source Sans 3'", "sans-serif"],
      },
      colors: {
        ink: "#1c1b20",
        sand: "#f6f1e7",
        clay: "#d8c6a6",
        moss: "#4e6b57",
        sunrise: "#f2b263",
      },
      boxShadow: {
        panel: "0 10px 30px rgba(28, 27, 32, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;

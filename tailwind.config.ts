import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-bricolage)", "var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-space-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.08)",
        "card-hover": "0 4px 12px rgba(16,24,40,0.10), 0 2px 4px rgba(16,24,40,0.08)",
        paper: "0 1px 2px rgba(25,24,23,0.04), 0 1px 3px rgba(25,24,23,0.06)",
      },
      colors: {
        paper: { DEFAULT: "#FAF8F4", deep: "#F1EDE5" },
        ink: { DEFAULT: "#191817", soft: "#4A4642" },
        muted: "#8C867E",
        line: "#E3DDD2",
        accent: { DEFAULT: "#FF5A3C", dark: "#e94b2f" },
        live: "#16A34A",
        amber: "#F59E0B",
        blue: "#2563EB",
        card: "#FFFFFF",
        brand: {
          DEFAULT: "#FF6A00",
          50: "#FFF3EB",
          100: "#FFE2CC",
          200: "#FFC599",
          300: "#FFA866",
          400: "#FF8B33",
          500: "#FF6A00",
          600: "#CC5500",
          700: "#993F00",
          800: "#662A00",
          900: "#331500",
        },
      },
    },
  },
  plugins: [],
};
export default config;

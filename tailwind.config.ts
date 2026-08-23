import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
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

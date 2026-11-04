import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sanrio: {
          white: "#FFFFFF",
          surface: "#F8FAFC",
          charcoal: "#334155",
          cinnamoroll: "#BAE6FD",
          cinnamorollDeep: "#38BDF8",
          mymelody: "#FECDD3",
          mymelodyDeep: "#FB7185",
          kuromi: "#E9D5FF",
          kuromiDeep: "#A855F7",
        },
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(254, 205, 211, 0.35), 0 4px 20px -6px rgba(186, 230, 253, 0.28)",
        pill: "0 12px 32px -8px rgba(51, 65, 85, 0.08), 0 2px 8px -2px rgba(254, 205, 211, 0.35)",
        card: "0 8px 30px rgba(51, 65, 85, 0.04)",
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      keyframes: {
        "soft-pulse": {
          "0%, 100%": { opacity: "0.75", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.06)" },
        },
      },
      animation: {
        "soft-pulse": "soft-pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

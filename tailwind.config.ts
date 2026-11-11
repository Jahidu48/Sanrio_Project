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
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        display: [
          '"Fredoka"',
          '"Plus Jakarta Sans"',
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      colors: {
        sanrio: {
          white: "#FFFFFF",
          surface: "#FFFDF9",
          charcoal: "#2D232E",
          cinnamoroll: "#BAE6FD",
          cinnamorollDeep: "#0284C7",
          mymelody: "#FECDD3",
          mymelodyDeep: "#F43F5E",
          kuromi: "#F5D0FE",
          kuromiDeep: "#D946EF",
        },
      },
      boxShadow: {
        soft: "0 8px 28px -10px rgba(74, 53, 49, 0.08), 0 2px 8px -2px rgba(244, 114, 182, 0.12)",
        pill: "0 8px 24px -6px rgba(74, 53, 49, 0.08), 0 2px 6px -1px rgba(244, 114, 182, 0.15)",
        card: "0 6px 20px -6px rgba(74, 53, 49, 0.06)",
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      keyframes: {
        "soft-pulse": {
          "0%, 100%": { opacity: "0.85", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
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

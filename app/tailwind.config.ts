import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        krontec: {
          blue: "#23478f",
          "blue-dark": "#18366f",
          purple: "#70549e",
          violet: "#7d5fff",
          sky: "#6ab6ef",
          gray: "#d3d3d3",
        },
        ink: {
          DEFAULT: "#111c35",
          muted: "#667085",
        },
        surface: "#ffffff",
        bg: "#f7f9fc",
        border: "#d8dee8",
        danger: {
          DEFAULT: "#c93434",
          soft: "#fff4f4",
        },
        success: "#198754",
      },
      borderRadius: {
        control: "0.625rem",
        card: "1.125rem",
      },
      boxShadow: {
        card: "0 1.25rem 3.75rem rgba(35, 71, 143, 0.12)",
        focus: "0 0 0 0.25rem rgba(35, 71, 143, 0.1)",
      },
      transitionDuration: {
        fast: "160ms",
      },
      fontFamily: {
        sans: [
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;

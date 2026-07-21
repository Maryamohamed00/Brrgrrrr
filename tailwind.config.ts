import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C1B1A",
        surface: "#0F0E0D",
        panel: "#F6F2EC",
        card: "#FFFFFF",
        line: "#E4DFD6",
        fire: "#FF5A36",
        "fire-dark": "#D9431F",
        success: "#2FA84F",
        warning: "#E8A33D",
        muted: "#8A8579",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;

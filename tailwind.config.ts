import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E2A33",
        porcelain: "#F3F6F5",
        line: "#DCE3E1",
        brand: { DEFAULT: "#2457D6", soft: "#E8EEFC" },
        ready: { DEFAULT: "#1E7F5C", soft: "#E3F4EC" },
        late: { DEFAULT: "#B42318", soft: "#FCE9E7" },
        qc: { DEFAULT: "#6D4BC2", soft: "#EFEAFB" },
        warn: { DEFAULT: "#B54708", soft: "#FDF0E1" },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Instrument Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;

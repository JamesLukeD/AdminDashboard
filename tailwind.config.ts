import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#0a1a12",
          100: "#0d2a1c",
          200: "#0f3d28",
          300: "#00b366",
          400: "#00cc77",
          500: "#00ff88",
          600: "#33ffaa",
          700: "#66ffbb",
          800: "#99ffcc",
          900: "#ccffee",
        },
        surface: {
          0: "#060a0f",
          1: "#0a0e14",
          2: "#0d1117",
          3: "#161b22",
          4: "#21262d",
          5: "#30363d",
        },
      },
    },
  },
  plugins: [],
};

export default config;

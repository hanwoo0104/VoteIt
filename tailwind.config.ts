import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./stores/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif"
        ]
      },
      colors: {
        navy: {
          50: "#eff6ff",
          100: "#d9e9ff",
          500: "#2f5277",
          700: "#18375a",
          900: "#0f2744"
        },
        vote: {
          red: "#e4233f",
          blue: "#2d5a88",
          ink: "#121826",
          soft: "#f3f6fa"
        }
      },
      boxShadow: {
        soft: "none",
        glow: "none"
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" }
        },
        floatUp: {
          "0%": { transform: "translateY(10px) scale(.92)", opacity: "0" },
          "35%": { opacity: "1" },
          "100%": { transform: "translateY(-32px) scale(1.08)", opacity: "0" }
        },
        lightSweep: {
          "0%": { transform: "translateX(-120%) skewX(-18deg)" },
          "100%": { transform: "translateX(220%) skewX(-18deg)" }
        }
      },
      animation: {
        shimmer: "shimmer 2.2s linear infinite",
        floatUp: "floatUp 1.8s ease-in-out infinite",
        lightSweep: "lightSweep 1.6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;

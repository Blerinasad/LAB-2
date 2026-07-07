/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        display: ["'Space Grotesk'", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
        },
      },
      borderRadius: { "2xl": "16px", "3xl": "20px" },
      boxShadow: {
        "card-sm": "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card": "0 4px 16px -2px rgb(0 0 0 / 0.06)",
        "lift": "0 8px 32px -4px rgb(0 0 0 / 0.12)",
      },
      animation: {
        "spin-slow": "spin 1s linear infinite",
        "fade-in": "fadeIn .15s ease",
        "slide-up": "slideUp .2s ease",
        "slide-in": "slideIn .2s ease",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { transform: "translateY(12px)", opacity: 0 }, to: { transform: "translateY(0)", opacity: 1 } },
        slideIn: { from: { transform: "translateX(16px)", opacity: 0 }, to: { transform: "translateX(0)", opacity: 1 } },
      },
    },
  },
  plugins: [],
};

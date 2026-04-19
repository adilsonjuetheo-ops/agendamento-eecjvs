/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563eb",
          light: "#3b82f6",
          dark: "#1d4ed8",
        },
        secondary: "#ffffff",
        accent: "#f59e0b",
        danger: "#dc2626",
        warning: "#f59e0b",
        success: "#16a34a",
      },
    },
  },
  plugins: [],
};

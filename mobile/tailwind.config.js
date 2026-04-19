/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1a5c2e",
          light: "#2d8049",
          dark: "#0f3a1c",
        },
        secondary: "#ffffff",
        accent: "#c9a227",
        danger: "#dc2626",
        warning: "#f59e0b",
        success: "#16a34a",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.tsx",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#F4A261",
        primaryHover: "#e5944f",
        secondary: "#1D3557",
        secondaryLight: "#2a4a73",
        accent: "#2A9D8F",
        accentLight: "#3bb3a4",
        background: "#FAF9F6",
        text: "#264653",
        white: "#FFFFFF",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "18px",
      },
      boxShadow: {
        soft: "0 4px 12px rgba(0, 0, 0, 0.06)",
        card: "0 6px 18px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#101722",
        panel: "#182331",
        "panel-2": "#202E40",
        accent: "#4B91D1",
        success: "#3EAC83",
        warning: "#D6A34C",
        error: "#D65C65",
        "text-main": "#E8EDF3",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
}

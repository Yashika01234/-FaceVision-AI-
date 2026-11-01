/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Manrope Variable"', "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      colors: {
        ink: "#0c1020",       // page background
        panel: "#131933",     // raised surfaces
        raised: "#1a2247",    // inputs, hover states
        line: "#283056",      // borders
        fg: "#e8ecfa",        // primary text
        muted: "#8c96b8",     // secondary text
        accent: "#7b8cff",    // interface accent (periwinkle)
        detect: "#ffb547",    // bounding boxes - the one warm colour in the UI
        ok: "#4ade9a",
        danger: "#ff6b7a",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  safelist: [
    'inline', // Often used by icons
    'mr-1',   // Used for spacing next to icons in mobile menu
    // Add other classes icons might need if the above isn't enough
    // e.g., 'w-6', 'h-6', 'block', text colors if they differ from parent
  ],
  plugins: [],
}
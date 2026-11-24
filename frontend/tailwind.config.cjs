/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neo: {
          bg: '#f0f0f0',      // Light gray background from image
          card: '#ffffff',    // White card background
          border: '#1a1a1a',  // Dark grid lines
          orange: '#FF5E1E',  // Bright orange accent
          text: '#1a1a1a',    // Dark text
          muted: '#808080'    // Muted gray text
        },
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        pixel: ['"VT323"', 'monospace'],
        mono: ['monospace']
      },
      boxShadow: {
        'neo': '4px 4px 0px 0px rgba(26,26,26,1)',
        'neo-sm': '2px 2px 0px 0px rgba(26,26,26,1)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};

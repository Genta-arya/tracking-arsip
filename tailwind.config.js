/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kpu: {
          maroon: '#660300',      // MAROON (DOMINAN) C34 M98 Y97 K52
          darkMaroon: '#340705',  // DARK MAROON C52 M79 Y72 K77
          orange: '#e95007',      // ORANGE C3 M83 Y100 K1
          darkOrange: '#e8300e',  // DARK ORANGE C3 M94 Y100 K1
          gold: '#ffbf00',        // GOLD C0 M27 Y100 K0
          lightGold: '#ffdc73',   // LIGHT GOLD C1 M12 Y66 K0
        },
      },
    },
  },
  plugins: [],
}


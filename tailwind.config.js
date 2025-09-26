/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        exo: ['Exo', 'sans-serif'],
      },
      colors: {
        base: '#2b2b2b',
        primaryAccent: '#12c2e9',
        secondaryAccent: '#c471f5',
        cardPanel: '#37373b',
        highlight: '#ffde59',
        textPrimary: '#f3f3f3',
        textSecondary: '#b0b2ba',
        borderLine: '#41414a',
        logoutButton: '#E84242',

        // Added Deep Mauve colors
        'deep-mauve-start': '#824d69',
        'deep-mauve-end': '#1c3239',
      },
      backgroundImage: {
        // Added Deep Mauve gradient
        'basegradient': 'linear-gradient(180deg, #824d69 0%, #1c3239 100%)',
      },
    },
  },
  plugins: [],
}

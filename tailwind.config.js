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
        'rush-funky': ['Rush Funky', 'cursive'],
        'vscode-mono': ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
        'vscode-ui': ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', '"Open Sans"', '"Helvetica Neue"', 'sans-serif'],
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
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
      },
      backgroundImage: {
        // Added Deep Mauve gradient
        'basegradient': 'linear-gradient(180deg, #020024 0%, #090979 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
  ],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        epistemic: {
          verified: '#2b8a3e',
          inferred: '#e67700',
          unknown: '#868e96',
          danger: '#c92a2a'
        }
      }
    },
  },
  plugins: [],
};

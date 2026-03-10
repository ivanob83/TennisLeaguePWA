/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './app/js/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#033629',
          dark: '#022419',
          light: '#054d3a',
        },
        secondary: {
          DEFAULT: '#cc4e00',
          dark: '#a33e00',
          light: '#e55a00',
        },
        accent: '#033629',
        success: '#033629',
        text: {
          DEFAULT: '#242424',
          light: '#6b7280',
          lighter: '#9ca3af',
        },
        background: {
          DEFAULT: '#ffffff',
          light: '#fafafa',
          dark: '#033629',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './app/src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
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
      spacing: {
        section: '4.5rem',
        'card-x': '1.5rem',
        'card-y': '1.25rem',
        'field-x': '0.875rem',
        'field-y': '0.625rem',
      },
      transitionDuration: {
        280: '280ms',
      },
    },
  },
  plugins: [],
}

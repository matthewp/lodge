/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./ui/src/**/*.{js,jsx,ts,tsx}",
    "./ui/index.html"
  ],
  theme: {
    extend: {
      // Remove all border radius for flat design
      borderRadius: {
        'none': '0',
        DEFAULT: '0',
      },
      // Thick borders
      borderWidth: {
        DEFAULT: '2px',
        '0': '0',
        '2': '2px',
        '3': '3px',
        '4': '4px',
        '6': '6px',
      },
      // Bold font weights
      fontWeight: {
        'normal': '400',
        'medium': '600',
        'bold': '700',
        'black': '900',
      },
      // High contrast colors
      colors: {
        primary: {
          50: '#f8f9fa',
          100: '#e9ecef',
          500: '#000000',
          600: '#000000',
          700: '#000000',
        },
        gray: {
          100: '#f8f9fa',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#6c757d',
          600: '#495057',
          700: '#343a40',
          800: '#212529',
          900: '#000000',
        }
      }
    },
  },
  plugins: [],
}
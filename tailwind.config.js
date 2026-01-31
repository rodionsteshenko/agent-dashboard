/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
    require('@tailwindcss/typography'),
  ],
  daisyui: {
    themes: [
      "light",
      "dark", 
      "cupcake",
      "garden",
      "forest",
      "lofi",
      "pastel",
      "fantasy",
      "autumn",
      "business",
      "coffee",
      "winter",
      "dim",
      "nord",
      "sunset",
    ],
  },
}

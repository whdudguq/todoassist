import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/renderer/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;

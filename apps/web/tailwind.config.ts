import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Tailwind convive com o CSS original SEM alterar o visual:
 *  - preflight desligado (o reset original continua mandando)
 *  - as cores/fontes apontam para as variaveis CSS do tema original
 *    (cada pagina define as suas: tema dourado na home, azul na hierarquia)
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        ink: {
          black: 'var(--black)', deep: 'var(--deep)', panel: 'var(--panel)', border: 'var(--border)',
          line: 'var(--line)', muted: 'var(--muted)', grey: 'var(--grey)', silver: 'var(--silver)',
          light: 'var(--light)', white: 'var(--white)', accent: 'var(--accent)', accent2: 'var(--accent2)',
          ember: 'var(--ember)',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Rajdhani', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
        fell: ['"IM Fell English"', 'serif'],
      },
    },
  },
  plugins: [animate],
} satisfies Config;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: 'var(--primary)',
        lilac: 'var(--accent-lilac)',
        primary: 'var(--primary)',
        'primary-container': 'var(--primary-container)',
        'on-primary': 'var(--on-primary)',
        'on-surface': 'var(--text-main)',
        'on-surface-variant': 'var(--text-soft)',
        'surface-container-lowest': 'var(--surface-lowest)',
        'surface-container-low': 'var(--surface-low)',
        'surface-container': 'var(--surface)',
        'surface-container-high': 'var(--surface-high)',
        'surface-container-highest': 'var(--surface-highest)',
        outline: 'var(--outline)',
        'outline-variant': 'var(--outline-variant)',
      },
      spacing: Object.fromEntries([1, 2, 3, 4, 6, 8, 12].map((step) => [step, `var(--space-${step})`])),
      fontSize: { xs: 'var(--type-xs)', sm: 'var(--type-sm)', base: 'var(--type-base)', lg: 'var(--type-lg)', xl: 'var(--type-xl)', display: 'var(--type-display)' },
      transitionDuration: { fast: 'var(--motion-fast)', normal: 'var(--motion-normal)', reveal: 'var(--motion-reveal)' },
      fontFamily: {
        headline: ['var(--font-display)'],
        body: ['var(--font-body)'],
        label: ['var(--font-body)'],
      },
      borderRadius: {
        xl: 'var(--radius-sm)',
        '2xl': 'var(--radius-md)',
        '3xl': 'var(--radius-lg)',
      },
      boxShadow: {
        ambient: 'var(--shadow-ambient)',
        gold: 'var(--shadow-gold)',
      },
    },
  },
  plugins: [],
}

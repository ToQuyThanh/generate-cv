/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        /* shadcn/ui tokens */
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        /* Webflow brand tokens */
        wf: {
          blue:        '#146ef5',
          'blue-400':  '#3b89ff',
          'blue-300':  '#006acc',
          'blue-hover':'#0055d4',
          black:       '#080808',
          'gray-800':  '#222222',
          'gray-700':  '#363636',
          'gray-500':  '#5a5a5a',
          'gray-300':  '#ababab',
          border:      '#d8d8d8',
          purple:      '#7a3dff',
          pink:        '#ed52cb',
          green:       '#00d722',
          orange:      '#ff6b00',
          yellow:      '#ffae13',
          red:         '#ee1d36',
        },
      },
      borderRadius: {
        sm:  '2px',
        DEFAULT: '4px',
        md:  '4px',
        lg:  '8px',
        xl:  '8px',
        '2xl': '12px',
        full: '9999px',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Arial', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      fontSize: {
        'micro': ['10px', { lineHeight: '1.3', letterSpacing: '1px' }],
        'xs':    ['12px', { lineHeight: '1.4' }],
        'sm':    ['14px', { lineHeight: '1.5' }],
        'base':  ['16px', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
        'body':  ['20px', { lineHeight: '1.45' }],
        'xl':    ['24px', { lineHeight: '1.3' }],
        '2xl':   ['32px', { lineHeight: '1.3' }],
        '3xl':   ['40px', { lineHeight: '1.1' }],
        '4xl':   ['56px', { lineHeight: '1.04' }],
        'hero':  ['80px', { lineHeight: '1.04', letterSpacing: '-0.8px' }],
      },
      boxShadow: {
        'wf':  'rgba(0,0,0,0) 0px 84px 24px, rgba(0,0,0,0.01) 0px 54px 22px, rgba(0,0,0,0.04) 0px 30px 18px, rgba(0,0,0,0.08) 0px 13px 13px, rgba(0,0,0,0.09) 0px 3px 7px',
        'wf-sm': '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { transform: 'translateX(-100%)' },
          to:   { transform: 'translateX(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':        'fade-in 0.3s ease-out',
        'slide-in':       'slide-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
}

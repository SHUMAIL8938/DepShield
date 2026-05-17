/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      colors: {
        terminal: {
          bg: '#0a0a0a',
          surface: '#111111',
          border: '#1a2e1a',
          green: '#00ff41',
          'green-dim': '#00cc33',
          'green-faint': '#003300',
          amber: '#ffb000',
          red: '#ff3333',
          'red-dim': '#cc0000',
          gray: '#666666',
          white: '#e0e0e0',
        }
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'scanline': 'scanline 8s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'typewriter': 'typewriter 0.5s steps(20) forwards',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        blink: { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0 } },
        scanline: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100vh)' } },
        flicker: { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.98 } },
        'glow-pulse': {
          '0%, 100%': { textShadow: '0 0 4px #00ff41, 0 0 8px #00ff41' },
          '50%': { textShadow: '0 0 8px #00ff41, 0 0 16px #00ff41, 0 0 24px #00ff41' }
        }
      }
    }
  },
  plugins: []
};

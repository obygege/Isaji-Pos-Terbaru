/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'isaji-navy': '#0F2040',
                'isaji-cyan': '#00B4D8',
                'isaji-orange': '#FF8C00',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(6px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                popIn: {
                    '0%': { opacity: '0', transform: 'scale(0.85)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-400px 0' },
                    '100%': { backgroundPosition: '400px 0' },
                },
            },
            animation: {
                'fade-in': 'fadeIn 0.35s ease-out both',
                'pop-in': 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
                'slide-up': 'slideUp 0.4s ease-out both',
                shimmer: 'shimmer 1.4s infinite linear',
            },
        },
    },
    plugins: [],
}
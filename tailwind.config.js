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
            }
        },
    },
    plugins: [],
}
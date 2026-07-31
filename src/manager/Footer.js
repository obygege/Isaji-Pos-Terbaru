import React from 'react';

function Footer() {
    return (
        <footer className="py-4 px-8 border-t border-gray-100 bg-white text-center shrink-0">
            <p className="text-xs text-gray-400 font-medium">
                &copy; {new Date().getFullYear()} ISAJI POS System. Modul Manajer Cabang.
            </p>
        </footer>
    );
}

export default Footer;
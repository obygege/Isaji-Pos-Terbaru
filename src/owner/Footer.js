import React from 'react';

function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-transparent py-4 px-8 shrink-0 flex items-center justify-between border-t border-gray-200/50">
            <p className="text-xs font-medium text-gray-400">
                &copy; {currentYear} ISAJI Point of Sales. All rights reserved.
            </p>
            <p className="text-xs font-bold text-gray-300">
                V 1.0.0
            </p>
        </footer>
    );
}

export default Footer;
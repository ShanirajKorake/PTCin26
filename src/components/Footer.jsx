import React from "react";
import { LayoutDashboard, FilePlus, History, Truck } from "lucide-react";

// The NavButton component needs the theme prop to adjust active/hover colors
const NavButton = ({ icon, label, isActive, onClick, theme }) => {
    // Conditional styling for the button text and icon color
    const activeClasses = theme === "light"
        ? "text-indigo-600 bg-indigo-100 shadow-inner" // Light theme active state
        : "text-indigo-400 bg-gray-700 shadow-inner"; // Dark theme active state

    // Conditional styling for the default and hover states
    const defaultClasses = theme === "light"
        ? "text-gray-500 hover:text-indigo-600 hover:bg-gray-100" // Light theme default/hover
        : "text-gray-400 hover:text-indigo-300 hover:bg-gray-700/50"; // Dark theme default/hover

    return (
        <button
            onClick={onClick}
            // Use the conditional classes inside the template literal
            className={`flex flex-col items-center p-2 rounded-xl transition duration-300 w-1/4 active:scale-95 ${
                isActive ? activeClasses : defaultClasses
            }`}
        >
            {icon}
            <span className="text-xs mt-1 font-medium">{label}</span>
        </button>
    );
};

// You need to accept the 'theme' prop here
const Footer = ({ currentPage, setPage, theme, setFormContextChanger }) => {
    // Define the footer background and border based on the theme
    const footerClasses = theme === "light"
        ? "bg-white shadow-xl border-t border-gray-200" // Light theme classes
        : "bg-gray-800 shadow-2xl border-t border-gray-700"; // Dark theme classes

    const pages = [
        { id: "dashboard", label: "Dashboard", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2 2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
        { id: "new Invoice", label: "New Invoice", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M12 2a10 10 0 100 20 10 10 0 000-20z" /></svg> },
        { id: "history", label: "History", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    ];

    return (
        // Apply the dynamic footer classes
        <footer className={` p-2 pb-8 ${footerClasses}`}>
            <nav className="flex justify-around max-w-lg mx-auto">
                {pages.map((page) => (
                    <NavButton
                        key={page.id}
                        label={page.label}
                        icon={page.icon}
                        isActive={currentPage === page.id}
                        onClick={() => {
                            setPage(page.id)
                            setFormContextChanger({ mode: 'new', data: null, title: page.label }); // Reset form context on navigation to New Invoice
                        }}
                        // IMPORTANT: Pass the theme prop down to NavButton
                        theme={theme} 
                    />
                ))}
            </nav>
        </footer>
    );
};

export default Footer;
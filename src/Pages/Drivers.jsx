import React from 'react';

// Accept the 'theme' prop
export default function Drivers({ theme }) {
    
    const isLight = theme === "light";
    
    // 1. Conditional Styling for the Main Container
    const containerClasses = isLight
        ? "bg-gray-50 text-gray-800" // Light theme background and text
        : "bg-gray-900 text-white"; // Dark theme background and text

    // 2. Conditional Styling for the Title
    const titleClasses = isLight
        ? "text-indigo-600" // Light theme title
        : "text-indigo-400"; // Dark theme title

    // 3. Conditional Styling for the Truck Cards
    const cardClasses = isLight
        ? "bg-white shadow-lg border border-gray-200 transition duration-300 hover:bg-gray-100" // Light theme card
        : "bg-gray-800 shadow-xl border border-gray-700 transition duration-300 hover:bg-gray-700/70"; // Dark theme card

    // 4. Conditional Styling for Card Text
    const truckIdClasses = isLight
        ? "text-indigo-600"
        : "text-indigo-300";
    
    const subTextClasses = isLight
        ? "text-gray-500"
        : "text-gray-400";
        
    // 5. Conditional Styling for the Message Block
    const messageBlockClasses = isLight
        ? "bg-white border border-gray-200 "
        : "bg-gray-800 border border-gray-700";

    const data = [
        { id: "T120", status: "Active", driver: "A. Johnson", location: "Dallas, TX" },
        { id: "T055", status: "Maintenance", driver: "B. Smith", location: "Yard" },
        { id: "T319", status: "On Route", driver: "C. Davis", location: "Chicago, IL" },
    ];
    
    const truckStatusClasses = (status) => {
        if (isLight) {
            switch (status) {
                case "Active": return "bg-green-100 text-green-700";
                case "Maintenance": return "bg-red-100 text-red-700";
                default: return "bg-yellow-100 text-yellow-700";
            }
        } else {
            switch (status) {
                case "Active": return "bg-green-600/50 text-green-300";
                case "Maintenance": return "bg-red-600/50 text-red-300";
                default: return "bg-yellow-600/50 text-yellow-300";
            }
        }
    };

    return (
        // Apply theme-specific container classes
        <div className={`p-4 w-full min-h-screen-minus-header-footer h-full ${containerClasses}`}>
            


            {/* Funny "Feature in Production" Message */}
            <div className={`mt-10 p-6 rounded-2xl max-w-sm w-full mx-auto text-center ${messageBlockClasses}`}>
                
                <span role="img" aria-label="Funny Sticker" className="text-5xl block mb-3 animate-wiggle">
                    🚚
                </span>
                
                <h3 className={`text-xl font-semibold mb-1 ${titleClasses}`}>
                    Trucking Along!
                </h3>
                
                <p className={`text-md font-medium ${subTextClasses}`}>
                    This section is under development. Truck management features will be available soon. Stay tuned!
                </p>
            </div>
            
        </div>
    )
}
import React, { useState } from "react";
import { Menu, Sun, Moon } from "lucide-react";
import logo from '../assets/logo.jpg';
// Import the necessary services (assuming they are correctly defined in your project)
import { getInvoicesHistory } from "../services/dbService"; 
import { Share } from '@capacitor/share'; 
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'; // Needed to write JSON file

const SECRET_PASSWORD = "PENGU"; // The secret password
const CLICK_THRESHOLD = 7;      // The number of clicks to trigger the feature

const Header = ({ toggleTheme, theme, title }) => {
  // 1. State to track the number of logo clicks
  const [logoClickCount, setLogoClickCount] = useState(0);

  // --- Utility Functions for Secret Export ---

  const handleSecretExport = async () => {
    try {
      // 1. Fetch all invoice history
      const history = await getInvoicesHistory();
      const historyJson = JSON.stringify(history, null, 2);
      
      const fileName = `InvoiceHistory_Export_${new Date().toISOString().slice(0, 10)}.json`;

      // 2. Write the JSON data to a temporary file in the Cache directory
      await Filesystem.writeFile({
          path: fileName,
          data: historyJson,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
          recursive: true,
      });

      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName,
      });

      // 3. Open the Share sheet
      await Share.share({
          title: 'Invoice History Backup',
          text: 'Encrypted backup of all application data.',
          url: fileUri.uri,
          dialogTitle: 'Share Invoice Data',
      });

      alert("Data exported successfully and ready to share!");

    } catch (e) {
      console.error("Secret export failed:", e);
      alert(`Export failed. Error: ${e.message}. Check console.`);
    }
  };


  const handleLogoClick = () => {
    setLogoClickCount(prevCount => {
        const newCount = prevCount + 1;
        
        if (newCount >= CLICK_THRESHOLD) {
            // Trigger the secret prompt
            const passwordAttempt = prompt("SECRET ACCESS: Enter the password to export data.");
            
            if (passwordAttempt === SECRET_PASSWORD) {
                // Password is correct, execute the export and share logic
                handleSecretExport();
            } else if (passwordAttempt !== null) {
                // User entered something but it was wrong
                alert("Access Denied: Incorrect password.");
            }
            // Reset the count regardless of success/failure or cancellation
            return 0;
        }
        return newCount;
    });
  };

  // Define the class names based on the theme (Unchanged)
  const headerClasses = theme === "light"
    ? "bg-white text-gray-800 border-b border-gray-200"
    : "bg-gray-800 text-white shadow-xl border-b border-gray-700";

  const titleColor = theme === "light"
    ? "text-gray-700"
    : "text-gray-300";

  const toggleButtonClasses = theme === "light"
    ? "p-2 rounded-full bg-gray-100 text-gray-800 hover:bg-indigo-200 transition duration-150 transform hover:scale-105"
    : "p-2 rounded-full bg-gray-700 text-white hover:bg-indigo-600 transition duration-150 transform hover:scale-105";

  const iconStrokeColor = theme === "light" ? "currentColor" : "currentColor";

  return (
     <header className={`flex justify-between items-center p-4 pt-12 ${headerClasses}`}>
        {/* Logo with the secret onClick handler */}
        <img 
            src={logo} 
            alt="logo ptc" 
            srcSet=" " 
            className={`h-10 rounded-full border cursor-pointer ${theme === "light" ? "border-gray-300" : "border-gray-500"}`} 
            onClick={handleLogoClick} // ATTACH THE CLICK HANDLER HERE
        />

        {/* Title */}
        <h1 className={`text-xl font-extrabold ${titleColor}`}>{title}</h1>

        {/* Theme Toggle Button (Unchanged) */}
        <button
            onClick={() => toggleTheme(theme === "light" ? "dark" : "light")}
            className={toggleButtonClasses}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke={iconStrokeColor} strokeWidth={2}>
                {theme === "light" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                )}
            </svg>
        </button>
    </header>
  );
};

export default Header;
import React, { useState, useEffect, useCallback } from "react";
import { Lock, XCircle, CheckCircle, Loader2 } from "lucide-react";
import Divers from './Pages/Drivers';
import NewInvoice from './Pages/NewInvoice';
import Header from "./components/Header";
import Footer from "./components/Footer";
import Dashboard from "./Pages/Dashboard";
import History from "./Pages/History";
import './index.css';
import { StatusBar, Style } from "@capacitor/status-bar";
import { i } from "framer-motion/client";
// Define the target PIN globally or within the component scope
const TARGET_PIN = '7655';

// Main App Component
function App() {
    const [theme, setTheme] = useState("dark");
    const [currentPage, setPage] = useState("dashboard");

    // 1. PIN VERIFICATION STATE
    const [isAuthenticated, setIsAuthenticated] = useState(
        sessionStorage.getItem('authenticated') === 'true'
    );

    // NEW STATE: Manages data and title for InvoiceForm when editing/duplicating
    const [formContext, setFormContext] = useState({
        mode: 'null',
        data: null,
        title: 'Dashboard'
    });

    const [histoyFilter, setHistoryFilter] = useState({
        mode: 'null',
        data: 'null',
        type: 'null'
    })

    const toggleTheme = (newTheme) => {
        setTheme(newTheme);
    };

    /**
     * 2. COMBINED EFFECT HOOK for Body Class and Status Bar.
     */
    useEffect(() => {
        // Set the body background color based on theme
        document.body.className = theme === "dark" ? "bg-gray-900" : "bg-gray-100";

        // Status Bar Logic (uncomment if running in Capacitor environment)

        if (window.statusbar) {
            if (theme === "dark") {
                StatusBar.setStyle({ style: Style.Dark });
            } else {
                StatusBar.setStyle({ style: Style.Light });
            }
        }

    }, [theme]);

    // NEW HANDLER: Passed to History.jsx to request navigation/data load
    const handleNavigateToForm = (data, mode, title) => {
        setFormContext({ mode, data, title });
        setPage('new Invoice');
    };

    const handleNavigateToHistory = (data, mode, type) => {
        setHistoryFilter({ mode, data , type})
        console.log("redirecting to history :", histoyFilter)
        setFormContext({
            data:null,
            mode: null,
            title: "history"
        })
        setPage('history')
    }

    const resetHistoryFilter= useCallback(() =>{
        setHistoryFilter({
            mode : null,
            data : null
        })
    },[setHistoryFilter])

    // Conditional rendering function for routing
    const renderPage = () => {
        switch (currentPage) {
            case "dashboard":
                return <Dashboard
                    theme={theme}
                    handleNavigateToHistory = {handleNavigateToHistory}
                />;

            case "new Invoice":
                return <NewInvoice
                    theme={theme}
                    initialData={formContext.data}
                    contextTitle={formContext.title}
                />;

            case "history":
                return <History
                    theme={theme}
                    onNavigateToForm={handleNavigateToForm}
                    filterFromDashboard={histoyFilter}
                    setfilterfromRedirecton={resetHistoryFilter}
                />;

            case "vehicals":
                return <Divers theme={theme} />;

            default:
                return <Dashboard theme={theme} />;
        }
    };

    // 3. PIN VERIFICATION SCREEN COMPONENT
    const PinVerificationScreen = () => {
        const [pinInput, setPinInput] = useState('');
        const [error, setError] = useState(false);
        const [isChecking, setIsChecking] = useState(false);

        // Keypad layout
        const keypad = [
            '1', '2', '3',
            '4', '5', '6',
            '7', '8', '9',
            'C', '0', 'OK'
        ];

        // Dynamic styling based on App's theme state
        const isDark = theme === 'dark';
        const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
        const textColor = isDark ? 'text-white' : 'text-gray-900';
        const buttonBaseClass = "p-4 text-2xl font-bold rounded-xl shadow-md transition-all duration-150 active:scale-95 w-full h-16 flex items-center justify-center";

        const handleSubmit = (e) => {
            if (e) e.preventDefault();
            if (pinInput.length !== 4) return;

            setIsChecking(true);

            setTimeout(() => {
                if (pinInput === TARGET_PIN) {
                    sessionStorage.setItem('authenticated', 'true');
                    setIsAuthenticated(true);
                } else {
                    setError(true);
                    setPinInput('');
                }
                setIsChecking(false);
            }, 400); // Simulate check delay
        };

        // Handler for virtual keyboard input
        const handleKeyClick = (key) => {
            if (isChecking) return;

            if (key === 'C') {
                setPinInput('');
                setError(false);
            } else if (key === 'OK') {
                handleSubmit();
            } else if (pinInput.length < 4) {
                setPinInput(prev => prev + key);
                if (error) setError(false);
            }
        };

        return (
            <div className={`flex items-center justify-center h-screen w-full ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
                <div className={`p-6 rounded-3xl shadow-2xl max-w-sm w-full border ${cardBg}`}>

                    <Lock size={40} className={`mx-auto mb-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <h2 className={`text-2xl font-bold mb-8 text-center ${textColor}`}>
                        Secure Access
                    </h2>

                    {/* PIN Display */}
                    <div className={`flex justify-center space-x-3 mb-6`}>
                        {Array(4).fill(null).map((_, index) => (
                            <div key={index} className={`w-10 h-10 border-b-4 
                            ${error ? 'border-red-500' : 'border-indigo-500'} 
                            ${pinInput[index] ? 'opacity-100' : 'opacity-40'}
                            flex items-center justify-center ${textColor}`}>
                                {pinInput[index] ? <span className="text-3xl font-mono">•</span> : null}
                            </div>
                        ))}
                    </div>

                    {/* Status Message */}
                    {error && (
                        <p className="text-red-500 text-sm mb-4 text-center flex items-center justify-center">
                            <XCircle size={16} className="mr-1" /> Invalid PIN.
                        </p>
                    )}

                    {/* Virtual Keypad */}
                    <div className="grid grid-cols-3 gap-3">
                        {keypad.map((key) => {
                            let buttonClasses = isDark
                                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-900';

                            if (key === 'C') {
                                buttonClasses = isDark ? 'bg-red-700/50 hover:bg-red-600/70 text-red-100' : 'bg-red-200 hover:bg-red-300 text-red-700';
                            } else if (key === 'OK') {
                                buttonClasses = (pinInput.length === 4 && !isChecking)
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    : 'bg-gray-400 text-gray-700 cursor-not-allowed';
                            }

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    disabled={isChecking || (key === 'OK' && pinInput.length !== 4)}
                                    onClick={() => handleKeyClick(key)}
                                    className={`${buttonBaseClass} ${buttonClasses} ${key === 'OK' && 'col-span-1'}`}
                                >
                                    {isChecking && key === 'OK' ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        key
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // --- CONDITIONAL RENDERING ---
    if (!isAuthenticated) {
        return <PinVerificationScreen />;
    }

    const themeClasses = theme === 'dark'
        ? 'bg-gray-900 text-white'
        : 'bg-gray-100 text-gray-900';

    return (
        <div className={`h-screen flex flex-col overflow-hidden ${themeClasses} outfit`} >

            {/* Header: Use the context title for the header */}
            <Header
                toggleTheme={toggleTheme}
                theme={theme}
                title={formContext.title}
            />

            {/* Main Content Area: Scrollable middle section */}
            <main className={`flex-grow overflow-y-auto h-screen ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} >
                {renderPage()}
            </main>

            {/* Footer Navigation - handles page switching */}
            <Footer
                currentPage={currentPage}
                setPage={setPage}
                theme={theme}
                setFormContextChanger={setFormContext}
            />
        </div>
    );
}

export default App;
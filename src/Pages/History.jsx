import React, { useState, useEffect, useCallback, use, useRef } from 'react';
import { ChevronDown, ChevronUp, Trash2, CheckCircle, Edit, Copy, Loader2, RefreshCw, MoveLeft, Dot, BadgeX } from 'lucide-react';
import { getInvoicesHistory, deleteInvoice, clearInvoiceDue } from '../services/dbService';
import InvoicePDF from '../components/InvoicePDF';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { i, s } from 'framer-motion/client';
import HistoryInvoiceCard from '../components/refurbished/HistoryInvoiceCard';
import ExpandedInvoiceCard from '../components/refurbished/ExpandedInvoiceCard';
import { motion } from 'framer-motion';

// --- Utility Function: Date Format ---
/**
 * Converts a YYYY-MM-DD date string (or Date object) to DD-MM-YYYY string.
 * @param {string|Date} dateString - The date string in YYYY-MM-DD format.
 * @returns {string} The date string in DD-MM-YYYY format, or a locale date string if parse fails.
 */
const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    try {
        const parts = dateString.split('T')[0].split('-');
        if (parts.length === 3) {
            // Re-order: DD-MM-YYYY
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    } catch (e) {
        return new Date(dateString).toLocaleDateString('en-IN');
    }
    return new Date(dateString).toLocaleDateString('en-IN');
};
const formatDateWithMonthName = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}


export default function History({ theme, onNavigateToForm, filterFromDashboard, setfilterfromRedirecton }) {
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null); // State for errors
    const [expandedId, setExpandedId] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false); // For local loading state
    const [filterType, setFilterType] = useState('all'); // 'all', 'paid', 'unpaid'
    const filterOptions = ['all', 'paid', 'unpaid'];
    const [parties, setParties] = useState([]);
    const [selectedParty, setSelectedParty] = useState('All Parties');
    const [isPartySelectionDropDownOpen, setIsPartySelectionDropDownOpen] = useState(false)

    const [isAnyInvoiceExpanded, setIsAnyInvoiceExpanded] = useState(false);
    const [expandedInvoiceData, setExpandedInvoiceData] = useState(null);
    const mainContainerRef = useRef(null);

    const makeMonthlyEntries = (invoices) => {
        const monthlyInvoices = {};
        invoices.forEach(invoice => {
            const date = new Date(invoice.formData.billDate);
            const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`; // e.g., "3-2023"
            if (!monthlyInvoices[monthYear]) {
                monthlyInvoices[monthYear] = [];
            }
            monthlyInvoices[monthYear].push(invoice);
        });
        return monthlyInvoices;
    }



    // --- Data Fetching Logic (Refined) ---
    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        // 1. Handle Redirect Logic immediately
        let activeParty = selectedParty;
        let activeFilter = filterType;

        if (filterFromDashboard.mode === "party") {
            activeFilter = filterFromDashboard.type
            activeParty = filterFromDashboard.data;

            // Update state for UI consistency
            setFilterType(activeFilter);
            setSelectedParty(activeParty);


            // Reset redirect state
            setfilterfromRedirecton();
        }


        try {
            const fetchedInvoices = await getInvoicesHistory();

            // 2. Single-pass processing for Parties and Sorting
            const partySet = new Set(["All Parties"]);

            // Sort newest first - converting to value once for performance
            const sortedInvoices = fetchedInvoices.sort((a, b) => {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            // 3. Efficiently build the party list and filter in one go
            const filtered = [];
            for (const inv of sortedInvoices) {
                // Collect unique parties
                partySet.add(inv.formData.partyName);

                // Apply Filters
                const matchesParty = activeParty === "All Parties" || inv.formData.partyName === activeParty;
                if (!matchesParty) continue;

                const balance = parseFloat(inv.summary.totalBalance || 0);
                const isPaid = balance <= 0.01;

                if (activeFilter === "paid" && isPaid) {
                    filtered.push(inv);
                } else if (activeFilter === "unpaid" && !isPaid) {
                    filtered.push(inv);
                } else if (activeFilter === "all") {
                    filtered.push(inv);
                }
            }

            setParties(Array.from(partySet));
            setInvoices(makeMonthlyEntries(filtered));

            if (filterFromDashboard.mode === "trip") {
                let selectedId = filterFromDashboard.data

                setExpandedId(selectedId)
                setIsAnyInvoiceExpanded(true)
                setExpandedInvoiceData(sortedInvoices.find(inv => inv.id === selectedId))

                setfilterfromRedirecton()
            }

        } catch (e) {
            console.error("Failed to load history:", e);
            setError("Failed to fetch invoice history. Please check your network.");
            setInvoices([]);
        } finally {
            setIsLoading(false);

        }


        // We remove selectedParty and filterType from dependencies if we want 
        // this to only run once on mount, or keep them if it should re-run on UI toggle.
    }, [filterType, selectedParty]);




    // --- Delete Handler ---
    const handleDelete = async (id, partyName) => {
        if (window.confirm(`Are you sure you want to permanently delete the invoice for "${partyName}"? This cannot be undone.`)) {
            setIsDeleting(true);
            try {
                await deleteInvoice(id);
                setExpandedId(null);
                setPreviewData(null);
                await loadHistory();
            } catch (error) {
                alert("Could not delete invoice. Please try again.");
                console.error("Deletion error:", error);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    // --- Clear Due Handler ---
    const handleClearDue = async (id, partyName) => {
        if (window.confirm(`Confirm payment received for ${partyName}? This will set the balance due to zero.`)) {
            setIsDeleting(true); // Using this state for any update operation
            try {
                await clearInvoiceDue(id);
                setExpandedId(null);
                await loadHistory();
            } catch (error) {
                alert("Could not update payment status. Please try again.");
                console.error("Clear Due error:", error);
            } finally {
                setIsDeleting(false);
            }
        }
    };


    const toggleExpand = (id) => {
        setIsAnyInvoiceExpanded(id !== expandedId);
        if (expandedId === id) {
            setPreviewData(null);
        }
        setExpandedId(prevId => (prevId === id ? null : id));

    };

    // --- Generate PDF Data for Preview (Unchanged) ---
    const handleGeneratePDF = (invoice) => {
        setPreviewData({
            formData: invoice.formData,
            vehicles: invoice.vehicles,
            url: "data:application/pdf;base64,Base64_PDF_Content",
            filename: `Invoice_${invoice.formData.invoiceNo}_${new Date().getFullYear()}.pdf`
        });
    };

    const closePreview = () => {
        setPreviewData(null);
    };

    // --- CAPACITOR SHARE LOGIC (Unchanged) ---
    const handleShare = async () => {
        if (!previewData || !previewData.url) return;
        const { url, filename } = previewData;

        try {
            const writeResult = await Filesystem.writeFile({
                path: filename,
                data: url,
                directory: Directory.Cache,
                recursive: true
            });

            await Share.share({
                title: filename,
                text: 'Here is your historical invoice.',
                url: writeResult.uri,
            });

        } catch (e) {
            console.error('Error sharing PDF:', e);
            alert('Failed to share PDF.');
        }
    };



    // --- Initial Load Effect ---
    useEffect(() => {
        loadHistory();

    }, [loadHistory]);





    // --- Data Preparation Functions (Unchanged) ---
    const prepareDataForEdit = (invoice) => {
        const title = `Editing Invoice ${invoice.formData.invoiceNo}`;
        onNavigateToForm(invoice, 'edit', title);
    };

    const prepareDataForDuplicate = (invoice) => {
        const duplicatedData = {
            ...invoice,
            formData: {
                ...invoice.formData,
                invoiceNo: "Loading...",
                billDate: new Date().toISOString().split("T")[0]
            },
            id: null,
        };
        const title = `Duplicating Invoice ${invoice.formData.invoiceNo}`;
        onNavigateToForm(duplicatedData, 'duplicate', title);
    };


    // --- Dynamic Theme Classes ---
    const isLight = theme === "light";
    const titleClasses = isLight ? "text-indigo-600" : "text-indigo-400";
    const cardClasses = isLight ? "bg-white border border-gray-200" : "bg-gray-800  border border-gray-700";
    const filterClasses = isLight ? "bg-gray-100 " : "bg-gray-800";
    const subTextClasses = isLight ? "text-gray-600" : "text-gray-400";
    const summaryHeaderClasses = isLight ? "bg-indigo-100 text-indigo-800" : "bg-indigo-900/40 text-indigo-300";
    const containerClasses = isLight ? "bg-gray-50 text-gray-800" : "bg-gray-900 text-white";
    const textClasses = isLight ? "text-gray-500" : "text-gray-300";
    const retryButtonClasses = "bg-red-600 text-white px-4 py-2 rounded-xl flex items-center justify-center hover:bg-red-700 transition";


    // --- Render Logic for Loading/Error/Empty States ---
    const renderStatus = () => {
        if (isLoading) {
            return (
                <div className={`p-4 py-12 text-center  max-w-lg mx-auto`}>
                    <Loader2 size={30} className={`mx-auto mb-3 animate-spin ${titleClasses}`} />
                    <p className={`font-medium ${textClasses}`}>Loading invoice history...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className={`p-4 py-8 text-center ${cardClasses} max-w-lg mx-auto`}>
                    <span role="img" aria-label="Error" className="text-4xl block mb-3">
                        ❌
                    </span>
                    <p className={`font-medium text-red-500 mb-3`}>Error loading data.</p>
                    <button onClick={loadHistory} className={retryButtonClasses}>
                        <RefreshCw size={16} className="mr-2" />
                        Retry Loading
                    </button>
                </div>
            );
        }

        if (invoices.length === 0) {
            return (
                <div className={`p-4 py-12 text-center ${cardClasses} max-w-lg mx-auto`}>
                    <span role="img" aria-label="Empty" className="text-4xl block mb-3">
                        📭
                    </span>
                    <p className={`font-medium ${textClasses}`}>No records found. Start by creating a new invoice!</p>
                </div>
            );
        }

        return null;
    };


    // --- Main Component JSX Return ---
    if (previewData) {
        // PDF Preview Mode
        return (
            <div className={` pb-20 w-full  ${containerClasses}`}>
                <div className={`z-10 shadow-lg max-w-lg mx-auto p-3 px-5 ${filterClasses}  flex gap-4 items-center align-middle sticky top-0 `}>
                    <button onClick={closePreview}>

                        <MoveLeft size={32} className={`flex-none p-1 rounded-full ${isLight ? 'text-gray-100 bg-gray-500' : 'text-gray-600 bg-gray-300'}`} />
                    </button>
                    <div className="flex-1">
                        <span className={`font-bold flex align-middle items-center ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            <div>{expandedInvoiceData.formData.invoiceNo}</div>
                            <Dot size={24} className={subTextClasses} />
                            <div>PDF Priview</div>
                        </span>
                    </div>
                </div>
                <div className='pt-5'>

                    <InvoicePDF
                        formData={previewData.formData}
                        vehicles={previewData.vehicles}
                        theme={theme}
                        pdfData={previewData}
                        handleShare={handleShare}
                        handleDone={closePreview}
                    />
                </div>
            </div>
        );
    }

    // History List Mode
    return (
        <div ref={mainContainerRef} className='flex flex-col overflow-y-hidden h-full w-full'>
            <div>

                {
                    isAnyInvoiceExpanded ? (
                        <>
                            <div className={`z-10 shadow-lg max-w-lg mx-auto p-3 px-5 ${filterClasses}  flex gap-4 items-center align-middle sticky top-0 `}>
                                <button onClick={() => {
                                    setIsAnyInvoiceExpanded(false);
                                    setExpandedInvoiceData(null);
                                    setExpandedId(null);
                                }}>

                                    <MoveLeft size={32} className={`flex-none p-1 rounded-full ${isLight ? 'text-gray-100 bg-gray-500' : 'text-gray-600 bg-gray-300'}`} />
                                </button>
                                <div className="flex-1">
                                    <span className={`font-bold flex align-middle items-center ${isLight ? 'text-gray-800' : 'text-white'}`}>
                                        <div>{expandedInvoiceData.formData.invoiceNo}</div>
                                        <Dot size={24} className={subTextClasses} />
                                        <div>{formatDateWithMonthName(expandedInvoiceData.formData.billDate)}</div>
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <><div className={`z-10 shadow-lg max-w-lg mx-auto p-2 ${filterClasses}  flex gap-4 items-center align-middle sticky top-0 `}>
                            <div className="flex gap-2 items-center align-middle overflow-x-auto">

                                <button
                                    className={`px-4 py-2 rounded-xl text-nowrap ${isLight ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-700 hover:bg-gray-600'} border border-gray-400' : 'border border-gray-400  transition`}
                                    onClick={() => {
                                        setIsPartySelectionDropDownOpen(!isPartySelectionDropDownOpen)
                                    }}
                                >
                                    {selectedParty.charAt(0).toUpperCase() + selectedParty.slice(1)}
                                </button>
                                {
                                    isPartySelectionDropDownOpen &&
                                    <>
                                        <div className={`${isLight ? 'text-gray-600' : 'text-gray-500'} font-bold`}>Select a party !!!</div>
                                    </>
                                }
                                {!isPartySelectionDropDownOpen &&
                                    <>
                                        <div className={`border-l border-2 rounded-2xl my-2 ${isLight ? 'border-gray-300' : 'border-gray-600'}`}></div>
                                        <button
                                            className={`px-4 py-2 rounded-full ${isLight ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-700 hover:bg-gray-600'} border border-gray-400' : 'border border-gray-400  transition`}>
                                            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                                        </button>
                                    </>
                                }
                                {!isPartySelectionDropDownOpen && filterOptions.map(option => {
                                    if (option === filterType) return null;
                                    return (
                                        <button
                                            key={option}
                                            onClick={() => setFilterType(option)}
                                            className={`px-4 py-2 rounded-full ${isLight ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-700 hover:bg-gray-600'} opacity-50 transition`}
                                        >
                                            {option.charAt(0).toUpperCase() + option.slice(1)}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                            {
                                !isAnyInvoiceExpanded && (selectedParty !== "All Parties" || filterType !== "all") &&
                                <><motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    whileInView={{ opacity: 1, y: 1 }}
                                    transition={{ duration: 0.1 }}
                                    viewport={{ once: true }}
                                    className={`absolute  overflow-y-scroll w-full rounded-md `}
                                >
                                    <div className=" flex items-center align-middle  ">
                                        <button className={`flex gap-1 items-center shadow-lg align-middle p-1 text-sm rounded-br-xl ${isLight ? "bg-gray-300" : "bg-gray-600"}`}
                                            onClick={() => {
                                                setSelectedParty("All Parties")
                                                setFilterType("all")
                                            }}
                                        >

                                            <BadgeX size={24} className='p-0.5' />
                                            <div>Clear Filters</div>
                                        </button>
                                    </div>
                                </motion.div></>
                            }

                        </>
                    )
                }
                {/* Filters */}
                {
                    isPartySelectionDropDownOpen && !isAnyInvoiceExpanded &&
                    <><div className={`absolute z-10 h-50 overflow-y-scroll w-full rounded-md border-b  shadow-lg ${isLight ? 'bg-gray-200' : 'bg-gray-700'}`}>
                        <div className=" flex flex-wrap p-2 gap-2">
                            {parties.map((option) => (
                                <button
                                    key={option}
                                    onClick={() => {
                                        setSelectedParty(option)
                                        setIsPartySelectionDropDownOpen(false)
                                    }}
                                    className={`block w-fit b text-nowrap rounded-full text-left px-4 py-2 text-sm ${isLight ? 'bg-gray-300' : 'bg-gray-600'}`}
                                >
                                    {option.charAt(0).toUpperCase() + option.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div></>
                }




            </div >

            {

                (isAnyInvoiceExpanded && expandedInvoiceData !== null) ? (
                    <div className='overflow-y-scroll '>
                        <ExpandedInvoiceCard
                            invoiceData={expandedInvoiceData}
                            formatDateForDisplay={formatDateForDisplay}
                            theme={theme}
                            handleClearDue={handleClearDue}
                            isDeleting={isDeleting}
                            handleGeneratePDF={handleGeneratePDF}
                            prepareDataForEdit={prepareDataForEdit}
                            prepareDataForDuplicate={prepareDataForDuplicate}
                            handleDelete={handleDelete}
                        />
                    </div>
                ) : (
                    null
                )}

            {!isAnyInvoiceExpanded && (
                <div className={`w-full ${containerClasses} ${isLight ? 'bg-gray-200' : 'bg-gray-700'}  h-fit overflow-y-scroll `}>


                    <div className={`max-w-lg mx-auto pb-6  ${isLight ? 'bg-gray-200' : 'bg-gray-700'} `}>
                        {renderStatus()}
                        {!isLoading && !error && Object.keys(invoices).length === 0 && (
                            <div className={`p-4 py-12 text-center ${isLight ? 'bg-gray-200' : 'bg-gray-700'} min-h-screen flex-col items-center align-middle max-w-lg mx-auto`}>
                                <span role="img" aria-label="Empty" className="text-4xl block mb-3">
                                    📭
                                </span>
                                <p className={`font-medium ${textClasses}`}>No records found with the selected filters.</p>
                            </div>
                        )}

                        {!isLoading && !isAnyInvoiceExpanded && !error && Object.keys(invoices).map((monthYear) => {
                            const [month, year] = monthYear.split('-');
                            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
                            const monthlyInvoices = invoices[monthYear];

                            return (
                                <div key={monthYear} className={` ${isLight ? 'bg-gray-200' : 'bg-gray-700'}`}>
                                    <h2 className={`w-full flex justify-center items-center text-center pt-2 pb-1 ${isLight ? 'bg-gray-200 text-gray-500' : 'bg-gray-700 text-gray-300'}`}>{monthName} {year}</h2>

                                    <div className={`mx-2 rounded-4xl overflow-clip ${isLight ? 'bg-gray-200' : 'bg-gray-700'}`}>
                                        {!isLoading && !error && monthlyInvoices.map((invoice) => {

                                            const summary = invoice.summary;

                                            const balanceDue = parseFloat(summary.totalBalance || 0);
                                            const isDue = balanceDue > 0.01;


                                            // NEW: Construct the container type string



                                            return (
                                                <div key={invoice.id} className={`  rounded-xl transition-all duration-300 ${cardClasses} overflow-clip `}>

                                                    {/* Header Button */}
                                                    {/* <button
                                                    onClick={() => toggleExpand(invoice.id)}
                                                    className="w-full p-4 flex justify-between items-center text-left"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-bold text-lg ${titleClasses} truncate`}>{formData.partyName}</p>
                                                        <p className={`text-sm ${subTextClasses} mt-1`}>Inv No: {formData.invoiceNo} • Date: {dateFormatted}</p>
                                                    </div>
                                                    <div className="flex items-center space-x-2 ml-4">
                                                        <p className={`font-bold text-lg ${isDue ? 'text-red-500' : 'text-green-500'}`}>₹{totalBalanceFormatted}</p>
                                                        {isExpanded ? <ChevronUp size={20} className={titleClasses} /> : <ChevronDown size={20} className={titleClasses} />}
                                                    </div>
                                                </button> */}
                                                    <HistoryInvoiceCard
                                                        invoice={invoice}
                                                        isExpanded={isAnyInvoiceExpanded}
                                                        setIsExpanded={setIsAnyInvoiceExpanded}
                                                        setExpandedId={setExpandedId}
                                                        isLight={isLight}
                                                        isDue={isDue}
                                                        formatDateForDisplay={formatDateForDisplay}
                                                        setPreviewData={setExpandedInvoiceData}
                                                        previewData={expandedInvoiceData}
                                                    />

                                                    {/* --- EXPANDABLE CONTENT --- */}

                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        {/* Render Invoices only if they exist and no error */}

                    </div>
                </div>
            )}


        </div >
    );
}
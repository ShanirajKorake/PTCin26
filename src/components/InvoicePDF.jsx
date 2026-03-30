import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share'; 
import { Download, Share2, CheckCircle } from 'lucide-react';

// NOTE: Ensure these paths are correct in your project structure
import signImg from "../assets/sign.png";
import ptc4 from "../assets/ptc4.jpg"; // Header image
import ptc5 from "../assets/ptc5.jpg"; // Footer image
import gpayQrImg from "../assets/GPAY_QR.jpeg"; 
import PDFViewerComponent from "./PDFViewerComponent"; // Assuming you have this component

// --- Utility Function: Date Format ---
const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    try {
        const parts = dateString.split('T')[0].split('-');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    } catch (e) {
        console.error("Failed to parse date string:", dateString, e);
    }
    return '';
};

export default function InvoicePDF({ formData, vehicles, theme, handleDone}) {
    const [pdfState, setPdfState] = useState({ url: null, filename: null, viewerUrl: null });
    const [isGenerating, setIsGenerating] = useState(true);

    // Helper: Converts a blob into a Base64 string (Data URL format)
    const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };


    // --- 1. PDF GENERATION EFFECT ---
    useEffect(() => {
        setIsGenerating(true);
        
        if (!formData || !vehicles || vehicles.length === 0) {
            setPdfState({ url: null, filename: null, viewerUrl: null });
            setIsGenerating(false);
            return;
        }

        // --- Helper function to convert number to words (Indian system) ---
        const numberToWords = (n) => {
            if (typeof n !== 'number' || isNaN(n)) return 'Zero';
            const num = Math.floor(n);
            if (num === 0) return 'Zero';

            const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
            const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];

            const convertTens = (x) => (x < 20 ? a[x] : b[Math.floor(x / 10)] + a[x % 10]);

            const convertHundreds = (x) => {
                let s = convertTens(x % 100);
                if (x > 99) s = a[Math.floor(x / 100)] + 'Hundred ' + s;
                return s;
            };

            let words = '';
            let tempNum = num;

            // Indian Numbering System
            let part = Math.floor(tempNum / 10000000); // Crores
            if (part > 0) words += convertTens(part) + 'Crore ';
            tempNum %= 10000000;

            part = Math.floor(tempNum / 100000); // Lakhs
            if (part > 0) words += convertTens(part) + 'Lakh ';
            tempNum %= 100000;

            part = Math.floor(tempNum / 1000); // Thousands
            if (part > 0) words += convertTens(part) + 'Thousand ';
            tempNum %= 1000;

            words += convertHundreds(tempNum);

            return words.trim() + ' Only';
        };
        // -------------------------------------------------------------------

        const doc = new jsPDF();
        
        // --- PDF Configuration Constants ---
        const PAGE_WIDTH = 210;
        const MARGIN = 10;
        
        // 7 Logical Columns: [0:LR No. (15), 1:Vehicle/Container No. (30), 2:Charge Name (30), 3:Charge Amt (30), 4:Total Freight (30), 5:Total Advance (30), 6:Balance Due (25)]
        const COL_WIDTHS = [25, 40, 25, 25, 25, 25, 25]; 

        // --- Custom Colors ---
        const COLOR_WHITE = [255, 255, 255];
        const COLOR_LIGHT_GRAY = [240, 240, 240];
        const COLOR_MEDIUM_GRAY = [220, 220, 220];
        const COLOR_RED = [255, 0, 0];

        // Default Table Styles
        const TABLE_BASE_STYLES = {
            fontSize: 10,
            cellPadding: 1.5,
            textColor: [50, 50, 50],
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            margin: { left: MARGIN, right: MARGIN },
            styles: { fillColor: COLOR_WHITE, minCellHeight: 6 }
        };

        // Header Style
        const SECTION_HEAD_STYLES = {
            fillColor: COLOR_MEDIUM_GRAY,
            fontStyle: 'bold',
            fontSize: 8.5,
            halign: 'center'
        };

        let currentY = 0;

        // --- 2. Data Aggregation for Vehicle Charges ---
        const getVehicleChargesData = () => {
            const totalFreightAgg = vehicles.reduce((sum, v) => sum + parseFloat(v.totalFreight || 0), 0);
            const totalAdvanceAgg = vehicles.reduce((sum, v) => sum + parseFloat(v.advance || 0), 0);
            const totalBalanceAgg = vehicles.reduce((sum, v) => sum + parseFloat(v.balance || 0), 0);
            console.log(vehicles);
            const formatCharge = (key) => {
                const vals = vehicles.map(v => parseFloat(v[key]) || 0).filter(v => v > 0);
                if (vals.length === 0) return 0;
                return (vals.every(v => v === vals[0]) && vals.length > 1) 
                    ? `${vals[0]} x ${vals.length}` 
                    : vals.join(' + ');
            };

            const aggregateCharges = {
                Freight: formatCharge('freight'),
                Unloading: formatCharge('unloadingCharges'),
                Detention: formatCharge('detention'),
                Weight: formatCharge('weightCharges'),
                Others: formatCharge('others'),
                Warai: formatCharge('warai'),
            };
            console.log("aggregateCharges", aggregateCharges);

            const charges = [
                { label: 'Freight', value: aggregateCharges.Freight },
                { label: 'Unloading Ch.', value: aggregateCharges.Unloading },
                { label: 'Detention Ch.', value: aggregateCharges.Detention },
                { label: 'Weight Ch.', value: aggregateCharges.Weight },
                { label: 'Other Ch.', value: aggregateCharges.Others },
                { label: 'Warai', value: aggregateCharges.Warai }, 
            ].filter(c => c.value != "0" );
            console.log("charges", charges);

            return { charges, totalFreightAgg, totalAdvanceAgg, totalBalanceAgg };
        };

        const { charges, totalFreightAgg, totalAdvanceAgg, totalBalanceAgg } = getVehicleChargesData();
        
        // --- Calculate Container Type String ---
        const containerTypeString = `${formData.loadDirection || ''} ${formData.vehicleCount || 0}x${formData.containerSize || ''}`;


        // --- 3. Build the SINGLE LARGE TABLE Body (7 logical columns) ---
        const ALL_TABLE_BODY = [];

        // --- SECTION 1: PARTY DETAILS (Combined, spanning 7 columns) ---
        ALL_TABLE_BODY.push([
            {
                content: `Bill To: ${formData.partyName || ''}`,
                colSpan: 7,
                styles: { fontStyle: 'bold', fontSize: 14, fillColor: COLOR_WHITE, textColor: [0, 0, 0], halign: 'left', minCellHeight: 6 }
            }
        ]);
        ALL_TABLE_BODY.push([
            {
                content: `Address: ${formData.partyAddress || 'KALAMBOLI'}`,
                colSpan: 7,
                styles: { fontStyle: 'bold', fontSize: 10, fillColor: COLOR_WHITE, textColor: [0, 0, 0], halign: 'left', minCellHeight: 6 }
            }
        ]);

        // --- SECTION 2: TRIP DETAILS (2 rows) ---
        
        // Row 1: Loading Date, Unloading Date, Container Type (3 EQUAL COLUMNS)
        ALL_TABLE_BODY.push([
            // Column 1: Loading Date (ColSpan 2)
            {
                content: `Loading Date: ${formatDateForDisplay(formData.loadingDate) || ''}`,
                colSpan: 2,
                styles: { fontStyle: 'bold', fillColor: COLOR_WHITE, halign: 'left', fontSize: 10, textColor: [0, 0, 0] }
            },
            // Column 2: Unloading Date (ColSpan 2)
            {
                content: `Unloading Date: ${formatDateForDisplay(formData.unloadingDate) || ''}`,
                colSpan: 3,
                styles: { fontStyle: 'bold', fillColor: COLOR_WHITE, halign: 'center', fontSize: 10, textColor: [0, 0, 0] }
            },
            // Column 3: Container Type (ColSpan 3)
            {
                content: `Cont. Type: ${containerTypeString}`,
                colSpan: 2,
                styles: { fontStyle: 'bold', fillColor: COLOR_WHITE, halign: 'right', fontSize: 10, textColor: [0, 0, 0] } // Highlight Type
            }
        ]);

        // Row 2: Trip locations (ColSpan 2, 3, 2 - remains the same for trip locations)
        ALL_TABLE_BODY.push([
            {
                content: `From: ${formData.from || ''}`,
                colSpan: 2,
                styles: { fontStyle: 'bold', fillColor: COLOR_WHITE, halign: 'left', fontSize: 10, textColor: [0, 0, 0] }
            },
            {
                content: `To: ${formData.to || ''}`,
                colSpan: 3,
                styles: { fontStyle: 'bold', fillColor: COLOR_WHITE, halign: 'center', fontSize: 10, textColor: [0, 0, 0] }
            },
            {
                content: `${formData.backTo?"Back To":""} ${formData.backTo || ''}`,
                colSpan: 2,
                styles: { fontStyle: 'bold', fillColor: COLOR_WHITE, halign: 'right', fontSize: 10, textColor: [0, 0, 0] }
            }
        ]);

        // --- SECTION 3: VEHICLE/CHARGES (Main Content Header) ---
        ALL_TABLE_BODY.push([
            { content: 'LR No.', colSpan: 1, styles: SECTION_HEAD_STYLES }, 
            { content: 'Vehicle/Container No.', colSpan: 1, styles: SECTION_HEAD_STYLES }, 
            { content: 'Charge Name', colSpan: 1, styles: SECTION_HEAD_STYLES },
            { content: 'Charge Amount (INR)', colSpan: 1, styles: SECTION_HEAD_STYLES },
            { content: 'Total Freight', colSpan: 1, styles: SECTION_HEAD_STYLES },
            { content: 'Total Advance', colSpan: 1, styles: SECTION_HEAD_STYLES },
            { content: 'Balance Due', colSpan: 1, styles: SECTION_HEAD_STYLES }
        ]);

        // --- SECTION 3: VEHICLE/CHARGES (Main Content Body) ---

        // Prepare content strings for the new LR and Vehicle/Container columns
        const lrContent = Array.from({ length: 5 }, (_, idx) => {
            const v = vehicles[idx];
            return v ? `${v.lrNo || ''}` : ' ';
        }).join('\n\n');

        const vehicleContainerContent = Array.from({ length: 5 }, (_, idx) => {
            const v = vehicles[idx];
            return v ? `${v.vehicleNo || ''}\n${v.containerNo || ''}` : '\n';
        }).join('\n');


        const N_ROWS_FOR_CHARGES = charges.length || 1;

        for (let i = 0; i < N_ROWS_FOR_CHARGES; i++) {
            const charge = charges[i] || { label: '-', value: 0 };
            let row = [];

            // Col 1: LR No. (Only in the first row, spans N rows)
            if (i === 0) {
                row.push({
                    content: lrContent,
                    rowSpan: N_ROWS_FOR_CHARGES,
                    styles: {
                        fontStyle: 'bold',
                        fontSize: 12,
                        valign: 'top',
                        textColor: COLOR_RED,
                        fillColor: COLOR_WHITE,
                        halign: 'center' 
                    }
                });
            }

            // Col 2: Vehicle/Container No. (Only in the first row, spans N rows)
            if (i === 0) {
                row.push({
                    content: vehicleContainerContent,
                    rowSpan: N_ROWS_FOR_CHARGES,
                    styles: {
                        fontStyle: 'bold',
                        fontSize: 12,
                        valign: 'top',
                        textColor: COLOR_RED,
                        fillColor: COLOR_WHITE,
                        halign: 'left' 
                    }
                });
            }

            // Col 3 & 4: Charge Name and Amount
            row.push({ content: charge.label, styles: { fontSize: 10, fontStyle: 'normal', halign: 'left' } });
            row.push({ content: charge.value, styles: { halign: 'right', fontSize: 10, fontStyle: 'normal' } });

            // Col 5, 6, 7: Totals (Only in the first row, spans N rows) - HIGHLIGHTED
            if (i === 0) {
                const totalColumns = [
                    { value: totalFreightAgg.toFixed(2) },
                    { value: totalAdvanceAgg.toFixed(2) },
                    { value: totalBalanceAgg.toFixed(2) }
                ];

                totalColumns.forEach(col => {
                    row.push({
                        content: col.value,
                        rowSpan: N_ROWS_FOR_CHARGES,
                        styles: {
                            fontStyle: 'bold',
                            fontSize: 10,
                            halign: 'right',
                            valign: 'top',
                            textColor: [50, 50, 50],
                            fillColor: COLOR_WHITE, 
                        }
                    });
                });
            }

            ALL_TABLE_BODY.push(row);
        }

        // --- SECTION 4: GRAND AGGREGATE TOTALS (Summary) ---
        ALL_TABLE_BODY.push([
            {
                content: 'TOTAL (INR)',
                colSpan: 4, 
                styles: { fontStyle: 'bold', halign: 'right', fontSize: 10, fillColor: COLOR_LIGHT_GRAY, textColor: [50, 50, 50], }
            },
            {
                content: totalFreightAgg.toFixed(2),
                styles: { fontStyle: 'bold', fontSize: 10, halign: 'right', fillColor: COLOR_LIGHT_GRAY, textColor: [50, 50, 50], }
            },
            {
                content: totalAdvanceAgg.toFixed(2),
                styles: { fontStyle: 'bold', fontSize: 10, halign: 'right', fillColor: COLOR_LIGHT_GRAY, textColor: [50, 50, 50], }
            },
            {
                content: totalBalanceAgg.toFixed(2),
                styles: { fontStyle: 'bold', fontSize: 10, halign: 'right', fillColor: COLOR_LIGHT_GRAY, textColor: [50, 50, 50], }
            }
        ]);

        // --- SECTION 5: TOTAL DUE IN WORDS ---
        const totalDueAmount = totalBalanceAgg.toFixed(2);
        const totalDueWords = numberToWords(totalBalanceAgg);

        ALL_TABLE_BODY.push([
            {
                content: `Total Balance Due: INR ${totalDueAmount}\n(In Words: ${totalDueWords})`,
                colSpan: 7, 
                styles: {
                    fontStyle: 'bold',
                    textColor: [255, 0, 0],
                    fontSize: 10,
                    halign: 'right',
                    fillColor: COLOR_LIGHT_GRAY, 
                    cellPadding: 3,
                    minCellHeight: 12
                }
            }
        ]);


        // Bank Details & Terms
        const bankDetailsContent =
            `PAN NO.: AWWPP1314Q\n` +
            `Bank Account Details:\n` +
            `Name: PALAK TRANSPORT CORP\n` +
            `Bank: HDFC BANK LTD.\n` +
            `A/c No.: 50200044714511\n` +
            `IFSC: HDFC0002822\n` +
            `Branch: KALAMBOLI`;

        const termsContent =
            `Note:\n\n` +
            `1) 12% Interest will be charged if the payment of this bill is not made within 15 days from the date of bill.\n\n` +
            `2) You are requested to make payment to this bill by cross or order cheque in favour of "PALAK TRANSPORT CORP"`;

        ALL_TABLE_BODY.push([
            {
                content: bankDetailsContent,
                colSpan: 3, 
                styles: { fontStyle: 'normal', fontSize: 10, valign: 'top', cellPadding: 2, fillColor: COLOR_WHITE, halign : 'left' }
            },
            {
                content: termsContent,
                colSpan: 4, 
                styles: { fontStyle: 'normal', fontSize: 10, valign: 'top', halign: 'left', cellPadding: 2, fillColor: COLOR_WHITE }
            }
        ]);


        // --- 4. Document Content Generation ---

        // 4.1 Header Image
        doc.addImage(ptc4, "JPEG", 0, 0, PAGE_WIDTH, 58.03);
        currentY = 62;

        // 4.2 Invoice/Date Info 
        const formattedBillDate = formatDateForDisplay(formData.billDate);
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 0, 0);
        doc.text(`BILL NO. ${formData.invoiceNo || '1'}`, MARGIN + 1, currentY);
        doc.setTextColor(0, 0, 0);
        doc.text(`DATE: ${formattedBillDate || ''}`, PAGE_WIDTH - 11, currentY, { align: 'right' });

        currentY += 2;

        // 4.3 SINGLE LARGE TABLE
        autoTable(doc, {
            ...TABLE_BASE_STYLES,
            startY: currentY,
            head: [],
            body: ALL_TABLE_BODY,
            theme: 'grid',

            // Define 7 columns using the fixed widths
            columnStyles: {
                0: { cellWidth: COL_WIDTHS[0], halign: 'center' }, // LR No. - Center aligned
                1: { cellWidth: COL_WIDTHS[1], halign: 'left' }, // Vehicle/Container No.
                2: { cellWidth: COL_WIDTHS[2], halign: 'left' }, // Charge Name
                3: { cellWidth: COL_WIDTHS[3], halign: 'right' }, // Charge Amount
                4: { cellWidth: COL_WIDTHS[4], halign: 'right' }, // Total Freight
                5: { cellWidth: COL_WIDTHS[5], halign: 'right' }, // Total Advance
                6: { cellWidth: COL_WIDTHS[6], halign: 'right' }, // Balance Due
            },
        });

        currentY = doc.lastAutoTable.finalY + 3;

        // --- 4.4 Signatures (OUT OF TABLE) ---
        const SIGNATURE_Y_POS = 297 - 40;
        const SIGNATURE_IMAGE_WIDTH = 35;
        const SIGNATURE_IMAGE_HEIGHT = 25;
        const SIGNATURE_IMAGE_X_POS = PAGE_WIDTH - MARGIN - SIGNATURE_IMAGE_WIDTH - 10;
        
        // --- GPAY QR IMAGE PLACEMENT (Left side) ---
        const QR_SIZE = 30;
        const QR_X_POS = MARGIN ;
        const QR_Y_POS = SIGNATURE_Y_POS - QR_SIZE ;

        doc.addImage(
            gpayQrImg, 
            "JPEG",
            QR_X_POS,
            QR_Y_POS,
            QR_SIZE,
            QR_SIZE
        );
        doc.setFontSize(8);
        doc.text('Scan for Payment', QR_X_POS + QR_SIZE / 2, QR_Y_POS + QR_SIZE + 4, { align: 'center' });
        // --- END QR CODE ---


        // Authorized Signatory (Right side)
        doc.addImage(
            signImg,
            "PNG",
            SIGNATURE_IMAGE_X_POS,
            SIGNATURE_Y_POS - SIGNATURE_IMAGE_HEIGHT - 4,
            SIGNATURE_IMAGE_WIDTH,
            SIGNATURE_IMAGE_HEIGHT
        );

        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text('Authorised Signatory', PAGE_WIDTH - 17, SIGNATURE_Y_POS - 3, { align: 'right' });
        doc.setFont(undefined, 'normal');
        doc.text('for PALAK TRANSPORT CORP.', PAGE_WIDTH - MARGIN, SIGNATURE_Y_POS + 3, { align: 'right' });

        // 4.5 Footer Image 
        const FOOTER_HEIGHT = 33.12;
        doc.addImage(ptc5, "JPEG", 0, 297 - FOOTER_HEIGHT, PAGE_WIDTH, FOOTER_HEIGHT);

        // --- 5. Final Output ---
        const blob = doc.output("blob");
        
        blobToBase64(blob).then(base64Url => {
            const invoiceNo = formData.invoiceNo || 'DRAFT';
            const filename = `Invoice_${invoiceNo}.pdf`;
            
            const viewerUrl = URL.createObjectURL(blob); 

            setPdfState({ url: base64Url, filename: filename, viewerUrl: viewerUrl });
            setIsGenerating(false);
        }).catch(err => {
            console.error("Base64 conversion failed:", err);
            setIsGenerating(false);
        });

        // Cleanup function for the Blob URL
        return () => {
             if (pdfState.viewerUrl) URL.revokeObjectURL(pdfState.viewerUrl);
        };
    }, [formData, vehicles]); 


    // --- 2. CAPACITOR ACTION LOGIC ---
    
    const isReady = pdfState.url && pdfState.url.length > 100 && !isGenerating; 

    // --- SHARE LOGIC ---
    const handleShare = async () => {
        if (!isReady) return; 

        const { url, filename } = pdfState;
        let rawBase64 = url;

        const base64Index = rawBase64.lastIndexOf(','); 
        if (base64Index > 0) {
            rawBase64 = rawBase64.substring(base64Index + 1);
        }

        try {
            const writeResult = await Filesystem.writeFile({
                path: filename,
                data: rawBase64, 
                directory: Directory.Cache,
                encoding: Encoding.Base64, 
                recursive: true,
            });

            await Share.share({
                title: filename,
                text: `Invoice ${formData.invoiceNo}`,
                url: writeResult.uri,
            });

        } catch (e) {
            console.error('Filesystem Write/Share Error:', e);
            alert('File Write/Share Failed: Check console for error.');
        }
    };
  


    // --- 3. THEME STYLES AND JSX ---
    const primaryButtonClasses = 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]';
    const secondaryButtonClasses = theme === 'light' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-[0.98]' : 'bg-gray-700 text-indigo-400 hover:bg-gray-600 active:scale-[0.98]';
    const doneButtonClasses = theme === 'light' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-green-700 text-white hover:bg-green-600';

    return (
        <div className={`mx-auto flex flex-col items-center w-full ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
            
            {/* PDF Viewer Container */}
            <div 
                className={`w-fit h-115 rounded-2xl overflow-hidden shadow-xl 
                    ${theme === 'light' 
                        ? 'border-4 border-gray-200 bg-white' 
                        : 'border-4 border-gray-700 bg-gray-900'
                    }
                `}
            >
                {pdfState.viewerUrl && !isGenerating ? (
                    <PDFViewerComponent pdfUrl={pdfState.viewerUrl} theme={theme} /> 
                ) : (
                    // Themed loading state
                    <div className="p-5 h-full flex flex-col items-center justify-center">
                        <p className={`text-xl font-medium animate-pulse ${theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'}`}>
                            📄 {isGenerating ? 'Generating Invoice PDF...' : 'Error: Data missing.'}
                        </p>
                        <p className={`text-sm mt-2 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                            (This might take a moment)
                        </p>
                    </div>
                )}
            </div>

            {/* --- ACTION BUTTONS --- */}
            <div className="flex justify-between mt-6 space-x-3 max-w-lg mx-auto">
                
                {/* 1. SHARE Button */}
                <button
                    onClick={handleShare}
                    disabled={!isReady}
                    className={`flex-1 flex items-center justify-center gap-1 px-4 py-3 font-semibold rounded-xl shadow-md transition-all ${isReady ? secondaryButtonClasses : 'bg-gray-400 text-gray-700 cursor-not-allowed'}`}
                >
                    <Share2 size={20} />
                    Share
                </button>
                

                {/* 3. DONE Button (Calls handleDone from parent to reset form) */}
                <button
                    onClick={handleDone}
                    className={`flex-1 flex items-center justify-center gap-1 px-4 py-3 font-semibold rounded-xl shadow-md transition-all ${doneButtonClasses}`}
                >
                    <CheckCircle size={20} />
                    Done
                </button>
            </div>
        </div>
    );
}
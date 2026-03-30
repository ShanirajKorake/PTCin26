import React, { useState, useEffect } from "react";
import { Plus, Trash2, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import InvoicePDF from "./InvoicePDF";
import { Encoding } from '@capacitor/filesystem';
import {
  generateAndSaveInvoice,
  getInvoiceCounter,
  formatInvoiceId,
  getInvoicesHistory
} from "../services/dbService";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';


// --- Utility Function to Clean/Format Vehicle Data (For PDF Generation) ---
const formatVehicleDataForPDF = (vehicle) => {
  const numericFields = [
    'freight', 'unloadingCharges', 'detention', 'weightCharges',
    'others', 'warai', 'advance', 'totalFreight', 'balance'
  ];
  const cleanVehicle = { ...vehicle };
  numericFields.forEach(field => {
    const numericValue = parseFloat(cleanVehicle[field] || 0) || 0;
    cleanVehicle[field] = numericValue.toFixed(2).toString();
  });
  cleanVehicle.lrNo = cleanVehicle.lrNo || "";
  cleanVehicle.vehicleNo = cleanVehicle.vehicleNo || "";
  cleanVehicle.containerNo = cleanVehicle.containerNo || "";
  return cleanVehicle;
};

// --- Initial State for Form Reset ---
const initialFormData = {
  invoiceNo: "Loading...",
  billDate: new Date().toISOString().split("T")[0], // YYYY-MM-DD for HTML input
  partyName: "",
  partyAddress: "",
  from: "",
  to: "",
  backTo: "",
  loadingDate: new Date().toISOString().split("T")[0],
  unloadingDate: new Date().toISOString().split("T")[0],
  warai: "0.00",
  // New structured fields
  loadDirection: "Import", // Default to Import
  vehicleCount: 1, // Default vehicle count
  containerSize: "40", // Default container size
};

const initialVehicleEntry = {
  lrNo: "",
  vehicleNo: "",
  containerNo: "",
  freight: "0.00",
  unloadingCharges: "0.00",
  detention: "0.00",
  weightCharges: "0.00",
  others: "0.00",
  warai: "0.00",
  totalFreight: "0.00",
  advance: "0.00",
  balance: "0.00",
};


// Main Application Component
export default function InvoiceForm({ theme, initialData, context }) {

  const [formData, setFormData] = useState(
    initialData ? initialData.formData : initialFormData
  );
  const [vehicles, setVehicles] = useState(
    initialData ? initialData.vehicles : [initialVehicleEntry]
  );

  const [showPreview, setShowPreview] = useState(false);
  const [pdfData, setPdfData] = useState(null);

  // --- STATE FOR SUBMISSION HANDLING ---
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [retryData, setRetryData] = useState(null);
  // -----------------------------------------

  // --- STATE FOR SUGGESTIONS ---
  const [uniqueSuggestions, setUniqueSuggestions] = useState({});
  const [activeSuggestions, setActiveSuggestions] = useState([]);
  const [activeField, setActiveField] = useState(null);

  // Memoized current vehicle count for easy access
  const currentVehicleCount = parseInt(formData.vehicleCount, 10) || 1;


  // --- Logic to load the next sequential Invoice ID (for display only) ---
  const loadNewInvoiceId = async () => {
    try {
      const nextCount = (await getInvoiceCounter()) + 1;
      setFormData(prev => ({
        ...prev,
        invoiceNo: formatInvoiceId(nextCount),
        billDate: new Date().toISOString().split("T")[0],
      }));
    } catch (e) {
      console.error("Error loading invoice number:", e);
      setFormData(prev => ({ ...prev, invoiceNo: "ERR-000" }));
    }
  };


  // --- EFFECT 1: Load Initial Data / New ID on Mount ---
  useEffect(() => {
    if (initialData) {
      setFormData(initialData.formData);
      setVehicles(initialData.vehicles);
      if (context && context.includes("Dupli")) {
        loadNewInvoiceId();
      }
    } else {
      setFormData(initialFormData);
      setVehicles([initialVehicleEntry]);
      loadNewInvoiceId();
    }
  }, [initialData]);

  // --- EFFECT 2: Load All Past Invoice Data for Suggestions ---
  useEffect(() => {
    const loadPastData = async () => {
      const history = await getInvoicesHistory();
      const data = {
        partyName: new Set(),
        partyAddress: new Set(),
        from: new Set(),
        to: new Set(),
        backTo: new Set(),
        containerSize: new Set(), // Suggestions for size
        lrNo: new Set(),
        vehicleNo: new Set(),
        containerNo: new Set(),
      };

      history.forEach(invoice => {
        const fd = invoice.formData;
        data.partyName.add(fd.partyName);
        data.partyAddress.add(fd.partyAddress);
        data.from.add(fd.from);
        data.to.add(fd.to);
        data.backTo.add(fd.backTo);
        data.containerSize.add(fd.containerSize);

        invoice.vehicles.forEach(v => {
          data.lrNo.add(v.lrNo);
          data.vehicleNo.add(v.vehicleNo);
          data.containerNo.add(v.containerNo);
        });
      });

      const uniqueData = {};
      for (const key in data) {
        uniqueData[key] = Array.from(data[key]).filter(v => v && v.length > 0);
      }
      setUniqueSuggestions(uniqueData);
    };

    loadPastData();
  }, []);

  // --- EFFECT 3: Auto-calculate Warai ---
  useEffect(() => {
    const totalWarai = vehicles.reduce((sum, v) => sum + parseFloat(v.warai || 0), 0);
    setFormData(prev => ({ ...prev, warai: totalWarai.toFixed(2).toString() }));
  }, [vehicles]);

  // --- EFFECT 4: Synchronize Vehicle List with Vehicle Count ---
  useEffect(() => {
    const count = currentVehicleCount;
    if (count > 0) {
      setVehicles(prevVehicles => {
        if (prevVehicles.length === count) return prevVehicles;

        if (prevVehicles.length < count) {
          // Add new vehicles
          const newEntries = Array(count - prevVehicles.length).fill(initialVehicleEntry);
          return [...prevVehicles, ...newEntries];
        } else {
          // Trim vehicles
          return prevVehicles.slice(0, count);
        }
      });
    }
  }, [currentVehicleCount]); // Reruns when formData.vehicleCount changes


  // --- Suggestion Handlers ---
  const handleInputFocus = (fieldName, vehicleIndex = null, currentValue = "") => {
    setActiveField({ name: fieldName, index: vehicleIndex });

    if (uniqueSuggestions[fieldName]) {
      const suggestions = uniqueSuggestions[fieldName].filter(item =>
        item.toLowerCase().startsWith(currentValue.toLowerCase())
      );
      setActiveSuggestions(suggestions);
    } else {
      setActiveSuggestions([]);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setActiveField(null), 300);
  };

  const handleSuggestionClick = (fieldName, value, vehicleIndex = null) => {
    if (vehicleIndex !== null) {
      handleVehicleChange(vehicleIndex, fieldName, value);
    } else {
      handleFormChange({ target: { name: fieldName, value: value } });
    }
    setActiveField(null);
  };


  const handleFormChange = (e) => {
    const { name, value } = e.target;

    // Special handling for vehicleCount to ensure it's a valid number >= 1
    let processedValue = value;
    if (name === 'vehicleCount') {
      processedValue = Math.max(1, parseInt(value, 10) || 1);
    }

    setFormData((prev) => ({ ...prev, [name]: processedValue }));

    if (uniqueSuggestions[name]) {
      const suggestions = uniqueSuggestions[name].filter(item =>
        item.toLowerCase().startsWith(processedValue.toLowerCase())
      );
      setActiveSuggestions(suggestions);
    } else {
      setActiveSuggestions([]);
    }

    setActiveField({ name: name, index: null });
  };

  const handleVehicleChange = (index, field, value) => {
    const updated = vehicles.map((v, i) => {
      if (i === index) {
        let updatedVehicle = { ...v, [field]: value };

        const calculationFields = ['freight', 'unloadingCharges', 'detention', 'weightCharges', 'others', 'warai', 'advance'];

        if (calculationFields.includes(field)) {
          const total = parseFloat(updatedVehicle.freight || 0) +
            parseFloat(updatedVehicle.unloadingCharges || 0) +
            parseFloat(updatedVehicle.detention || 0) +
            parseFloat(updatedVehicle.weightCharges || 0) +
            parseFloat(updatedVehicle.others || 0) +
            parseFloat(updatedVehicle.warai || 0);

          updatedVehicle.totalFreight = total.toFixed(2).toString();
          updatedVehicle.balance = (total - parseFloat(updatedVehicle.advance || 0)).toFixed(2).toString();
        }
        return updatedVehicle;
      }
      return v;
    });

    setVehicles(updated);

    if (uniqueSuggestions[field]) {
      const suggestions = uniqueSuggestions[field].filter(item =>
        item.toLowerCase().startsWith(value.toLowerCase())
      );
      setActiveSuggestions(suggestions);
    } else {
      setActiveSuggestions([]);
    }

    setActiveField({ name: field, index: index });
  };


  // --- Form Controls (simplified - only for explicit adding/removing if count is manual) ---
  const addVehicle = () => {
    // Manual override increases vehicleCount state, triggering Effect 4
    const newVehicle = { ...initialVehicleEntry };
    setVehicles([...vehicles, newVehicle]);
    setFormData(prev => ({ ...prev, vehicleCount: prev.vehicleCount + 1 }));
  };

  const removeVehicle = (index) => {
    if (vehicles.length > 1) {
      setVehicles(vehicles.filter((_, i) => i !== index));
      setFormData(prev => ({ ...prev, vehicleCount: prev.vehicleCount - 1 }));
    }
  };


  // --- Post-Preview Done Action ---
  const handleDone = () => {
    setShowPreview(false);
    setFormData(initialFormData);
    setVehicles([initialVehicleEntry]);
    loadNewInvoiceId();
  };


  // Calculate summary totals
  const totalBalance = vehicles.reduce((sum, v) => sum + parseFloat(v.balance || 0), 0).toFixed(2);
  const totalAdvance = vehicles.reduce((sum, v) => sum + parseFloat(v.advance || 0), 0).toFixed(2);
  const totalFreight = vehicles.reduce((sum, v) => sum + parseFloat(v.totalFreight || 0), 0).toFixed(2);


  // --- CAPACITOR ACTIONS (Unchanged) ---
  const handleShare = async () => {
    if (!pdfData || !pdfData.url) return;
    const filename = pdfData.filename || `Invoice_${formData.invoiceNo}.pdf`;
    let rawBase64 = pdfData.url;

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
        text: 'Here is your generated invoice.',
        url: writeResult.uri,
      });

    } catch (e) {
      console.error('Error sharing PDF:', e);
      alert('Failed to share PDF. Check console for details.');
    }
  };

  const handleDownload = () => {
    alert(`Download started for ${pdfData.filename}! (Needs full Filesystem implementation)`);
  };


  // --- CORE SAVE/GENERATE FUNCTIONALITY (UPDATED TO INCLUDE ALERT) ---
  const coreSaveAndGenerate = async (dataToSave, isRetry = false) => {
    setIsSaving(true);
    setSaveError(null);

    if (dataToSave.formData.invoiceNo.includes("Load") || dataToSave.formData.invoiceNo.includes("ERR") || !dataToSave.formData.partyName || dataToSave.vehicles.length === 0) {
      alert("Please ensure Party Name is filled and the Invoice ID is valid.");
      setIsSaving(false);
      return;
    }

    try {
      // Call the consolidated orchestration function
      const saveResult = await generateAndSaveInvoice(dataToSave);

      if (saveResult.status === 'aborted') {
        setIsSaving(false);
        return;
      }

      // --- ALERT LOGIC ADDED ---
      if (saveResult.status === 'updated') {
        // Alert user that they updated an existing record
        alert(`⚠️ Warning: Invoice ID ${saveResult.invoiceNo} already exists. The existing record has been updated with the current data.`);
      }
      // -------------------------

      // Update local state and data package with the FINAL, confirmed invoiceNo.
      if (saveResult.status === 'saved' || saveResult.status === 'updated') {
        const finalInvoiceNo = saveResult.invoiceNo;
        dataToSave.formData.invoiceNo = finalInvoiceNo;
        setFormData(prev => ({ ...prev, invoiceNo: finalInvoiceNo }));
      }

      setRetryData(null);

      const formattedVehicles = vehicles.map(formatVehicleDataForPDF);
      const filename = `Invoice_${dataToSave.formData.invoiceNo}_${new Date().getFullYear()}.pdf`;

      setPdfData({
        formData: dataToSave.formData,
        vehicles: formattedVehicles,
        url: "data:application/pdf;base64,Base64_PDF_Content", // Placeholder, replace with actual PDF generation
        filename: filename
      });

      setShowPreview(true);

    } catch (error) {
      const errorMsg = "Error: Could not complete save/generate process. Check the console for details.";
      setSaveError(errorMsg);
      setRetryData(dataToSave);
      console.error("Save failed:", error);

    } finally {
      setIsSaving(false);
    }
  };

  // --- Main submission wrapper function (Unchanged) ---
  const handleSaveAndGeneratePDF = (isRetry = false) => {

    const invoiceRecord = {
      formData: {
        ...formData,
        warai: parseFloat(formData.warai || 0).toFixed(2).toString(),
      },
      vehicles: vehicles.map(v => ({
        ...v,
        freight: parseFloat(v.freight || 0).toFixed(2).toString(),
        balance: parseFloat(v.balance || 0).toFixed(2).toString(),
        totalFreight: parseFloat(v.totalFreight || 0).toFixed(2).toString(),
      })),
      summary: {
        totalFreight: parseFloat(totalFreight).toFixed(2),
        totalAdvance: parseFloat(totalAdvance).toFixed(2),
        totalBalance: parseFloat(totalBalance).toFixed(2),
      }
    };

    const dataToUse = isRetry && retryData ? retryData : invoiceRecord;

    coreSaveAndGenerate(dataToUse, isRetry);
  };
  // --------------------------------------------------------------------------


  // --- DYNAMIC THEME CLASSES ---
  const isLight = theme === "light";
  const sectionContainerClasses = isLight ? "bg-indigo-50 p-4 rounded-2xl mb-5 shadow-sm border border-indigo-100" : "bg-gray-800 p-4 rounded-2xl mb-5 shadow-inner shadow-gray-700/50 border border-gray-700";
  const cardContainerClasses = isLight ? "bg-gray-50 p-4 rounded-2xl mb-4 shadow-sm border border-gray-200" : "bg-gray-700/50 p-4 rounded-2xl mb-4 shadow-sm border border-gray-600";
  const labelClasses = isLight ? "text-gray-700" : "text-gray-300";
  const headerTextClasses = isLight ? "text-indigo-700" : "text-indigo-400";
  const subHeaderTextClasses = isLight ? "text-gray-800" : "text-gray-100";
  const inputClasses = isLight ? "w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white text-gray-800" : "w-full border border-gray-600 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-gray-900 text-white";
  const inputSmallClasses = isLight ? "w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white text-gray-800" : "w-full border border-gray-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 bg-gray-900 text-white";

  const primaryButtonClasses = `w-full text-white px-6 py-3 rounded-2xl shadow-xl transition-all duration-300 text-lg font-semibold tracking-wide 
    ${isSaving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`;

  const retryButtonClasses = "w-full bg-red-600 text-white px-6 py-3 rounded-2xl shadow-xl hover:bg-red-700 transition-all duration-300 text-lg font-semibold tracking-wide";

  const secondaryButtonClasses = isLight ? "flex items-center p-2 rounded-full text-gray-600 border border-gray-300 hover:bg-gray-100 transition text-sm font-medium" : "flex p-2 rounded-full items-center gap-1 text-gray-300 border border-gray-600 hover:bg-gray-700 transition text-sm font-medium";
  const summaryBoxClasses = isLight ? "bg-indigo-100 p-4 rounded-3xl mb-6 shadow-md border-2 border-indigo-200" : "bg-indigo-900/40 p-4 rounded-3xl mb-6 shadow-md border-2 border-indigo-800";

  const suggestionContainerClasses = isLight ? 'bg-white border border-gray-300 shadow-lg' : 'bg-gray-700 border border-gray-600 shadow-xl';
  const suggestionItemClasses = isLight ? 'hover:bg-indigo-50 text-gray-800' : 'hover:bg-indigo-900/50 text-white';
  // ------------------------------------


  // --- SUGGESTION RENDERING COMPONENT ---
  const SuggestionDropdown = ({ fieldName, value, onSelect, vehicleIndex = null }) => {
    const showDropdown = activeField &&
      activeField.name === fieldName &&
      activeField.index === vehicleIndex &&
      activeSuggestions.length > 0 &&
      value.length > 0;

    if (!showDropdown) return null;

    return (
      <div className={`absolute z-20 w-full mt-1 max-h-40 overflow-y-auto rounded-lg ${suggestionContainerClasses}`}>
        {activeSuggestions.slice(0, 8).map((suggestion, i) => (
          <button
            key={i}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(fieldName, suggestion, vehicleIndex);
            }}
            className={`block w-full text-left px-3 py-2 text-sm truncate ${suggestionItemClasses}`}
          >
            {suggestion}
          </button>
        ))}
      </div>
    );
  };

  // --- Render Functions for Form Input and Vehicle Input ---
  const renderFormInput = (name) => {
    const isDate = name.includes('Date');
    const currentValue = formData[name];

    return (
      <div key={name} className="relative">
        <label className={`block text-sm font-medium mb-1 ${labelClasses}`}>{name.replace(/([A-Z])/g, ' $1').trim()}</label>
        <input
          type={isDate ? 'date' : 'text'}
          name={name}
          value={currentValue}
          onChange={handleFormChange}
          onFocus={() => handleInputFocus(name, null, currentValue)}
          onBlur={handleInputBlur}
          className={inputClasses}
        />
        {!isDate && (
          <SuggestionDropdown
            fieldName={name}
            value={currentValue}
            onSelect={handleSuggestionClick}
          />
        )}
      </div>
    );
  };


  return (
    <div className="mx-auto">
      <div className="p-2">
        {!showPreview ? (
          <div>
            {/* Bill & Trip Information */}
            <div className={sectionContainerClasses}>
              <h3 className={`text-lg font-semibold mb-3 ${headerTextClasses}`}>Bill & Global Trip Details</h3>

              <div className="grid grid-cols-1 gap-3 mb-3">

                {/* INVOICE NUMBER - Editable */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${labelClasses}`}>Invoice No</label>
                  <input
                    type="text"
                    name="invoiceNo"
                    value={formData.invoiceNo}
                    onChange={handleFormChange}
                    // Use a different color if the ID is not the standard sequential format
                    className={inputClasses + " font-bold " + (formData.invoiceNo.startsWith("P26-") && !formData.invoiceNo.includes("ERR") ? "text-indigo-600" : "text-red-500")}
                  />
                </div>

                {renderFormInput('billDate')}
                {renderFormInput('partyName')}
              </div>

              <div className="grid grid-cols-1 gap-3">
                {renderFormInput('loadingDate')}
                {renderFormInput('unloadingDate')}
                {renderFormInput('from')}
                {renderFormInput('to')}
                {renderFormInput('backTo')}
              </div>

              <div className="mt-3">
                {renderFormInput('partyAddress')}
              </div>
            </div>

            {/* --- NEW: CONTAINER TYPE SECTION --- */}
            <div className={sectionContainerClasses}>
              <h3 className={`text-lg font-semibold mb-3 ${headerTextClasses}`}>Container/Load Details</h3>

              <div className="grid grid-cols-3 gap-3">
                {/* 1. Load Direction Dropdown */}
                <div className="col-span-1">
                  <label className={`block text-sm font-medium mb-1 ${labelClasses}`}>Direction</label>
                  <select
                    name="loadDirection"
                    value={formData.loadDirection}
                    onChange={handleFormChange}
                    className={inputClasses}
                  >
                    <option value="Import">Import</option>
                    <option value="Export">Export</option>
                  </select>
                </div>

                {/* 2. Vehicle Count Number Input */}
                <div className="col-span-1">
                  <label className={`block text-sm font-medium mb-1 ${labelClasses}`}>Vehicle Count</label>
                  <input
                    type="number"
                    name="vehicleCount"
                    min="1"
                    value={formData.vehicleCount}
                    onChange={handleFormChange}
                    className={inputClasses}
                    placeholder="1"
                  />
                </div>

                {/* 3. Container Size/Type Text Input */}
                <div className="col-span-1">
                  <label className={`block text-sm font-medium mb-1 ${labelClasses}`}>Size/Type (e.g. 40)</label>
                  <input
                    type="text"
                    name="containerSize"
                    value={formData.containerSize}
                    onChange={handleFormChange}
                    onFocus={() => handleInputFocus('containerSize', null, formData.containerSize)}
                    onBlur={handleInputBlur}
                    className={inputClasses}
                    placeholder="40"
                  />
                  <SuggestionDropdown
                    fieldName='containerSize'
                    value={formData.containerSize}
                    onSelect={handleSuggestionClick}
                  />
                </div>
              </div>

              <p className={`text-sm mt-3 ${labelClasses}`}>
                Total vehicles entries below: {currentVehicleCount} ({formData.loadDirection} {currentVehicleCount}x{formData.containerSize})
              </p>
            </div>
            {/* --- END CONTAINER TYPE SECTION --- */}


            {/* Vehicle Details Section */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-bold ${subHeaderTextClasses}`}>Vehicle Entries ({vehicles.length})</h3>
                {/* NOTE: We keep manual buttons for adding/removing vehicles, which also updates the count */}
                <button
                  type="button"
                  onClick={addVehicle}
                  className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-xl shadow-md hover:bg-indigo-700 transition text-sm font-medium"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>

              {vehicles.length >= 5 ? (
                <div className="flex justify-center items-center mb-4 w-full">
                <div className="border px-2 py-1 rounded-full text-sm text-red-500">Note: More than 5 vehicals can't be displayed on bill.</div>
              </div>
              ) : ""}
              

              {vehicles.map((vehicle, index) => (
                <div key={index} className={cardContainerClasses}>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className={`text-lg font-bold ${headerTextClasses}`}>Vehicle #{index + 1}</h4>
                    {vehicles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVehicle(index)}
                        className={isLight ? "text-red-500 hover:bg-red-50 p-1 rounded-full transition" : "text-red-400 hover:bg-gray-600 p-1 rounded-full transition"}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Vehicle Numbers */}
                  <div className={isLight ? "grid grid-cols-1 gap-3 mb-4 p-3 bg-white rounded-xl border border-gray-100" : "grid grid-cols-1 gap-3 mb-4 p-3 bg-gray-800 rounded-xl border border-gray-700"}>
                    {['lrNo', 'vehicleNo', 'containerNo'].map(field => (
                      <div key={field} className="relative">
                        <label className={`block text-sm font-medium mb-1 ${labelClasses}`}>{field.replace(/([A-Z])/g, ' $1').trim()}</label>
                        <input
                          type="text"
                          value={vehicle[field]}
                          onChange={(e) => handleVehicleChange(index, field, e.target.value)}
                          onFocus={() => handleInputFocus(field, index, vehicle[field])}
                          onBlur={handleInputBlur}
                          className={inputSmallClasses}
                        />
                        <SuggestionDropdown
                          fieldName={field}
                          value={vehicle[field]}
                          onSelect={handleSuggestionClick}
                          vehicleIndex={index}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Charges & Advance (Amounts - NOT suggestive) */}
                  <h5 className={`text-md font-semibold mb-3 border-b pb-2 ${labelClasses} ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>Charges & Advance</h5>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Input Fields (Amounts) */}
                    {['freight', 'unloadingCharges', 'detention', 'weightCharges', 'others', 'warai', 'advance'].map(field => (
                      <div key={field}>
                        <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{field.replace(/([A-Z])/g, ' $1').trim()}</label>
                        <input
                          type="number"
                          value={vehicle[field]}
                          onChange={(e) => handleVehicleChange(index, field, e.target.value)}
                          className={inputSmallClasses}
                          placeholder="0.00"
                        />
                      </div>
                    ))}

                    {/* Calculated Fields (unchanged) */}
                    <div className={`col-span-2 grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-dashed ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${labelClasses}`}>Total Freight</label>
                        <input type="number" value={vehicle.totalFreight} readOnly className={isLight ? "w-full border-2 border-indigo-200 rounded-xl px-3 py-2 bg-indigo-50 text-indigo-900 font-bold text-sm" : "w-full border-2 border-indigo-800 rounded-xl px-3 py-2 bg-indigo-900/30 text-indigo-300 font-bold text-sm"} />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${labelClasses}`}>Balance</label>
                        <input type="number" value={vehicle.balance} readOnly className={isLight ? "w-full border-2 border-green-200 rounded-xl px-3 py-2 bg-green-50 text-green-800 font-bold text-sm" : "w-full border-2 border-green-800 rounded-xl px-3 py-2 bg-green-900/30 text-green-300 font-bold text-sm"} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>


            {/* INVOICE SUMMARY SECTION (unchanged) */}
            <div className={summaryBoxClasses}>
              <h3 className={`text-xl font-bold mb-3 ${headerTextClasses}`}>Invoice Totals Summary</h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Summary Fields */}
                <div><label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-indigo-800' : 'text-indigo-300'}`}>Total Freight</label><div className={isLight ? "w-full rounded-xl px-3 py-2 bg-indigo-50 text-indigo-900 font-extrabold text-base border border-indigo-200" : "w-full rounded-xl px-3 py-2 bg-indigo-900/30 text-indigo-300 font-extrabold text-base border border-indigo-800"}>₹ {parseFloat(totalFreight).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>

                <div><label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-red-800' : 'text-red-300'}`}>Total Advance</label><div className={isLight ? "w-full rounded-xl px-3 py-2 bg-red-50 text-red-800 font-extrabold text-base border border-red-200" : "w-full rounded-xl px-3 py-2 bg-red-900/30 text-red-300 font-extrabold text-base border border-red-800"}>₹ {parseFloat(totalAdvance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
                <div><label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-green-800' : 'text-green-300'}`}>Balance Due</label><div className={isLight ? "w-full rounded-xl px-3 py-2 bg-green-50 text-green-800 font-extrabold text-base border border-green-200" : "w-full rounded-xl px-3 py-2 bg-green-900/30 text-green-300 font-extrabold text-base border border-green-800"}>₹ {parseFloat(totalBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
              </div>
            </div>

            {/* --- SAVE AND RETRY BUTTONS --- */}
            <div className="flex flex-col gap-3 justify-center">

              {/* Error Message */}
              {saveError && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-red-700 text-sm font-medium text-center">
                  {saveError}
                </div>
              )}

              {/* Save/Retry Button */}
              <button
                onClick={() => handleSaveAndGeneratePDF(saveError ? true : false)}
                disabled={isSaving}
                className={saveError ? retryButtonClasses : primaryButtonClasses}
              >
                {isSaving ? (
                  <span className="flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin mr-2" />
                    {saveError ? 'Retrying...' : 'Saving...'}
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    {saveError ? (
                      <>
                        <RefreshCw size={20} className="mr-2" />
                        Retry Save
                      </>
                    ) : (
                      'Save and Generate PDF'
                    )}
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center p-4">
              <h3 className={`text-xl font-bold ${subHeaderTextClasses}`}>Invoice Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className={secondaryButtonClasses}
              >
                <ArrowLeft size={16} /> Back to Edit
              </button>
            </div>
            {/* RENDER INVOICE PDF AND PASS HANDLERS */}
            <InvoicePDF
              formData={pdfData.formData}
              vehicles={pdfData.vehicles}
              theme={theme}
              pdfData={pdfData}
              handleDownload={handleDownload}
              handleShare={handleShare}
              handleDone={handleDone}
            />
          </div>
        )}
      </div>
    </div>
  );
}
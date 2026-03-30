import React from 'react';
import InvoiceForm from '../components/InvoiceForm';

// Accept the 'theme' prop
export default function NewInvoice({ theme, initialData, contextTitle }) {
  
  // Define classes for the main container based on the theme
  const containerClasses = theme === "light"
    ? "bg-gray-50 text-gray-800"
    : "bg-gray-900 text-white";

  return (
    // Apply the dynamic container classes
    <div className={` text-center w-full  ${containerClasses}`}>
        
        {/* Removed: <h2 className="text-4xl font-extrabold mb-8 text-indigo-400">Create New Invoice</h2> */}
        
        {/* Pass the theme prop to the InvoiceForm */}
        <InvoiceForm theme={theme}  initialData={initialData}  context={contextTitle}/>
        
        {/* Removed: Submit Button */}
    </div>
  )
}
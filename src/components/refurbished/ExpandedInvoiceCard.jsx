import { CheckCircle, Copy, Edit, MoveRight, Trash2 } from 'lucide-react';
import React from 'react'

export default function ExpandedInvoiceCard({ invoiceData, formatDateForDisplay, handleClearDue, isDeleting, handleGeneratePDF, prepareDataForEdit, prepareDataForDuplicate, handleDelete, theme }) {
    const summary = invoiceData.summary;
    const formData = invoiceData.formData;
    const vehicles = invoiceData.vehicles;
    const balanceDue = parseFloat(summary.totalBalance || 0);
    const isDue = balanceDue > 0.01;
    const totalBalanceFormatted = balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const isLight = theme === "light";
    const titleClasses = isLight ? "text-gray-600" : "text-gray-400";
    const subTextClasses = isLight ? "text-gray-600" : "text-gray-400";
    const summaryHeaderClasses = isLight ? "bg-indigo-100 text-indigo-800" : "bg-indigo-900/40 text-indigo-300";
    // NEW: Construct the container type string
    const containerTypeString = `${formData.loadDirection || ''} ${formData.vehicleCount || 0}x${formData.containerSize || ''}`;

    const containerClasses = isLight ? "bg-white" : "bg-gray-800"

    const mainBorderClasses = isLight ? "border border-1 border-gray-400" : "border-1 border-gray-600"


    return (
        <div className={`flex flex-col m-4  gap-1 overflow-y-scroll ${isLight ? "bg-white":"bg-gray-800"} rounded-4xl ${mainBorderClasses} `}>

            <div className={`p-4 py-2 rounded-4xl ${containerClasses} ${mainBorderClasses}`}>
                <div className='font-bold w-full text-center text-wrap text-xl'>
                    {formData.partyName}
                </div>
                <div className={`font-bold w-full text-center text-wrap text-xl ${isLight ? "text-gray-500" : "text-gray-500"}`}>
                    {formData.partyAddress}
                </div>
            </div>
            <div className='rounded-xl overflow-clip flex flex-col gap-o.5'>
                <div className=" font-bold flex items-stretch align-middle text-center gap-0.5">

                    <div className={`p-2 rounded-md flex-2 flex flex-col items-center justify-center ${containerClasses}`}>
                        {formData.from}
                        <div className={`text-sm w-fit rounded-full px-1 ${isLight ? 'bg-gray-400 text-gray-100' : 'bg-gray-500 text-gray-800'}`}>
                            {formatDateForDisplay(formData.loadingDate)}
                        </div>
                    </div>

                    <div className={`${containerClasses} flex items-center rounded-md p-1 flex-none`} >
                        <MoveRight size={24} />
                    </div>

                    <div className={`p-2 rounded-md flex-2 flex flex-col items-center justify-center ${containerClasses}`}>
                        {formData.to}
                        {formData.backTo === "" && (
                            <div className={`text-sm w-fit rounded-full px-1 ${isLight ? 'bg-gray-400 text-gray-100' : 'bg-gray-500 text-gray-800'}`}>
                                {formatDateForDisplay(formData.unloadingDate)}
                            </div>
                        )}
                    </div>

                    {formData.backTo !== "" && (
                        <>
                            <div className={`${containerClasses} flex items-center rounded-md p-1 flex-none`} >
                                <MoveRight size={24} />
                            </div>

                            <div className={`p-2 rounded-md flex-2 flex flex-col items-center justify-center ${containerClasses}`}>
                                {formData.backTo}
                                <div className={`text-sm w-fit rounded-full px-1 ${isLight ? 'bg-gray-400 text-gray-100' : 'bg-gray-500 text-gray-800'}`}>
                                    {formatDateForDisplay(formData.unloadingDate)}
                                </div>
                            </div>
                        </>
                    )}

                </div>
                <div className={`p-1 flex items-center justify-center font-bold rounded-md mt-0.5 ${containerClasses}`}>
                    <p className={`${subTextClasses} text-sm`}>
                        {containerTypeString}
                    </p>
                </div>
            </div>

            {/*redesign from here*/}

            {/* VEHICLES */}
            <div className="flex flex-col gap-1">

                <div className="flex flex-col gap-0.5">
                    {vehicles.map((v, index) => (
                        <div
                            key={index}
                            className={` p-2 flex flex-col gap-1 ${isLight ? "bg-gray-200" : "bg-gray-900"}`}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center font-bold">
                                <span className='text-lg'>{v.vehicleNo}</span>
                                {v.lrNo != "" &&
                                    <span className={`text-md ${subTextClasses}`}>LR {v.lrNo}</span>
                                }
                            </div>
                            { v.containerNo != "" &&
                                <span className={`text-sm ${subTextClasses}`}>Cont. No: {v.containerNo}</span>
                            }

                            {/* Charges */}
                            <div className="grid grid-cols gap-x-3 text-sm">
                                {[
                                    'freight',
                                    'unloadingCharges',
                                    'detention',
                                    'weightCharges',
                                    'others',
                                    'warai',
                                    'advance'
                                ].map(field => (
                                    <div key={field} className="flex justify-between">
                                        {v[field] != 0 && (
                                            <>
                                                <span className={subTextClasses}>
                                                    {field.replace(/([A-Z])/g, ' $1').replace('warai', 'Warai')}
                                                </span>
                                                <span className="font-semibold">
                                                    ₹{parseFloat(v[field]).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Balance */}
                            <div className="flex justify-between text-sm font-bold pt-1 border-t border-dashed border-gray-400/30">
                                <span className="text-red-500">Balance</span>
                                <span className="text-red-500">
                                    ₹{parseFloat(v.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SUMMARY */}
            <div className={` p-3 flex flex-col gap-1 ${containerClasses} `}>
                <div className={`font-bold text-sm ${titleClasses}`}>Invoice Summary</div>

                <div className="grid grid-cols-2 text-sm gap-y-1">
                    <span className={subTextClasses}>Gross Freight</span>
                    <span className="font-bold text-right">
                        ₹{parseFloat(summary.totalFreight).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>

                    <span className={subTextClasses}>Total Advance</span>
                    <span className="font-bold text-right">
                        ₹{parseFloat(summary.totalAdvance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    
                    <span className={`font-extrabold text-lg ${isDue ? 'text-red-500' : 'text-green-500'} h-full flex items-center`}>
                        Balance Due
                    </span>
                    <span className={`font-extrabold text-2xl text-right ${isDue ? 'text-red-500' : 'text-green-500'}`}>
                        ₹{totalBalanceFormatted}
                    </span>
                </div>
            </div>

            {/* PRIMARY ACTIONS */}
            <div className=" flex gap-3 px-3">
                {isDue ? (
                    <button
                        onClick={() => handleClearDue(invoiceData.id, formData.partyName)}
                        disabled={isDeleting}
                        className={`flex-1 rounded-xl py-4 font-bold text-sm transition  text-shadow-lg 
        ${isDeleting ? 'opacity-60' : 'hover:scale-[1.01]'}
        ${isLight ? 'bg-green-600 text-white' : 'bg-green-500 text-white'}
      `}
                    >
                        {isDeleting ? 'Updating…' : 'Clear Due'}
                    </button>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center rounded-xl py-1 text-center font-bold text-green-500">
                        <span>PAID</span>
                        {invoiceData.clearedDate && (
                            <span className="text-xs font-medium text-green-600">
                                {formatDateForDisplay(invoiceData.clearedDate)}
                            </span>
                        )}
                    </div>
                )}

                <button
                    onClick={() => handleGeneratePDF(invoiceData)}
                    className={`flex-1 rounded-xl py-2 font-bold text-sm transition text-shadow-lg hover:scale-[1.01] ${isLight ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white'}`}
                >
                    Generate PDF
                </button>
            </div>

            {/* SECONDARY ACTIONS */}
            <div className="mt-1 flex gap-1 px-3">
                <button
                    onClick={() => prepareDataForEdit(invoiceData)}
                    className={`flex-1 rounded-xl py-4 text-xs font-semibold ${containerClasses}`}
                >
                    <Edit size={14} className="inline mr-1" />
                    Edit
                </button>

                <button
                    onClick={() => prepareDataForDuplicate(invoiceData)}
                    className={`flex-1 rounded-xl py-2 text-xs font-semibold ${containerClasses}`}
                >
                    <Copy size={14} className="inline mr-1" />
                    Duplicate
                </button>

                <button
                    onClick={() => handleDelete(invoiceData.id, formData.partyName)}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold text-red-500 ${containerClasses}`}

                >
                    <Trash2 size={14} className="inline mr-1" />
                    Delete
                </button>
            </div>

        </div>
    )
}

import { ArrowLeft, ArrowRight, Dot, MoveRight } from 'lucide-react'
import React from 'react'

export default function HistoryInvoiceCard({ invoice, setIsExpanded, isExpanded, setExpandedId, isLight, formatDateForDisplay, isDue, setPreviewData, resetScroll }) {

    const subTextClasses = isLight ? "text-gray-500" : "text-gray-500"
    const formatDateWithMonthName = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
    return (
        <>
            <button
                className={`w-full px-4 py-3  transition-colors`}
                onClick={() => {
                    
                    setPreviewData(prev =>
                        prev === null ? invoice : null
                    );
                    setIsExpanded(prev => !prev);
                    setExpandedId(invoice.id);

                }}
            >
                <p className={`text-sm flex items-center align-middle justify-center font-semibold text-left ${subTextClasses}`}>

                    {invoice.formData.invoiceNo}

                    <Dot size={24} />

                    {`${formatDateWithMonthName(invoice.formData.billDate)}`}

                </p>
                <div className={`w-full text-center text-lg  font-bold ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                    {invoice.formData.partyName}
                    <div className={`${isLight ? "text-gray-700" : "text-gray-500"}`}>{
                        invoice.vehicles.map((v) => (v.vehicleNo + " "))
                        }</div>
                </div>

                <div className='flex items-center align-middle justify-center'>
                    <div className='flex align-middle items-center text-center justify-center h-full w-full pb-1'>
                        <p className={ `self-center text-2xl font-bold text-center ${isDue ? 'text-red-500' : 'line-through text-gray-500'}`}>
                            {`Rs. ${isDue? invoice.summary.totalBalance : invoice.summary.totalFreight }`}</p>
                        {!isDue &&
                            <div className='flex items-center align-middle justify-center'>
                                <Dot size={24} className={subTextClasses} />
                                <div className={`flex flex-col items-center justify-center `}>
                                    <div className={`text-center text-green-500 font-bold`}>
                                        PAID
                                    </div>
                                    {invoice.clearedDate && (
                                        <div className={`text-xs text-green-600 font-medium bg-gray-700 p-1 rounded-full`}>
                                            {formatDateForDisplay(invoice.clearedDate)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        }
                    </div>
                </div>
                <div className={`text-wrap text-sm flex items-center align-middle gap-2  ${isLight ? 'bg-gray-200' : 'bg-gray-700'} rounded-full py-2 px-3`}>
                    <div className='flex-2 flex flex-col items-center justify-center'>
                        {invoice.formData.from}

                        <div className={`text-sm w-fit font-normal rounded-full px-1 ${isLight ? 'bg-gray-400 text-gray-100' : 'bg-gray-500 text-gray-800'}`}>
                            {formatDateForDisplay(invoice.formData.loadingDate)}
                        </div>

                    </div>
                    <MoveRight size={24} className='flex-none' />
                    <div className='flex-2 flex flex-col items-center justify-center'>
                        {invoice.formData.to}
                        {invoice.formData.backTo == "" ? (
                            <div className={`text-sm w-fit font-normal rounded-full px-1 ${isLight ? 'bg-gray-400 text-gray-100' : 'bg-gray-500 text-gray-800'}`}>
                                {formatDateForDisplay(invoice.formData.unloadingDate)}
                            </div>
                        ) : null}
                    </div>
                    {
                        (invoice.formData.backTo != "") && <>
                            <MoveRight size={24} className='flex-none' />
                            <div className='flex flex-2 flex-col items-center justify-center'>
                                <div className='w-full flex text-center justify-center'>
                                    {invoice.formData.backTo}
                                </div>
                                <div className={`text-sm w-fit font-normal rounded-full px-1 ${isLight ? 'bg-gray-400 text-gray-100' : 'bg-gray-500 text-gray-800'}`}>
                                    {formatDateForDisplay(invoice.formData.unloadingDate)}
                                </div>
                            </div>
                        </>
                    }
                </div>

            </button>
        </>
    )
}

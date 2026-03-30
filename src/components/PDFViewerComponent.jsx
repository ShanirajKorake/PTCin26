import React, { useState } from 'react';
import { Document, Page } from 'react-pdf';
// Import the necessary CSS for the text layer (optional but recommended)

import { pdfjs } from 'react-pdf';

// ----------------------------------------------------------------------
// 💡 IMPORTANT: This line resolves the path correctly for modern bundlers (like Vite)
// which bundle dependencies and workers.
// ----------------------------------------------------------------------
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();
export default function PDFViewerComponent({ pdfUrl }) {
  const [numPages, setNumPages] = useState(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  // Create an array of page numbers to map over
  const pages = Array.from(new Array(numPages), (el, index) => index + 1);

  return (
    <div className="pdf-viewer-container w-fit">
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        className="w-full" // Apply Tailwind classes here
      >
        {/* Render each page separately */}
        {pages.map(pageNumber => (
          <div key={`page_${pageNumber}`} className="mb-4 shadow-md border border-gray-200">
            <Page
              pageNumber={pageNumber}
              // Set a specific width/scale if needed for mobile view
              width={320} // 90% of the viewport width
            />
            <p className="text-center text-sm p-1 text-gray-500">
                Page {pageNumber} of {numPages}
            </p>
          </div>
        ))}
      </Document>

      {!numPages && (
        <p className="text-center p-5 text-gray-600 font-medium">Loading Document...</p>
      )}
    </div>
  );
}
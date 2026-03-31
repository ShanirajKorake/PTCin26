import { Client, TablesDB, Query, ID } from 'appwrite';

// --- CONFIGURATION (Based on your input) ---
// Ensure these match your Appwrite environment variables exactly
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT; 
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID; 


// Table (Collection) IDs
const COUNTER_TABLE_ID = 'counters'; 
const ENTRIES_TABLE_ID = 'entries26'; 

// Counter Row ID (The specific row that holds the current number)
const COUNTER_ROW_ID = 'invoice_counter26'; 

// Field/Column Names
const COUNTER_COLUMN_KEY = 'count'; // Must be a numeric (integer) column in the 'counters' table
const INVOICE_NO_KEY = 'invoiceNo';
const VALUE_KEY = 'formData'; // Holds the JSON string of the invoice data

// --- INITIALIZATION ---
const client = new Client();
client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(PROJECT_ID);

const tablesDB = new TablesDB(client);

// --- UTILITY FUNCTIONS ---

/**
 * Formats a raw integer counter into the desired Invoice ID format (e.g., P-000001).
 */
export const formatInvoiceId = (count) => {
    return `P26-${String(count).padStart(4, '0')}`; 
};

/**
 * Checks if an invoice number is in the standard, generated format (P-XXXXXX).
 */
const isGeneratedInvoiceNo = (invoiceNo) => {
    // Matches 'P-' followed by exactly 6 digits
    return /^P26-\d{4}$/.test(invoiceNo); 
};


// --- COUNTER FUNCTIONS ---

/**
 * Retrieves the current invoice counter value.
 */
export const getInvoiceCounter = async () => {
    try {
        const row = await tablesDB.getRow({
            databaseId: DATABASE_ID,
            tableId: COUNTER_TABLE_ID,
            rowId: COUNTER_ROW_ID,
        });
        return row[COUNTER_COLUMN_KEY] || 0; 
    } catch (error) {
        console.warn(`Counter row '${COUNTER_ROW_ID}' not found. Attempting to initialize.`);
        
        try {
            // Attempt to create the row with an initial value of 0
            await tablesDB.createRow({
                databaseId: DATABASE_ID,
                tableId: COUNTER_TABLE_ID,
                rowId: COUNTER_ROW_ID,
                data: { [COUNTER_COLUMN_KEY]: 0 }
            });
            console.log(`Successfully created initial counter row: ${COUNTER_ROW_ID}`);
            return 0;
        } catch (createError) {
            console.error("Critical Error: Failed to initialize invoice counter row. Check table permissions/existence.", createError);
            throw new Error("Failed to initialize invoice counter. Setup required."); 
        }
    }
};

/**
 * Atomically increments the invoice counter by one.
 */
export const incrementInvoiceCounter = async () => {
    try {
        const updatedRow = await tablesDB.incrementRowColumn({
            databaseId: DATABASE_ID,
            tableId: COUNTER_TABLE_ID,
            rowId: COUNTER_ROW_ID,
            column: COUNTER_COLUMN_KEY,
            value: 1
        });
        console.log(`Successfully incremented counter for row '${COUNTER_ROW_ID}'`);
        return updatedRow[COUNTER_COLUMN_KEY];
    } catch (error) {
        console.error(`Error atomically incrementing counter for row '${COUNTER_ROW_ID}':`, error);
        throw new Error("Failed to increment invoice counter. Counter row may be missing or locked.");
    }
};

/**
 * Atomically sets the invoice counter to a new specific value.
 */
export const setInvoiceCounter = async (newValue) => {
    try {
        const updatedRow = await tablesDB.updateRow({
            databaseId: DATABASE_ID,
            tableId: COUNTER_TABLE_ID,
            rowId: COUNTER_ROW_ID,
            data: { [COUNTER_COLUMN_KEY]: newValue }
        });
        return updatedRow[COUNTER_COLUMN_KEY];
    } catch (error) {
        console.error(`Error setting counter for row '${COUNTER_ROW_ID}':`, error);
        throw new Error("Failed to set invoice counter value.");
    }
};


// --- INVOICE CRUD/UPDATE FUNCTIONS (LOW LEVEL) ---

/**
 * Saves a new invoice or updates an existing one using the provided invoiceNo.
 * Returns {status: 'saved', invoiceNo: string} or {status: 'updated', invoiceNo: string}.
 */
export const saveInvoiceRecord = async (invoiceData, invoiceNo) => {
    const invoiceValueString = JSON.stringify(invoiceData);
    
    // 1. Check if an entry with this invoiceNo already exists
    const { rows: existingEntries } = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: ENTRIES_TABLE_ID,
        queries: [Query.equal(INVOICE_NO_KEY, invoiceNo)]
    });

    if (existingEntries.length > 0) {
        // --- UPDATE EXISTING INVOICE ---
        const rowId = existingEntries[0].$id;
        
        await tablesDB.updateRow({
            databaseId: DATABASE_ID,
            tableId: ENTRIES_TABLE_ID,
            rowId: rowId,
            data: { [VALUE_KEY]: invoiceValueString } 
        });
        
        return { status: 'updated', invoiceNo: invoiceNo };

    } else {
        // --- CREATE NEW INVOICE ---
        await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: ENTRIES_TABLE_ID,
            rowId: ID.unique(),
            data: {
                [INVOICE_NO_KEY]: invoiceNo,
                [VALUE_KEY]: invoiceValueString 
            }
        });

        return { status: 'saved', invoiceNo: invoiceNo };
    }
};


// --- INVOICE ORCHESTRATION FUNCTION (The core logic) ---

/**
 * Orchestrates the invoice creation and counter update process based on your rules.
 */
export const generateAndSaveInvoice = async (invoiceData) => {
    let currentInvoiceNo = invoiceData.formData.invoiceNo;
    
    // Safety check for invalid/placeholder IDs
    if (!currentInvoiceNo || currentInvoiceNo.includes("Load") || currentInvoiceNo.includes("ERR")) {
        return { status: 'aborted' };
    }

    try {
        // 1. Check for Dynamic (non-sequential) IDs
        if (!isGeneratedInvoiceNo(currentInvoiceNo)) {
            // Rule 1: Dynamic value entered, save the record but DO NOT modify counter.
            console.log(`Dynamic Invoice No '${currentInvoiceNo}' detected. Saving record without modifying the counter.`);
            return await saveInvoiceRecord(invoiceData, currentInvoiceNo);
        }

        // --- Standard (P-XXXXXX) Invoice Processing ---

        let counter = await getInvoiceCounter();
        const incomingIdValue = parseInt(currentInvoiceNo.replace('P26-', ''), 10);
        
        let result;

        // Check if the current InvoiceNo already exists (Handles updates)
        const { rows: existingEntries } = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: ENTRIES_TABLE_ID,
            queries: [Query.equal(INVOICE_NO_KEY, currentInvoiceNo)]
        });

        if (existingEntries.length > 0) {
            // 2. This is an UPDATE: Save the record, DO NOT change the counter.
            console.log(`Invoice No '${currentInvoiceNo}' found. Performing update only.`);
            result = await saveInvoiceRecord(invoiceData, currentInvoiceNo);
            
            // Critical check: If the updated number is higher than the counter, advance the counter.
            if (incomingIdValue > counter) {
                await setInvoiceCounter(incomingIdValue);
                console.log(`Counter updated to ${incomingIdValue} due to manual update of a higher ID.`);
            }
            
            return { status: result.status, invoiceNo: currentInvoiceNo }; 

        } else {
            // 3. This is a NEW save: Handle fast-forwarding and conflicts.

            if (incomingIdValue > counter + 1) {
                // Rule 2: User manually entered a higher unused sequential number. Fast-forward counter.
                await setInvoiceCounter(incomingIdValue - 1); 
                counter = incomingIdValue - 1;
                console.log(`Manual high ID detected: ${currentInvoiceNo}. Counter fast-forwarded to ${counter}.`);
            }
            
            // Check for the expected next ID
            let currentCheckId = formatInvoiceId(counter + 1);

            // Conflict Resolution Loop (Rule 3: Increment if generated ID exists)
            while (true) {
                const { rows: collisionCheck } = await tablesDB.listRows({
                    databaseId: DATABASE_ID,
                    tableId: ENTRIES_TABLE_ID,
                    queries: [Query.equal(INVOICE_NO_KEY, currentCheckId)]
                });

                if (collisionCheck.length > 0) {
                    // Collision found! Increment the counter and check the next ID.
                    console.log(`Collision detected for Invoice No: ${currentCheckId}. Incrementing counter and retrying.`);
                    counter = await incrementInvoiceCounter();
                    currentCheckId = formatInvoiceId(counter + 1); 

                } else {
                    // Unique invoice number found. Use this ID to save the record.
                    console.log(`Unique invoice number found: ${currentCheckId}. Saving record.`);
                    // Update the invoice data with the final determined ID
                    invoiceData.formData.invoiceNo = currentCheckId;
                    
                    result = await saveInvoiceRecord(invoiceData, currentCheckId);
                    console.log(`Invoice saved successfully as ${result.invoiceNo}`);
                    // Final increment for the NEXT transaction.
                    await incrementInvoiceCounter();
                    console.log(`New record saved as ${currentCheckId}. Final counter increment successful.`);
                    
                    break;
                }
            }
        }
        console.log(`Invoice saved successfully as ${result.invoiceNo}`);
        return { status: result.status, invoiceNo: result.invoiceNo };

    } catch (error) {
        console.error("Error generating and saving invoice:", error);
        throw new Error("Failed to complete invoice process.");
    }
};

// --- HISTORY & DELETION FUNCTIONS ---

/**
 * Retrieves all saved invoices history, including the Appwrite Row ID ($id) and creation date.
 */
export const getInvoicesHistory = async () => {
    try {
        const { rows } = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: ENTRIES_TABLE_ID,
            queries: [
                Query.limit(500),
                Query.orderDesc('$createdAt') 
            ]
        });

        const history = rows.map(row => {
            try {
                const invoiceData = JSON.parse(row[VALUE_KEY]);
                return { ...invoiceData, id: row.$id, createdAt: row.$createdAt };
            } catch (e) {
                console.error("Error parsing JSON for row:", row.$id, e);
                return null;
            }
        }).filter(item => item !== null);

        return history;

    } catch (error) {
        console.error("Error fetching invoice history:", error);
        return [];
    }
};

/**
 * Deletes an invoice row permanently using the Appwrite Row ID.
 */
export const deleteInvoice = async (rowId) => {
    if (!rowId) throw new Error("Row ID is required for deletion.");

    try {
        await tablesDB.deleteRow({
            databaseId: DATABASE_ID,
            tableId: ENTRIES_TABLE_ID,
            rowId: rowId
        });
        console.log(`Invoice row ${rowId} deleted successfully.`);
    } catch (error) {
        console.error(`Failed to delete invoice row ${rowId}:`, error);
        throw new Error("Appwrite deletion failed.");
    }
};

/**
 * Updates an invoice row to set the balance due to zero (clears payment).
 */
export const clearInvoiceDue = async (rowId) => {
    if (!rowId) throw new Error("Row ID is required for updating.");

    try {
        const row = await tablesDB.getRow({
            databaseId: DATABASE_ID,
            tableId: ENTRIES_TABLE_ID,
            rowId: rowId,
        });

        const invoiceData = JSON.parse(row[VALUE_KEY]);

        const zero = "0.00";
        
        const updatedSummary = {
            ...invoiceData.summary,
            totalBalance: zero
        };

        const updatedVehicles = invoiceData.vehicles.map(v => ({
            ...v,
            balance: zero
        }));

        const updatedInvoiceData = {
            ...invoiceData,
            vehicles: updatedVehicles,
            summary: updatedSummary,
            clearedDate: new Date().toISOString()
        };

        const updatedInvoiceValueString = JSON.stringify(updatedInvoiceData);

        await tablesDB.updateRow({
            databaseId: DATABASE_ID,
            tableId: ENTRIES_TABLE_ID,
            rowId: rowId,
            data: { [VALUE_KEY]: updatedInvoiceValueString }
        });

        console.log(`Invoice row ${rowId} balance cleared successfully.`);

    } catch (error) {
        console.error(`Failed to clear balance for invoice row ${rowId}:`, error);
        throw new Error("Appwrite update failed during balance clearing.");
    }
};
import axios from 'axios';
import FormData from 'form-data';
import moment from 'moment-timezone'; // For date parsing

const findTotalAmount = (parsedText) => {
    if (!parsedText) return null;

    const lines = parsedText.split('\n');
    let potentialTotals = [];
    const totalKeywords = ['Total', 'Amount', 'NET', 'Balance', 'Paid'];
    const amountRegex = /[₹$€£]?\s?([\d,]+(?:\.\d{2})?)\b/g;
    for (let i = lines.length - 1; i >= 0; i--) {
        const lineText = lines[i].trim();
        let amountsOnLine = [];
        let match;
        amountRegex.lastIndex = 0; // Reset regex

        while ((match = amountRegex.exec(lineText)) !== null) {
            const numStr = match[1].replace(/,/g, '');
            const num = parseFloat(numStr);
            if (!isNaN(num)) {
                amountsOnLine.push(num);
            }
        }

        if (amountsOnLine.length > 0) {
            const largestAmountOnLine = Math.max(...amountsOnLine);
            let priority = 3; // Lowest priority by default

            if (totalKeywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(lineText))) {
                priority = 1; // Highest priority if keyword and amount on same line
                console.log(`OCR Parse: Found amount ${largestAmountOnLine} with keyword on line ${i}`);
            }
            else if (i > 0 && totalKeywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(lines[i-1]))) {
                 priority = 2; // Medium priority if keyword on line above
                 console.log(`OCR Parse: Found amount ${largestAmountOnLine} on line ${i}, keyword likely on line ${i-1}`);
            } else {
                 console.log(`OCR Parse: Found amount ${largestAmountOnLine} on line ${i} (no keyword nearby)`);
            }
            potentialTotals.push({ amount: largestAmountOnLine, lineIndex: i, priority: priority });
        }
    }

    if (potentialTotals.length === 0) return null;

    potentialTotals.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return b.amount - a.amount;
    });

    console.log("OCR Parse: Selected Total:", potentialTotals[0].amount);
    return potentialTotals[0].amount.toFixed(2); // Return the best candidate
};


const findDate = (parsedText) => {
    if (!parsedText) return null;
    console.log("OCR Parse: Searching for Date/Time...");

    // Regex priority:
    // 1. DD/MM/YY HH:MM:SS (or HH:MM) - Common on simple receipts
    // 2. DD/MM/YYYY HH:MM:SS (or HH:MM)
    // 3. YYYY-MM-DD HH:MM:SS (or HH:MM)
    // 4. DD-Mon-YYYY HH:MM:SS (or HH:MM)
    // 5. Date only variants
    const dateTimeRegex = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-\d{2,4})[,\s]*(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?)?/gi;

    let possibleDateTimes = [];
    let dateMatch;

    while ((dateMatch = dateTimeRegex.exec(parsedText)) !== null) {
        let dateString = dateMatch[1];
        let timeString = dateMatch[2] || ''; 
        let combinedString = (dateString + ' ' + timeString).trim();

        const formatsToTry = timeString ? [
            'DD/MM/YY hh:mm:ss A', 'DD-MM-YY hh:mm:ss A',
            'DD/MM/YYYY hh:mm:ss A', 'DD-MM-YYYY hh:mm:ss A',
            'MM/DD/YY hh:mm:ss A', 'MM-DD-YY hh:mm:ss A',
            'MM/DD/YYYY hh:mm:ss A', 'MM-DD-YYYY hh:mm:ss A',
            'YYYY-MM-DD hh:mm:ss A', 'DD-MMM-YYYY hh:mm:ss A',
            'DD/MM/YY HH:mm:ss', 'DD-MM-YY HH:mm:ss',
            'DD/MM/YYYY HH:mm:ss', 'DD-MM-YYYY HH:mm:ss',
            'MM/DD/YY HH:mm:ss', 'MM-DD-YY HH:mm:ss',
            'MM/DD/YYYY HH:mm:ss', 'MM-DD-YYYY HH:mm:ss',
            'YYYY-MM-DD HH:mm:ss', 'DD-MMM-YYYY HH:mm:ss',
            'DD/MM/YY HH:mm', 'DD-MM-YY HH:mm',
            'DD/MM/YYYY HH:mm', 'DD-MM-YYYY HH:mm',
            'MM/DD/YY HH:mm', 'MM-DD-YY HH:mm',
            'MM/DD/YYYY HH:mm', 'MM-DD-YYYY HH:mm',
            'YYYY-MM-DD HH:mm', 'DD-MMM-YYYY HH:mm'
        ] : [ // Date only formats if no timeString
            'DD/MM/YY', 'DD-MM-YY',
            'DD/MM/YYYY', 'DD-MM-YYYY',
            'MM/DD/YY', 'MM-DD-YY',
            'MM/DD/YYYY', 'MM-DD-YYYY',
            'YYYY-MM-DD', 'DD-MMM-YYYY'
        ];

        let parsed = moment(dateString + ' ' + timeString.trim(), formatsToTry, true, "Asia/Kolkata"); // Strict parsing

        if (parsed.isValid()) {
            if (dateString.match(/\d{2}$/) && parsed.year() > moment().year() + 1) {
                parsed.subtract(100, 'years'); // Correct year like '25' becoming 2025 not 1925 etc.
            }
             console.log(`OCR Parse: Valid DateTime found: ${parsed.format()} from string: "${dateMatch[0]}"`);
            possibleDateTimes.push(parsed);
        } else {
             console.log(`OCR Parse: Could not parse date string: "${dateMatch[0]}"`);
        }
    }

    if (possibleDateTimes.length > 0) {
        possibleDateTimes.sort((a, b) => b.valueOf() - a.valueOf()); 
        const selectedDateObject = possibleDateTimes[0].toDate();
        console.log("OCR Parse: Selected DateTime (as Date Object):", selectedDateObject);
        return selectedDateObject; 
    }

     console.log("OCR Parse: No valid date/time found.");
    return null; 
};

const findVendor = (parsedText) => {
     if (!parsedText) return null;
     console.log("OCR Parse: Searching for Vendor...");
     const lines = parsedText.split('\n')
                           .map(line => line.trim().replace(/\s{2,}/g, ' '))
                           .filter(line => line.length > 0);

     if (lines.length === 0) return null;

     let potentialVendors = [];
     const maxLinesToCheck = Math.min(lines.length, 5); // Focus on top lines
     const stopKeywords = ['bill', 'invoice', 'receipt', 'date', 'time', 'gstin', 'phone', 'ph:', 'address', 'customer', 'cashier', 'order', 'table', 'item', 'qty', 'rate', 'amount', 'total', 'tax'];

     for (let i = 0; i < maxLinesToCheck; i++) {
        const line = lines[i];

        if (stopKeywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(line))) {
             console.log(`OCR Parse: Stopping vendor search at line ${i} due to keyword: "${line}"`);
            break;
        }

        if (line.length < 3 || line.length > 60) continue; // Skip very short/long lines
        if (!line.match(/[a-zA-Z]/)) continue; // Skip lines with no letters
        if (line.match(/^\d+[-/\s]+\d+[-/\s]+\d+/)) continue; // Skip lines starting like dates
        if (line.match(/^\d{1,2}:\d{2}/)) continue; // Skip lines starting like times
        if (line.match(/\d{6,}/) && !line.match(/[a-zA-Z]{3,}/)) continue; // Skip lines that are mostly long numbers (GSTIN, Phone?) unless they also have significant text

         console.log(`OCR Parse: Potential vendor line ${i}: "${line}"`);
        potentialVendors.push(line);
     }

     if (potentialVendors.length > 0) {
         let vendorName = potentialVendors[0];
          if (potentialVendors.length > 1 && potentialVendors[1].length < 30 && !potentialVendors[1].match(/^\d/)) {
              if (!potentialVendors[1].match(/^(?:no|#|plot|apt|near)/i)) {
                   vendorName += ` ${potentialVendors[1]}`;
              }
          }
          let allCapsVendor = potentialVendors.find(v => v === v.toUpperCase() && v.length > 3 && !v.match(/^\d+$/));
          if (allCapsVendor) {
              vendorName = allCapsVendor; // Prefer ALL CAPS if found
          }

         vendorName = vendorName.substring(0, 100); // Limit length
         console.log("OCR Parse: Selected Vendor:", vendorName);
         return vendorName;
     }

     console.log("OCR Parse: No suitable vendor name found, using first line as fallback.");
     return lines[0].substring(0, 100);
};


// @desc    Scan a receipt image using OCR.space
// @route   POST /api/ocr/scan-receipt
// @access  Private (Needs auth middleware)
const scanReceipt = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No receipt image uploaded.' });
    }
    if (!process.env.OCR_SPACE_API_KEY) {
         console.error("OCR.space API Key not configured.");
         return res.status(500).json({ message: 'OCR service not configured.' });
    }

    console.log(`Received file: ${req.file.originalname}, Size: ${req.file.size}`);

    try {
        const form = new FormData();
        form.append('apikey', process.env.OCR_SPACE_API_KEY);
        form.append('language', 'eng'); // Or other languages if needed
        form.append('isOverlayRequired', 'false');
        form.append('detectOrientation', 'true');
        form.append('scale', 'true');
        // --- Enable Receipt Scanning Engine ---
        form.append('isTable', 'true'); // Helpful for structure
        form.append('OCREngine', '2'); // Engine 2 often better for receipts
        // form.append('receiptScanning', 'true'); // Use if available/needed on specific plans

        // Append the file buffer
        form.append('file', req.file.buffer, { filename: req.file.originalname });

        console.log("Sending request to OCR.space...");
        const response = await axios.post('https://api.ocr.space/parse/image', form, {
            headers: form.getHeaders(),
        });

        console.log("OCR.space Response Status:", response.status);
        // console.log("OCR.space Response Data:", response.data); // Log full response if needed

        if (response.data?.OCRExitCode === 1 && response.data.ParsedResults?.length > 0) {
            const parsedText = response.data.ParsedResults[0].ParsedText;
            console.log("--- OCR Parsed Text ---");
            console.log(parsedText);
            console.log("-----------------------");

            // --- Extract Data ---
            const totalAmount = findTotalAmount(parsedText);
            const transactionDate = findDate(parsedText);
            const vendor = findVendor(parsedText);
            // ------------------

            res.json({
                success: true,
                amount: totalAmount,
                date: transactionDate, // Send as ISO string or timestamp
                description: vendor || 'Scanned Bill', // Use default if vendor not found
            });
        } else {
            console.error("OCR.space Error:", response.data?.ErrorMessage?.join(', '));
            throw new Error(response.data?.ErrorMessage?.join(', ') || 'OCR parsing failed.');
        }
    } catch (error) {
        // --- ADD MORE LOGGING ---
        console.error('!!! Error calling OCR.space API !!!');
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('OCR.space Response Status:', error.response.status);
            console.error('OCR.space Response Headers:', error.response.headers);
            console.error('OCR.space Response Data:', error.response.data);
        } else if (error.request) {
            console.error('OCR.space No Response Received:', error.request);
        } else {
            console.error('OCR.space Request Setup Error:', error.message);
        }
        console.error('Axios Error Config:', error.config); // Log the request config
        // --- END ADD MORE LOGGING ---
        res.status(500).json({ message: 'Failed to process receipt image.' });
    }
};

export { scanReceipt };
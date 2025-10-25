import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import * as csv from 'fast-csv';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';

// @desc    Export transactions to CSV
// @route   GET /api/data/export
// @access  Private
const exportTransactions = async (req, res) => {
  console.log('Starting CSV Export...');
  try {
    const { startDate, endDate } = req.query;
    const query = { user: req.user._id };

    if (startDate && endDate) {
      // Adjust date query to cover the entire start and end days if only date is provided
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // Start of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day
      query.date = { $gte: start, $lte: end };
    }

    console.log('Fetching transactions for CSV...');
    const transactions = await Transaction.find(query)
      .populate('account', 'name')
      .sort({ date: -1 }) // Sort by date descending for consistency
      .lean();
    console.log(`Fetched ${transactions.length} transactions.`);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');

    const csvStream = csv.format({ headers: true });

    csvStream.on('error', (err) => {
        console.error('CSV Stream Error:', err);
        if (!res.headersSent) {
            res.status(500).send('Error generating CSV');
        } else {
            res.end();
        }
    });

    csvStream.pipe(res);

    console.log('Writing CSV rows...');
    // --- Define headers explicitly for consistency ---
    csvStream.write({
        DateTime: 'DateTime',
        Account: 'Account',
        Description: 'Description',
        Category: 'Category',
        Type: 'Type',
        Amount: 'Amount (INR)'
    });
    // ---------------------------------------------
    transactions.forEach(tx => {
      const accountName = tx.account?.name || 'Account Deleted';
      csvStream.write({
        // --- UPDATED: Use toLocaleString for Date and Time ---
        DateTime: tx.date ? new Date(tx.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' }) : 'N/A',
        // ----------------------------------------------------
        Account: accountName,
        Description: tx.description || '',
        Category: tx.category || '',
        Type: tx.type || '',
        Amount: tx.amount !== undefined ? tx.amount.toFixed(2) : '0.00',
      });
    });

    console.log('Finalizing CSV...');
    csvStream.end();
    console.log('CSV Export Finished Successfully.');

  } catch (error) {
    console.error('!!! CSV Export Controller Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server Error during CSV export' });
    } else {
        res.end();
    }
  }
};

// @desc    Import transactions from CSV
// @route   POST /api/data/import
// @access  Private
const importTransactions = async (req, res) => {
  console.log('Starting CSV Import...');
  const { accountId } = req.body;
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  if (!accountId) {
    return res.status(400).json({ message: 'No account selected.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  console.log('Import Transaction Session Started.');

  try {
    const account = await Account.findById(accountId).session(session);
    if (!account || account.user.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      console.log('Import Aborted: Account not found or unauthorized.');
      return res.status(404).json({ message: 'Account not found or not authorized.' });
    }

    const transactionsToCreate = [];
    let totalBalanceChange = 0;
    let rowCount = 0;

    const stream = Readable.from(req.file.buffer.toString());
    console.log('Reading CSV file stream...');

    stream
      .pipe(csvParser({
          mapHeaders: ({ header }) => header.trim() // Trim header whitespace
      }))
      .on('data', (row) => {
        rowCount++;
        // Access columns case-insensitively and trim values
        // --- UPDATED: Use DateTime if present, fallback to Date ---
        const dateValue = (row['DateTime'] || row['Date'])?.trim();
        // --------------------------------------------------------
        const descValue = row['Description']?.trim();
        const amountValue = row['Amount']?.trim() || row['Amount (INR)']?.trim(); // Allow for different amount headers
        const typeValue = row['Type']?.trim().toLowerCase();
        const catValue = row['Category']?.trim();

        const amount = parseFloat(amountValue);

        // Date Parsing Logic (Handles DD-MM-YYYY and others)
        let parsedDate = null;
        if (dateValue) {
            // Check for DD-MM-YYYY specifically
            const ddMMyyyyParts = dateValue.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/); // Allow - or /
            if (ddMMyyyyParts) {
                const year = ddMMyyyyParts[3];
                const month = ddMMyyyyParts[2].padStart(2, '0');
                const day = ddMMyyyyParts[1].padStart(2, '0');
                 // Try to include time if present (e.g., DD-MM-YYYY HH:mm)
                const timeMatch = dateValue.match(/(\d{1,2}:\d{2}(:\d{2})?)/);
                const timeString = timeMatch ? `T${timeMatch[1]}` : 'T00:00:00'; // Default to midnight if no time
                parsedDate = new Date(`${year}-${month}-${day}${timeString}`);
            } else {
                // Try parsing directly for other formats (YYYY-MM-DD, ISO, localeString)
                parsedDate = new Date(dateValue);
            }
        }
        const isValidDate = parsedDate instanceof Date && !isNaN(parsedDate);

        if (isValidDate && descValue && !isNaN(amount) && (typeValue === 'income' || typeValue === 'expense')) {
          transactionsToCreate.push({
            user: req.user._id,
            account: accountId,
            date: parsedDate,
            description: descValue,
            amount: amount,
            type: typeValue,
            category: catValue || 'Uncategorized',
          });
          totalBalanceChange += (typeValue === 'income' ? amount : -amount);
        } else {
            console.warn(`Skipping invalid row ${rowCount}: Date='${dateValue}' (Parsed as ${isValidDate ? parsedDate.toISOString() : 'Invalid'}), Desc='${descValue}', Amount='${amountValue}', Type='${typeValue}'`, row);
        }
      })
      .on('end', async () => {
        console.log(`CSV Parsing Finished. Found ${transactionsToCreate.length} valid transactions.`);
        try {
          if (transactionsToCreate.length > 0) {
            console.log('Inserting transactions into DB...');
            await Transaction.insertMany(transactionsToCreate, { session });

            console.log('Updating account balance...');
            account.balance += totalBalanceChange;
            await account.save({ session });

            await session.commitTransaction();
            console.log('Import Transaction Session Committed.');
            res.json({ message: `Successfully imported ${transactionsToCreate.length} transactions.` });
          } else {
            await session.abortTransaction();
            console.log('Import Aborted: No valid transactions found.');
            res.status(400).json({ message: 'No valid transactions found in CSV.' });
          }
        } catch (dbError) {
          await session.abortTransaction();
          console.error('!!! Import DB Error:', dbError);
          console.log('Import Transaction Session Aborted due to DB error.');
          res.status(500).json({ message: 'Error saving transactions to database' });
        } finally {
          session.endSession();
        }
      })
      .on('error', (parseError) => {
        console.error('!!! CSV Parsing Error:', parseError);
        session.abortTransaction().finally(() => session.endSession());
        console.log('Import Transaction Session Aborted due to parsing error.');
        if (!res.headersSent) {
             res.status(400).json({ message: 'Error parsing CSV file.' });
        }
      });

  } catch (error) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    session.endSession();
    console.error('!!! Import Controller Error:', error);
    console.log('Import Transaction Session Aborted due to controller error.');
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server Error during CSV import setup' });
    }
  }
};

// Helper function to format a table row
function generateTableRow(doc, y, c1, c2, c3, c4, c5, isHeader = false) {
  const rowHeight = 15;
  const startX = 50;
  const endX = 570;
  const textY = y + (rowHeight / 2);

  if (isHeader) {
      doc.rect(startX, y, endX - startX, rowHeight)
         .fillOpacity(0.1)
         .fill('#007bff');
      doc.fillOpacity(1);
      doc.font('Helvetica-Bold').fillColor('black');
  } else {
      doc.font('Helvetica').fillColor('black');
  }

  doc.fontSize(7.5);

  // Adjusted widths for DateTime
  doc.text(c1 || '', startX + 5, textY, { width: 70, align: 'left', lineBreak: false, baseline: 'middle' }); // Date column wider
  doc.text(c2 || '', startX + 75, textY, { width: 150, align: 'left', ellipsis: true, lineBreak: false, baseline: 'middle' }); // Description shifted
  doc.text(c3 || '', startX + 230, textY, { width: 60, align: 'left', ellipsis: true, lineBreak: false, baseline: 'middle' }); // Category shifted
  doc.text(c4 || '', startX + 295, textY, { width: 120, align: 'left', ellipsis: true, lineBreak: false, baseline: 'middle' }); // Account shifted
  doc.text(c5 || '', endX - 95, textY, { width: 90, align: 'right', lineBreak: false, baseline: 'middle' });

  doc.moveTo(startX, y + rowHeight)
     .lineTo(endX, y + rowHeight)
     .lineWidth(0.3)
     .strokeColor('#dddddd')
     .stroke();

  return y + rowHeight;
}

// @desc    Export transactions to PDF
// @route   GET /api/data/export-pdf
// @access  Private
const exportTransactionsPDF = async (req, res) => {
  console.log('Starting PDF Export...');
  try {
    console.log('Fetching transactions for PDF...');
    const transactions = await Transaction.find({ user: req.user._id })
      .populate('account', 'name')
      .sort({ date: -1 }) // Sort by date descending
      .lean();
    console.log(`Fetched ${transactions.length} transactions.`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    doc.on('error', (err) => {
        console.error('PDF Document Stream Error:', err);
         if (!res.headersSent) {
            res.status(500).send('Error generating PDF');
        } else {
            res.end();
        }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions_report.pdf');
    doc.pipe(res);

    console.log('Generating PDF content...');
    // Header
    doc.fontSize(18).font('Helvetica-Bold').fillColor('black').text('Transaction Report', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('black').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Table Header
    let currentY = doc.y;
    const tableTop = currentY;
    // --- UPDATED Header Label ---
    currentY = generateTableRow(doc, tableTop, "Date & Time", "Description", "Category", "Account", "Amount", true);
    // --------------------------
    const tableBottomMargin = 700;

    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
      if (currentY > tableBottomMargin) {
          console.log('Adding PDF page...');
          doc.addPage();
          currentY = 50;
          // Re-add table header
          currentY = generateTableRow(doc, currentY, "Date & Time", "Description", "Category", "Account", "Amount", true);
      }

      // --- UPDATED: Use toLocaleString for Date and Time ---
      const dateTime = tx.date ? new Date(tx.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
      // ----------------------------------------------------
      const accountName = tx.account?.name || 'Account Deleted';
      const amountVal = tx.amount !== undefined ? tx.amount : 0;
      const amount = (tx.type === 'income' ? '+' : '-') + `₹${amountVal.toFixed(2)}`;

      if(tx.type === 'income') totalIncome += amountVal;
      if(tx.type === 'expense') totalExpense += amountVal;

      currentY = generateTableRow(doc, currentY, dateTime, tx.description || '', tx.category || '', accountName, amount);
    }

    // Simplified Summary
    if (currentY > tableBottomMargin - 45) {
        console.log('Adding PDF page for summary...');
        doc.addPage();
        currentY = 50;
    }
    console.log('Adding PDF summary...');
    doc.moveDown(3);
    currentY = doc.y;
    const summaryXLabel = 400;
    const summaryXValue = 480;
    const lineSpacing = 15;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('black');

    doc.text('Total Income:', summaryXLabel, currentY, { align: 'right', width: 95 });
    doc.text(`₹${totalIncome.toFixed(2)}`, summaryXValue, currentY, { align: 'right', width: 90 });
    currentY += lineSpacing;

    doc.text('Total Expense:', summaryXLabel, currentY, { align: 'right', width: 95 });
    doc.text(`₹${totalExpense.toFixed(2)}`, summaryXValue, currentY, { align: 'right', width: 90 });

    console.log('Finalizing PDF...');
    doc.end();
    console.log('PDF Export Finished Successfully.');

  } catch (error) {
    console.error('!!! PDF Export Controller Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server Error during PDF export' });
    } else {
        res.end();
    }
  }
};

export { exportTransactions, importTransactions, exportTransactionsPDF };
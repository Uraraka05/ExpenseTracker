import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaCamera } from 'react-icons/fa';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import moment from 'moment';
import useCurrency from '../hooks/useCurrency';
import Tesseract from 'tesseract.js';

const formatDateTimeLocal = (dateString) => {
    const date = moment(dateString);
    return date.isValid() ? date.format('YYYY-MM-DDTHH:mm') : '';
};

const preprocessImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size to image size
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.filter = 'grayscale(100%) contrast(150%)'; // Example: 100% grayscale, 150% contrast

        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob); // Return the processed image Blob
          } else {
            reject(new Error('Canvas to Blob conversion failed'));
          }
        }, file.type); // Keep original file type if possible
      };
      img.onerror = reject; // Handle image loading errors
      img.src = event.target.result; // Load image data into Image object
    };
    reader.onerror = reject; // Handle file reading errors
    reader.readAsDataURL(file); // Read the file as a Data URL
  });
};

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ description: '', category: '', account: '' });
  const { formatCurrency, settings } = useCurrency(); // Added settings check

  const [newTxForm, setNewTxForm] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    date: formatDateTimeLocal(new Date()), 
    account: '',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef(null);

  const fetchAccounts = async () => {
    try {
      const { data } = await api.get('/accounts');
      setAccounts(data);
      if (data.length > 0 && !newTxForm.account) { // Set default only if not set
        setNewTxForm(prev => ({ ...prev, account: data[0]._id }));
      }
    } catch (error) {
      toast.error('Failed to fetch accounts');
    }
  };

 const fetchTransactions = async (reset = false) => {
    // Only run if settings are loaded (to prevent race conditions with currency formatting)
    if (!settings) return;

    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      const params = new URLSearchParams({ page: currentPage, limit: 10, ...filters });
      const { data } = await api.get(`/transactions?${params.toString()}`);

      // Ensure account data is present for rendering
      const transactionsWithAccount = data.transactions.map(tx => ({
          ...tx,
          account: tx.account || { name: 'N/A' } // Provide fallback account object
      }));

      if (reset) {
        setTransactions(transactionsWithAccount);
      } else {
        setTransactions(prev => [...prev, ...transactionsWithAccount]);
      }
      setTotalPages(data.totalPages);
    } catch (error) {
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if(settings) { // Fetch accounts only after currency settings are loaded
        fetchAccounts();
    }
  }, [settings]);

  useEffect(() => {
    // Fetch transactions when page loads or filters change, dependent on settings
    if(settings) {
        setTransactions([]);
        setPage(1); // Reset page on filter change
        fetchTransactions(true);
    }
  }, [filters, settings]); // Add settings dependency

  const handleLoadMore = () => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  };

  useEffect(() => {
      // Fetch next page only if page > 1 and settings are loaded
      if (page > 1 && settings) {
          fetchTransactions(false);
      }
  }, [page, settings]); // Add settings dependency


  const handleFormChange = (e) => {
    setNewTxForm({ ...newTxForm, [e.target.name]: e.target.value });
  };

  const handleFilterChange = (e) => {
      setFilters({ ...filters, [e.target.name]: e.target.value });
      // Reset page to 1 when filters change - useEffect handles the fetch
      // setPage(1);
  };

  const handleEditFormChange = (e) => {
      setEditingTransaction({ ...editingTransaction, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/transactions', {
          ...newTxForm,
          // Convert amount to number just before sending
          amount: Number(newTxForm.amount)
      });
       // Manually add account info for immediate display before refetch might happen
      const accountInfo = accounts.find(a => a._id === data.account);
      setTransactions([{ ...data, account: accountInfo || { name: 'N/A' } }, ...transactions]);
      toast.success('Transaction added!');
      setNewTxForm(prev => ({
        ...prev,
        description: '',
        amount: '',
        category: '',
        type: 'expense',
        date: formatDateTimeLocal(new Date()), // Reset date
      }));
      fetchAccounts(); // Refetch accounts to show new balance
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add transaction');
    }
  };

  const handleDelete = async (id) => {
      if (window.confirm('Are you sure you want to delete this transaction?')) {
          try {
              await api.delete(`/transactions/${id}`);
              setTransactions(transactions.filter(tx => tx._id !== id));
              toast.success('Transaction deleted!');
              fetchAccounts(); // Refetch accounts to show new balance
          } catch (error) {
              toast.error('Failed to delete transaction');
          }
      }
  };

  const handleEditClick = (tx) => {
      setEditingTransaction({
          ...tx,
          // --- UPDATED: Format for datetime-local ---
          date: formatDateTimeLocal(tx.date),
          account: tx.account?._id // Use optional chaining just in case
      });
      setIsModalOpen(true);
  };

  const handleUpdate = async (e) => {
      e.preventDefault();
      try {
           const { data } = await api.put(`/transactions/${editingTransaction._id}`, {
              ...editingTransaction,
              // Convert amount to number just before sending
              amount: Number(editingTransaction.amount)
           });
          // Find account name for display
          const accountInfo = accounts.find(a => a._id === data.account);
          const updatedTx = { ...data, account: accountInfo || { name: 'N/A' }};

          setTransactions(transactions.map(tx => (tx._id === data._id ? updatedTx : tx)));

          toast.success('Transaction updated!');
          setIsModalOpen(false);
          setEditingTransaction(null);
          fetchAccounts(); // Refetch accounts to show new balance
      } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to update transaction');
      }
  };


    // --- 3. Function to handle image upload and OCR ---
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrProgress(0);
    toast.loading('Processing & Scanning bill...'); // Updated message

    try {
      // 1. Preprocess the image
      console.log("Preprocessing image...");
      const processedImageBlob = await preprocessImage(file);
      console.log("Image preprocessing complete.");

      // 2. Run OCR on the processed image
      const { data: { text } } = await Tesseract.recognize(
        processedImageBlob, // Use the processed Blob
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      toast.dismiss();
      console.log("OCR Result Text:\n", text);
      parseOcrText(text);
      toast.success('Scan complete! Check form data.');

    } catch (error) {
      toast.dismiss();
      console.error("Image Processing/OCR Error:", error);
      toast.error("Failed to process or scan bill.");
    } finally {
      setOcrLoading(false);
      setOcrProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // --- 4. Function to parse extracted text and pre-fill form ---
  // --- ENHANCED OCR Parsing Function ---
  // --- ENHANCED OCR Parsing Function (v2) ---
  const parseOcrText = (text) => {
    console.log("--- Starting OCR Text Parsing ---");
    let extractedAmount = '';
    // Default to current date/time, try to find better one
    let extractedDate = formatDateTimeLocal(new Date());
    let extractedDescription = 'Scanned Bill'; // Default description

    // Clean lines: split, trim whitespace, remove extra spaces, filter empty
    const lines = text.split('\n')
                      .map(line => line.trim().replace(/\s{2,}/g, ' '))
                      .filter(line => line.length > 0);
    console.log("Lines Found:", lines.length);
    console.log("Cleaned Lines:", lines); // Log cleaned lines

    // --- 1. Extract Date & Time ---
    // Regex for various date formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-Mon-YYYY)
    // Optionally includes time (HH:MM, HH:MM:SS, with AM/PM)
    const dateTimeRegex = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-\d{2,4})[,\s]*(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?)?/gi; // Slightly improved month regex
    let possibleDates = [];
    let dateMatch;

    // Find all potential date/time strings
    while ((dateMatch = dateTimeRegex.exec(text)) !== null) {
        let dateString = dateMatch[1]; // The date part
        let timeString = dateMatch[2] || ''; // The time part (optional)

        // Attempt to parse using multiple formats, including time if present
        let parsed = moment(dateString + ' ' + timeString, [
             'DD-MM-YYYY hh:mm:ss A', 'DD/MM/YYYY hh:mm:ss A',
             'MM-DD-YYYY hh:mm:ss A', 'MM/DD/YYYY hh:mm:ss A',
             'YYYY-MM-DD hh:mm:ss A', 'DD-MMM-YYYY hh:mm:ss A',
             'DD-MM-YYYY HH:mm:ss', 'DD/MM/YYYY HH:mm:ss',
             'MM-DD-YYYY HH:mm:ss', 'MM/DD/YYYY HH:mm:ss',
             'YYYY-MM-DD HH:mm:ss', 'DD-MMM-YYYY HH:mm:ss',
             'DD-MM-YYYY HH:mm', 'DD/MM/YYYY HH:mm',
             'MM-DD-YYYY HH:mm', 'MM/DD/YYYY HH:mm',
             'YYYY-MM-DD HH:mm', 'DD-MMM-YYYY HH:mm',
             // Date only formats
             'DD-MM-YYYY', 'DD/MM/YYYY', 'MM-DD-YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MMM-YYYY'
        ], true); // Added true for strict parsing

        if (parsed.isValid()) {
            possibleDates.push(parsed);
        }
    }
    console.log("Possible Dates Found:", possibleDates.map(d => d.format()));

    if(possibleDates.length > 0) {
        // Sort dates descending (most recent first)
        possibleDates.sort((a, b) => b - a);
        // Assume the most recent valid date found is the transaction date
        extractedDate = formatDateTimeLocal(possibleDates[0].toDate());
         console.log("Selected Date:", extractedDate);
    } else {
        console.log("No valid dates found in specific formats, using current date.");
    }


    // --- 2. Extract Total Amount (REVISED LOGIC) ---
    const totalKeywords = ['NET', 'Total', 'Amount Due', 'Grand Total', 'Balance', 'Paid', 'Net Amount', 'TOTAL PAYABLE'];
    let potentialTotals = [];
    // More robust amount regex: optional currency, spaces, digits/commas, required decimal point and two digits.
    const amountRegexStrict = /[₹$€£]?\s?([\d,]+(\.\d{2}))\b/g;

    console.log("--- Searching for Amount ---");
    // Iterate lines in reverse (totals often near the bottom)
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        let foundKeyword = null;
        let amountOnLine = null;

        // Check if line contains a total keyword (case-insensitive)
        for (const keyword of totalKeywords) {
            // Use word boundaries (\b) to avoid partial matches (e.g., 'Totaling')
            if (new RegExp(`\\b${keyword}\\b`, 'i').test(line)) {
                foundKeyword = keyword;
                break; // Found a keyword on this line
            }
        }

        // Search for a strictly formatted amount (e.g., 123.00, 1,234.56) on this line
        let amountMatchResult;
        amountRegexStrict.lastIndex = 0; // Reset regex index for global flag
        while((amountMatchResult = amountRegexStrict.exec(line)) !== null) {
            const amountStr = amountMatchResult[1].replace(/,/g, ''); // Get amount incl decimal, remove commas
            const amountNum = parseFloat(amountStr);
            if (!isNaN(amountNum) && amountNum > 0) {
                 // Store all amounts found on the line, keep the largest
                 if (amountOnLine === null || amountNum > amountOnLine.amount) {
                      amountOnLine = { amount: amountNum, lineIndex: i };
                 }
            }
        }

        // If both keyword and amount are on the same line, store it with high priority
        if (foundKeyword && amountOnLine) {
            console.log(`Potential Total (Keyword Match): ${amountOnLine.amount} on line ${i} (Keyword: ${foundKeyword})`);
            potentialTotals.push({ ...amountOnLine, priority: 1 }); // High priority
        }
        // If only amount found (no keyword), store with lower priority
        else if (amountOnLine && !foundKeyword) {
            // Simple check to avoid adding item prices: is the amount significantly larger than others found so far? (Very basic heuristic)
            const averageAmountFound = potentialTotals.reduce((sum, p) => sum + p.amount, 0) / (potentialTotals.length || 1);
            // Only add if it's somewhat plausible as a total (e.g., not much smaller than amounts already found near keywords)
            if (potentialTotals.length === 0 || amountOnLine.amount >= averageAmountFound * 0.5) {
                 console.log(`Potential Amount (No Keyword): ${amountOnLine.amount} on line ${i}`);
                 potentialTotals.push({ ...amountOnLine, priority: 2 }); // Lower priority
            } else {
                 console.log(`Skipping likely item price (No Keyword): ${amountOnLine.amount} on line ${i}`);
            }
        }
    }
    if (potentialTotals.length > 0) {
        potentialTotals.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority; // Lower priority number (1) comes first
            }
            return b.amount - a.amount; // Larger amount comes first
        });
        extractedAmount = potentialTotals[0].amount.toFixed(2);
        console.log("Selected Amount:", extractedAmount, "From:", potentialTotals[0]);
    } else {
         console.log("Could not determine amount using strict format.");
    }


    // --- 3. Extract Vendor/Store Name (Improved Heuristic) ---
    console.log("--- Searching for Vendor ---");
    let potentialVendors = [];
    const maxLinesToCheck = Math.min(lines.length, 5); // Check top 5 lines

    for (let i = 0; i < maxLinesToCheck; i++) {
        const line = lines[i];
        // Skip lines that look like addresses, dates, phone numbers, or generic terms
        if (line.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/)) continue; // Skip dates like DD/MM/YYYY
        if (line.match(/\d{4}-\d{2}-\d{2}/)) continue; // Skip dates like YYYY-MM-DD
        if (line.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) continue; // Skip lines with month names
        if (line.match(/(\d{3}[-\.\s]?){2}\d{4}/)) continue; // Skip phone numbers (approximate)
        if (line.match(/(?:[A-Z]\d[A-Z][-\s]?\d[A-Z]\d|\d{6})/i)) continue; // Skip postal codes (UK/India example)
        if (line.match(/\b\d{5,}\b/)) continue; // Skip long numbers (maybe zip codes, IDs, GST numbers like 9036139989) unless part of name
        if (line.match(/address|street|road|city|state|pincode|gstin/i)) continue; // Skip address lines
        if (line.toLowerCase().includes('invoice') || line.toLowerCase().includes('receipt') || line.toLowerCase().includes('bill #') || line.toLowerCase().includes('cash memo')) continue;
        if (line.length < 3 || line.length > 60) continue; // Skip very short/long lines
        if (!line.match(/[a-zA-Z]/)) continue; // Skip lines with no letters

        potentialVendors.push(line);
    }
    console.log("Potential Vendors:", potentialVendors);

    if (potentialVendors.length > 0) {
        let bestVendor = potentialVendors.find(v => v === v.toUpperCase() && v.length > 3 && !v.match(/^\d+$/)); // Find suitable ALL CAPS
        if (bestVendor) {
            extractedDescription = bestVendor;
        } else {
            extractedDescription = potentialVendors[0]; // Default to the first likely line
        }
         extractedDescription = extractedDescription.replace(/\s\d{6,}$/, '').trim();

        console.log("Selected Description:", extractedDescription);
    } else {
        console.log("Could not determine vendor/description, using default.");
        extractedDescription = lines[0] || 'Scanned Bill'; // Fallback to first line if no potentials found
    }

    console.log("--- Applying extracted data to form ---");
    setNewTxForm(prev => ({
      ...prev,
      description: extractedDescription,
      amount: extractedAmount,
      date: extractedDate,
      type: 'expense', // Default scanned bills to expense
      category: prev.category, // Keep category if user already selected one
      account: prev.account // Keep account if user already selected one
    }));
  };

  if (loading || !settings) return <Spinner />;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* --- ADD TRANSACTION FORM --- */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Add Transaction</h2>
            <div className="mb-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                style={{ display: 'none' }} // Hide the default input
                id="imageUpload"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current.click()} // Trigger hidden input
                className="w-full bg-teal-500 text-white py-2 px-4 rounded-lg hover:bg-teal-600 flex items-center justify-center space-x-2 disabled:bg-teal-300"
                disabled={ocrLoading}
              >
                <FaCamera />
                <span>{ocrLoading ? `Scanning... (${ocrProgress}%)` : 'Scan Bill (Beta)'}</span>
              </button>
               {ocrLoading && <div className="w-full bg-gray-200 rounded-full h-1 mt-1"><div className="bg-teal-500 h-1 rounded-full" style={{ width: `${ocrProgress}%` }}></div></div>}
               <p className="text-xs text-gray-500 mt-1">Upload a clear bill image.</p>
            </div>
             <hr className="my-4"/>
            <form onSubmit={handleSubmit}>
              {/* Account */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="account">Account</label>
                <select name="account" id="account" value={newTxForm.account} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-lg bg-white" required>
                  {accounts.length === 0 ? ( <option disabled value="">Create an account first</option> ) :
                   ( accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.name}</option>) )}
                </select>
              </div>
              {/* Description */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="description">Description</label>
                <input type="text" name="description" id="description" value={newTxForm.description} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              {/* Amount */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="amount">Amount (in INR)</label>
                <input type="number" step="0.01" name="amount" id="amount" value={newTxForm.amount} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              {/* Type */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Type</label>
                <div className="flex">
                  <label className="mr-4"><input type="radio" name="type" value="expense" checked={newTxForm.type === 'expense'} onChange={handleFormChange} /> Expense</label>
                  <label><input type="radio" name="type" value="income" checked={newTxForm.type === 'income'} onChange={handleFormChange} /> Income</label>
                </div>
              </div>
              {/* Category */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="category">Category</label>
                <input type="text" name="category" id="category" value={newTxForm.category} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Groceries, Salary" required />
              </div>
              {/* Date & Time */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="date">Date & Time</label>
                <input type="datetime-local" name="date" id="date" value={newTxForm.date} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center space-x-2">
                <FaPlus />
                <span>Add Transaction</span>
              </button>
            </form>
          </div>
        </div>

        {/* --- TRANSACTIONS LIST & FILTERS --- */}
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold mb-6">Recent Transactions</h1>
          <div className="bg-white p-4 rounded-lg shadow-md mb-4 flex items-center space-x-2">
              <input type="text" name="description" placeholder="Search description..." value={filters.description} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg" />
              <input type="text" name="category" placeholder="Search category..." value={filters.category} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg" />
              <select name="account" value={filters.account} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg bg-white">
                  <option value="">All Accounts</option>
                  {accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.name}</option>)}
              </select>
              {/* Removed redundant fetch trigger, useEffect handles it */}
              {/* <button onClick={() => { setTransactions([]); fetchTransactions(true); }} className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <FaSearch />
              </button> */}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            {loading && transactions.length === 0 ? <Spinner /> :
              transactions.length === 0 ? <p>No transactions found.</p> :
              (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      {/* --- UPDATED Header --- */}
                      <th className="py-2 px-4 text-left">Date & Time</th>
                      <th className="py-2 px-4 text-left">Description</th>
                      <th className="py-2 px-4 text-left">Category</th>
                      <th className="py-2 px-4 text-left">Account</th>
                      <th className="py-2 px-4 text-right">Amount</th>
                      <th className="py-2 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx._id} className="border-b hover:bg-gray-50">
                        {/* --- UPDATED: Display format --- */}
                        <td className="py-2 px-4 whitespace-nowrap">{moment(tx.date).format('YYYY-MM-DD HH:mm')}</td>
                        <td className="py-2 px-4">{tx.description}</td>
                        <td className="py-2 px-4"><span className="bg-gray-200 rounded-full px-2 py-1 text-sm">{tx.category}</span></td>
                        <td className="py-2 px-4">{tx.account?.name || 'N/A'}</td>
                        <td className={`py-2 px-4 text-right font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <button onClick={() => handleEditClick(tx)} className="text-blue-500 hover:text-blue-700 mr-2">
                              <FaEdit />
                          </button>
                          <button onClick={() => handleDelete(tx._id)} className="text-red-500 hover:text-red-700">
                              <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )
            }
            {page < totalPages && (
              <button
                onClick={handleLoadMore}
                className="w-full mt-4 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit Transaction"
      >
          {editingTransaction && (
              <form onSubmit={handleUpdate}>
                  {/* Account */}
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2" htmlFor="edit-account">Account</label>
                    <select name="account" id="edit-account" value={editingTransaction.account} onChange={handleEditFormChange} className="w-full px-3 py-2 border rounded-lg bg-white" required>
                        {accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.name}</option>)}
                    </select>
                  </div>
                   {/* Description */}
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2" htmlFor="edit-description">Description</label>
                    <input type="text" name="description" id="edit-description" value={editingTransaction.description} onChange={handleEditFormChange} className="w-full px-3 py-2 border rounded-lg" required />
                  </div>
                  {/* Amount */}
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2" htmlFor="edit-amount">Amount (in INR)</label>
                    <input type="number" step="0.01" name="amount" id="edit-amount" value={editingTransaction.amount} onChange={handleEditFormChange} className="w-full px-3 py-2 border rounded-lg" required />
                  </div>
                  {/* Type */}
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Type</label>
                    <div className="flex">
                      <label className="mr-4"><input type="radio" name="type" value="expense" checked={editingTransaction.type === 'expense'} onChange={handleEditFormChange} /> Expense</label>
                      <label><input type="radio" name="type" value="income" checked={editingTransaction.type === 'income'} onChange={handleEditFormChange} /> Income</label>
                    </div>
                  </div>
                  {/* Category */}
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2" htmlFor="edit-category">Category</label>
                    <input type="text" name="category" id="edit-category" value={editingTransaction.category} onChange={handleEditFormChange} className="w-full px-3 py-2 border rounded-lg" required />
                  </div>
                  {/* Date & Time */}
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2" htmlFor="edit-date">Date & Time</label>
                    {/* --- UPDATED: type="datetime-local" --- */}
                    <input type="datetime-local" name="date" id="edit-date" value={editingTransaction.date} onChange={handleEditFormChange} className="w-full px-3 py-2 border rounded-lg" required />
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">
                    Save Changes
                  </button>
              </form>
          )}
      </Modal>
    </>
  );
};

export default TransactionsPage;
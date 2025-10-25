import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { FaTrash, FaPlus, FaPercentage, FaCalculator, FaEdit } from 'react-icons/fa'; // Added FaEdit and FaCalculator
import Spinner from '../components/Spinner';
import Modal from '../components/Modal'; // Import Modal
import useCurrency from '../hooks/useCurrency';

// Combined Accounts Page with Debt Planner
const AccountsPage = () => {
  // --- State for Accounts Section ---
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [addFormData, setAddFormData] = useState({ // Renamed formData to addFormData
      name: '', type: 'Checking', balance: 0, interestRate: '', isLiability: false
  });

  // --- State for Edit Modal ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null); // Holds account being edited

  // --- State for Debt Planner Section ---
  const [debts, setDebts] = useState([]); // List of liability accounts
  const [extraPayment, setExtraPayment] = useState('');
  const [results, setResults] = useState(null); // Snowball/Avalanche results
  const [loadingCalc, setLoadingCalc] = useState(false);

  // --- Hooks ---
  const { formatCurrency, settings } = useCurrency();

  // Update isLiability flag based on selected account type in ADD form
  useEffect(() => {
      const liabilityTypes = ['Credit Card', 'Loan', 'Mortgage', 'Other Liability'];
      setAddFormData(prev => ({ ...prev, isLiability: liabilityTypes.includes(prev.type) }));
  }, [addFormData.type]);

  // Fetch all accounts data
  const fetchAccountsData = async () => {
    if (!settings) return; // Wait for currency settings
    try {
      setLoadingAccounts(true);
      const { data } = await api.get('/accounts');
      setAccounts(data);
      // Filter out debts for the planner section (negative balance AND marked as liability)
      const liabilityAccounts = data.filter(acc => acc.isLiability && acc.balance < 0);
      setDebts(liabilityAccounts);
    } catch (error) {
      toast.error('Failed to fetch accounts');
      console.error("Fetch Accounts Error:", error); // Added console log
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Fetch accounts when currency settings are loaded
  useEffect(() => {
    fetchAccountsData();
  }, [settings]); // Depend on settings

  // --- Handlers for ADD Account Section ---
  const handleAddInputChange = (e) => { // Renamed
    setAddFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddAccountSubmit = async (e) => { // Renamed
    e.preventDefault();
    if (!addFormData.name || !addFormData.type) return toast.error('Please fill name and type');
    // Convert rate from % to decimal for saving
    const rateToSave = addFormData.isLiability && addFormData.interestRate ? parseFloat(addFormData.interestRate) / 100 : 0;
    try {
      await api.post('/accounts', {
          ...addFormData,
          balance: Number(addFormData.balance), // Ensure number
          interestRate: rateToSave // Save as decimal
      });
      setAddFormData({ name: '', type: 'Checking', balance: 0, interestRate: '', isLiability: false }); // Reset ADD form
      toast.success('Account created!');
      fetchAccountsData(); // Refresh list and debts
    } catch (error) {
        console.error("Add Account Error:", error.response || error); // Log error details
        toast.error(error.response?.data?.message || 'Failed to create account');
    }
  };

  const handleAccountDelete = async (id) => {
    if (!window.confirm('Are you sure? This may affect transfers/transactions!')) return;
    try {
      await api.delete(`/accounts/${id}`);
      toast.success('Account deleted');
      fetchAccountsData(); // Refresh list and debts
    } catch (error) {
        console.error("Delete Account Error:", error.response || error); // Log error details
        toast.error(error.response?.data?.message || 'Failed to delete account');
    }
  };

  // --- Handlers for EDIT Account Section ---
  const handleEditClick = (account) => {
      setEditingAccount({
          ...account,
          // Convert rate back to percentage string for display in input
          interestRate: account.isLiability && account.interestRate ? (account.interestRate * 100).toString() : ''
      });
      setIsEditModalOpen(true);
  };

  const handleEditInputChange = (e) => {
      const { name, value } = e.target;
      setEditingAccount(prev => {
          const updated = { ...prev, [name]: value };
          // Update isLiability flag if type changes
          if (name === 'type') {
              const liabilityTypes = ['Credit Card', 'Loan', 'Mortgage', 'Other Liability'];
              updated.isLiability = liabilityTypes.includes(value);
              // Clear interest rate if it's no longer a liability type
              if (!updated.isLiability) {
                  updated.interestRate = '';
              }
          }
          return updated;
      });
  };

  const handleUpdateSubmit = async (e) => {
      e.preventDefault();
      if (!editingAccount || !editingAccount.name || !editingAccount.type) {
          return toast.error("Name and type are required.");
      }
      // Convert rate from % string to decimal for saving
       const rateToSave = editingAccount.isLiability && editingAccount.interestRate ? parseFloat(editingAccount.interestRate) / 100 : 0;

      try {
          // Exclude internal fields before sending update
          const { _id, user, createdAt, updatedAt, __v, ...updateData } = editingAccount;
          await api.put(`/accounts/${_id}`, {
              ...updateData,
              // Send balance only if needed, otherwise rely on transactions.
              // For simplicity now, we allow direct balance edit but warn user.
              balance: Number(editingAccount.balance), // Ensure number
              interestRate: rateToSave // Send decimal rate
          });
          toast.success("Account updated!");
          setIsEditModalOpen(false);
          setEditingAccount(null);
          fetchAccountsData(); // Refresh list
      } catch (error) {
          console.error("Update Account Error:", error.response || error); // Log error details
          toast.error(error.response?.data?.message || "Failed to update account.");
      }
  };
  // --- END EDIT HANDLERS ---

  // --- Handlers for Debt Planner Section ---
  const handleCalculateDebt = async () => {
    setLoadingCalc(true);
    setResults(null);
    try {
      const { data } = await api.post('/debt/calculate', { extraPayment: Number(extraPayment) || 0 });
      setResults(data);
    } catch (error) {
      console.error("Debt Calc Error:", error.response || error); // Log error details
      toast.error(error.response?.data?.message || "Calculation failed.");
    } finally {
      setLoadingCalc(false);
    }
  };

  // Helper to format months
  const formatMonths = (totalMonths) => {
    if (!totalMonths || totalMonths <= 0) return "0 months"; // Added check for invalid input
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    let result = '';
    if (years > 0) result += `${years} year${years > 1 ? 's' : ''} `;
    // Show months only if needed or if years is 0
    if (months > 0 || years === 0) result += `${months} month${months > 1 ? 's' : ''}`;
    return result.trim();
  };

  // --- Render Logic ---
  if (loadingAccounts || !settings) return <Spinner />;

  return (
    <div>
      {/* --- ACCOUNTS MANAGEMENT SECTION --- */}
      <h1 className="text-3xl font-bold mb-6">Manage Accounts</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Add Account Form */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Add New Account</h2>
            <form onSubmit={handleAddAccountSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="name">Name</label>
                <input type="text" id="name" name="name" className="w-full px-3 py-2 border rounded-lg" value={addFormData.name} onChange={handleAddInputChange} placeholder="e.g., Savings, Visa Card" required/>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="type">Type</label>
                <select id="type" name="type" className="w-full px-3 py-2 border rounded-lg bg-white" value={addFormData.type} onChange={handleAddInputChange} required>
                  <option>Checking</option> <option>Savings</option> <option>Credit Card</option>
                  <option>Cash</option> <option>Investment</option> <option>Loan</option>
                  <option>Mortgage</option> <option>Other Liability</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="balance">Initial Balance (INR)</label>
                <input type="number" step="0.01" id="balance" name="balance" className="w-full px-3 py-2 border rounded-lg" value={addFormData.balance} onChange={handleAddInputChange} required/>
                 <p className="text-xs text-gray-500 mt-1">Use negative for debts (e.g., -5000).</p>
              </div>
              {addFormData.isLiability && (
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2" htmlFor="interestRate">Interest Rate (APR %)</label>
                    <input type="number" step="0.01" id="interestRate" name="interestRate" className="w-full px-3 py-2 border rounded-lg" value={addFormData.interestRate} onChange={handleAddInputChange} placeholder="e.g., 19.9"/>
                  </div>
              )}
              <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center space-x-2">
                <FaPlus /> <span>Add Account</span>
              </button>
            </form>
          </div>
        </div>

        {/* Account List */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md h-full">
            <h2 className="text-2xl font-bold mb-4">Your Accounts</h2>
            {accounts.length === 0 ? <p>No accounts found.</p> : (
              <ul className="space-y-4">
                {accounts.map(acc => (
                  <li key={acc._id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div className="flex-1 min-w-0 mr-2"> {/* Added flex-1 to allow shrinking */}
                      <span className="text-lg font-semibold block truncate">{acc.name}</span> {/* Added truncate */}
                      <span className="text-sm text-gray-500 block">({acc.type})</span>
                      {acc.isLiability && acc.interestRate > 0 && (
                          <span className="text-xs text-red-600 flex items-center mt-1">
                             <FaPercentage className="mr-1"/> {(acc.interestRate * 100).toFixed(2)}% APR
                          </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 flex-shrink-0"> {/* Added flex-shrink-0 */}
                      <span className={`text-lg font-bold ${acc.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(acc.balance)}
                      </span>
                      <button onClick={() => handleEditClick(acc)} className="text-blue-500 hover:text-blue-700 p-1"> <FaEdit /> </button>
                      <button onClick={() => handleAccountDelete(acc._id)} className="text-red-500 hover:text-red-700 p-1"> <FaTrash /> </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <hr className="my-10 border-gray-300" />

      {/* --- DEBT PAYDOWN PLANNER SECTION --- */}
      <h1 className="text-3xl font-bold mb-6">Debt Paydown Planner</h1>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-2xl font-bold mb-4">Your Debts</h2>
          {debts.length === 0 ? (
              <p>No debt accounts found (accounts with negative balance & interest rate).</p>
          ) : (
              <ul className="space-y-3 mb-6">
                  {debts.map(debt => (
                      <li key={debt._id} className="flex justify-between items-center border-b pb-2">
                          <span>{debt.name} ({debt.type})</span>
                          <span className="flex items-center space-x-2">
                              <span className="text-red-600 font-semibold">{formatCurrency(debt.balance)}</span>
                              {debt.interestRate > 0 && (
                                  <span className="text-xs text-gray-500">({(debt.interestRate * 100).toFixed(2)}% APR)</span>
                              )}
                          </span>
                      </li>
                  ))}
              </ul>
          )}

          {/* Calculation Input */}
          {debts.length > 0 && (
              <div>
                  <h3 className="text-xl font-bold mb-4">Calculate Strategy</h3>
                  <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <label htmlFor="extraPayment" className="font-semibold whitespace-nowrap">Monthly Extra Payment (INR):</label>
                      <input
                          type="number" step="0.01" id="extraPayment" value={extraPayment}
                          onChange={(e) => setExtraPayment(e.target.value)}
                          className="w-full sm:w-40 px-3 py-2 border rounded-lg" placeholder="0"
                      />
                      <button
                          onClick={handleCalculateDebt} disabled={loadingCalc}
                          className="w-full sm:w-auto bg-indigo-600 text-white py-2 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center space-x-2"
                      >
                           <FaCalculator /> <span>{loadingCalc ? 'Calculating...' : 'Calculate'}</span>
                      </button>
                  </div>
                   <p className="text-xs text-gray-500 mt-2">Enter amount paid *in addition* to minimums each month.</p>
              </div>
          )}
      </div>

      {/* Results Display */}
      {results && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-500">
                  <h3 className="text-xl font-bold mb-3 text-blue-700">Debt Snowball</h3>
                   <p className="mb-2"><strong>Payoff Time:</strong> {formatMonths(results.snowball.months)}</p>
                  <p className="mb-4"><strong>Total Interest:</strong> {formatCurrency(results.snowball.totalInterest)}</p>
                   <h4 className="font-semibold mb-1">Payoff Order:</h4>
                  <ol className="list-decimal list-inside text-sm space-y-1">
                       {results.snowball.payoffOrder.map((item, index) => (
                           <li key={index}>{item.name} <span className="text-gray-500">({formatMonths(item.months)})</span></li>
                       ))}
                       {results.snowball.payoffOrder.length === 0 && <li>No debts to pay off.</li>}
                  </ol>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-red-500">
                  <h3 className="text-xl font-bold mb-3 text-red-700">Debt Avalanche</h3>
                   <p className="mb-2"><strong>Payoff Time:</strong> {formatMonths(results.avalanche.months)}</p>
                  <p className="mb-4"><strong>Total Interest:</strong> {formatCurrency(results.avalanche.totalInterest)}</p>
                  <h4 className="font-semibold mb-1">Payoff Order:</h4>
                   <ol className="list-decimal list-inside text-sm space-y-1">
                       {results.avalanche.payoffOrder.map((item, index) => (
                           <li key={index}>{item.name} <span className="text-gray-500">({formatMonths(item.months)})</span></li>
                       ))}
                       {results.avalanche.payoffOrder.length === 0 && <li>No debts to pay off.</li>}
                  </ol>
              </div>
          </div>
      )}

      {/* --- EDIT ACCOUNT MODAL --- */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Account"
      >
        {editingAccount && (
          <form onSubmit={handleUpdateSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="edit-name">Name</label>
              <input type="text" id="edit-name" name="name" className="w-full px-3 py-2 border rounded-lg" value={editingAccount.name} onChange={handleEditInputChange} required />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="edit-type">Type</label>
              <select id="edit-type" name="type" className="w-full px-3 py-2 border rounded-lg bg-white" value={editingAccount.type} onChange={handleEditInputChange} required>
                 <option>Checking</option> <option>Savings</option> <option>Credit Card</option>
                 <option>Cash</option> <option>Investment</option> <option>Loan</option>
                 <option>Mortgage</option> <option>Other Liability</option>
              </select>
            </div>
            {/* Balance - Hidden by default, uncomment if needed */}
            {/*
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="edit-balance">Balance (INR)</label>
              <input type="number" step="0.01" id="edit-balance" name="balance" className="w-full px-3 py-2 border rounded-lg" value={editingAccount.balance} onChange={handleEditInputChange} />
              <p className="text-xs text-gray-500 mt-1">Warning: Changing balance here doesn't adjust past transactions.</p>
            </div>
            */}
             {editingAccount.isLiability && (
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2" htmlFor="edit-interestRate">Interest Rate (APR %)</label>
                  <input type="number" step="0.01" id="edit-interestRate" name="interestRate" className="w-full px-3 py-2 border rounded-lg" value={editingAccount.interestRate} onChange={handleEditInputChange} placeholder="e.g., 19.9"/>
                </div>
            )}
            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">
              Save Changes
            </button>
          </form>
        )}
      </Modal>
      {/* ----------------------------- */}
    </div>
  );
};

export default AccountsPage;
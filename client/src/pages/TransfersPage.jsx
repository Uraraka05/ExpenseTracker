import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import moment from 'moment';
import useCurrency from '../hooks/useCurrency';

// --- ADDED HELPER ---
const formatDateTimeLocal = (dateString) => {
    const date = moment(dateString);
    return date.isValid() ? date.format('YYYY-MM-DDTHH:mm') : '';
};

const TransfersPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { formatCurrency, settings } = useCurrency();

  const [newTransfer, setNewTransfer] = useState({
    fromAccount: '',
    toAccount: '',
    amount: '',
    // --- UPDATED Initial state ---
    date: formatDateTimeLocal(new Date()),
    description: ''
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accRes, transRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/transfers')
      ]);

      setAccounts(accRes.data);
      setTransfers(transRes.data);

      if (accRes.data.length >= 2 && !newTransfer.fromAccount) { // Set default only if not set
        setNewTransfer(prev => ({
          ...prev,
          fromAccount: accRes.data[0]._id,
          toAccount: accRes.data[1]._id,
        }));
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (settings) {
      fetchData();
    }
  }, [settings]);

  const handleFormChange = (e) => {
    setNewTransfer({ ...newTransfer, [e.target.name]: e.target.value });
  };

  const handleEditFormChange = (e) => {
    setEditingTransfer({ ...editingTransfer, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/transfers', {
          ...newTransfer,
          amount: Number(newTransfer.amount) // Ensure number
      });
      fetchData();
      toast.success('Transfer complete!');
      setNewTransfer(prev => ({
        ...prev,
        amount: '',
         // --- UPDATED Reset date ---
        date: formatDateTimeLocal(new Date()),
        description: ''
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transfer failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transfer?')) {
      try {
        await api.delete(`/transfers/${id}`);
        setTransfers(transfers.filter(t => t._id !== id));
        toast.success('Transfer deleted!');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete transfer');
      }
    }
  };

  const handleEditClick = (transfer) => {
    setEditingTransfer({
      ...transfer,
      fromAccount: transfer.fromAccount?._id, // Safety check
      toAccount: transfer.toAccount?._id,   // Safety check
      // --- UPDATED Format for input ---
      date: formatDateTimeLocal(transfer.date),
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { _id, ...updateData } = editingTransfer;
      await api.put(`/transfers/${_id}`, {
          ...updateData,
          amount: Number(updateData.amount) // Ensure number
      });
      toast.success('Transfer updated!');
      setIsModalOpen(false);
      setEditingTransfer(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update transfer');
    }
  };


  if (loading || !settings) return <Spinner />;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* --- ADD TRANSFER FORM --- */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">New Transfer</h2>
            <form onSubmit={handleSubmit}>
              {/* From Account */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="fromAccount">From</label>
                <select name="fromAccount" id="fromAccount" value={newTransfer.fromAccount} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-lg bg-white" required>
                  {accounts.map(acc => (
                    <option key={acc._id} value={acc._id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                  ))}
                </select>
              </div>
              {/* To Account */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="toAccount">To</label>
                <select name="toAccount" id="toAccount" value={newTransfer.toAccount} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-lg bg-white" required>
                   {accounts.length === 0 ? (<option disabled value="">Requires at least two accounts</option>) :
                   (accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.name}</option>))}
                </select>
              </div>
              {/* Amount */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="amount">Amount (in INR)</label>
                <input type="number" step="0.01" name="amount" id="amount" value={newTransfer.amount} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              {/* Date & Time */}
              <div className="mb-4">
                {/* --- UPDATED Label and Type --- */}
                <label className="block text-gray-700 mb-2" htmlFor="date">Date & Time</label>
                <input type="datetime-local" name="date" id="date" value={newTransfer.date} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              {/* Description */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="description">Description (Optional)</label>
                <input type="text" name="description" id="description" value={newTransfer.description} onChange={handleFormChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center space-x-2">
                <FaPlus />
                <span>Make Transfer</span>
              </button>
            </form>
          </div>
        </div>

        {/* --- TRANSFERS LIST --- */}
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold mb-6">Transfer History</h1>
          <div className="bg-white p-6 rounded-lg shadow-md">
            {transfers.length === 0 ? <p>No transfers found.</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      {/* --- UPDATED Header --- */}
                      <th className="py-2 px-4 text-left">Date & Time</th>
                      <th className="py-2 px-4 text-left">From</th>
                      <th className="py-2 px-4 text-left">To</th>
                      <th className="py-2 px-4 text-right">Amount</th>
                      <th className="py-2 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map(t => (
                      <tr key={t._id} className="border-b hover:bg-gray-50">
                        {/* --- UPDATED Display format --- */}
                        <td className="py-2 px-4 whitespace-nowrap">{moment(t.date).format('YYYY-MM-DD HH:mm')}</td>
                        <td className="py-2 px-4">{t.fromAccount?.name || 'Account Deleted'}</td>
                        <td className="py-2 px-4">{t.toAccount?.name || 'Account Deleted'}</td>
                        <td className="py-2 px-4 text-right font-semibold">{formatCurrency(t.amount)}</td>
                        <td className="py-2 px-4 text-center">
                          <button onClick={() => handleEditClick(t)} className="text-blue-500 hover:text-blue-700 mr-2"><FaEdit /></button>
                          <button onClick={() => handleDelete(t._id)} className="text-red-500 hover:text-red-700"><FaTrash /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- EDIT TRANSFER MODAL --- */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Transfer">
        {editingTransfer && (
          <form onSubmit={handleUpdate}>
            {/* From Account */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="edit-fromAccount">From</label>
              <select name="fromAccount" id="edit-fromAccount" value={editingTransfer.fromAccount} onChange={handleEditFormChange} className="w-full px-3 py-2 border rounded-lg bg-white" required>
                {accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.name} ({formatCurrency(acc.balance)})</option>)}
              </select>
            </div>
            {/* To Account */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="edit-toAccount">To</label>
              <select name="toAccount" id="edit-toAccount" value={editingTransfer.toAccount} onChange={handleEditFormChange} className="w-full px-3 py-2 border rounded-lg bg-white" required>
                 {accounts.length === 0 ? (<option disabled value="">Requires at least two accounts</option>) :
                 (accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.name}</option>))}
              </select>
            </div>
            {/* Amount */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="edit-amount">Amount (in INR)</label>
              <input type="number" step="0.01" name="amount" id="edit-amount" value={editingTransfer.amount} onChange={handleEditFormChange} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            {/* Date & Time */}
            <div className="mb-4">
              {/* --- UPDATED Label and Type --- */}
              <label className="block text-gray-700 mb-2" htmlFor="edit-date">Date & Time</label>
              <input type="datetime-local" name="date" id="edit-date" value={editingTransfer.date} onChange={handleEditFormChange} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            {/* Description */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="edit-description">Description (Optional)</label>
              <input type="text" name="description" id="edit-description" value={editingTransfer.description} onChange={handleEditFormChange} className="w-full px-3 py-2 border rounded-lg" />
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

export default TransfersPage;
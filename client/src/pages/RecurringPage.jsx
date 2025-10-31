import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { FaPlus, FaTrash } from 'react-icons/fa';
import Spinner from '../components/Spinner';
import moment from 'moment';
import useCurrency from '../hooks/useCurrency';
import { expenseCategories, incomeCategories } from '../constants/categories';

const RecurringPage = () => {
  const [schedules, setSchedules] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { formatCurrency, settings } = useCurrency(); // Use settings for loading check

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: 'Uncategorized',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    account: '',
  });

  // Fetch accounts and recurring schedules
  const fetchData = async () => {
    try {
      setLoading(true);
      const [accRes, recRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/recurring')
      ]);
      setAccounts(accRes.data);
      setSchedules(recRes.data);
      if (accRes.data.length > 0) {
        setFormData(prev => ({ ...prev, account: accRes.data[0]._id }));
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (settings) { // Wait for currency settings
      fetchData();
    }
  }, [settings]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => {
      const newState = {
        ...prev,
        [name]: value
      };
      if (name === 'type') {
        newState.category = value === 'income' ? incomeCategories[0] : expenseCategories[0];
      }

      return newState;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/recurring', formData);
      // Manually add account name for display
      const accountName = accounts.find(a => a._id === data.account)?.name || 'N/A';
      setSchedules([{ ...data, account: { name: accountName }}, ...schedules]);
      toast.success('Recurring schedule added!');
      // Reset form (keep account and frequency)
      setFormData(prev => ({
        ...prev,
        description: '',
        amount: '',
        category: 'Uncategorized',
        type: 'expense',
        startDate: new Date().toISOString().split('T')[0],
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add schedule');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this recurring schedule?')) {
      try {
        await api.delete(`/recurring/${id}`);
        setSchedules(schedules.filter(s => s._id !== id));
        toast.success('Schedule deleted!');
      } catch (error) {
        toast.error('Failed to delete schedule');
      }
    }
  };
  const currentCategories = formData.type === 'income' ? incomeCategories : expenseCategories;

  if (loading || !settings) return <Spinner />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* --- ADD SCHEDULE FORM --- */}
      <div className="md:col-span-1">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Add Recurring</h2>
          <form onSubmit={handleSubmit}>
            {/* Account */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="account">Account</label>
              <select name="account" id="account" value={formData.account} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-white" required>
                {accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.name}</option>)}
              </select>
            </div>
            {/* Description */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="description">Description</label>
              <input type="text" name="description" id="description" value={formData.description} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            {/* Amount */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="amount">Amount (in INR)</label>
              <input type="number" step="0.01" name="amount" id="amount" value={formData.amount} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            {/* Type */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Type</label>
              <div className="flex">
                <label className="mr-4"><input type="radio" name="type" value="expense" checked={formData.type === 'expense'} onChange={handleInputChange} /> Expense</label>
                <label><input type="radio" name="type" value="income" checked={formData.type === 'income'} onChange={handleInputChange} /> Income</label>
              </div>
            </div>
             {/* Category */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="category">Category</label>
              <select 
                name="category" 
                id="category" 
                value={formData.category} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border rounded-lg bg-white" 
                required
              >
                {currentCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            {/* Frequency */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="frequency">Frequency</label>
              <select name="frequency" id="frequency" value={formData.frequency} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg bg-white" required>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            {/* Start Date */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="startDate">Start Date</label>
              <input type="date" name="startDate" id="startDate" value={formData.startDate} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center space-x-2">
              <FaPlus />
              <span>Add Schedule</span>
            </button>
          </form>
        </div>
      </div>

      {/* --- SCHEDULES LIST --- */}
      <div className="md:col-span-2">
        <h1 className="text-3xl font-bold mb-6">Recurring Schedules</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          {schedules.length === 0 ? <p>No recurring schedules found.</p> : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-4 text-left">Description</th>
                    <th className="py-2 px-4 text-left">Category</th>
                    <th className="py-2 px-4 text-left">Account</th>
                    <th className="py-2 px-4 text-right">Amount</th>
                    <th className="py-2 px-4 text-left">Frequency</th>
                    <th className="py-2 px-4 text-left">Start Date</th>
                    <th className="py-2 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map(s => (
                    <tr key={s._id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{s.description}</td>
                      <td className="py-2 px-4"><span className="bg-gray-200 rounded-full px-2 py-1 text-sm">{s.category}</span></td>
                      <td className="py-2 px-4">{s.account?.name || 'N/A'}</td>
                      <td className={`py-2 px-4 text-right font-semibold ${s.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {s.type === 'income' ? '+' : '-'} {formatCurrency(s.amount)}
                      </td>
                      <td className="py-2 px-4 capitalize">{s.frequency}</td>
                      <td className="py-2 px-4">{moment(s.startDate).format('YYYY-MM-DD')}</td>
                      <td className="py-2 px-4 text-center">
                        <button onClick={() => handleDelete(s._id)} className="text-red-500 hover:text-red-700">
                          <FaTrash />
                        </button>
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
  );
};

export default RecurringPage;
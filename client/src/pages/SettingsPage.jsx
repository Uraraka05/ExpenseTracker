import React, { useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import useCurrency from '../hooks/useCurrency'; 
import { FaTrash, FaPlus, FaEye, FaEyeSlash } from 'react-icons/fa'; // Added Eye icons
import Spinner from '../components/Spinner';
import AboutApp from '../components/AboutApp';

// --- ChangePasswordForm (Updated) ---
const ChangePasswordForm = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  // State for password visibility
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { currentPassword, newPassword, confirmPassword } = formData;
  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.put('/auth/changepassword', { currentPassword, newPassword });
      toast.success(data.message);
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      // Reset visibility states
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Change Password</h2>
      <form onSubmit={onSubmit}>
        {/* Current Password */}
        <div className="mb-4 relative">
          <label className="block text-gray-700 mb-2" htmlFor="currentPassword">Current Password</label>
          <input
            type={showCurrent ? 'text' : 'password'}
            id="currentPassword"
            name="currentPassword"
            className="w-full px-3 py-2 border rounded-lg pr-10"
            value={currentPassword}
            onChange={onChange}
            required
          />
          <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute inset-y-0 right-0 top-7 px-3 flex items-center text-gray-500">
            {showCurrent ? <FaEye /> : <FaEyeSlash />}
          </button>
        </div>
        {/* New Password */}
        <div className="mb-4 relative">
          <label className="block text-gray-700 mb-2" htmlFor="newPassword">New Password</label>
          <input
            type={showNew ? 'text' : 'password'}
            id="newPassword"
            name="newPassword"
            className="w-full px-3 py-2 border rounded-lg pr-10"
            value={newPassword}
            onChange={onChange}
            required
            minLength="6"
          />
           <button type="button" onClick={() => setShowNew(!showNew)} className="absolute inset-y-0 right-0 top-7 px-3 flex items-center text-gray-500">
            {showNew ? <FaEye /> : <FaEyeSlash />}
          </button>
        </div>
        {/* Confirm New Password */}
        <div className="mb-6 relative">
          <label className="block text-gray-700 mb-2" htmlFor="confirmPassword">Confirm New Password</label>
          <input
            type={showConfirm ? 'text' : 'password'}
            id="confirmPassword"
            name="confirmPassword"
            className="w-full px-3 py-2 border rounded-lg pr-10"
            value={confirmPassword}
            onChange={onChange}
            required
            minLength="6"
          />
           <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-0 top-7 px-3 flex items-center text-gray-500">
            {showConfirm ? <FaEye /> : <FaEyeSlash />}
          </button>
        </div>
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
};


// --- CurrencySettings Component (Unchanged) ---
const CurrencySettings = () => {
  // ... (Keep the existing CurrencySettings component code here) ...
   const { settings, fetchSettings, loading } = useCurrency();
   const [newRate, setNewRate] = useState({ code: '', rate: '' });

  if (loading || !settings) return <Spinner />;

  const handleRateChange = (e) => {
    setNewRate({ ...newRate, [e.target.name]: e.target.value });
  };
  
  const handleAddRate = async (e) => {
    e.preventDefault();
    if (!newRate.code || !newRate.rate) return toast.error('Please fill both fields');
    const updatedRates = {
      ...settings.rates,
      [newRate.code.toUpperCase()]: Number(newRate.rate)
    };
    try {
      await api.put('/currency', {
        baseCurrency: settings.baseCurrency,
        rates: updatedRates
      });
      toast.success('Rate added!');
      setNewRate({ code: '', rate: '' });
      fetchSettings(); 
    } catch (error) {
      toast.error('Failed to add rate');
    }
  };

  const handleDeleteRate = async (code) => {
    const { [code]: _, ...updatedRates } = settings.rates; 
    try {
      await api.put('/currency', {
        baseCurrency: settings.baseCurrency,
        rates: updatedRates
      });
      toast.success('Rate removed!');
      fetchSettings(); 
    } catch (error) {
      toast.error('Failed to remove rate');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-4">Currency Settings</h2>
      <div className="mb-4">
        <label className="block text-gray-700 mb-1">Base Currency</label>
        <input
          type="text"
          className="w-full px-3 py-2 border rounded-lg bg-gray-100"
          value={settings.baseCurrency}
          disabled
        />
        <p className="text-xs text-gray-500 mt-1">All transactions are stored in this currency.</p>
      </div>
      
      <h3 className="text-lg font-semibold mb-2">Conversion Rates (per 1 Foreign Unit)</h3>
      <div className="space-y-2 mb-4">
        {Object.entries(settings.rates).map(([code, rate]) => (
          <div key={code} className="flex justify-between items-center p-2 border rounded-lg">
            <span>1 {code} = {rate} {settings.baseCurrency}</span>
            <button onClick={() => handleDeleteRate(code)} className="text-red-500 hover:text-red-700">
              <FaTrash />
            </button>
          </div>
        ))}
        {Object.keys(settings.rates).length === 0 && (
          <p className="text-gray-500">No conversion rates set.</p>
        )}
      </div>

      <form onSubmit={handleAddRate} className="flex space-x-2">
        <input
          type="text"
          name="code"
          value={newRate.code}
          onChange={handleRateChange}
          placeholder="e.g., USD"
          className="w-1/3 px-3 py-2 border rounded-lg"
        />
        <input
          type="number"
          step="0.01"
          name="rate"
          value={newRate.rate}
          onChange={handleRateChange}
          placeholder="e.g., 83.50" 
          className="w-1/2 px-3 py-2 border rounded-lg"
        />
        <button type="submit" className="w-auto bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600">
          <FaPlus />
        </button>
      </form>
    </div>
  );
};


// --- Main Page Component (Unchanged) ---
const SettingsPage = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="flex flex-col md:flex-row gap-6"> 
        <div className="w-full md:w-1/2 max-w-lg"> 
          <ChangePasswordForm />
        </div>
        <div className="w-full md:w-1/2 max-w-lg">
          <CurrencySettings />
        </div>
      </div>
      <AboutApp />
    </div>
  );
};

export default SettingsPage;
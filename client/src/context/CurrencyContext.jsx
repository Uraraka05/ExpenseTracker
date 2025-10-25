import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [settings, setSettings] = useState(null); 
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); 

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // --- THIS IS THE FIX ---
      const { data } = await api.get('/currency'); 
      setSettings(data);
      setSelectedCurrency(data.baseCurrency); 
    } catch (error) {
      console.error('Failed to fetch currency settings', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!settings) return amount; 
    
    const { baseCurrency, rates } = settings;

    if (selectedCurrency === baseCurrency) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount);
    }

    const rate = rates[selectedCurrency];
    if (!rate) {
      return `${selectedCurrency} ?`;
    }
    const convertedAmount = amount / rate;

    try {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency',
        currency: selectedCurrency,
      }).format(convertedAmount);
    } catch (e) {
      return `${selectedCurrency} ${convertedAmount.toFixed(2)}`;
    }
  };

  const value = {
    settings,
    loading,
    selectedCurrency,
    setSelectedCurrency,
    formatCurrency,
    fetchSettings,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  return useContext(CurrencyContext);
};
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { FaTrash, FaPlus } from 'react-icons/fa';
import Spinner from '../components/Spinner';
import BarChart from '../components/BarChart';
// --- 1. Import the hook ---
import useCurrency from '../hooks/useCurrency';

const BudgetsPage = () => {
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ category: '', amount: '' });
  const [chartData, setChartData] = useState(null); 
  // --- 2. Use the hook ---
  const { formatCurrency, settings } = useCurrency();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [budgetsRes, summaryRes] = await Promise.all([
        api.get('/budgets'),
        api.get('/dashboard/summary')
      ]);
      
      setBudgets(budgetsRes.data);
      setExpenses(summaryRes.data.expenseByCategory);
      processChartData(budgetsRes.data, summaryRes.data.expenseByCategory);

    } catch (error) {
      toast.error('Failed to fetch budget data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch data if settings are loaded
    if (settings) {
      fetchData();
    }
  }, [settings]); // Re-run when settings (and thus currency) are loaded

  const processChartData = (budgets, expenses) => {
    const dataMap = new Map();

    budgets.forEach(b => {
      dataMap.set(b.category.toLowerCase(), {
        budget: b.amount,
        spent: 0
      });
    });

    expenses.forEach(e => {
      const category = e.category.toLowerCase();
      const spent = e.total;
      if (dataMap.has(category)) {
        dataMap.get(category).spent = spent;
      } else {
        dataMap.set(category, { budget: 0, spent: spent });
      }
    });

    const labels = [...dataMap.keys()];
    const budgetData = [...dataMap.values()].map(d => d.budget);
    const spentData = [...dataMap.values()].map(d => d.spent);

    setChartData({
      labels: labels,
      datasets: [
        {
          label: 'Budgeted',
          data: budgetData,
          backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue
        },
        {
          label: 'Spent',
          data: spentData,
          backgroundColor: 'rgba(255, 99, 132, 0.6)', // Red
        },
      ],
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.amount) {
      return toast.error('Please fill in all fields');
    }
    try {
      const { data } = await api.post('/budgets', {
          ...formData,
          amount: Number(formData.amount)
      });
      
      toast.success('Budget saved!');
      setFormData({ category: '', amount: '' }); // Reset form
      fetchData(); // Refetch all data to update list and chart
    } catch (error) {
      toast.error('Failed to save budget');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) {
      return;
    }
    try {
      await api.delete(`/budgets/${id}`);
      toast.success('Budget deleted');
      fetchData(); // Refetch all data
    } catch (error) {
      toast.error('Failed to delete budget');
    }
  };

  // Show spinner if data is loading
  if (loading) return <Spinner />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* --- ADD/UPDATE BUDGET FORM --- */}
      <div className="md:col-span-1">
        {/* Removed dark: classes */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Set Budget</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              {/* Removed dark: classes */}
              <label className="block text-gray-700 mb-2" htmlFor="category">Category</label>
              <input
                type="text"
                id="category"
                name="category"
                // Removed dark: classes
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="e.g., Groceries"
              />
            </div>
            <div className="mb-4">
              {/* Removed dark: classes & updated label */}
              <label className="block text-gray-700 mb-2" htmlFor="amount">Monthly Amount (in INR)</label>
              <input
                type="number"
                id="amount"
                name="amount"
                // Removed dark: classes
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="e.g., 5000"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center space-x-2"
            >
              <FaPlus />
              <span>Set/Update Budget</span>
            </button>
          </form>
        </div>
      </div>

      {/* --- BUDGET LIST & CHART --- */}
      <div className="md:col-span-2">
        
        {/* --- BUDGET CHART --- */}
        <h1 className="text-3xl font-bold mb-6">Budget vs. Spending (This Month)</h1>
        {/* Removed dark: classes */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          {chartData && (
            <div style={{maxHeight: '400px'}}>
              <BarChart data={chartData} />
            </div>
          )}
        </div>
        
        <h2 className="text-2xl font-bold mb-4">Your Budgets List</h2>
        {/* Removed dark: classes */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          {budgets.length === 0 ? (
            <p>No budgets set. Add one to get started!</p>
          ) : (
            <ul className="space-y-4">
              {budgets.map(budget => (
                // Removed dark: classes
                <li key={budget._id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <span className="text-lg font-semibold">{budget.category}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    {/* --- 3. Apply the formatter --- */}
                    <span className="text-xl font-bold">{formatCurrency(budget.amount)}</span>
                    <button
                      onClick={() => handleDelete(budget._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetsPage;
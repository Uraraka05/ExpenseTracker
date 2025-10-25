import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import PieChart from '../components/PieChart';
import BarChart from '../components/BarChart';
import Spinner from '../components/Spinner';
import { FaExclamationTriangle } from 'react-icons/fa'; 
import toast from 'react-hot-toast';
// --- 1. Import the hook ---
import useCurrency from '../hooks/useCurrency';

// Helper to get random colors for the pie chart
const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

const Dashboard = () => {
    const [summary, setSummary] = useState(null);
    const [budgets, setBudgets] = useState([]);
    const [overBudget, setOverBudget] = useState([]); 
    const [loading, setLoading] = useState(true);
    // --- 2. Use the hook ---
    const { formatCurrency, settings } = useCurrency();

    useEffect(() => {
        // Don't fetch until currency settings are loaded
        if (!settings) return;

        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const [summaryRes, budgetsRes] = await Promise.all([
                    api.get('/dashboard/summary'),
                    api.get('/budgets')
                ]);
                
                setSummary(summaryRes.data);
                setBudgets(budgetsRes.data);

                // Budget Alert Logic
                const expenses = summaryRes.data.expenseByCategory;
                const budgetMap = new Map(budgetsRes.data.map(b => [b.category.toLowerCase(), b.amount]));
                
                const alerts = [];
                for (const expense of expenses) {
                    const budgetAmount = budgetMap.get(expense.category.toLowerCase());
                    
                    if (budgetAmount && expense.total > budgetAmount) {
                        alerts.push({
                            category: expense.category,
                            spent: expense.total,
                            budget: budgetAmount,
                            over: expense.total - budgetAmount
                        });
                    }
                }
                setOverBudget(alerts);
                
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
                toast.error("Could not load dashboard data");
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [settings]); // Re-run when settings are loaded

    if (loading || !settings) return <Spinner />;

    // Prepare data for Pie Chart
    const pieChartData = {
        labels: summary?.expenseByCategory.map(item => item.category) || [],
        datasets: [{
            data: summary?.expenseByCategory.map(item => item.total) || [],
            backgroundColor: summary?.expenseByCategory.map(() => getRandomColor()) || [],
        }],
    };

    // Prepare data for Bar Chart
    const monthLabels = [];
    const incomeData = [];
    const expenseData = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth() + 1; 
        monthLabels.push(`${month}/${year}`);
        
        const monthData = summary?.monthlySummary.find(
            item => item._id.year === year && item._id.month === month
        );
        
        incomeData.push(monthData?.totalIncome || 0);
        expenseData.push(monthData?.totalExpense || 0);
    }
    
    const barChartData = {
        labels: monthLabels,
        datasets: [
            { label: 'Income', data: incomeData, backgroundColor: 'rgba(75, 192, 192, 0.6)' },
            { label: 'Expense', data: expenseData, backgroundColor: 'rgba(255, 99, 132, 0.6)' }
        ]
    };

    return (
    // Main wrapper needs position: relative
    <div className="relative p-4 md:p-8 -m-4 overflow-hidden min-h-screen"> 
        {/* --- BUBBLE CONTAINER --- */}
        <div className="bubble-background">
            {/* Render multiple bubble elements */}
            {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="bubble"></div>
            ))}
        </div>

        {/* --- CONTENT CONTAINER --- */}
        {/* Added dashboard-content class for z-index */}
        <div className="dashboard-content"> 
            {/* Keep original text color, don't force white */}
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1> 
            
            {/* Budget Alerts (keep original styling) */}
            {overBudget.length > 0 && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded" role="alert">
                    <p className="font-bold flex items-center"><FaExclamationTriangle className="mr-2" /> Budget Alerts</p>
                    <ul className="list-disc list-inside mt-2">
                        {overBudget.map(alert => (
                            <li key={alert.category}>
                                <strong>{alert.category}:</strong> You are 
                                <strong className="ml-1">{formatCurrency(alert.over)}</strong> over budget! 
                                (Spent {formatCurrency(alert.spent)} of {formatCurrency(alert.budget)})
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- Removed bg-opacity --- */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Expense by Category (This Month)</h2>
                    {summary?.expenseByCategory.length > 0 ? 
                        <div style={{maxHeight: '400px'}}><PieChart data={pieChartData} /></div> 
                        : <p className="text-gray-600">No expense data for this month.</p>
                    }
                </div>
                {/* --- Removed bg-opacity --- */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Income vs Expense (Last 6 Months)</h2>
                    {summary?.monthlySummary.length > 0 ? 
                        <div style={{maxHeight: '400px'}}><BarChart data={barChartData} /></div>
                        : <p className="text-gray-600">No income/expense data available.</p>
                    }
                </div>
            </div>
        </div> 
    </div>
  );
};

export default Dashboard;
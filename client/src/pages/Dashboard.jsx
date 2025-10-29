import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import PieChart from '../components/PieChart';
import BarChart from '../components/BarChart';
import Spinner from '../components/Spinner';
import { FaExclamationTriangle, FaLightbulb, FaInfoCircle, FaWallet, FaTasks, FaPiggyBank } from 'react-icons/fa';
import toast from 'react-hot-toast';
import useCurrency from '../hooks/useCurrency';
import { Link } from 'react-router-dom';
import AboutApp from '../components/AboutApp';

const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

const WelcomeInstructions = () => (
    <div className="bg-indigo-100 border-l-4 border-indigo-500 text-indigo-700 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
            <FaInfoCircle className="mr-3" /> Welcome to MyFinance!
        </h2>
        <p className="mb-4">It looks like you're just getting started. Here’s how to begin:</p>
        <ol className="list-decimal list-inside space-y-3">
            <li>
                <strong className="font-semibold">Add Your Accounts:</strong> Go to the{' '}
                <Link to="/accounts" className="text-indigo-600 hover:underline font-semibold items-center inline-flex">
                    <FaWallet className="mr-1" /> Accounts
                </Link> page and add your bank accounts, credit cards, loans, or cash.
            </li>
            <li>
                <strong className="font-semibold">Log Transactions:</strong> Head over to the{' '}
                <Link to="/transactions" className="text-indigo-600 hover:underline font-semibold items-center inline-flex">
                    <FaTasks className="mr-1" /> Transactions
                </Link> page to start recording your income and expenses. You can also scan bills here!
            </li>
            <li>
                <strong className="font-semibold">Set Budgets (Optional):</strong> Visit the{' '}
                 <Link to="/budgets" className="text-indigo-600 hover:underline font-semibold items-center inline-flex">
                    <FaPiggyBank className="mr-1" /> Budgets
                </Link> page to set monthly spending limits for different categories.
            </li>
        </ol>
        <p className="mt-4 text-sm">Once you add some accounts and transactions, your dashboard charts will appear here.</p>
    </div>
);
// --- END Welcome Component ---


const Dashboard = () => {
    const [summary, setSummary] = useState(null);
    const [budgets, setBudgets] = useState([]);
    const [overBudget, setOverBudget] = useState([]);
    const [hasAccounts, setHasAccounts] = useState(false); // State to check for accounts
    const [loading, setLoading] = useState(true); // Combined loading state
    const { formatCurrency, settings } = useCurrency();
    const [showAbout, setShowAbout] = useState(false);

    useEffect(() => {
        if (!settings) return; // Wait for currency settings

        const fetchDashboardData = async () => {
            try {
                setLoading(true); // Start loading

                // Fetch summary, budgets, AND accounts concurrently
                // --- CORRECTED Promise.all destructuring ---
                const [summaryRes, budgetsRes, accountsRes] = await Promise.all([
                    api.get('/dashboard/summary'),
                    api.get('/budgets'),
                    api.get('/accounts') // Fetch accounts
                ]);
                // ------------------------------------------

                setSummary(summaryRes.data);
                setBudgets(budgetsRes.data);

                // Check if accounts exist
                if (accountsRes.data && accountsRes.data.length > 0) {
                    setHasAccounts(true);

                    // --- CORRECTED Budget Alert Logic (only run if accounts exist) ---
                    const expenses = summaryRes.data.expenseByCategory || []; // Use empty array fallback
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
                    // ----------------------------------------------------------------

                } else {
                    setHasAccounts(false);
                    setOverBudget([]); // Clear alerts if no accounts
                }

            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
                toast.error("Could not load dashboard data");
                setHasAccounts(false); // Assume no accounts if fetch fails
                setOverBudget([]);
            } finally {
                setLoading(false); // Finish loading
            }
        };
        fetchDashboardData();
    }, [settings]); // Depend only on settings
    useEffect(() => {
    const firstLoginTimestamp = localStorage.getItem('firstLoginTimestamp');
    if (firstLoginTimestamp) {
      const firstLoginDate = new Date(parseInt(firstLoginTimestamp, 10));
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // Calculate date 30 days ago

      if (firstLoginDate > thirtyDaysAgo) {
        setShowAbout(true);
      } else {
        setShowAbout(false);
      }
    } else {
      setShowAbout(false);
    }
  }, [hasAccounts]); 
   useEffect(() => {
    const firstLoginTimestamp = localStorage.getItem('firstLoginTimestamp');
    if (firstLoginTimestamp) {
      const firstLoginDate = new Date(parseInt(firstLoginTimestamp, 10));
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      setShowAbout(firstLoginDate > thirtyDaysAgo);
    } else {
      setShowAbout(false); // Hide if no timestamp found
    }
  }, []);

    // --- Chart data prep (only calculate if needed AND data exists) ---
    let pieChartData = null;
    let barChartData = null;

    if (hasAccounts && summary?.expenseByCategory && summary?.monthlySummary) { // Added checks for summary data
        pieChartData = {
            labels: summary.expenseByCategory.map(item => item.category),
            datasets: [{
                data: summary.expenseByCategory.map(item => item.total),
                backgroundColor: summary.expenseByCategory.map(() => getRandomColor()),
            }],
        };

        const monthLabels = []; const incomeData = []; const expenseData = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            monthLabels.push(`${month}/${year}`);
            const monthData = summary.monthlySummary.find(item => item._id.year === year && item._id.month === month);
            incomeData.push(monthData?.totalIncome || 0);
            expenseData.push(monthData?.totalExpense || 0);
        }
        barChartData = {
            labels: monthLabels,
            datasets: [
                { label: 'Income', data: incomeData, backgroundColor: 'rgba(75, 192, 192, 0.6)' },
                { label: 'Expense', data: expenseData, backgroundColor: 'rgba(255, 99, 132, 0.6)' }
            ]
        };
    }
    if (loading) return <Spinner />;

    return (
        <div className="relative p-4 md:p-8 -m-4 overflow-hidden min-h-screen">
             <div className="bubble-background">
                 {Array.from({ length: 10 }).map((_, index) => ( <div key={index} className="bubble"></div> ))}
             </div>

            <div className="dashboard-content"> {/* Ensure this has position: relative; z-index: 1; */}
                <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

                {!hasAccounts ? (
                    <WelcomeInstructions />
                ) : (
                    <>
                        {/* Budget Alerts */}
                        {overBudget.length > 0 && (
                            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded" role="alert">
                                <p className="font-bold flex items-center"><FaExclamationTriangle className="mr-2" /> Budget Alerts</p>
                                <ul className="list-disc list-inside mt-2">
                                    {overBudget.map(alert => (
                                        <li key={alert.category}>
                                            <strong>{alert.category}:</strong> You are{' '}
                                            <strong className="ml-1">{formatCurrency(alert.over)}</strong> over budget!{' '}
                                            (Spent {formatCurrency(alert.spent)} of {formatCurrency(alert.budget)})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Pie Chart Card */}
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h2 className="text-xl font-semibold mb-4 text-gray-800">Expense by Category (This Month)</h2>
                                {/* Check if pie chart data is ready */}
                                {(pieChartData && pieChartData.datasets[0].data.length > 0) ?
                                    <div style={{maxHeight: '400px'}}><PieChart data={pieChartData} /></div>
                                    : <p className="text-gray-600">No expense data for this month.</p>
                                }
                            </div>
                            {/* Bar Chart Card */}
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h2 className="text-xl font-semibold mb-4 text-gray-800">Income vs Expense (Last 6 Months)</h2>
                                 {/* Check if bar chart data is ready */}
                                {(barChartData && barChartData.datasets[0].data.some(d => d > 0) || barChartData.datasets[1].data.some(d => d > 0)) ?
                                    <div style={{maxHeight: '400px'}}><BarChart data={barChartData} /></div>
                                    : <p className="text-gray-600">No income/expense data available for the last 6 months.</p>
                                }
                            </div>
                        </div>
                    </>
                )}{showAbout && <AboutApp />}
                {/* --- END Conditional Rendering --- */}
            </div>
        </div>
    );
};

export default Dashboard;
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Spinner from '../components/Spinner';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend,
} from 'chart.js';
import useCurrency from '../hooks/useCurrency';
import moment from 'moment';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
);

// Helper to get a random color (or you can define a fixed list)
const getRandomColor = () => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`;

const ProjectionsPage = () => {
  // --- Updated State ---
  const [totalProjection, setTotalProjection] = useState(null);
  const [accountProjections, setAccountProjections] = useState(null); // Keyed by ID
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [accountNames, setAccountNames] = useState({}); // { id: name }
  const [selectedAccountId, setSelectedAccountId] = useState(null); // NEW: State for dropdown
  const [loading, setLoading] = useState(true); // Single loading state
  const [duration, setDuration] = useState(3);
  const [visibleEventsCount, setVisibleEventsCount] = useState(10);
  const { formatCurrency, settings, selectedCurrency } = useCurrency();

  // --- Main Fetch Function ---
  const fetchProjection = async () => {
    if (!settings) return;
    setLoading(true);
    setTotalProjection(null); setAccountProjections(null); setUpcomingEvents([]); setVisibleEventsCount(10); setAccountNames({}); setSelectedAccountId(null);
    try {
      const { data } = await api.get(`/projections?duration=${duration}`);
      
      // --- Process Total Projection Chart ---
      const totalLabels = data.projectionTimeline.map(point => moment(point.date).format('YYYY-MM-DD'));
      const totalBalances = data.projectionTimeline.map(point => convertRate(point.balance));
      setTotalProjection({
        labels: totalLabels,
        datasets: [{
            label: `Projected Total Balance (${selectedCurrency})`,
            data: totalBalances,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            tension: 0.1
        }],
      });
      
      // --- Process Individual Account Projections (Keyed by ID) ---
      let individualChartsData = {};
      const chartColors = {}; // Store colors to keep them consistent
      for (const accId in data.accountProjections) {
          const accName = data.accountNames[accId] || 'Unknown Account';
          const accLabels = data.accountProjections[accId].map(point => moment(point.date).format('YYYY-MM-DD'));
          const accBalances = data.accountProjections[accId].map(point => convertRate(point.balance));
          const color = getRandomColor();
          chartColors[accId] = color; // Store color

          individualChartsData[accId] = { // Use ID as key
              labels: accLabels,
              datasets: [{
                  label: `Projected Balance (${selectedCurrency})`,
                  data: accBalances,
                  borderColor: color,
                  backgroundColor: 'rgba(0,0,0,0)',
                  tension: 0.1
              }]
          };
      }
      setAccountProjections(individualChartsData); // Set the object keyed by ID
      setAccountNames(data.accountNames);
      setUpcomingEvents(data.upcomingEvents);

      // --- Set default account for dropdown ---
      setSelectedAccountId(data.defaultAccountId || (Object.keys(data.accountNames).length > 0 ? Object.keys(data.accountNames)[0] : null));

    } catch (error) {
      toast.error('Failed to fetch projection data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  const handleLoadMoreEvents = () => {
  setVisibleEventsCount(prevCount => prevCount + 10);
};

  // --- Currency Conversion Helper ---
  const convertRate = (amountInBase) => {
      if (!settings || selectedCurrency === settings.baseCurrency) {
          return amountInBase;
      }
      const rate = settings.rates[selectedCurrency];
      return rate ? amountInBase / rate : 0;
  };

  // --- Chart Options (with Formatter) ---
  // --- Chart Options (with Formatter) ---
  const getChartOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: title, font: { size: 16 } },
       tooltip: {
            callbacks: {
                label: function(context) {
                    let label = `Balance: `;
                    if (context.parsed.y !== null) {
                         let baseAmount = context.parsed.y;
                         // Convert displayed value back to base currency (INR) for formatting
                         if (selectedCurrency !== settings.baseCurrency) {
                             const rate = settings.rates[selectedCurrency];
                             if (rate) baseAmount = context.parsed.y * rate;
                         }
                         label += formatCurrency(baseAmount);
                    }
                    return label;
                }
            }
        }
    },
     scales: {
        y: {
            ticks: {
                // --- THIS IS THE FIX ---
                callback: function(value) { // 'value' is the converted scale value
                     let baseAmount = value;
                     if (selectedCurrency !== settings.baseCurrency) {
                         const rate = settings.rates[selectedCurrency];
                         if (rate) baseAmount = value * rate; // Convert back to base (INR)
                     }
                    // Format as currency, but remove cents for a cleaner axis
                    return formatCurrency(baseAmount).replace(/\.00$/, '');
                }
                // ---------------------
            }
        },
        x: {
             ticks: {
                // --- THIS IS THE FIX ---
                callback: function(value, index, ticks) {
                    const label = this.getLabelForValue(value);
                    // Show fewer labels on X-axis for clarity
                    // Show first, last, and ~3-4 in between
                    const numTicks = ticks.length;
                    const maxLabels = 5; // Max labels to show
                    const step = Math.max(1, Math.floor(numTicks / maxLabels));

                    if (index === 0 || index === numTicks - 1 || index % step === 0) {
                         return moment(label).format('MMM D, YY'); // Shorter date format
                    }
                    return null; // Hide other labels
                }
                // ---------------------
             }
        }
    }
  });

  // Refetch when duration or currency settings/selection change
  useEffect(() => {
    fetchProjection();
  }, [duration, settings, selectedCurrency]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Cash Flow Projection</h1>

      {/* --- Controls --- */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex items-center space-x-4">
          <label htmlFor="duration" className="font-semibold">Project for:</label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg bg-white"
            disabled={loading}
          >
            <option value={1}>1 Month</option>
            <option value={3}>3 Months</option>
            <option value={6}>6 Months</option>
            <option value={12}>12 Months</option>
          </select>
        </div>
      </div>

      {loading && <Spinner />}

      {/* --- Main Chart: Total --- */}
      {!loading && totalProjection && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-bold mb-4">Total Projected Balance</h2>
          <div style={{ height: '400px' }}>
            <Line options={getChartOptions(`Total Balance over ${duration} Months`)} data={totalProjection} />
          </div>
        </div>
      )}

      {/* --- Grid for Individual Accounts & Upcoming Events --- */}
       {!loading && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

               {/* --- Section 1: Upcoming Events (UPDATED) --- */}
<div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
    <h2 className="text-xl font-bold mb-4">Upcoming Recurring Events</h2>
    {upcomingEvents.length === 0 ? (
        <p className="text-gray-500">No recurring transactions found in this period.</p>
    ) : (
        <>
            <div className="max-h-96 overflow-y-auto space-y-3">
                {/* --- Use .slice() here --- */}
                {upcomingEvents.slice(0, visibleEventsCount).map((event, index) => (
                    <div key={index} className="border-b pb-2">
                        <p className="font-semibold">{event.description}</p>
                        <p className="text-sm text-gray-600">{moment(event.date).format('YYYY-MM-DD')} on {event.accountName}</p>
                        <p className={`text-sm font-bold ${event.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(event.amount)}
                        </p>
                    </div>
                ))}
            </div>

            {upcomingEvents.length > visibleEventsCount && (
                <button
                    onClick={handleLoadMoreEvents}
                    className="w-full mt-4 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 text-sm"
                >
                    Load More (10)
                </button>
            )}
        </>
    )}
</div>

               {/* --- Section 2: Individual Account Chart (REVISED) --- */}
               <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                   <h2 className="text-xl font-bold mb-4">Projections by Account</h2>

                   {/* --- NEW: Account Selector Dropdown --- */}
                   {accountNames && Object.keys(accountNames).length > 0 ? (
                       <div className="mb-4">
                           <label htmlFor="accountSelect" className="block text-sm font-medium text-gray-700 mb-1">
                               Select Account:
                           </label>
                           <select
                               id="accountSelect"
                               value={selectedAccountId || ''}
                               onChange={(e) => setSelectedAccountId(e.target.value)}
                               className="w-full max-w-xs px-3 py-2 border rounded-lg bg-white shadow-sm"
                           >
                               {Object.entries(accountNames).map(([id, name]) => (
                                   <option key={id} value={id}>{name}</option>
                               ))}
                           </select>
                       </div>
                   ) : (
                       <p className="text-gray-500">No accounts found to project.</p>
                   )}

                   {selectedAccountId && accountProjections && accountProjections[selectedAccountId] ? (
                       <div className="mt-4">
                           <div style={{ height: '400px' }}>
                               <Line 
                                   options={getChartOptions(accountNames[selectedAccountId])} // Use account name as title
                                   data={accountProjections[selectedAccountId]} // Get chart data by selected ID
                               />
                           </div>
                       </div>
                   ) : (
                       !selectedAccountId && <p className="text-gray-500">Select an account to view its projection.</p>
                   )}
                   {/* --- END Single Chart --- */}
                   
               </div>
           </div>
       )}
    </div>
  );
};

export default ProjectionsPage;
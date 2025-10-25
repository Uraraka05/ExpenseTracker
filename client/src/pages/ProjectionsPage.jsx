import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Spinner from '../components/Spinner';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import useCurrency from '../hooks/useCurrency'; // Import currency hook
import moment from 'moment';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
);

const ProjectionsPage = () => {
  const [projectionData, setProjectionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(3); // Default to 3 months
  const { formatCurrency, settings, selectedCurrency, baseCurrency } = useCurrency(); // Use currency hook

  const fetchProjection = async () => {
    if (!settings) return; // Don't fetch if currency settings aren't loaded

    setLoading(true);
    setProjectionData(null); // Clear previous data
    try {
      const { data } = await api.get(`/projections?duration=${duration}`);
      
      // Convert data for chart, applying currency conversion
      const labels = data.map(point => moment(point.date).format('MMM YYYY')); // Format date labels
      const balances = data.map(point => {
          // Convert balance from base (INR) to selected currency
          if (selectedCurrency === settings.baseCurrency) {
              return point.balance;
          }
          const rate = settings.rates[selectedCurrency];
          return rate ? point.balance / rate : null; // Return null if rate missing
      }).filter(b => b !== null); // Filter out points with missing rates

      // Adjust labels if some points were filtered
       const finalLabels = labels.slice(0, balances.length);

      setProjectionData({
        labels: finalLabels,
        datasets: [
          {
            label: `Projected Balance (${selectedCurrency})`,
            data: balances,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            tension: 0.1 // Slight curve
          },
        ],
      });
    } catch (error) {
      toast.error('Failed to fetch projection data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Refetch when duration or currency settings/selection change
  useEffect(() => {
    fetchProjection();
  }, [duration, settings, selectedCurrency]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: `Projected Total Balance over ${duration} Months` },
       tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.y !== null) {
                        // Use formatCurrency for tooltip values
                        // Need to convert back to base currency first if not already base
                        let baseAmount = context.parsed.y;
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
                // Use formatCurrency for Y-axis labels
                callback: function(value, index, ticks) {
                    // Need to convert back to base currency first if not already base
                    let baseAmount = value;
                     if (selectedCurrency !== settings.baseCurrency) {
                         const rate = settings.rates[selectedCurrency];
                         if (rate) baseAmount = value * rate;
                     }
                    return formatCurrency(baseAmount);
                }
            }
        }
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Cash Flow Projection</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <label htmlFor="duration" className="font-semibold">Project for:</label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg bg-white"
          >
            <option value={1}>1 Month</option>
            <option value={3}>3 Months</option>
            <option value={6}>6 Months</option>
            <option value={12}>12 Months</option>
          </select>
        </div>

        {loading && <Spinner />}
        {!loading && projectionData && (
          <div style={{ height: '400px' }}> {/* Set height for chart container */}
            <Line options={chartOptions} data={projectionData} />
          </div>
        )}
         {!loading && !projectionData && (
             <p>No projection data available. Make sure you have recurring transactions set up.</p>
         )}
      </div>
    </div>
  );
};

export default ProjectionsPage;
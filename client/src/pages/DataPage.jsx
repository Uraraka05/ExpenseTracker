import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { FaDownload, FaUpload, FaFilePdf } from 'react-icons/fa';
import Spinner from '../components/Spinner';

const DataPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingCSVExport, setLoadingCSVExport] = useState(false);
  const [loadingPDFExport, setLoadingPDFExport] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoadingAccounts(true);
        const { data } = await api.get('/accounts');
        setAccounts(data);
        if (data.length > 0) {
          setSelectedAccount(data[0]._id);
        }
      } catch (error) {
        toast.error('Failed to fetch accounts');
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, []);

  const handleExportCSV = async () => {
    setLoadingCSVExport(true);
    try {
      const { data } = await api.get('/data/export', { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'transactions.csv');
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Transactions exported!');
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setLoadingCSVExport(false);
    }
  };
  
  const handleExportPDF = async () => {
    setLoadingPDFExport(true);
    toast.loading('Generating PDF report...'); 
    try {
      const { data } = await api.get('/data/export-pdf', { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'transactions_report.pdf');
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.dismiss(); 
      toast.success('PDF report exported!');
    } catch (error) {
      toast.dismiss();
      toast.error('PDF Export failed');
    } finally {
      setLoadingPDFExport(false);
    }
  };
  
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedAccount) {
      toast.error('Please select an account and a CSV file.');
      return;
    }
    setLoadingImport(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('accountId', selectedAccount);

    try {
      const { data } = await api.post('/data/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success(data.message);
      setSelectedFile(null); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Import failed');
    } finally {
      setLoadingImport(false);
    }
  };

  if (loadingAccounts) return <Spinner />;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Import & Export Data</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* --- EXPORT CARD --- */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Export Transactions</h2>
          <p className="text-gray-600 mb-4">
            Download all of your transactions as a CSV file for spreadsheets or as a printable PDF report.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleExportCSV}
              disabled={loadingCSVExport}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center space-x-2 disabled:bg-indigo-400"
            >
              {loadingCSVExport ? <Spinner /> : <FaDownload />}
              <span>{loadingCSVExport ? 'Exporting...' : 'Export as CSV'}</span>
            </button>
            
            <button
              onClick={handleExportPDF}
              disabled={loadingPDFExport}
              className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2 disabled:bg-red-400"
            >
              {loadingPDFExport ? <Spinner /> : <FaFilePdf />}
              <span>{loadingPDFExport ? 'Generating Report...' : 'Export as PDF Report'}</span>
            </button>
          </div>
        </div>

        {/* --- IMPORT CARD --- */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Import Transactions</h2>
          <form onSubmit={handleImport}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="account">
                Import to Account
              </label>
              <select
                id="account"
                name="account"
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              >
                {accounts.map(acc => (
                  <option key={acc._id} value={acc._id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="file">
                CSV File
              </label>
              <input
                type="file"
                id="file"
                name="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Required columns: `Date`, `Description`, `Amount`, `Type`, `Category`
              </p>
            </div>
            
            <button
              type="submit"
              disabled={loadingImport}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 disabled:bg-green-400"
            >
              {loadingImport ? <Spinner /> : <FaUpload />}
              <span>{loadingImport ? 'Importing...' : 'Import Transactions'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DataPage;
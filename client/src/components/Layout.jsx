import React, {useEffect} from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import api from '../api/axios'; 
import toast from 'react-hot-toast';

const Layout = () => {

  useEffect(() => {
    const processRecurring = async () => {
      // Check if we've already processed in this session
      const processed = sessionStorage.getItem('recurringProcessed');
      if (!processed) {
        console.log("Processing recurring transactions...");
        try {
          // Send request to the backend endpoint
          const { data } = await api.post('/recurring/process');
          console.log(data.message);
          // Optionally show a toast if transactions were processed
          if (data.message && data.message.includes('Processed') && !data.message.includes('Processed 0')) {
             toast.success(data.message, { duration: 4000 });
          }
          // Mark as processed for this session
          sessionStorage.setItem('recurringProcessed', 'true');
        } catch (error) {
          console.error("Failed to process recurring transactions:", error);
          // Don't mark as processed if it failed, maybe try again later
        }
      } else {
        console.log("Recurring transactions already processed this session.");
      }
    };

    processRecurring();
    
    // Cleanup function if needed (not strictly necessary here)
    // return () => { sessionStorage.removeItem('recurringProcessed'); };

  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <main className="flex-1 container mx-auto p-4 text-gray-900">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
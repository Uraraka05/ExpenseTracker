import React from 'react';
import { FaSpinner } from 'react-icons/fa';

const Spinner = () => {
  return (
    <div className="flex justify-center items-center h-full p-10">
      <FaSpinner className="animate-spin text-indigo-600 text-4xl" />
    </div>
  );
};

export default Spinner;
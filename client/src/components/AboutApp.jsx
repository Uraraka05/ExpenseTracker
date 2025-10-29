import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';

const AboutApp = () => {
  return (
    <div className="mt-12 pt-6 border-t border-gray-200 text-left text-gray-500 text-xs">
      <h4 className="font-semibold mb-2 flex items-left justify-left">
        <FaInfoCircle className="mr-2" /> About MyFinance
      </h4>
      <footer>
      <p className="mb-1">
        **MyFinance** helps you track your accounts, transactions, and budgets all in one place.
      </p>
      <p className="mb-1">
        **Key Features:** Dashboard Overview, Account Management, Transaction Logging, Transfers, Budgeting, Recurring Transactions, Cash Flow Projections, Debt Planner, Currency Conversion, Data Import/Export (CSV/PDF).
      </p>
      </footer>
    </div>
  );
};

export default AboutApp;
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { FaSignOutAlt, FaChartBar, FaWallet, FaTasks, FaExchangeAlt, FaCog, FaPiggyBank, FaDatabase, FaRedoAlt, FaChartLine} from 'react-icons/fa';
import useCurrency from '../hooks/useCurrency';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { settings, selectedCurrency, setSelectedCurrency } = useCurrency();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-indigo-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <NavLink to="/" className="text-2xl font-bold flex-shrink-0 mr-4">
          MyFinance
        </NavLink>
        
        <div className="flex items-center space-x-3">
          <NavLink to="/" className={({ isActive }) => `flex items-center space-x-1 ${isActive ? 'text-yellow-300' : 'hover:text-yellow-200'}`}>
            <FaChartBar />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/accounts" className={({ isActive }) => `flex items-center space-x-1 ${isActive ? 'text-yellow-300' : 'hover:text-yellow-200'}`}>
            <FaWallet />
            <span>Accounts</span>
          </NavLink>
          <NavLink to="/transactions" className={({ isActive }) => `flex items-center space-x-1 ${isActive ? 'text-yellow-300' : 'hover:text-yellow-200'}`}>
            <FaTasks />
            <span>Transactions</span>
          </NavLink>
          <NavLink to="/transfers" className={({ isActive }) => `flex items-center space-x-1 ${isActive ? 'text-yellow-300' : 'hover:text-yellow-200'}`}>
            <FaExchangeAlt />
            <span>Transfers</span>
          </NavLink>
          <NavLink to="/budgets" className={({ isActive }) => `flex items-center space-x-1 ${isActive ? 'text-yellow-300' : 'hover:text-yellow-200'}`}>
            <FaPiggyBank />
            <span>Budgets</span>
          </NavLink>
          <NavLink to="/recurring" className={({ isActive }) => `flex items-center space-x-1 ${isActive ? 'text-yellow-300' : 'hover:text-yellow-200'}`}>
            <FaRedoAlt />
            <span>Recurring</span>
          </NavLink>
          <NavLink to="/projections" className={({ isActive }) => `flex items-center space-x-1 ${isActive ? 'text-yellow-300' : 'hover:text-yellow-200'}`}>
            <FaChartLine />
            <span>Projections</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `flex items-center space-x-1 ${isActive ? 'text-yellow-300' : 'hover:text-yellow-200'}`}>
            <FaCog />
            <span>Settings</span>
          </NavLink>
          <NavLink to="/data" className={({ isActive }) => `flex items-center space-x-1 ${isActive ? 'text-yellow-300' : 'hover:text-yellow-200'}`}>
            <FaDatabase />
            <span>Import/Export</span>
          </NavLink>
          
          {/* Currency Selector */}
          {settings && (
            <div className="flex-shrink-0">
              <select 
                aria-label="Select Currency"
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="bg-indigo-700 text-white rounded-md p-2 hover:bg-indigo-500 focus:outline-none"
              >
                <option value={settings.baseCurrency}>{settings.baseCurrency}</option>
                {Object.keys(settings.rates).map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
          )}

          {/* Logout Button */}
          <button 
            onClick={handleLogout} 
            className="flex items-center space-x-1 text-red-300 hover:text-red-200"
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
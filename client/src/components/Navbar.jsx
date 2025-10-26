import React, { useState } from 'react'; // Import useState for potential mobile menu later
import { NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { FaSignOutAlt, FaChartBar, FaWallet, FaTasks, FaExchangeAlt, FaCog, FaPiggyBank, FaDatabase, FaRedoAlt, FaChartLine, FaBars, FaTimes } from 'react-icons/fa'; // Added FaBars, FaTimes
import useCurrency from '../hooks/useCurrency';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { settings, selectedCurrency, setSelectedCurrency } = useCurrency();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State for mobile menu

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMobileMenuOpen(false); // Close menu on logout
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Helper for NavLink classes
  const navLinkClasses = ({ isActive }) =>
    `flex items-center space-x-1 px-3 py-2 rounded-md font-medium ${
      isActive
        ? 'bg-indigo-700 text-white' // Active link background
        : 'text-indigo-100 hover:bg-indigo-500 hover:text-white' // Inactive link hover
    }`;

  // Helper for mobile NavLink classes
   const mobileNavLinkClasses = ({ isActive }) =>
    `block px-3 py-2 rounded-md text-base font-medium ${
      isActive
        ? 'bg-indigo-700 text-white'
        : 'text-indigo-100 hover:bg-indigo-500 hover:text-white'
    }`;


  return (
    <nav className="bg-indigo-600 text-white shadow-md">
      {/* --- Main Navbar Container --- */}
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <div className="flex-shrink-0">
            <NavLink to="/" className="text-xl font-bold" onClick={closeMobileMenu}>
              MyFinance
            </NavLink>
          </div>

          {/* Desktop Links (Hidden on small screens) */}
          <div className="hidden md:flex md:items-center md:space-x-2"> {/* Reduced space */}
            <NavLink to="/" className={navLinkClasses}> <FaChartBar /> <span>Dashboard</span> </NavLink>
            <NavLink to="/accounts" className={navLinkClasses}> <FaWallet /> <span>Accounts</span> </NavLink>
            <NavLink to="/transactions" className={navLinkClasses}> <FaTasks /> <span>Transactions</span> </NavLink>
            <NavLink to="/transfers" className={navLinkClasses}> <FaExchangeAlt /> <span>Transfers</span> </NavLink>
            <NavLink to="/budgets" className={navLinkClasses}> <FaPiggyBank /> <span>Budgets</span> </NavLink>
            <NavLink to="/recurring" className={navLinkClasses}> <FaRedoAlt /> <span>Recurring</span> </NavLink>
            <NavLink to="/projections" className={navLinkClasses}> <FaChartLine /> <span>Projections</span> </NavLink>
            <NavLink to="/settings" className={navLinkClasses}> <FaCog /> <span>Settings</span> </NavLink>
            <NavLink to="/data" className={navLinkClasses}> <FaDatabase /> <span>Import/Export</span> </NavLink>

            {/* Currency Selector (Desktop) */}
            {settings && (
              <div className="flex-shrink-0">
                <select
                  aria-label="Select Currency"
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="bg-indigo-700 text-white rounded-md py-2 pl-2 pr-8 border-transparent focus:ring-indigo-500 focus:border-indigo-500" // Adjusted padding/border
                >
                  <option value={settings.baseCurrency}>{settings.baseCurrency}</option>
                  {Object.keys(settings.rates).map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Logout Button (Desktop) */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-red-300 hover:bg-indigo-500 hover:text-red-100 px-3 py-2 rounded-md text-sm font-medium"
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>

          {/* --- Mobile Menu Button (Hidden on md+) --- */}
          <div className="md:hidden flex items-center">
             {/* Currency Selector (Mobile - before menu button) */}
             {settings && (
              <div className="mr-2 flex-shrink-0"> {/* Added margin */}
                <select
                  aria-label="Select Currency"
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="bg-indigo-700 text-white rounded-md py-1 pl-1 pr-6 border-transparent focus:ring-indigo-500 focus:border-indigo-500 text-xs" // Smaller text/padding
                >
                  <option value={settings.baseCurrency}>{settings.baseCurrency}</option>
                  {Object.keys(settings.rates).map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-indigo-200 hover:text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <FaTimes className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <FaBars className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>

        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <NavLink to="/" className={mobileNavLinkClasses} onClick={closeMobileMenu}> <FaChartBar className="inline mr-1"/> Dashboard </NavLink>
            <NavLink to="/accounts" className={mobileNavLinkClasses} onClick={closeMobileMenu}> <FaWallet className="inline mr-1"/> Accounts </NavLink>
            <NavLink to="/transactions" className={mobileNavLinkClasses} onClick={closeMobileMenu}> <FaTasks className="inline mr-1"/> Transactions </NavLink>
            <NavLink to="/transfers" className={mobileNavLinkClasses} onClick={closeMobileMenu}> <FaExchangeAlt className="inline mr-1"/> Transfers </NavLink>
            <NavLink to="/budgets" className={mobileNavLinkClasses} onClick={closeMobileMenu}> <FaPiggyBank className="inline mr-1"/> Budgets </NavLink>
            <NavLink to="/recurring" className={mobileNavLinkClasses} onClick={closeMobileMenu}> <FaRedoAlt className="inline mr-1"/> Recurring </NavLink>
            <NavLink to="/projections" className={mobileNavLinkClasses} onClick={closeMobileMenu}> <FaChartLine className="inline mr-1"/> Projections </NavLink>
            <NavLink to="/settings" className={mobileNavLinkClasses} onClick={closeMobileMenu}> <FaCog className="inline mr-1"/> Settings </NavLink>
            <NavLink to="/data" className={mobileNavLinkClasses} onClick={closeMobileMenu}> <FaDatabase className="inline mr-1"/> Import/Export </NavLink>
          </div>
          <div className="pt-4 pb-3 border-t border-indigo-700">
             <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-1 px-3 py-2 text-base font-medium rounded-md text-red-300 hover:bg-indigo-500 hover:text-red-100"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
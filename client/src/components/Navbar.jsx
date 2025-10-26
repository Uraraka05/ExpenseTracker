import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { FaSignOutAlt, FaChartBar, FaWallet, FaTasks, FaExchangeAlt, FaCog, FaPiggyBank, FaDatabase, FaRedoAlt, FaChartLine, FaBars, FaTimes } from 'react-icons/fa';
import useCurrency from '../hooks/useCurrency';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { settings, selectedCurrency, setSelectedCurrency } = useCurrency();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout(); // Clears auth state and localStorage via context
    navigate('/login'); // Redirects to login
    setIsMobileMenuOpen(false); // Closes mobile menu
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Helper for Desktop NavLink classes
  const navLinkClasses = ({ isActive }) =>
    `flex items-center space-x-1 px-3 py-2 rounded-md font-medium ${ // Default font size
      isActive
        ? 'bg-indigo-700 text-white'
        : 'text-indigo-100 hover:bg-indigo-500 hover:text-white'
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
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <div className="flex-shrink-0">
            <NavLink to="/" className="text-xl font-bold" onClick={closeMobileMenu}>
              MyFinance
            </NavLink>
          </div>

          {/* Desktop Links (Hidden below lg screens) */}
          <div className="hidden lg:flex lg:items-center lg:space-x-2"> {/* Switch breakpoint to lg */}
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
                <select aria-label="Select Currency" value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="bg-indigo-700 text-white rounded-md py-2 pl-2 pr-8 border-transparent focus:ring-indigo-500 focus:border-indigo-500 text-sm" >
                  <option value={settings.baseCurrency}>{settings.baseCurrency}</option>
                  {Object.keys(settings.rates).map(code => (<option key={code} value={code}>{code}</option>))}
                </select>
              </div>
            )}

            {/* Logout Button (Desktop) */}
            <button onClick={handleLogout}
              className="flex items-center space-x-1 text-red-300 hover:bg-indigo-500 hover:text-red-100 px-3 py-2 rounded-md text-sm font-medium">
              <FaSignOutAlt /> <span>Logout</span>
            </button>
          </div>

          {/* Mobile Menu Button (Hidden on lg+) */}
          <div className="lg:hidden flex items-center"> {/* Switch breakpoint to lg */}
             {/* Currency Selector (Mobile) */}
             {settings && (
              <div className="mr-2 flex-shrink-0">
                <select aria-label="Select Currency" value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="bg-indigo-700 text-white rounded-md py-1 pl-1 pr-6 border-transparent focus:ring-indigo-500 focus:border-indigo-500 text-xs">
                  <option value={settings.baseCurrency}>{settings.baseCurrency}</option>
                  {Object.keys(settings.rates).map(code => (<option key={code} value={code}>{code}</option>))}
                </select>
              </div>
            )}
            {/* Hamburger Button */}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-indigo-200 hover:text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu" aria-expanded={isMobileMenuOpen} >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? <FaTimes className="block h-6 w-6" /> : <FaBars className="block h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu (Dropdown - Hidden on lg+) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden" id="mobile-menu"> {/* Switch breakpoint to lg */}
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
             {/* Links with icons and closeMobileMenu onClick */}
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
          {/* Logout Button (Mobile) */}
          <div className="pt-4 pb-3 border-t border-indigo-700">
             <button onClick={handleLogout} // Correct handler
               className="w-full flex items-center justify-center space-x-1 px-3 py-2 text-base font-medium rounded-md text-red-300 hover:bg-indigo-500 hover:text-red-100">
               <FaSignOutAlt /> <span>Logout</span>
             </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
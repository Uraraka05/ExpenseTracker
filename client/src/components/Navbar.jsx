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
    logout();
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Helper for Desktop NavLink classes - standard font size, adjusted padding
  const navLinkClasses = ({ isActive }) =>
    `flex items-center space-x-1 px-2 py-1.5 rounded-md font-medium ${ // Use default font, adjusted padding
      isActive
        ? 'bg-indigo-700 text-white' // Darker background for active link
        : 'text-indigo-100 hover:bg-indigo-500 hover:text-white' // Lighter text for inactive
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
      {/* Increased container padding slightly on large screens */}
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex justify-between items-center h-16">

          {/* Logo - Prevent shrinking */}
          <div className="flex-shrink-0">
            <NavLink to="/" className="text-xl font-bold" onClick={closeMobileMenu}>
              MyFinance
            </NavLink>
          </div>

          {/* Desktop Links Container (Hidden below lg screens) */}
          {/* Uses lg breakpoint, reduced spacing */}
          <div className="hidden lg:flex lg:items-center lg:space-x-1">
            {/* Links - Text now appears at lg breakpoint */}
            <NavLink to="/" className={navLinkClasses}> <FaChartBar /> <span className="hidden lg:inline">Dashboard</span> </NavLink>
            <NavLink to="/accounts" className={navLinkClasses}> <FaWallet /> <span className="hidden lg:inline">Accounts</span> </NavLink>
            <NavLink to="/transactions" className={navLinkClasses}> <FaTasks /> <span className="hidden lg:inline">Transactions</span> </NavLink>
            <NavLink to="/transfers" className={navLinkClasses}> <FaExchangeAlt /> <span className="hidden lg:inline">Transfers</span> </NavLink>
            <NavLink to="/budgets" className={navLinkClasses}> <FaPiggyBank /> <span className="hidden lg:inline">Budgets</span> </NavLink>
            <NavLink to="/recurring" className={navLinkClasses}> <FaRedoAlt /> <span className="hidden lg:inline">Recurring</span> </NavLink>
            <NavLink to="/projections" className={navLinkClasses}> <FaChartLine /> <span className="hidden lg:inline">Projections</span> </NavLink>
            <NavLink to="/settings" className={navLinkClasses}> <FaCog /> <span className="hidden lg:inline">Settings</span> </NavLink>
            <NavLink to="/data" className={navLinkClasses}> <FaDatabase /> <span className="hidden lg:inline">Import/Export</span> </NavLink>

            {/* Currency Selector (Desktop) - Added margin */}
            {settings && (
              <div className="flex-shrink-0 ml-2"> {/* Added ml-2 */}
                <select aria-label="Select Currency" value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="bg-indigo-700 text-white rounded-md py-1.5 pl-2 pr-7 border-transparent focus:ring-indigo-500 focus:border-indigo-500 text-sm appearance-none" > {/* Adjusted padding/appearance */}
                  <option value={settings.baseCurrency}>{settings.baseCurrency}</option>
                  {Object.keys(settings.rates).map(code => (<option key={code} value={code}>{code}</option>))}
                </select>
              </div>
            )}

            {/* Logout Button (Desktop) - Added margin */}
            <button onClick={handleLogout}
              className="flex-shrink-0 ml-2 flex items-center space-x-1 text-red-300 hover:bg-indigo-500 hover:text-red-100 px-2 py-1.5 rounded-md text-sm font-medium"> {/* Reduced padding, added ml-2 */}
              <FaSignOutAlt /> <span className="hidden lg:inline">Logout</span> {/* Text appears at lg */}
            </button>
          </div>

          {/* Mobile Menu Button (Hidden on lg+) */}
          <div className="lg:hidden flex items-center">
             {/* Currency Selector (Mobile) */}
             {settings && (
              <div className="mr-2 flex-shrink-0">
                <select aria-label="Select Currency" value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="bg-indigo-700 text-white rounded-md py-1 pl-1 pr-6 border-transparent focus:ring-indigo-500 focus:border-indigo-500 text-xs appearance-none">
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
        <div className="lg:hidden" id="mobile-menu">
           {/* Mobile links and logout button remain the same */}
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
              <button onClick={handleLogout}
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
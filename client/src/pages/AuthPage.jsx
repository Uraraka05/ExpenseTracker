import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import { FaLandmark } from 'react-icons/fa'; // Example Logo Icon

// --- Use the same Background Image URL (REPLACE THIS) ---
const backgroundImageUrl = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1770&q=80';
// --------------------------------------------------------

const AuthPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Determine initial mode based on URL path
  const [isLoginView, setIsLoginView] = useState(location.pathname === '/login');

  // Update view if URL changes (e.g., browser back button)
  useEffect(() => {
    setIsLoginView(location.pathname === '/login');
  }, [location.pathname]);

  const toggleView = () => {
    // Navigate to the other route and update state
    const newPath = isLoginView ? '/register' : '/login';
    navigate(newPath);
    // No need to call setIsLoginView here, useEffect handles it
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-100">

      {/* --- Blurred Background Image (Always visible) --- */}
      <div
        className="absolute inset-0 bg-cover bg-center filter blur-sm z-0"
        style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        aria-hidden="true"
      />
      {/* --- Darkening Overlay (Always visible) --- */}
       <div className="absolute inset-0 bg-black bg-opacity-30 z-0" aria-hidden="true"/>

      {/* --- Logo / App Name --- */}
      <div className="absolute top-0 left-0 p-4 lg:p-6 z-20">
         <div className="flex items-center space-x-2 text-white">
             <FaLandmark className="h-8 w-8 text-indigo-300"/>
             <span className="text-2xl font-bold">MyFinance</span>
         </div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center lg:items-stretch lg:justify-start lg:flex z-10 p-4"> 
        <div className={`w-full lg:w-1/2 lg:flex lg:items-center lg:justify-center lg:p-12 transition-transform duration-700 ease-in-out ${
            isLoginView ? 'lg:translate-x-0' : 'lg:translate-x-full'
          }`}>
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md mx-auto"> {/* Added mx-auto for safety */}
            {isLoginView ? (
              <LoginForm onSwitchMode={toggleView} />
            ) : (
              <RegisterForm onSwitchMode={toggleView} />
            )}
          </div>
        </div>

        <div
          className={`absolute inset-0 w-full lg:relative lg:w-1/2 bg-cover bg-center transition-transform duration-700 ease-in-out hidden lg:flex items-center justify-center ${
            isLoginView ? 'lg:translate-x-0' : 'lg:-translate-x-full'
          }`}
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        >
           <div className="text-center text-white bg-black bg-opacity-40 p-10 rounded-lg max-w-md">
             {isLoginView ? (
               <>
                 <h2 className="text-3xl font-bold mb-4">New Here?</h2>
                 <p className="mb-6">Sign up and start managing your finances effectively!</p>
                 <button
                   onClick={toggleView}
                   className="border-2 border-white px-6 py-2 rounded-full hover:bg-white hover:text-indigo-600 font-semibold transition duration-300"
                 >
                   Sign Up
                 </button>
               </>
             ) : (
                <>
                 <h2 className="text-3xl font-bold mb-4">Welcome Back!</h2>
                 <p className="mb-6">Already have an account? Log in to access your dashboard.</p>
                 <button
                   onClick={toggleView}
                    className="border-2 border-white px-6 py-2 rounded-full hover:bg-white hover:text-indigo-600 font-semibold transition duration-300"
                 >
                   Log In
                 </button>
               </>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
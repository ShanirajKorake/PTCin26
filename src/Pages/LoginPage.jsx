// src/pages/LoginPage.jsx

import React, { useState } from 'react';
import { signInWithGoogle, loginUser } from '../services/authService'; // Assuming you put these functions here

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Handlers ---

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Success: Redirect the user (replace with your actual router logic)
      console.log("Google Sign-in successful! Redirecting...");
      // navigate('/dashboard'); // Example redirect
    } catch (err) {
      setError("Failed to sign in with Google. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginUser(email, password);
      // Success: Redirect the user
      console.log("Email/Password Sign-in successful! Redirecting...");
      // navigate('/dashboard'); // Example redirect
    } catch (err) {
      setError(err.message.includes('auth') ? 'Invalid email or password.' : 'An unexpected error occurred.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Component Render ---

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Sign In to Your Invoice App 📝
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Securely access your client and invoice data.
          </p>
        </div>

        {/* --- Google Sign-In Button --- */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
        >
          {loading ? (
            'Loading...'
          ) : (
            <>
              
              <span className="ml-3">Sign in with Google</span>
            </>
          )}
        </button>

        {/* --- Divider --- */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with email
            </span>
          </div>
        </div>

        {/* --- Email/Password Form --- */}
        <form className="space-y-4" onSubmit={handleEmailPasswordLogin}>
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:opacity-50"
          >
            {loading ? 'Logging In...' : 'Sign In'}
          </button>
        </form>

        {/* --- Sign Up Prompt --- */}
        <div className="text-center text-sm text-gray-600">
          Don't have an account? 
          <a href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500 ml-1">
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
import React, { useState } from 'react';

const Login: React.FC<{ onLogin: (user: any) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('admin@aidash.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBase}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Login failed');
      }

      const data = await res.json();
      const { access_token, user } = data;
      
      localStorage.setItem('access_token', access_token);
      onLogin(user);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <form onSubmit={submit} className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-700 to-pink-600 flex items-center justify-center text-white font-black text-xl mb-4">C</div>
          <h2 className="text-3xl font-black">CORE.</h2>
          <p className="text-sm text-gray-500">Daily Activity Tracker</p>
        </div>

        <label className="text-xs font-black text-gray-500 block mb-2">Email</label>
        <input 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          className="w-full px-4 py-3 rounded-lg border border-gray-200 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={loading}
        />

        <label className="text-xs font-black text-gray-500 block mb-2">Password</label>
        <input 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          className="w-full px-4 py-3 rounded-lg border border-gray-200 mb-6 focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={loading}
        />

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <button 
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-700 to-pink-600 text-white font-black hover:shadow-lg transition disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">Demo credentials:</p>
          <p className="text-xs text-gray-400 text-center mt-2">
            admin@aidash.com / password123
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;
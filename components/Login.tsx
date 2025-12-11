import React, { useState } from 'react';
import { UserRole } from '../types';
import { Navigation, User, Shield, Users, Mail, Lock, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string, role: UserRole) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  
  // Admin specific state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === UserRole.ADMIN) {
      if (email === 'admin' && password === 'pass') {
        onLogin('Administrator', role);
      } else {
        setError('Invalid admin credentials. Please check your email and password.');
      }
      return;
    }

    if (!username.trim() && role !== UserRole.GUEST) return;
    onLogin(role === UserRole.GUEST ? 'Guest' : username, role);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-600/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 p-8 rounded-2xl shadow-2xl w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-green-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Navigation className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white">CommuteWise</h1>
          <p className="text-slate-400 mt-2">Tandang Sora - Maharlika Route</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900/50 rounded-xl">
            <button
              type="button"
              onClick={() => { setRole(UserRole.GUEST); setError(''); }}
              className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all ${
                role === UserRole.GUEST ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Users className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Guest</span>
            </button>
            <button
              type="button"
              onClick={() => { setRole(UserRole.USER); setError(''); }}
              className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all ${
                role === UserRole.USER ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <User className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Commuter</span>
            </button>
            <button
              type="button"
              onClick={() => { setRole(UserRole.ADMIN); setError(''); }}
              className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all ${
                role === UserRole.ADMIN ? 'bg-green-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Shield className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Admin</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-2 text-red-200 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {role === UserRole.ADMIN ? (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="pass"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          ) : role === UserRole.USER ? (
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>
          ) : (
            <div className="text-center text-slate-400 text-sm py-2">
              Access the map and route info without an account.
            </div>
          )}

          <button
            type="submit"
            className={`w-full text-white font-bold py-3.5 rounded-xl shadow-lg transform transition hover:scale-[1.02] active:scale-[0.98] ${
              role === UserRole.ADMIN 
                ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500' 
                : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500'
            }`}
          >
            {role === UserRole.GUEST ? 'Continue as Guest' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};
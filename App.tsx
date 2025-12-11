import React, { useState } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { User, UserRole, DiscountType } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (username: string, role: UserRole, discountType: DiscountType = 'None') => {
    setUser({ username, role, discountType });
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <>
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
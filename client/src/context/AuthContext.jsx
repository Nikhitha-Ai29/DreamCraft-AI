import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dc_user') || 'null'); } catch { return null; }
  });
  const [loading] = useState(false);

  const login = (token, userData) => {
    localStorage.setItem('dc_token', token);
    localStorage.setItem('dc_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('dc_token');
    localStorage.removeItem('dc_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isCustomer: user?.role === 'customer', isArtisan: user?.role === 'artisan' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

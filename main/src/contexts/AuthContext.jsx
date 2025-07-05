import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check for existing auth token
    const token = localStorage.getItem('authToken');
    const userType = localStorage.getItem('userType');
    
    if (token) {
      // In a real app, you'd validate the token with your backend
      setUser({ token });
      setIsAdmin(userType === 'admin');
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password, userType = 'user') => {
    try {
      // Mock login - replace with actual API call
      const mockUser = {
        id: 1,
        email,
        name: email.split('@')[0],
        type: userType
      };
      
      const mockToken = 'mock-jwt-token-' + Date.now();
      
      localStorage.setItem('authToken', mockToken);
      localStorage.setItem('userType', userType);
      
      setUser({ ...mockUser, token: mockToken });
      setIsAdmin(userType === 'admin');
      
      return { success: true, user: mockUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      // Mock registration - replace with actual API call
      const mockUser = {
        id: Date.now(),
        ...userData,
        type: 'user'
      };
      
      const mockToken = 'mock-jwt-token-' + Date.now();
      
      localStorage.setItem('authToken', mockToken);
      localStorage.setItem('userType', 'user');
      
      setUser({ ...mockUser, token: mockToken });
      setIsAdmin(false);
      
      return { success: true, user: mockUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userType');
    setUser(null);
    setIsAdmin(false);
  };

  const value = {
    user,
    isLoading,
    isAdmin,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

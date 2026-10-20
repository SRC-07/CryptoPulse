import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('cryptopulse_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('cryptopulse_token') || null;
  });

  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState(null);

  // Obtener la billetera personal del usuario autenticado
  const fetchMyWallet = useCallback(async (authToken = token) => {
    if (!authToken) {
      setWallet(null);
      return;
    }

    setWalletLoading(true);
    setWalletError(null);
    try {
      const res = await fetch('/api/wallet/my-wallet', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setWallet(data);
      } else if (res.status === 401) {
        // Token expirado
        logout();
      } else {
        const err = await res.json();
        setWalletError(err.detail || 'Error al cargar billetera');
      }
    } catch (e) {
      setWalletError('Error de red al conectar con Portfolio Service');
    } finally {
      setWalletLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchMyWallet(token);
    }
  }, [token, fetchMyWallet]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Error al iniciar sesión');
    }

    const userData = {
      id: data.user_id,
      username: data.username,
      email: data.email,
      wallet_address: data.wallet_address,
    };

    setToken(data.access_token);
    setUser(userData);
    localStorage.setItem('cryptopulse_token', data.access_token);
    localStorage.setItem('cryptopulse_user', JSON.stringify(userData));

    await fetchMyWallet(data.access_token);
    return userData;
  };

  const register = async (username, email, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Error en el registro');
    }

    const userData = {
      id: data.user_id,
      username: data.username,
      email: data.email,
      wallet_address: data.wallet_address,
    };

    setToken(data.access_token);
    setUser(userData);
    localStorage.setItem('cryptopulse_token', data.access_token);
    localStorage.setItem('cryptopulse_user', JSON.stringify(userData));

    await fetchMyWallet(data.access_token);
    return userData;
  };

  const updateProfile = async (newUsername, newEmail) => {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: newUsername, email: newEmail }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Error al actualizar perfil');
    }

    const updatedUser = {
      ...user,
      username: data.username,
      email: data.email,
    };
    setUser(updatedUser);
    localStorage.setItem('cryptopulse_user', JSON.stringify(updatedUser));
    return updatedUser;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Error al cambiar contraseña');
    }
    return data;
  };

  const resetSimulatedFunds = async () => {
    const res = await fetch('/api/auth/reset-funds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Error al restablecer fondos');
    }
    await fetchMyWallet(token);
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setWallet(null);
    localStorage.removeItem('cryptopulse_token');
    localStorage.removeItem('cryptopulse_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        wallet,
        walletLoading,
        walletError,
        isAuthenticated: !!token,
        login,
        register,
        updateProfile,
        changePassword,
        resetSimulatedFunds,
        logout,
        refreshWallet: () => fetchMyWallet(token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}

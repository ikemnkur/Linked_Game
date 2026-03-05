import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const Ctx = createContext({ user: null, login: async () => false, register: async () => false, logout: () => { }, isAuthenticated: false });

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
            try {
                setUser(JSON.parse(storedUser));
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Error parsing stored user:', error);
                logout();
            }
        }
    }, []);

    const login = async (email, password) => {
        try {
            const response = await api.post('/api/auth/login', { email, password });
            
            if (response.data.success) {
                const { token, user } = response.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                setUser(user);
                setIsAuthenticated(true);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const register = async (userData) => {
        try {
            const response = await api.post('/api/auth/register', userData);
            
            if (response.data.success) {
                const { token, user } = response.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                setUser(user);
                setIsAuthenticated(true);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Registration error:', error);
            return false;
        }
    };

    const logout = async () => {
        try {
            // Optional: Call logout endpoint to invalidate token on server
            await api.post('/api/auth/logout').catch(() => {});
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.setItem('reloaded_', 'false');
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    return <Ctx.Provider value={{ user, login, register, logout, isAuthenticated }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
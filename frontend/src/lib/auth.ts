import axios from 'axios';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE_URL = rawApiUrl
    ? rawApiUrl.endsWith('/api')
        ? rawApiUrl
        : `${rawApiUrl}/api`
    : '/api';

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'EMPLOYEE' | 'TEAM_LEAD' | 'IT_TEAM' | 'ADMIN';
    department?: string;
}

export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token: string) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');

export const getSSOUrl = async () => {
    const response = await axios.get(`${API_BASE_URL}/auth/sso/login`);
    return response.data.auth_url;
};

export const handleSSOCallback = async (code: string) => {
    const response = await axios.post(`${API_BASE_URL}/auth/sso/callback`, { code });
    const { access_token, user } = response.data;
    setAuthToken(access_token);
    return user;
};

export const logout = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/auth/sso/logout`);
        removeAuthToken();
        if (response.data.logout_url) {
            window.location.href = response.data.logout_url;
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        removeAuthToken();
        window.location.href = '/login';
    }
};

export const isSSORole = (role: string) => ['EMPLOYEE', 'TEAM_LEAD'].includes(role);
export const isPlatformRole = (role: string) => ['IT_TEAM', 'ADMIN'].includes(role);

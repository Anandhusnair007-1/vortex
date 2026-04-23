import { useState, useEffect } from "react";
import { User, LoginCredentials } from "../types";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { logout as ssoLogout } from "../lib/auth";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const navigate = useNavigate();

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await api.post("/auth/login", credentials);
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      
      toast.success(`Welcome back, ${userData.name}`);
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Authentication failed");
      throw error;
    }
  };

  const logout = async () => {
    await ssoLogout();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    toast.success("Successfully logged out");
    navigate("/login");
  };

  const isAdmin = user?.role === "ADMIN";
  const isIT = user?.role === "IT_TEAM" || isAdmin;

  return { user, login, logout, isAdmin, isIT };
};

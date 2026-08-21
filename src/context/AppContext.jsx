import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as api from "../api";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setDataError("");
      const res = await api.getAllData();
      setEventData(res.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
      setDataError(err.response?.data?.message || "Unable to load your event data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const registerUser = async (formData) => {
    const res = await api.register(formData);
    // Don't auto-login new users - they need admin approval first
    return res.data.user;
  };

  const loginUser = async (username, password) => {
    const res = await api.login({ username, password });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logoutUser = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setEventData(null);
    setDataError("");
  };

  // Helpers to optimistically update state + call API
  const patch = (key, value) => {
    setEventData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AppContext.Provider
      value={{
        user,
        eventData,
        loading,
        dataError,
        loginUser,
        registerUser,
        logoutUser,
        fetchData,
        patch,
        setEventData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

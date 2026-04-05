import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);

// Event data
export const getAllData = () => api.get('/data');

// Guest settings
export const updateGuestSettings = (data) => api.put('/data/guest-settings', data);

// Guests
export const getGuests = () => api.get('/data/guests');
export const addGuest = (data) => api.post('/data/guests', data);
export const updateGuest = (id, data) => api.put(`/data/guests/${id}`, data);
export const deleteGuest = (id) => api.delete(`/data/guests/${id}`);
export const bulkSetGuests = (data) => api.put('/data/guests', data);

// Sponsors
export const updatePrimarySponsors = (data) => api.put('/data/primary-sponsors', data);
export const updateSecondarySponsors = (data) => api.put('/data/secondary-sponsors', data);

// Seating
export const updateSeatingSettings = (data) => api.put('/data/seating-settings', data);
export const updateSeating = (data) => api.put('/data/seating', data);
export const updatePresidentialSettings = (data) => api.put('/data/presidential-settings', data);
export const updatePresidentialSeating = (data) => api.put('/data/presidential-seating', data);

// Expenses
export const updateExpenseSettings = (data) => api.put('/data/expense-settings', data);
export const addExpense = (data) => api.post('/data/expenses', data);
export const updateExpense = (id, data) => api.put(`/data/expenses/${id}`, data);
export const deleteExpense = (id) => api.delete(`/data/expenses/${id}`);
export const resetExpenses = () => api.delete('/data/expenses');

// Tasks
export const addTask = (data) => api.post('/data/tasks', data);
export const updateTask = (id, data) => api.put(`/data/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/data/tasks/${id}`);
export const resetTasks = () => api.delete('/data/tasks');

// Checklist
export const addChecklistItem = (data) => api.post('/data/checklist', data);
export const updateChecklistItem = (id, data) => api.put(`/data/checklist/${id}`, data);
export const deleteChecklistItem = (id) => api.delete(`/data/checklist/${id}`);
export const resetChecklist = () => api.delete('/data/checklist');

// Program
export const addProgramItem = (data) => api.post('/data/program', data);
export const updateProgramItem = (id, data) => api.put(`/data/program/${id}`, data);
export const deleteProgramItem = (id) => api.delete(`/data/program/${id}`);
export const resetProgram = () => api.delete('/data/program');

// Suppliers
export const addSupplier = (data) => api.post('/data/suppliers', data);
export const updateSupplier = (id, data) => api.put(`/data/suppliers/${id}`, data);
export const deleteSupplier = (id) => api.delete(`/data/suppliers/${id}`);
export const resetSuppliers = () => api.delete('/data/suppliers');

export default api;

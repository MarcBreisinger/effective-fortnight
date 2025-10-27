import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Configure axios to include token from localStorage
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => 
    axios.post(`${API_URL}/auth/login`, { email, password }),
  
  register: (registrationData) => 
    axios.post(`${API_URL}/auth/register`, registrationData),
  
  getCurrentUser: () => 
    axios.get(`${API_URL}/auth/me`)
};

export const childrenAPI = {
  getAll: () => 
    axios.get(`${API_URL}/children`),
  
  getByGroup: (group) => 
    axios.get(`${API_URL}/children/group/${group}`),
  
  getMyChildren: () => 
    axios.get(`${API_URL}/children/my-children`),
  
  create: (childData) => 
    axios.post(`${API_URL}/children`, childData),
  
  update: (id, childData) => 
    axios.put(`${API_URL}/children/${id}`, childData),
  
  delete: (id) => 
    axios.delete(`${API_URL}/children/${id}`)
};

export const scheduleAPI = {
  getByDate: (date) => 
    axios.get(`${API_URL}/schedules/date/${date}`),
  
  getRange: (startDate, endDate) => 
    axios.get(`${API_URL}/schedules/range`, { params: { startDate, endDate } }),
  
  save: (date, scheduleData) => 
    axios.post(`${API_URL}/schedules/date/${date}`, scheduleData),
  
  updateCapacity: (date, capacityLimit) => 
    axios.patch(`${API_URL}/schedules/date/${date}/capacity`, { capacityLimit }),
  
  getChildrenByDate: (date) => 
    axios.get(`${API_URL}/schedules/date/${date}/children`)
};

export default {
  authAPI,
  childrenAPI,
  scheduleAPI
};

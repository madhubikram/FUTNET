import './assets/main.css'
import 'leaflet/dist/leaflet.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Import Toast
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

// Import ApexCharts
import VueApexCharts from "vue3-apexcharts"; // Use correct path based on installation

// Import Axios
import axios from 'axios'
import API_URL from '@/config/api'

// Configure Axios
axios.defaults.baseURL = API_URL
axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`

// Add auth token to every request
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => {
  return Promise.reject(error)
})

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueApexCharts); // Register ApexCharts globally
app.use(Toast, {
  transition: "Vue-Toastification__bounce",
  maxToasts: 5,
  newestOnTop: true,
  position: "top-right",
  timeout: 3000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: "button",
  icon: true,
  rtl: false
})

app.mount('#app')

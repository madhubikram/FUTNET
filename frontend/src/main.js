import './assets/main.css'
import 'leaflet/dist/leaflet.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Import Toast
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

// Import Axios
import axios from 'axios'

// Configure Axios
axios.defaults.baseURL = import.meta.env.PROD 
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : 'http://localhost:5000'

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

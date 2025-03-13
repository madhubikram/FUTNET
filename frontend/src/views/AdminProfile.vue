
<template>
  <PageLayout>
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-white">Profile Management</h1>
        <p class="text-gray-400">Manage your profile and futsal information</p>
      </div>

      <!-- Profile Form -->
      <div class="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
        <div v-if="isLoading" class="flex justify-center items-center py-10">
          <div class="flex items-center space-x-2">
            <Loader2 class="w-6 h-6 text-emerald-500 animate-spin" />
            <span class="text-gray-300">Loading profile...</span>
          </div>
        </div>

        <div v-else>
          <h2 class="text-xl font-medium text-white mb-4">Futsal Information</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Username</label>
              <input
                v-model="profileData.username"
                type="text"
                disabled
                class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent opacity-70"
              />
              <p class="text-xs text-gray-500 mt-1">Username cannot be changed</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Futsal Name</label>
              <input
                v-model="futsalData.name"
                type="text"
                class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Contact Email</label>
                <input
                  v-model="futsalData.contactEmail"
                  type="email"
                  class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Contact Phone</label>
                <input
                  v-model="futsalData.contactPhone"
                  type="tel"
                  class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Description</label>
              <textarea
                v-model="futsalData.description"
                rows="4"
                class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              ></textarea>
            </div>
            
            <!-- Futsal Images -->
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Futsal Images</label>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div 
                  v-for="(image, index) in futsalData.images" 
                  :key="index"
                  class="relative aspect-square rounded-lg overflow-hidden group"
                >
                  <img :src="image" alt="Futsal image" class="w-full h-full object-cover" />
                  <div class="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      @click="removeFutsalImage(index)"
                      class="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <!-- Add Image Placeholder -->
                <div 
                  @click="triggerFutsalFileInput"
                  class="border-2 border-dashed border-gray-600 rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-green-500 transition-colors"
                >
                  <ImagePlus class="w-8 h-8 text-gray-500" />
                  <span class="text-gray-500 text-sm mt-2">Add Image</span>
                  <input 
                    type="file" 
                    ref="futsalFileInput" 
                    @change="handleFutsalImageUpload" 
                    class="hidden" 
                    accept="image/*"
                  />
                </div>
              </div>
            </div>
            
            <!-- Operating Hours -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <label class="text-sm font-medium text-gray-400">Operating Hours</label>
                <button 
                  @click="addDay"
                  class="text-sm text-green-500 hover:text-green-400 flex items-center"
                >
                  <PlusCircle class="w-4 h-4 mr-1" />
                  Add Day
                </button>
              </div>
              
              <div 
                v-for="(day, index) in futsalData.operatingHours" 
                :key="index"
                class="grid grid-cols-12 gap-2 mb-2"
              >
                <div class="col-span-3">
                  <select 
                    v-model="day.day" 
                    class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
                <div v-if="day.day !== 'Normal'" class="col-span-4">
                  <input 
                    type="time" 
                    v-model="day.open" 
                    class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div v-if="day.day !== 'Normal'" class="col-span-4">
                  <input 
                    type="time" 
                    v-model="day.close" 
                    class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div class="col-span-1 flex items-center justify-center">
                  <button 
                    @click="removeDay(index)"
                    class="text-red-500 hover:text-red-400"
                  >
                    <XCircle class="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Location -->
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Location Coordinates</label>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Latitude</label>
                  <input
                    v-model="futsalData.location.lat"
                    type="number"
                    step="0.000001"
                    class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Longitude</label>
                  <input
                    v-model="futsalData.location.lng"
                    type="number"
                    step="0.000001"
                    class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              <p class="text-xs text-gray-500 mt-1">Drag the marker on the map to set location</p>
              
              <!-- Map will be added here -->
              <div class="h-60 bg-gray-700 rounded-lg mt-2 relative">
                <div v-if="!mapLoaded" class="absolute inset-0 flex items-center justify-center">
                  <Loader2 class="w-6 h-6 text-green-500 animate-spin" />
                </div>
                <div id="map" class="w-full h-full rounded-lg"></div>
              </div>
              
              <!-- Address field moved below map -->
              <div class="mt-3">
                <label class="block text-sm font-medium text-gray-400 mb-1">Address</label>
                <textarea
                  v-model="futsalData.address"
                  rows="2"
                  class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end mt-8 space-x-4">
            <button 
              @click="discardChanges"
              class="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <RotateCcw class="w-4 h-4" />
              Discard Changes
            </button>
            <button 
              @click="saveChanges"
              :disabled="isSaving"
              class="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save class="w-4 h-4" :class="{ 'animate-spin': isSaving }" />
              {{ isSaving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Change Password Section -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 class="text-xl font-medium text-white mb-4">Security</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Current Password</label>
            <input
              v-model="passwordData.currentPassword"
              type="password"
              class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">New Password</label>
            <input
              v-model="passwordData.newPassword"
              type="password"
              class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Confirm New Password</label>
            <input
              v-model="passwordData.confirmPassword"
              type="password"
              class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <div class="flex justify-end">
            <button 
              @click="changePassword"
              :disabled="isChangingPassword || !canChangePassword"
              class="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock class="w-4 h-4" :class="{ 'animate-spin': isChangingPassword }" />
              {{ isChangingPassword ? 'Changing Password...' : 'Change Password' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useToast } from 'vue-toastification'
import PageLayout from '@/components/layout/PageLayout.vue'
import { 
  Loader2, 
  Save, 
  RotateCcw, 
  Lock, 
  XCircle, 
  PlusCircle, 
  ImagePlus,
  Trash2
} from 'lucide-vue-next'
import axios from 'axios'

// State
const isLoading = ref(true)
const isSaving = ref(false)
const isChangingPassword = ref(false)
const mapLoaded = ref(false)
const futsalFileInput = ref(null)
const toast = useToast()

// Profile data
const profileData = ref({
  email: '',
  role: 'Futsal Admin',
  username: ''
})

// Futsal data
const futsalData = ref({
  name: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  description: '',
  images: [],
  operatingHours: [
    { day: 'Monday', open: '07:00', close: '22:00' },
    { day: 'Tuesday', open: '07:00', close: '22:00' },
    { day: 'Wednesday', open: '07:00', close: '22:00' },
    { day: 'Thursday', open: '07:00', close: '22:00' },
    { day: 'Friday', open: '07:00', close: '22:00' },
    { day: 'Saturday', open: '07:00', close: '22:00' },
    { day: 'Sunday', open: '07:00', close: '22:00' }
  ],
  location: {
    lat: 27.7172,
    lng: 85.3240
  }
})

// Password data
const passwordData = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Computed
const canChangePassword = computed(() => {
  return (
    passwordData.value.currentPassword.length > 0 &&
    passwordData.value.newPassword.length >= 8 &&
    passwordData.value.newPassword === passwordData.value.confirmPassword
  )
})

// Methods
const fetchProfileData = async () => {
  isLoading.value = true
  try {
    const response = await axios.get('/api/profile')
    const { user, futsal } = response.data
    
    // Set user data
    profileData.value = {
      email: user.email,
      role: user.role === 'futsalAdmin' ? 'Futsal Admin' : user.role,
      username: user.username || ''
    }
    
    // Set futsal data if exists
    if (futsal) {
      futsalData.value = {
        name: futsal.name || '',
        contactEmail: futsal.contactEmail || '',
        contactPhone: futsal.contactPhone || '',
        address: futsal.address || '',
        description: futsal.description || '',
        images: futsal.images || [],
        operatingHours: futsal.operatingHours || [
          { day: 'Monday', open: '07:00', close: '22:00' },
        ],
        location: futsal.location || {
          lat: 27.7172,
          lng: 85.3240
        }
      }
    }
    
    // Reset password fields
    passwordData.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    
    // Initialize map after data is loaded
    nextTick(() => {
      initMap()
    })
  } catch (error) {
    console.error('Error fetching profile data:', error)
    toast.error('Failed to load profile data')
  } finally {
    isLoading.value = false
  }
}

const saveChanges = async () => {
  isSaving.value = true
  try {
    // Update user profile
    await axios.patch('/api/profile', {
      email: profileData.value.email,
    })
    
    // Update futsal data
    await axios.patch('/api/futsal/profile', futsalData.value)
    
    toast.success('Profile updated successfully')
  } catch (error) {
    console.error('Error saving profile:', error)
    toast.error('Failed to save profile changes')
  } finally {
    isSaving.value = false
  }
}

const discardChanges = () => {
  fetchProfileData()
  toast.info('Changes discarded')
}

const changePassword = async () => {
  if (!canChangePassword.value) return
  
  isChangingPassword.value = true
  try {
    await axios.patch('/api/profile/password', {
      currentPassword: passwordData.value.currentPassword,
      newPassword: passwordData.value.newPassword
    })
    
    // Reset password fields
    passwordData.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    
    toast.success('Password changed successfully')
  } catch (error) {
    console.error('Error changing password:', error)
    toast.error(error.response?.data?.message || 'Failed to change password')
  } finally {
    isChangingPassword.value = false
  }
}

const triggerFutsalFileInput = () => {
  futsalFileInput.value.click()
}

const handleFutsalImageUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  const formData = new FormData()
  formData.append('image', file)
  
  try {
    const response = await axios.post('/api/futsal/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    futsalData.value.images.push(response.data.imageUrl)
    toast.success('Futsal image added')
  } catch (error) {
    console.error('Error uploading futsal image:', error)
    toast.error('Failed to upload futsal image')
  }
}

const removeFutsalImage = (index) => {
  futsalData.value.images.splice(index, 1)
}

const addDay = () => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const existingDays = futsalData.value.operatingHours.map(day => day.day)
  const availableDays = days.filter(day => !existingDays.includes(day))
  
  if (availableDays.length > 0) {
    futsalData.value.operatingHours.push({ 
      day: availableDays[0], 
      open: '07:00', 
      close: '22:00' 
    })
  }
}

const removeDay = (index) => {
  futsalData.value.operatingHours.splice(index, 1)
}

const initMap = () => {
  if (typeof window.L === 'undefined') {
    // Load Leaflet if not already loaded
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
    script.crossOrigin = ''
    script.onload = () => {
      createMap()
    }
    document.head.appendChild(script)
  } else {
    createMap()
  }
}

const createMap = () => {
  const mapContainer = document.getElementById('map')
  if (!mapContainer) return
  
  // Clear previous map if exists
  mapContainer.innerHTML = ''
  
  const map = window.L.map('map').setView([futsalData.value.location.lat, futsalData.value.location.lng], 15)
  
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)
  
  const marker = window.L.marker([futsalData.value.location.lat, futsalData.value.location.lng], {
    draggable: true
  }).addTo(map)
  
  marker.on('dragend', function(event) {
    const position = event.target.getLatLng()
    futsalData.value.location.lat = position.lat
    futsalData.value.location.lng = position.lng
  })
  
  mapLoaded.value = true
}

// Lifecycle hooks
onMounted(() => {
  fetchProfileData()
})
</script>
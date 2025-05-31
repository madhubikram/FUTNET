<template>
  <div class="min-h-screen py-8 flex items-center justify-center relative overflow-hidden">
    <div
      class="absolute inset-0 bg-cover bg-center bg-no-repeat"
      style="background-image: url('/background.jpg'); filter: blur(4px); background-attachment: fixed;"  ></div>
    <div class="absolute inset-0 bg-black/50"></div>

    <div class="w-full max-w-[95%] sm:max-w-[85%] md:max-w-2xl relative z-10 my-4">
      <div class="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-gray-700/30 shadow-2xl">
        <div class="text-center mb-4">
          <h1 class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-300 to-emerald-200 bg-clip-text text-transparent">
            FUTNET
          </h1>
          <p class="text-xs sm:text-sm text-green-100">Create your account</p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="grid grid-cols-2 gap-2">
            <BaseInput
              v-model="formData.firstName"
              label="First Name"
              placeholder="First name"
              :error="errors.firstName"
              variant="glass"
              required
            />
            <BaseInput
              v-model="formData.lastName"
              label="Last Name"
              placeholder="Last name"
              :error="errors.lastName"
              variant="glass"
              required
            />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <BaseInput
              v-model="formData.username"
              label="Username"
              placeholder="Choose username"
              :error="errors.username"
              variant="glass"
              required
            />
            <div>
              <BaseSelect
                v-model="formData.role"
                label="Role"
                placeholder="Select role"
                :error="errors.role"
                variant="glass"
                required
              >
                <option value="player" class="bg-gray-800">Player</option>
                <option value="futsalAdmin" class="bg-gray-800">Futsal Admin</option>
              </BaseSelect>
            </div>
          </div>

          <div :class="formData.role === 'futsalAdmin' ? 'grid grid-cols-2 gap-2' : ''">
            <BaseInput
              v-model="formData.contactNumber"
              label="Contact Number"
              placeholder="Contact number"
              :error="errors.contactNumber"
              variant="glass"
              required
              @keydown="onlyNumbers"
            />
            <BaseInput
              v-if="formData.role === 'futsalAdmin'"
              v-model="formData.panNumber"
              label="PAN Number"
              placeholder="Enter PAN number"
              :error="errors.panNumber"
              variant="glass"
              required
              @keydown="onlyNumbers"
            />
          </div>

          <BaseInput
            v-model="formData.email"
            type="email"
            label="Email Address"
            placeholder="Email address"
            :error="errors.email"
            variant="glass"
            required
          />

          <BaseInput
            v-model="formData.password"
            type="password"
            label="Password"
            placeholder="Create password"
            :error="errors.password"
            variant="glass"
            required
          />

          <BaseInput
            v-model="formData.confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="Confirm password"
            :error="errors.confirmPassword"
            variant="glass"
            required
          />

          <template v-if="formData.role === 'futsalAdmin'">
            <BaseInput
              v-model="formData.futsalName"
              label="Futsal Name"
              placeholder="Enter futsal name"
              :error="errors.futsalName"
              variant="glass"
              required
            />

            <ImageUpload
              v-model="selectedFiles"
              label="Legal Documents"
              :error="errors.documents"
              variant="glass"
              accept=".pdf,.jpg,.jpeg,.png"
              placeholder="Upload your legal documents"
              :maxFiles="5"
            />
          </template>

          <div v-if="errors.submit" class="text-red-400 text-xs text-center">
            {{ errors.submit }}
          </div>

          <button
            type="submit"
            class="w-full bg-gradient-to-r from-green-400 to-emerald-500
                      hover:from-green-500 hover:to-emerald-600
                      text-white font-semibold py-2 px-4 rounded-lg
                      transition duration-200 transform hover:scale-[1.02]
                      text-sm mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? 'Registering...' : 'Register' }}
          </button>
        </form>

        <p class="text-center text-green-100 text-xs mt-4">
          Already have an account?
          <router-link
            to="/login"
            class="text-green-300 hover:text-green-200 ml-1 transition-colors duration-200"
          >
            Sign in
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from "vue-toastification";
import { BaseInput, BaseSelect } from '../components/base' 
import ImageUpload from '../components/ImageUpload.vue'
import API_URL from '@/config/api'

const router = useRouter()
const toast = useToast();
const errors = ref({})
const isSubmitting = ref(false)
const selectedFiles = ref([])

const formData = ref({
  firstName: '',
  lastName: '',
  username: '',
  contactNumber: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: '',
  panNumber: '',
  futsalName: ''
})

const onlyNumbers = (event) => {
  if (!/[0-9]/.test(event.key) &&
      !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.key)) {
    event.preventDefault()
  }
}

const validateForm = () => {
  errors.value = {}
  let isValid = true

  const requiredFields = {
    firstName: 'First Name',
    lastName: 'Last Name',
    username: 'Username',
    contactNumber: 'Contact Number',
    email: 'Email Address',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    role: 'Role'
  }

  Object.entries(requiredFields).forEach(([field, label]) => {
    if (!formData.value[field]) {
      errors.value[field] = `${label} is required`
      isValid = false
    }
  })

  // Email validation
  if (formData.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    errors.value.email = 'Please enter a valid email address'
    isValid = false
  }

  // Contact number validation
  if (formData.value.contactNumber && formData.value.contactNumber.length < 10) {
    errors.value.contactNumber = 'Contact number must be at least 10 digits'
    isValid = false
  }

  // Password validation
  if (formData.value.password && formData.value.password.length < 6) {
    errors.value.password = 'Password must be at least 6 characters'
    isValid = false
  }

  // Password confirmation
  if (formData.value.password !== formData.value.confirmPassword) {
    errors.value.confirmPassword = 'Passwords do not match'
    isValid = false
  }

  // Futsal Admin specific validations
  if (formData.value.role === 'futsalAdmin') {
    if (!formData.value.panNumber) {
      errors.value.panNumber = 'PAN number is required'
      isValid = false
    }
    if (!formData.value.futsalName) {
      errors.value.futsalName = 'Futsal name is required'
      isValid = false
    }
    if (selectedFiles.value.length === 0) {
      errors.value.documents = 'Please upload required documents'
      isValid = false
    }
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true
  errors.value.submit = ''

  try {
    const submitData = new FormData()

    // Add basic fields
    Object.entries(formData.value).forEach(([key, value]) => {
      if (value) submitData.append(key, value)
    })

    // Add documents for futsal admin
    if (formData.value.role === 'futsalAdmin') {
      selectedFiles.value.forEach(file => {
        submitData.append('documents', file)
      })
    }

    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      body: submitData
    })

    const data = await response.json()

    if (response.ok) {
      // Show different message based on role
      if (formData.value.role === 'futsalAdmin') {
        toast.info("Registration complete! Your account is pending verification."); // Use info level for pending status
      } else {
        toast.success("Registration successful!"); // Standard success for players
      }
      router.push('/login')
    } else {
      throw new Error(data.message || 'Registration failed')
    }
  } catch (error) {
    console.error('Submission error:', error)
    errors.value.submit = error.message || 'Registration failed. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
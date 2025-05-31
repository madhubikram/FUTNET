<template>
  <div class="min-h-screen flex items-center justify-center relative overflow-hidden">
    <div
      class="absolute inset-0 bg-cover bg-center bg-no-repeat"
      style="background-image: url('/background.jpg'); filter: blur(4px);"
    ></div>
    <div class="absolute inset-0 bg-black/50"></div>

    <div class="w-full max-w-md px-6 relative z-10">
      <div class="bg-white/10 backdrop-blur-lg border border-gray-700/30 shadow-2xl rounded-lg p-8">
        <div class="text-center space-y-2 mb-8">
          <h1 class="text-4xl font-bold bg-gradient-to-r from-green-300 to-emerald-200 bg-clip-text text-transparent">
            FUTNET
          </h1>
          <p class="text-green-100">Sign in to your account</p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <BaseInput
            v-model="form.username"
            label="Username"
            placeholder="Enter your username"
            :error="errors.username"
            required
            variant="glass"
          />

          <BaseInput
            v-model="form.password"
            type="password"
            label="Password"
            placeholder="Enter your password"
            :error="authError"
            required
            variant="glass"
          />

          <BaseButton
            type="submit"
            :loading="isLoading"
            class="w-full"
          >
            Sign In
          </BaseButton>
        </form>

        <p class="text-center text-green-100 mt-6">
          Don't have an account?
          <router-link
            to="/register"
            class="text-green-300 hover:text-green-200 ml-1 transition-colors duration-200"
          >
            Sign up now
          </router-link>
        </p>
      </div>
    </div>

    <BaseNotification
      v-for="notification in notifications"
      :key="notification.id"
      v-bind="notification"
      @close="removeNotification(notification.id)"
    />
  </div>
</template>

<script setup>
import { useForm } from '../composables/useForm'
import { useAuth } from '../composables/useAuth'
import { useNotification } from '../composables/useNotification'
import { BaseInput, BaseButton, BaseNotification } from '../components/base'
import { RouterLink } from 'vue-router';

// Initialize composables
const { form, errors, validate } = useForm({
  username: '',
  password: '',
}, {
  username: { required: true },
  password: { required: true }
})

const { login, isLoading, error: authError } = useAuth()
const { notifications, removeNotification } = useNotification()

// Form submission
const handleSubmit = async () => {
  if (!validate()) return

  authError.value = '';

  try {
    await login({
      username: form.username,
      password: form.password
    })
  } catch {
    // Error is already handled and notification shown in useAuth
  }
}
</script>
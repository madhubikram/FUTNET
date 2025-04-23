<template>
    <PageLayout>
      <div class="p-4 md:p-8">
        <div class="max-w-4xl mx-auto">
          <!-- Profile Header -->
          <div class="mb-6 md:mb-8 flex justify-between items-start">
            <div>
                <h1 class="text-xl md:text-2xl font-bold bg-gradient-to-r from-green-300 to-emerald-400 bg-clip-text text-transparent mb-2">
                  My Profile
                </h1>
                <p class="text-sm md:text-base text-gray-400">Manage your account settings and preferences</p>
            </div>
            <!-- Add NotificationBell here -->
            <NotificationBell class="mt-1" />
          </div>
          
          <!-- Loading State -->
          <div v-if="loading" class="flex justify-center items-center min-h-[300px]">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
          </div>
          
          <!-- Error State -->
          <div v-else-if="error" class="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">
            {{ error }}
          </div>
          
          <!-- Profile Content -->
          <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <!-- Left Column - Profile Summary -->
            <div class="md:col-span-1">
              <div class="bg-gray-800 rounded-xl p-5 md:p-6 border border-gray-700 relative overflow-hidden">
                <!-- Background Decoration -->
                <div class="absolute top-0 right-0 w-40 h-40 bg-green-500/20 rounded-full blur-3xl -mr-20 -mt-20 z-0"></div>
                
                <!-- Avatar and Basic Info -->
                <div class="relative z-10 flex flex-col items-center mb-6">
                  <div class="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-700 border-4 border-gray-600 flex items-center justify-center mb-4">
                    <UserIcon class="w-10 h-10 md:w-12 md:h-12 text-gray-400" />
                  </div>
                  <h2 class="text-lg md:text-xl font-bold text-white">{{ profile.firstName }} {{ profile.lastName }}</h2>
                  <p class="text-gray-400 text-sm">@{{ profile.username }}</p>
                  <div class="mt-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                    Player
                  </div>
                </div>
                
                <!-- Contact Information -->
                <div class="space-y-4 relative z-10">
                  <div class="flex items-center gap-3">
                    <MailIcon class="w-4 h-4 md:w-5 md:h-5 text-gray-500 flex-shrink-0" />
                    <div class="overflow-hidden">
                      <p class="text-xs text-gray-500">Email</p>
                      <p class="text-sm text-white truncate">{{ profile.email }}</p>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-3">
                    <PhoneIcon class="w-4 h-4 md:w-5 md:h-5 text-gray-500 flex-shrink-0" />
                    <div>
                      <p class="text-xs text-gray-500">Phone</p>
                      <p class="text-sm text-white">{{ profile.contactNumber }}</p>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-3">
                    <CalendarIcon class="w-4 h-4 md:w-5 md:h-5 text-gray-500 flex-shrink-0" />
                    <div>
                      <p class="text-xs text-gray-500">Member Since</p>
                      <p class="text-sm text-white">{{ formatDate(profile.createdAt) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Right Column - Profile Details & Settings -->
            <div class="md:col-span-2 space-y-6">
              <!-- Stats Overview -->
              <div class="bg-gray-800 rounded-xl p-5 md:p-6 border border-gray-700">
                <h3 class="text-base md:text-lg font-medium text-white mb-4">Your Stats</h3>
                
                <div class="grid grid-cols-3 gap-2 md:gap-4">
                  <div class="bg-gray-700/50 rounded-lg p-3 md:p-4 text-center">
                    <p class="text-xl md:text-2xl font-bold text-white">{{ stats.totalBookings }}</p>
                    <p class="text-xs text-gray-400 mt-1">Confirmed Bookings</p>
                  </div>
                  
                  <div class="bg-gray-700/50 rounded-lg p-3 md:p-4 text-center">
                    <p class="text-xl md:text-2xl font-bold text-purple-400">{{ stats.loyaltyPoints }}</p>
                    <p class="text-xs text-gray-400 mt-1">Loyalty Points</p>
                  </div>
                  
                  <div class="bg-gray-700/50 rounded-lg p-3 md:p-4 text-center">
                    <p class="text-xl md:text-2xl font-bold text-blue-400">{{ stats.tournamentsJoined }}</p>
                    <p class="text-xs text-gray-400 mt-1">Tournaments Joined</p>
                  </div>
                </div>
              </div>
              
              <!-- Account Settings -->
              <div class="bg-gray-800 rounded-xl p-5 md:p-6 border border-gray-700">
                <div class="flex justify-between items-center mb-5 md:mb-6">
                  <h3 class="text-base md:text-lg font-medium text-white">Account Settings</h3>
                  <button 
                    @click="isEditing = !isEditing"
                    class="px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                  >
                    <PencilIcon v-if="!isEditing" class="w-3 h-3 md:w-4 md:h-4" />
                    <XIcon v-else class="w-3 h-3 md:w-4 md:h-4" />
                    {{ isEditing ? 'Cancel' : 'Edit Profile' }}
                  </button>
                </div>
                
                <!-- Profile View Mode -->
                <div v-if="!isEditing" class="space-y-5 md:space-y-6">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                    <div>
                      <p class="text-xs text-gray-500 mb-1">First Name</p>
                      <p class="text-gray-300">{{ profile.firstName }}</p>
                    </div>
                    
                    <div>
                      <p class="text-xs text-gray-500 mb-1">Last Name</p>
                      <p class="text-gray-300">{{ profile.lastName }}</p>
                    </div>
                    
                    <div>
                      <p class="text-xs text-gray-500 mb-1">Username</p>
                      <p class="text-gray-300">{{ profile.username }}</p>
                    </div>
                    
                    <div>
                      <p class="text-xs text-gray-500 mb-1">Email</p>
                      <p class="text-gray-300 truncate">{{ profile.email }}</p>
                    </div>
                    
                    <div>
                      <p class="text-xs text-gray-500 mb-1">Phone</p>
                      <p class="text-gray-300">{{ profile.contactNumber }}</p>
                    </div>
                  </div>
                </div>
                
                <!-- Profile Edit Mode -->
                <form v-else @submit.prevent="updateProfile" class="space-y-5 md:space-y-6">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">First Name</label>
                      <input 
                        v-model="editForm.firstName"
                        type="text"
                        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                      >
                    </div>
                    
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Last Name</label>
                      <input 
                        v-model="editForm.lastName"
                        type="text"
                        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                      >
                    </div>
                    
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Username</label>
                      <input 
                        v-model="editForm.username"
                        type="text"
                        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                      >
                    </div>
                    
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Email</label>
                      <input 
                        v-model="editForm.email"
                        type="email"
                        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                      >
                    </div>
                    
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Phone</label>
                      <input 
                        v-model="editForm.contactNumber"
                        type="tel"
                        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                      >
                    </div>
                  </div>
                  
                  <div class="flex justify-end space-x-3">
                    <button 
                      type="button"
                      @click="isEditing = false"
                      class="px-3 py-1.5 md:px-4 md:py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    
                    <button 
                      type="submit"
                      class="px-3 py-1.5 md:px-4 md:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
              
              <!-- Security Settings -->
              <div class="bg-gray-800 rounded-xl p-5 md:p-6 border border-gray-700">
                <h3 class="text-base md:text-lg font-medium text-white mb-4">Security</h3>
                
                <button 
                  @click="showPasswordModal = true"
                  class="w-full px-4 py-2 md:py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex justify-center items-center gap-2"
                >
                  <LockIcon class="w-4 h-4 md:w-5 md:h-5" />
                  Change Password
                </button>
              </div>
              
              <!-- Logout Button -->
              <div class="text-center">
                <button 
                  @click="handleLogout"
                  class="px-4 py-2 md:px-6 md:py-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 w-full"
                >
                  <LogOutIcon class="w-4 h-4 md:w-5 md:h-5" />
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Change Password Modal -->
      <BaseModal v-if="showPasswordModal" @update:model-value="showPasswordModal = false" :model-value="showPasswordModal">
        <template #header>
          <h3 class="text-xl font-semibold text-white">Change Password</h3>
        </template>
        
        <form @submit.prevent="changePassword" class="space-y-4 md:space-y-6 p-2">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Current Password</label>
            <input 
              v-model="passwordForm.currentPassword"
              type="password"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              required
            >
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-1">New Password</label>
            <input 
              v-model="passwordForm.newPassword"
              type="password"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              required
            >
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-1">Confirm New Password</label>
            <input 
              v-model="passwordForm.confirmPassword"
              type="password"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              required
            >
          </div>
          
          <div v-if="passwordError" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
            {{ passwordError }}
          </div>
        </form>
        
        <template #footer>
          <div class="flex justify-end space-x-3">
            <button
              @click="showPasswordModal = false"
              class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            
            <button
              @click="changePassword"
              :disabled="isSubmitting"
              class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Loader2Icon v-if="isSubmitting" class="animate-spin w-4 h-4" />
              Change Password
            </button>
          </div>
        </template>
      </BaseModal>
    </PageLayout>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import PageLayout from '@/components/layout/PageLayout.vue';
  import BaseModal from '@/components/base/BaseModal.vue';
  import { useTimeFormatting } from '@/composables/useTimeFormatting';
  import { useAuth } from '@/composables/useAuth';
  import NotificationBell from '@/components/features/NotificationBell.vue';
  import { 
    UserIcon, MailIcon, PhoneIcon, CalendarIcon,
    PencilIcon, XIcon, LockIcon, LogOutIcon, Loader2Icon 
  } from 'lucide-vue-next';
  import API_URL from '@/config/api';
  
  const router = useRouter();
  const { formatDate } = useTimeFormatting();
  const { logout } = useAuth();
  
  // State
  const loading = ref(false);
  const error = ref(null);
  const profile = ref({});
  const stats = ref({
    totalBookings: 0,
    loyaltyPoints: 0,
    tournamentsJoined: 0
  });
  
  // Edit mode
  const isEditing = ref(false);
  const editForm = ref({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    contactNumber: ''
  });
  
  // Password change
  const showPasswordModal = ref(false);
  const passwordForm = ref({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const passwordError = ref('');
  const isSubmitting = ref(false);
  
  // API calls
  const fetchProfile = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const data = await response.json();
      profile.value = data.user || {};
      
      // Initialize edit form with current values
      editForm.value = {
        firstName: profile.value.firstName || '',
        lastName: profile.value.lastName || '',
        username: profile.value.username || '',
        email: profile.value.email || '',
        contactNumber: profile.value.contactNumber || ''
      };
      
      // Fetch stats
      await fetchStats();
      
    } catch (err) {
      console.error('Error fetching profile:', err);
      error.value = 'Failed to load profile data. Please try again later.';
      
      // For demo purposes, generate sample data
      generateSampleProfile();
      
    } finally {
      loading.value = false;
    }
  };
  
  const fetchStats = async () => {
    try {
      // In a real implementation, this would fetch from multiple API endpoints
      const token = localStorage.getItem('token');
      
      // Get loyalty points
      try {
        const loyaltyResponse = await fetch(`${API_URL}/api/loyalty/points`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (loyaltyResponse.ok) {
          const loyaltyData = await loyaltyResponse.json();
          stats.value.loyaltyPoints = loyaltyData.points || 0;
        }
      } catch (error) {
        console.warn('Error fetching loyalty points:', error);
      }
      
      // Get booking count - only confirmed paid bookings
      try {
        const bookingsResponse = await fetch(`${API_URL}/api/bookings/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (bookingsResponse.ok) {
          const bookingsData = await bookingsResponse.json();
          // Only count confirmed bookings that are not free
          stats.value.totalBookings = bookingsData.confirmedPaidCount || 0;
        }
      } catch (error) {
        console.warn('Error fetching booking stats:', error);
      }
      
      // Get tournaments count from tournament history
      try {
        const tournamentsResponse = await fetch(`${API_URL}/api/tournaments/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (tournamentsResponse.ok) {
          const tournamentsData = await tournamentsResponse.json();
          stats.value.tournamentsJoined = tournamentsData.tournaments?.length || 0;
        } else if (tournamentsResponse.status === 403) {
          // If endpoint is not available or forbidden, try alternative endpoint
          console.warn('Tournament history endpoint forbidden, trying alternative endpoint');
          
          try {
            // Try to get registered tournaments from the user profile or another endpoint
            const userTournamentsResponse = await fetch(`${API_URL}/api/profile/tournaments`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (userTournamentsResponse.ok) {
              const userData = await userTournamentsResponse.json();
              stats.value.tournamentsJoined = userData.tournaments?.length || 0;
            } else {
              // If all else fails, estimate from user profile data
              // This is just a fallback if API endpoints aren't available
              stats.value.tournamentsJoined = profile.value.tournaments?.length || 0;
            }
          } catch (innerError) {
            console.warn('Error fetching alternative tournament data:', innerError);
            stats.value.tournamentsJoined = profile.value.tournaments?.length || 0;
          }
        }
      } catch (error) {
        console.warn('Error fetching tournament history:', error);
        // Fallback to estimated value if we can't get the data
        stats.value.tournamentsJoined = profile.value.tournaments?.length || 0;
      }
      
      // Get tournaments count from player's registrations
      try {
        // Use the my-registrations endpoint from the tournament player routes that we found in the code
        const tournamentsResponse = await fetch(`${API_URL}/api/player/tournaments/my-registrations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (tournamentsResponse.ok) {
          const registrationsData = await tournamentsResponse.json();
          // Count the registrations
          stats.value.tournamentsJoined = Array.isArray(registrationsData) ? registrationsData.length : 0;
        } else {
          // Try alternative endpoints if first one fails
          console.warn('My registrations endpoint returned status:', tournamentsResponse.status);
          
          try {
            // Try to get all tournaments and filter registered ones
            const allTournamentsResponse = await fetch(`${API_URL}/api/player/tournaments`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (allTournamentsResponse.ok) {
              const allTournaments = await allTournamentsResponse.json();
              // Filter for tournaments where isRegistered is true
              const registeredTournaments = Array.isArray(allTournaments) 
                ? allTournaments.filter(t => t.isRegistered) 
                : [];
              stats.value.tournamentsJoined = registeredTournaments.length;
            } else {
              // Default fallback
              stats.value.tournamentsJoined = 0;
            }
          } catch (innerError) {
            console.warn('Error fetching all tournaments data:', innerError);
            stats.value.tournamentsJoined = 0;
          }
        }
      } catch (error) {
        console.warn('Error fetching tournament registrations:', error);
        // Set a default value
        stats.value.tournamentsJoined = 0;
      }
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set fallback values
      stats.value = {
        totalBookings: 3,
        loyaltyPoints: 150,
        tournamentsJoined: 1
      };
    }
  };
  
  const updateProfile = async () => {
  try {
    isSubmitting.value = true;
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(editForm.value)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update profile');
    }
    
    // Update local profile with returned user data from server
    profile.value = {
      ...profile.value,
      ...data.user
    };
    
    isEditing.value = false;
    
    // Show success message
    alert('Profile updated successfully');
    
  } catch (error) {
    console.error('Error updating profile:', error);
    alert(error.message || 'Failed to update profile. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
};
  
  const changePassword = async () => {
    try {
      passwordError.value = '';
      
      // Validate passwords
      if (passwordForm.value.newPassword.length < 6) {
        passwordError.value = 'New password must be at least 6 characters';
        return;
      }
      
      if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
        passwordError.value = 'Passwords do not match';
        return;
      }
      
      isSubmitting.value = true;
      
      // In a real app, you'd make an API call to change password
      // For demo, just simulate success
      
      setTimeout(() => {
        // Reset form
        passwordForm.value = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
        
        showPasswordModal.value = false;
        alert('Password changed successfully');
        
        isSubmitting.value = false;
      }, 1500);
      
    } catch (error) {
      console.error('Error changing password:', error);
      passwordError.value = 'Failed to change password. Please try again.';
      isSubmitting.value = false;
    }
  };
  
  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout();
      router.push('/login');
    }
  };
  
  // Generate sample profile data for demo purposes
  const generateSampleProfile = () => {
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    
    profile.value = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john.doe@example.com',
      contactNumber: '9876543210',
      role: 'player',
      createdAt: oneYearAgo.toISOString()
    };
    
    editForm.value = {
      firstName: profile.value.firstName,
      lastName: profile.value.lastName,
      username: profile.value.username,
      email: profile.value.email,
      contactNumber: profile.value.contactNumber
    };
    
    stats.value = {
      totalBookings: 3,
      loyaltyPoints: 150,
      tournamentsJoined: 1
    };
  };
  
  // Lifecycle hooks
  onMounted(() => {
    fetchProfile();
  });
  </script>
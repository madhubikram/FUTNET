<template>
  <PageLayout class="bg-gradient-to-br from-gray-900 to-gray-950 min-h-screen">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-10">
        <h1 class="text-4xl font-bold tracking-tight mb-1">
          <span class="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Profile & Futsal Management
          </span>
        </h1>
        <p class="text-lg text-gray-400">Update your personal and futsal details.</p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex flex-col justify-center items-center py-20 bg-gray-800/50 rounded-xl border border-gray-700/50 shadow-lg">
        <svg class="animate-spin h-10 w-10 text-emerald-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-lg text-gray-300 font-medium">Loading profile data...</span>
      </div>

      <!-- Form Sections -->
      <form v-else @submit.prevent="saveChanges" class="space-y-8">

        <!-- User Details Card -->
        <section class="section-card">
           <h2 class="section-title">
            <User class="w-5 h-5 mr-2 text-cyan-400"/>
            User Details
          </h2>
          <div class="section-content grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="firstName" class="input-label">First Name</label>
              <div class="input-wrapper"> <User class="input-icon"/> <input id="firstName" v-model="profileData.firstName" type="text" required class="input-field pl-10"/> </div>
            </div>
            <div>
              <label for="lastName" class="input-label">Last Name</label>
              <div class="input-wrapper"> <User class="input-icon"/> <input id="lastName" v-model="profileData.lastName" type="text" required class="input-field pl-10"/> </div>
            </div>
            <div>
              <label for="username" class="input-label">Username</label>
              <div class="input-wrapper"> <User class="input-icon"/> <input id="username" v-model="profileData.username" type="text" required class="input-field pl-10"/> </div>
              <p class="input-hint">Choose a unique username.</p>
            </div>
            <div>
              <label for="email" class="input-label">Contact Email</label>
              <div class="input-wrapper"> <Mail class="input-icon"/> <input id="email" v-model="profileData.email" type="email" required class="input-field pl-10"/> </div>
            </div>
            <div class="md:col-span-2">
              <label for="contactNumber" class="input-label">Contact Phone</label>
              <div class="input-wrapper"> <Phone class="input-icon"/> <input id="contactNumber" v-model="profileData.contactNumber" type="tel" required class="input-field pl-10"/> </div>
            </div>
          </div>
        </section>

        <!-- Futsal Details Card -->
        <section class="section-card">
          <h2 class="section-title">
            <Building2 class="w-5 h-5 mr-2 text-emerald-400"/>
            Futsal Details
          </h2>
          <div v-if="futsalId" class="section-content space-y-6">
            <div>
              <label for="futsalName" class="input-label">Futsal Name</label>
              <div class="input-wrapper"> <Building2 class="input-icon"/> <input id="futsalName" v-model="futsalData.name" type="text" required class="input-field pl-10"/> </div>
            </div>
            <div>
              <label for="description" class="input-label">Description</label>
              <div class="input-wrapper"> <Info class="input-icon mt-2.5 self-start"/> <textarea id="description" v-model="futsalData.description" rows="4" class="input-field pl-10 py-2.5"></textarea> </div>
            </div>
            <div>
              <label class="input-label mb-3">Operating Hours</label>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label for="openingTime" class="block text-sm font-medium text-gray-300 mb-2">Opening Time</label> 
                   <input
                     id="openingTime"
                     type="time"
                     v-model="futsalData.operatingHours.opening"
                     class="input-field"
                     required
                   />
                 </div>
                 <div>
                   <label for="closingTime" class="block text-sm font-medium text-gray-300 mb-2">Closing Time</label>
                   <input
                     id="closingTime"
                     type="time"
                     v-model="futsalData.operatingHours.closing"
                     class="input-field"
                     required
                   />
                 </div>
              </div>
               <p v-if="timeErrorMessage" class="input-error-msg mt-2">{{ timeErrorMessage }}</p>
            </div>
            <div>
              <label class="input-label mb-1">Location</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                <div> <label for="latitude" class="block text-xs text-gray-400 mb-1">Latitude</label> <input id="latitude" v-model.number="futsalData.coordinates.lat" type="number" step="any" class="input-field"/> </div>
                <div> <label for="longitude" class="block text-xs text-gray-400 mb-1">Longitude</label> <input id="longitude" v-model.number="futsalData.coordinates.lng" type="number" step="any" class="input-field"/> </div>
              </div>
              <p class="input-hint mb-3">Click on the map to pin location or enter coordinates manually.</p>
              <div class="h-72 w-full bg-gray-700/50 rounded-lg relative shadow-inner border border-gray-700">
                 <AdminProfileMap
                    v-if="!isLoading && futsalId"
                    :key="'map-' + futsalId"
                    :initial-location="futsalData.coordinates"
                    @location-selected="handleLocationSelected"
                    @map-click="handleMapClick"
                    class="w-full h-full rounded-lg z-0"
                 />
                 <div v-else-if="isLoading" class="absolute inset-0 flex items-center justify-center z-10 bg-gray-800/60 backdrop-blur-sm"> <Loader2 class="w-8 h-8 text-emerald-400 animate-spin" /> </div>
              </div>
              <div class="mt-4">
                <label for="addressString" class="input-label mb-1">Location / Address String</label>
                <div class="input-wrapper"> <MapPin class="input-icon mt-2.5 self-start"/> <textarea id="addressString" v-model="futsalData.locationString" rows="2" placeholder="e.g., Chabahil Chowk, Near Ganesh Temple, Kathmandu" class="input-field pl-10 py-2.5"></textarea> </div>
                <p class="input-hint">Address auto-updates when marker is moved or map is clicked.</p>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-10 px-6 bg-yellow-900/20 rounded-lg border border-yellow-700/50">
             <h3 class="text-lg font-semibold text-yellow-400 mb-2">Futsal Profile Not Set Up</h3>
            <p class="text-yellow-200/80">Please complete your initial futsal profile registration to manage details here.</p>
            <router-link v-if="profileData.role === 'Futsal Admin'" to="/futsal-admin/profile-completion" class="mt-4 inline-block px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
              Complete Profile Now
            </router-link>
          </div>
        </section>

        <section class="section-card">
           <h2 class="section-title"> <Lock class="w-5 h-5 mr-2 text-red-400"/> Security </h2>
          <div class="section-content space-y-6">
            <div> <label for="currentPassword" class="input-label">Current Password</label> <div class="input-wrapper"> <KeyRound class="input-icon"/> <input id="currentPassword" v-model="passwordData.currentPassword" type="password" class="input-field pl-10"/> </div> <p v-if="passwordError && passwordError.toLowerCase().includes('current password')" class="input-error-msg">{{ passwordError }}</p> </div>
            <div> <label for="newPassword" class="input-label">New Password</label> <div class="input-wrapper"> <KeyRound class="input-icon"/> <input id="newPassword" v-model="passwordData.newPassword" type="password" class="input-field pl-10"/> </div> <p class="input-hint">Must be at least 6 characters long.</p> <p v-if="passwordError && passwordError.includes('at least 6 characters')" class="input-error-msg">{{ passwordError }}</p> </div>
            <div> <label for="confirmPassword" class="input-label">Confirm New Password</label> <div class="input-wrapper"> <KeyRound class="input-icon"/> <input id="confirmPassword" v-model="passwordData.confirmPassword" type="password" class="input-field pl-10"/> </div> <p v-if="passwordMismatchError" class="input-error-msg">{{ passwordMismatchError }}</p> <p v-if="passwordError && !passwordError.toLowerCase().includes('current password') && !passwordError.includes('at least 6 characters')" class="input-error-msg">{{ passwordError }}</p> </div>
            <div class="flex justify-end pt-2"> <button type="button" @click="changePassword" :disabled="isChangingPassword" class="action-button danger px-6 py-2.5"> <span v-if="isChangingPassword" class="flex items-center gap-2"> <div class="spinner-xs"></div> Changing... </span> <span v-else class="flex items-center gap-2"> <Lock class="w-4 h-4"/> Change Password </span> </button> </div>
          </div>
        </section>

        <div class="flex justify-end mt-10 space-x-4 border-t border-gray-700 pt-6">
           <button type="button" @click="discardChanges" class="action-button secondary px-8"> Discard All </button>
          <button type="submit" :disabled="isSaving" class="action-button primary px-8"> <span v-if="isSaving" class="flex items-center gap-2"> <div class="spinner-xs"></div> Saving... </span> <span v-else class="flex items-center gap-2"> <Save class="w-5 h-5"/> Save All Changes </span> </button>
        </div>
      </form>
    </div>
  </PageLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useToast } from 'vue-toastification';
import PageLayout from '@/components/layout/PageLayout.vue';
import AdminProfileMap from '@/components/AdminProfileMap.vue';
import { Loader2, Save, Lock, User, Mail, Phone, Building2, Info, MapPin, KeyRound /* Removed ImagePlus, Trash2 */ } from 'lucide-vue-next';
import axios from 'axios';
import _ from 'lodash';

// --- State ---
const isLoading = ref(true);
const isSaving = ref(false);
const isChangingPassword = ref(false);
const toast = useToast();
const futsalId = ref(null);

// --- Reverted default operating hours to simple object ---
const defaultOperatingHours = () => ({
  opening: '09:00',
  closing: '21:00'
});

const profileData = ref({ firstName: '', lastName: '', email: '', role: '', username: '', contactNumber: '' });
const futsalData = ref({
  _id: null, name: '', description: '', locationString: '', images: [],
  operatingHours: defaultOperatingHours(), // Use simple object
  coordinates: { lat: 27.7172, lng: 85.3240 }
});
const passwordData = ref({ currentPassword: '', newPassword: '', confirmPassword: '' });

const initialProfileData = ref(null);
const initialFutsalData = ref(null);

// --- Computed ---
const passwordMismatchError = computed(() => {
  if (passwordData.value.newPassword && passwordData.value.confirmPassword && passwordData.value.newPassword !== passwordData.value.confirmPassword) {
    return 'Passwords do not match.';
  } return '';
});

const passwordError = ref(''); // For API/length errors

// --- Operating Hours Time Validation ---
const timeErrorMessage = computed(() => {
    // Ensure operatingHours and its properties exist before validation
    if (!futsalData.value.operatingHours?.opening || !futsalData.value.operatingHours?.closing) {
        return ''; // No error if times are not set yet
    }
    // Basic check: Convert HH:mm to minutes for comparison
    const timeToMinutes = (time) => {
         if (!time || typeof time !== 'string' || !time.includes(':')) return NaN; // Add robustness
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };
    const openingMinutes = timeToMinutes(futsalData.value.operatingHours.opening);
    const closingMinutes = timeToMinutes(futsalData.value.operatingHours.closing);

     if (isNaN(openingMinutes) || isNaN(closingMinutes)) {
        return 'Invalid time format selected.'; // Handle potential NaN from parsing
    }

     // Basic check (doesn't handle overnight wrap-around)
    if (closingMinutes <= openingMinutes) {
        return 'Closing time must be after opening time';
    }
    return ''; // No error
});


// --- Methods ---

const fetchProfileData = async () => {
  isLoading.value = true;
  futsalData.value = {
    _id: null, name: '', description: '', locationString: '', images: [],
    operatingHours: defaultOperatingHours(), coordinates: { lat: 27.7172, lng: 85.3240 }
  };
  profileData.value = { firstName: '', lastName: '', email: '', role: '', username: '', contactNumber: '' };
  futsalId.value = null;

  try {
    const response = await axios.get('/api/profile');
    const { user } = response.data;
    if (!user) throw new Error("User data not found.");

    profileData.value = {
      firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '',
      role: user.role === 'futsalAdmin' ? 'Futsal Admin' : user.role || '', username: user.username || '',
      contactNumber: user.contactNumber || ''
    };

    const futsal = user.futsal;
    if (futsal) {
      futsalId.value = futsal._id;
      // --- Adapt fetching for simple operating hours ---
      const fetchedHours = futsal.operatingHours;
      const populatedHours = {
          opening: fetchedHours?.opening || '09:00', // Use optional chaining and defaults
          closing: fetchedHours?.closing || '21:00'
      };

      const fetchedCoords = futsal.coordinates && typeof futsal.coordinates.lat === 'number' && typeof futsal.coordinates.lng === 'number'
        ? { lat: futsal.coordinates.lat, lng: futsal.coordinates.lng } : { lat: 27.7172, lng: 85.3240 };

      futsalData.value = {
        _id: futsal._id, name: futsal.name || user.futsalName || '', description: futsal.description || '',
        locationString: futsal.location || '',
        images: Array.isArray(futsal.images) ? futsal.images : [],
        operatingHours: populatedHours, // Assign simple object
        coordinates: fetchedCoords
      };
    } else {
      futsalId.value = null; futsalData.value.name = user.futsalName || '';
    }
    passwordData.value = { currentPassword: '', newPassword: '', confirmPassword: '' };

    initialProfileData.value = _.cloneDeep(profileData.value);
    initialFutsalData.value = _.cloneDeep(futsalData.value);

  } catch (error) { console.error('Fetch Profile Error:', error); toast.error(`Load failed: ${error.message || 'Unknown error'}`); }
  finally { isLoading.value = false; }
};

const hasDataChanged = () => {
  const profileChanged = !_.isEqual(profileData.value, initialProfileData.value);
  // Remove image comparison
  const { images: currentImages, ...currentFutsalRest } = futsalData.value;
  const { images: initialImages, ...initialFutsalRest } = initialFutsalData.value || {};
  const futsalDetailsChanged = !_.isEqual(currentFutsalRest, initialFutsalRest);

  console.log("Change Check:", { profileChanged, futsalDetailsChanged });
  return profileChanged || futsalDetailsChanged;
};

const saveChanges = async () => {
   if (!hasDataChanged()) { toast.info("No changes were made."); return; }
    // Check operating hours validity before saving
    if (timeErrorMessage.value) {
        toast.error(timeErrorMessage.value);
        return;
    }


  isSaving.value = true;
  try {
    // 1. Update User Profile
    const userUpdatePayload = {
      firstName: profileData.value.firstName, lastName: profileData.value.lastName,
      username: profileData.value.username, email: profileData.value.email,
      contactNumber: profileData.value.contactNumber
    };
    await axios.patch('/api/profile', userUpdatePayload);

    // 2. Update Futsal Profile
    if (futsalId.value) {
       // --- Send plain JSON ---
      const futsalUpdatePayload = {
          name: futsalData.value.name,
          description: futsalData.value.description,
          location: futsalData.value.locationString,
          coordinates: futsalData.value.coordinates,
          operatingHours: futsalData.value.operatingHours, // Send simple object
          // Send existing image paths if you want to allow removal
          images: futsalData.value.images.filter(img => typeof img === 'string' && !img.startsWith('blob:'))
      };

      console.log("Sending Futsal Update (JSON):", futsalUpdatePayload);

      await axios.post('/api/futsal/profile', futsalUpdatePayload, {
           headers: { 'Content-Type': 'application/json' }
      });

    } else { console.warn("No futsal ID found, cannot update futsal details."); }

    toast.success('Profile updated successfully!');
    await fetchProfileData(); // Refresh data and reset initial state

  } catch (error) {
    console.error('Save Changes Error:', error);
    const errorMsg = error.response?.data?.message || 'Failed to save changes.';
    toast.error(errorMsg);
    if (error.response?.data?.errors) { // Handle potential Mongoose validation errors
       Object.values(error.response.data.errors).forEach(err => toast.error(err.message));
    }
  } finally {
    isSaving.value = false;
  }
};

// --- Location/Map Methods ---
const handleMapClick = async ({ lat, lng }) => {
    futsalData.value.coordinates = { lat, lng };
    try { const address = await reverseGeocode(lat, lng); futsalData.value.locationString = address; toast.info("Location updated.", { timeout: 1500 }); }
    catch (error) 
    { console.error("Reverse Geocode Error:", error); futsalData.value.locationString = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`; toast.warning("Could not get address.", { timeout: 2000 }); }
    { futsalData.value.locationString = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`; toast.warning("Could not get address.", { timeout: 2000 }); }
};
const handleLocationSelected = (location) => {
  if (location) {
    const latChanged = Math.abs(futsalData.value.coordinates.lat - location.lat) > 0.0001;
    const lngChanged = Math.abs(futsalData.value.coordinates.lng - location.lng) > 0.0001;
    if (latChanged || lngChanged) futsalData.value.coordinates = { lat: location.lat, lng: location.lng };
    if (futsalData.value.locationString !== location.address) futsalData.value.locationString = location.address;
  }
};

// --- Password Change Method ---
const changePassword = async () => {
  passwordError.value = '';
  if (!passwordData.value.currentPassword) { passwordError.value = 'Current password is required.'; return; }
  if (passwordData.value.newPassword.length < 6) { passwordError.value = 'New password must be at least 6 characters.'; return; }
  if (passwordMismatchError.value) { passwordError.value = passwordMismatchError.value; return; } // Use computed error

  isChangingPassword.value = true;
  try {
    await axios.patch('/api/profile/change-password', {
        currentPassword: passwordData.value.currentPassword,
        newPassword: passwordData.value.newPassword
     });
    passwordData.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
    toast.success('Password changed successfully!');
    // showPasswordModal.value = false; // Remove if not using modal
  } catch (error) {
      console.error('Password Change Error:', error);
      passwordError.value = error.response?.data?.message || 'Failed to change password.';
  } finally { isChangingPassword.value = false; }
};

// --- Lifecycle Hooks ---
onMounted(() => { fetchProfileData(); });
// onBeforeUnmount is not needed for image cleanup anymore

// --- Discard Changes ---
const discardChanges = () => {
  if (!hasDataChanged()) { toast.info("No changes to discard."); return; }
  if (window.confirm("Discard all unsaved changes?")) {
    // No blob URLs to clean up
    fetchProfileData(); // Re-fetch original data & resets initial state
    toast.info('Changes discarded');
  }
};

// --- Reverse Geocode ---
const reverseGeocode = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  try {
    const response = await axios.get(url, { headers: { 'Accept-Language': 'en' } });
    return response.data?.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
  } catch (error) {
    console.error("Nominatim API error:", error.response?.data || error.message);
    throw new Error("Failed to fetch address from Nominatim");
  }
};

</script>

<style scoped>
/* Styles remain the same */
.section-card { @apply bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-lg overflow-hidden mb-8; }
.section-title { @apply text-xl font-semibold text-white px-6 py-4 border-b border-gray-700/50 flex items-center bg-gray-800/40; }
.section-content { @apply p-6; }
.input-label { @apply block text-sm font-medium text-gray-300 mb-1.5; }
.input-wrapper { @apply relative; }
.input-field { @apply w-full bg-gray-700/80 text-white border border-gray-600/80 rounded-lg px-4 py-2.5 text-sm shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-150; }
.input-icon { @apply absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none; }
.input-hint { @apply text-xs text-gray-500 mt-1.5; }
.input-field.pl-10 { padding-left: 2.75rem; }
input:read-only, textarea:read-only { @apply bg-gray-700/50 opacity-70 cursor-not-allowed focus:ring-0 focus:border-gray-600/80; }
input:disabled { @apply bg-gray-700/60 opacity-60 cursor-not-allowed; }
.action-button { @apply px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ease-in-out shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 outline-none font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 active:shadow-inner; }
.action-button.primary { @apply bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white focus-visible:ring-emerald-400; }
.action-button.secondary { @apply bg-gray-600 hover:bg-gray-500 text-white focus-visible:ring-gray-400; }
.action-button.danger { @apply bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white focus-visible:ring-red-400; }
#map { position: relative; z-index: 0; }
.spinner-xs { @apply inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-current; }
.leaflet-container { height: 100%; width: 100%; z-index: 0; }
/* Toggle Switch Styles REMOVED */
.input-error-msg { @apply mt-1 text-xs text-red-400; }
</style>
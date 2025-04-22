<template>
  <PageLayout>
  <div class="p-8">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-white">Manage Existing Courts</h1>
      <button
        @click="showAddCourtModal = true"
        class="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg
                      flex items-center gap-2 transition-colors duration-200"
      >
        <PlusIcon class="w-5 h-5" />
        Add Court
      </button>
    </div>
  </div>

  <div class="flex items-center gap-4 px-8">
    <span class="text-gray-400 text-sm">Require Prepayment</span>
    <button
      type="button"
      @click="togglePrepayment"
      :class="{
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200': true,
        'bg-green-500': requirePrepayment,
        'bg-gray-600': !requirePrepayment
      }"
    >
      <span
        :class="{
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform': true,
          'translate-x-6': requirePrepayment,
          'translate-x-1': !requirePrepayment
        }"
      />
    </button>
  </div>

  <div class="p-8 pt-4">
    <LoadingState 
      v-if="loading" 
       message="Loading courts..."
      />
    <EmptyState v-else-if="!loading && courts.length === 0" message="No courts added yet. Click 'Add Court' to get started." />

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <CourtCard
        v-for="court in courts"
        :key="court._id"
        :court="court"
        @edit="editCourt"
        @delete="deleteCourt"
      />
    </div>
  </div>

  <BaseModal v-if="showAddCourtModal" @close="closeModal">
    <template #header>
      <h3 class="text-xl font-semibold text-white">
        {{ editingCourt ? 'Edit Court' : 'Add New Court' }}
      </h3>
    </template>

    <template #body>
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Court Name</label>
            <input
              v-model="courtForm.name"
              type="text"
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            >
            <p v-if="formErrors.name" class="text-xs text-red-400 mt-1">
              {{ formErrors.name }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Court Type</label>
             <select
               v-model="courtForm.courtType"
               class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
               required
             >
               <option value="Indoor">Indoor</option>
               <option value="Outdoor">Outdoor</option>
             </select>
             <p v-if="formErrors.courtType" class="text-xs text-red-400 mt-1">
               {{ formErrors.courtType }}
             </p>
           </div>
        </div>

         <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
             <label class="block text-sm font-medium text-gray-400 mb-1">Surface Type</label>
             <select
               v-model="courtForm.surfaceType"
               class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
               required
             >
               <option value="">Select Surface Type</option>
               <option value="Synthetic Turf">Synthetic Turf</option>
               <option value="Wooden Flooring">Wooden Flooring</option>
               <option value="Concrete">Concrete</option>
               <option value="Rubber Flooring">Rubber Flooring</option>
               <option value="Gripper Tiles">Gripper Tiles</option>
             </select>
             <p v-if="formErrors.surfaceType" class="text-xs text-red-400 mt-1">
               {{ formErrors.surfaceType }}
             </p>
           </div>

           <div>
             <label class="block text-sm font-medium text-gray-400 mb-1">Dimensions (Length x Width)</label>
             <div class="flex items-center gap-2">
               <input
                 v-model.number="courtForm.dimensionLength"
                 type="number"
                 min="1"
                 placeholder="Length"
                 class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                 required
               >
               <span class="text-gray-400">x</span>
               <input
                 v-model.number="courtForm.dimensionWidth"
                 type="number"
                 min="1"
                 placeholder="Width"
                 class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                 required
               >
               <span class="text-gray-400">ft</span>
             </div>
             <p v-if="formErrors.dimensionLength || formErrors.dimensionWidth" class="text-xs text-red-400 mt-1">
               {{ formErrors.dimensionLength || formErrors.dimensionWidth }} 
             </p>
           </div>
         </div>

        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Regular Price</label>
              <input
                v-model="courtForm.priceHourly"
                type="number"
                min="0"
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                required
              >
              <p v-if="formErrors.priceHourly" class="text-xs text-red-400 mt-1">
                {{ formErrors.priceHourly }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Court Side</label>
              <select
                v-model="courtForm.courtSide"
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                required
              >
                <option value="5A">5A Side</option>
                <option value="7A">7A Side</option>
              </select>
              <p v-if="formErrors.courtSide" class="text-xs text-red-400 mt-1">
                {{ formErrors.courtSide }}
              </p>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-400">Enable Peak Hours</label>
              <button
                type="button"
                @click="courtForm.hasPeakHours = !courtForm.hasPeakHours"
                :class="{
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200': true,
                  'bg-green-500': courtForm.hasPeakHours,
                  'bg-gray-600': !courtForm.hasPeakHours
                }"
              >
                <span
                  :class="{
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform': true,
                    'translate-x-6': courtForm.hasPeakHours,
                    'translate-x-1': !courtForm.hasPeakHours
                  }"
                />
              </button>
            </div>

            <div v-if="courtForm.hasPeakHours" class="space-y-3">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-400 mb-1">Start Time</label>
                  <input
                    v-model="courtForm.peakHours.start"
                    type="time"
                    class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    @input="validateTimes"
                    required
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-400 mb-1">End Time</label>
                  <input
                    v-model="courtForm.peakHours.end"
                    type="time"
                    class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    @input="validateTimes"
                    required
                  >
                </div>
              </div>
              <p v-if="formErrors.peakHours" class="text-xs text-red-400 mt-1">
                {{ formErrors.peakHours }}
              </p>

              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Peak Hour Price</label>
                <input
                  v-model="courtForm.pricePeakHours"
                  type="number"
                  min="0"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  @input="validatePrices"
                  required
                >
                <p v-if="formErrors.pricePeakHours" class="text-xs text-red-400 mt-1">
                  {{ formErrors.pricePeakHours }}
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-400">Enable Off-Peak Hours</label>
              <button
                type="button"
                @click="courtForm.hasOffPeakHours = !courtForm.hasOffPeakHours"
                :class="{
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200': true,
                  'bg-green-500': courtForm.hasOffPeakHours,
                  'bg-gray-600': !courtForm.hasOffPeakHours
                }"
              >
                <span
                  :class="{
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform': true,
                    'translate-x-6': courtForm.hasOffPeakHours,
                    'translate-x-1': !courtForm.hasOffPeakHours
                  }"
                />
              </button>
            </div>

            <div v-if="courtForm.hasOffPeakHours" class="space-y-3">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-400 mb-1">Start Time</label>
                  <input
                    v-model="courtForm.offPeakHours.start"
                    type="time"
                    class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    @input="validateTimes"
                    required
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-400 mb-1">End Time</label>
                  <input
                    v-model="courtForm.offPeakHours.end"
                    type="time"
                    class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    @input="validateTimes"
                    required
                  >
                </div>
              </div>
              <p v-if="formErrors.offPeakHours" class="text-xs text-red-400 mt-1">
                {{ formErrors.offPeakHours }}
              </p>

              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Off-Peak Hour Price</label>
                <input
                  v-model="courtForm.priceOffPeakHours"
                  type="number"
                  min="0"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  @input="validatePrices"
                  required
                >
                <p v-if="formErrors.priceOffPeakHours" class="text-xs text-red-400 mt-1">
                  {{ formErrors.priceOffPeakHours }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <label class="block text-sm font-medium text-gray-400 mb-2">Facilities</label>
          <div class="grid grid-cols-2 gap-4">
            <label class="flex items-center space-x-2">
              <input
                type="checkbox"
                v-model="courtForm.facilities.changingRooms"
                class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500"
              >
              <span class="text-gray-400">Changing Rooms</span>
            </label>

            <label class="flex items-center space-x-2">
              <input
                type="checkbox"
                v-model="courtForm.facilities.lighting"
                class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500">
              <span class="text-gray-400">Lighting</span>
            </label>

            <label class="flex items-center space-x-2">
              <input
                type="checkbox"
                v-model="courtForm.facilities.parking"
                class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500"
              >
              <span class="text-gray-400">Parking</span>
            </label>

            <label class="flex items-center space-x-2">
              <input
                type="checkbox"
                v-model="courtForm.facilities.shower"
                class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500"
              >
              <span class="text-gray-400">Shower</span>
            </label>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1">Status</label>
          <select
            v-model="courtForm.status"
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            required
          >
            <option value="Active">Active</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inactive">Inactive</option>
          </select>
          <p v-if="formErrors.status" class="text-xs text-red-400 mt-1">
            {{ formErrors.status }}
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-400 mb-2">Court Images</label>
          <div
            class="border-2 border-dashed border-gray-600 rounded-lg p-4 hover:border-green-500
                          transition-colors duration-200 cursor-pointer"
            @dragover.prevent
            @drop.prevent="handleImageDrop"
            @click="$refs.fileInput.click()"
          >
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              multiple
              class="hidden"
              @change="handleImageSelect"
            >
            <div class="text-center">
              <ImageIcon class="w-12 h-12 mx-auto text-gray-400" />
              <p class="mt-2 text-sm text-gray-400">
                Drag and drop images here, or click to select files
              </p>
              <p class="mt-1 text-xs text-gray-500">
                Supported formats: JPG, PNG (Max 5 images)
              </p>
            </div>
          </div>

          <div v-if="selectedImages.length > 0" class="mt-4 grid grid-cols-4 gap-4">
            <div
              v-for="(image, index) in imagePreviewUrls"
              :key="index"
              class="relative group"
            >
              <img
                :src="image"
                class="w-full h-24 object-cover rounded-lg"
                alt="Court preview"
              >
              <button
                @click="removeImage(index)"
                class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1
                          opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <XIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </form>
      
    </template>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <button
          @click="showAddCourtModal = false"
          class="px-4 py-2 text-gray-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          @click="handleSubmit"
          :disabled="isSubmitting"
          class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600
                          disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Loader2Icon v-if="isSubmitting" class="animate-spin w-4 h-4" />
          {{ editingCourt ? 'Save Changes' : 'Add Court' }}
        </button>
      </div>
    </template>
  </BaseModal>
</PageLayout>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import CourtCard from '@/components/CourtCard.vue'
import BaseModal from '@/components/BaseModal.vue'
import LoadingState from '@/components/states/LoadingState.vue'
import EmptyState from '@/components/states/EmptyState.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import { useToast } from 'vue-toastification'
import {
  PlusIcon, ImageIcon, XIcon, Loader2Icon
} from 'lucide-vue-next'
import API_URL from '@/config/api'

const toast = useToast()

const imagePreviewUrls = computed(() => {
  return selectedImages.value.map(image => {
    if (typeof image === 'string') return image
    return URL.createObjectURL(image)
  })
})


const requirePrepayment = ref(false);

const togglePrepayment = async () => {
  try {
    const newValue = !requirePrepayment.value;
    requirePrepayment.value = newValue;

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/courts/prepayment`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requirePrepayment: newValue
      })
    });

    if (!response.ok) {
      requirePrepayment.value = !newValue;
      throw new Error('Failed to update prepayment setting');
    }
    courts.value = courts.value.map(court => ({
      ...court,
      requirePrepayment: newValue
    }));

  } catch (error) {
    console.error('Error toggling prepayment:', error);
  }
};


const formErrors = ref({
  peakHours: '',
  offPeakHours: '',
  pricePeakHours: '',
  priceOffPeakHours: '',
  name: '',
  dimensions: '',
  surfaceType: '',
  courtType: '',
  priceHourly: '',
  status: ''
})

// Time validation functions - Extracted to a separate composable/util if needed for reuse
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const validateTimeRange = (start, end) => {
  if (!start || !end) return true
  return timeToMinutes(start) < timeToMinutes(end)
}

const validateTimeOverlap = (time1Start, time1End, time2Start, time2End) => {
  if (!time1Start || !time1End || !time2Start || !time2End) return true
  const t1s = timeToMinutes(time1Start)
  const t1e = timeToMinutes(time1End)
  const t2s = timeToMinutes(time2Start)
  const t2e = timeToMinutes(time2End)
  return t1e <= t2s || t2e <= t1s
}

const validatePrices = () => {
  formErrors.value.pricePeakHours = ''
  formErrors.value.priceOffPeakHours = ''

  if (Number(courtForm.value.pricePeakHours) < 0) {
    formErrors.value.pricePeakHours = 'Price cannot be negative'
  }

  if (Number(courtForm.value.priceOffPeakHours) < 0) {
    formErrors.value.priceOffPeakHours = 'Price cannot be negative'
  }
}

const validateTimes = () => {
  formErrors.value.peakHours = ''
  formErrors.value.offPeakHours = ''

  if (courtForm.value.hasPeakHours) {
    const { start, end } = courtForm.value.peakHours
    if (start && end && !validateTimeRange(start, end)) {
      formErrors.value.peakHours = 'End time must be after start time'
    }
  }

  if (courtForm.value.hasOffPeakHours) {
    const { start, end } = courtForm.value.offPeakHours
    if (start && end && !validateTimeRange(start, end)) {
      formErrors.value.offPeakHours = 'End time must be after start time'
    }
  }

  if (courtForm.value.hasPeakHours && courtForm.value.hasOffPeakHours) {
    const { start: ps, end: pe } = courtForm.value.peakHours
    const { start: os, end: oe } = courtForm.value.offPeakHours

    if (ps && pe && os && oe && !validateTimeOverlap(ps, pe, os, oe)) {
      formErrors.value.offPeakHours = 'Time periods cannot overlap with peak hours'
    }
  }
}


const validateForm = () => {
  formErrors.value = {};
  let isValid = true;

  if (!courtForm.value.name?.trim()) {
    formErrors.value.name = 'Court name is required.';
    isValid = false;
  }

  if (!courtForm.value.dimensionLength || courtForm.value.dimensionLength <= 0) {
     formErrors.value.dimensionLength = 'Valid court length is required.'; 
     isValid = false;
  }
  if (!courtForm.value.dimensionWidth || courtForm.value.dimensionWidth <= 0) {
    formErrors.value.dimensionWidth = 'Valid court width is required.';
    isValid = false;
  }

  if (!courtForm.value.surfaceType) {
    formErrors.value.surfaceType = 'Surface type is required.';
    isValid = false;
  }
  
  if (!courtForm.value.courtType) {
    formErrors.value.courtType = 'Court type is required.';
    isValid = false;
  }
  
  if (!courtForm.value.courtSide) {
    formErrors.value.courtSide = 'Court side is required.';
    isValid = false;
  }

  if (courtForm.value.priceHourly === null || courtForm.value.priceHourly < 0) {
    formErrors.value.priceHourly = 'Valid regular price is required.';
    isValid = false;
  }

  if (!courtForm.value.status) {
    formErrors.value.status = 'Status is required.';
    isValid = false;
  }

  validateTimes();
  validatePrices();
  if (formErrors.value.peakHours || formErrors.value.offPeakHours || formErrors.value.pricePeakHours || formErrors.value.priceOffPeakHours) {
    isValid = false;
  }

  if (courtForm.value.hasPeakHours) {
    if (!courtForm.value.peakHours.start || !courtForm.value.peakHours.end) {
      formErrors.value.peakHours = 'Peak hours time range is required when enabled';
      isValid = false;
    }
    if (courtForm.value.pricePeakHours === null || courtForm.value.pricePeakHours < 0) {
      formErrors.value.pricePeakHours = 'Valid peak hours price is required when enabled';
      isValid = false;
    }
  }
   
  if (courtForm.value.hasOffPeakHours) {
    if (!courtForm.value.offPeakHours.start || !courtForm.value.offPeakHours.end) {
      formErrors.value.offPeakHours = 'Off-peak hours time range is required when enabled';
      isValid = false;
    }
    if (courtForm.value.priceOffPeakHours === null || courtForm.value.priceOffPeakHours < 0) {
      formErrors.value.priceOffPeakHours = 'Valid off-peak hours price is required when enabled';
      isValid = false;
    }
  }

  return isValid;
};


// Clean up object URLs when component is unmounted
onBeforeUnmount(() => {
  imagePreviewUrls.value.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  })
})

const courts = ref([])
const loading = ref(false)
const showAddCourtModal = ref(false)
const editingCourt = ref(null)
const isSubmitting = ref(false)
const selectedImages = ref([])
const fileInput = ref(null)

const initialCourtForm = () => ({
  name: '',
  dimensionLength: null,
  dimensionWidth: null,
  surfaceType: '',
  courtType: 'Indoor',
  courtSide: '5A',
  priceHourly: null,
  hasPeakHours: false,
  peakHours: { start: '', end: '' },
  pricePeakHours: null,
  hasOffPeakHours: false,
  offPeakHours: { start: '', end: '' },
  priceOffPeakHours: null,
  facilities: {
    changingRooms: false,
    lighting: false,
    parking: false,
    shower: false
  },
  status: 'Active'
})

const courtForm = ref(initialCourtForm())

const closeModal = () => {
  showAddCourtModal.value = false;
  editingCourt.value = null;
  courtForm.value = initialCourtForm();
  selectedImages.value = [];
  formErrors.value = {};
}

onMounted(async () => {
  await fetchCourts()
})

const fetchCourts = async () => {
    loading.value = true;
    try {
        const token = localStorage.getItem('token');
        
        // First try to fetch courts
        const courtsResponse = await fetch(`${API_URL}/courts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!courtsResponse.ok) {
            throw new Error('Failed to fetch courts');
        }

        courts.value = await courtsResponse.json();
        
        // Then try to fetch settings
        try {
            const settingsResponse = await fetch(`${API_URL}/courts/settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (settingsResponse.ok) {
                const settingsData = await settingsResponse.json();
                requirePrepayment.value = settingsData.requirePrepayment;
            }
        } catch (settingsError) {
            console.warn('Error fetching settings:', settingsError);
            // Don't throw error for settings - just log warning
        }

    } catch (error) {
        console.error('Error fetching courts:', error);
    } finally {
        loading.value = false;
    }
};

const handleImageSelect = (event) => handleImageFiles(Array.from(event.target.files));
const handleImageDrop = (event) => {
  event.preventDefault();
  handleImageFiles(Array.from(event.dataTransfer.files));
};

const handleImageFiles = (files) => {
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  if (selectedImages.value.length + imageFiles.length > 5) {
    alert('Maximum 5 images allowed');
    return;
  }
  selectedImages.value.push(...imageFiles);
};

const removeImage = (index) => selectedImages.value.splice(index, 1);

const editCourt = (court) => {
  editingCourt.value = { ...court };
  
  let length = null;
  let width = null;
  if (court.dimensionLength && court.dimensionWidth) {
      length = court.dimensionLength;
      width = court.dimensionWidth;
  } else if (court.dimensions && typeof court.dimensions === 'string') {
     const parts = court.dimensions.toLowerCase().replace('ft', '').trim().split('x');
     if (parts.length === 2) {
       length = parseInt(parts[0], 10);
       width = parseInt(parts[1], 10);
     }
  }

  courtForm.value = {
    name: court.name || '',
    dimensionLength: !isNaN(length) ? length : null,
    dimensionWidth: !isNaN(width) ? width : null,
    surfaceType: court.surfaceType || '',
    courtType: court.courtType || 'Indoor',
    courtSide: court.courtSide || '5A',
    priceHourly: court.priceHourly ?? null,
    hasPeakHours: !!(court.peakHours && court.peakHours.start && court.peakHours.end),
    peakHours: {
      start: court.peakHours?.start || '',
      end: court.peakHours?.end || ''
    },
    pricePeakHours: court.pricePeakHours ?? null,
    hasOffPeakHours: !!(court.offPeakHours && court.offPeakHours.start && court.offPeakHours.end),
    offPeakHours: {
      start: court.offPeakHours?.start || '',
      end: court.offPeakHours?.end || ''
    },
    priceOffPeakHours: court.priceOffPeakHours ?? null,
    facilities: {
        changingRooms: court.facilities?.changingRooms || false,
        lighting: court.facilities?.lighting || false,
        parking: court.facilities?.parking || false,
        shower: court.facilities?.shower || false
      },
    status: court.status || 'Active'
  };
  selectedImages.value = court.images ? [...court.images] : [];
  showAddCourtModal.value = true;
};

const deleteCourt = async (courtId) => {
  if (!confirm('Are you sure you want to delete this court?')) return;
  try {
    const response = await fetch(`${API_URL}/courts/${courtId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Failed to delete court');
    await fetchCourts();
  } catch (error) {
    console.error('Error deleting court:', error);
  }
};

const handleSubmit = async () => {
  if (!validateForm()) {
    toast.error('Please fix the errors in the form.');
    return;
  }

  isSubmitting.value = true;
  const formData = new FormData();

  // Add a calculated dimensions field to satisfy backend validation
  if (courtForm.value.dimensionLength && courtForm.value.dimensionWidth) {
    formData.append('dimensions', `${courtForm.value.dimensionLength} x ${courtForm.value.dimensionWidth} ft`);
  }

  Object.keys(courtForm.value).forEach(key => {
    if (key !== 'hasPeakHours' && key !== 'hasOffPeakHours') { 
      const value = courtForm.value[key];
      
      if (key === 'peakHours' || key === 'offPeakHours') {
        if (courtForm.value[key === 'peakHours' ? 'hasPeakHours' : 'hasOffPeakHours']) {
           Object.keys(value).forEach(subKey => {
             if (value[subKey] !== null && value[subKey] !== undefined && value[subKey] !== '') {
               formData.append(`${key}[${subKey}]`, value[subKey]);
             }
           });
         }
      } else if (key === 'facilities') {
         Object.keys(value).forEach(subKey => {
            formData.append(`${key}[${subKey}]`, value[subKey]);
         });
      } else if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    }
  });
   
  formData.append('hasPeakHours', courtForm.value.hasPeakHours);
  formData.append('hasOffPeakHours', courtForm.value.hasOffPeakHours);

  const existingImageUrls = [];
  selectedImages.value.forEach(image => {
    if (image instanceof File) {
      formData.append('images', image);
    } else if (typeof image === 'string') {
      existingImageUrls.push(image);
    }
  });

  console.log('Form Data to be sent:');
  for (let [key, value] of formData.entries()) {
    if (value instanceof File) {
        console.log(`${key}: ${value.name} (File)`);
    } else {
        console.log(`${key}: ${value}`);
    }
  }

  try {
    let response;
    const token = localStorage.getItem('token');
    const headers = { 
        'Authorization': `Bearer ${token}`
    };

    if (editingCourt.value) {
      response = await fetch(`${API_URL}/courts/${editingCourt.value._id}`, {
        method: 'PUT',
        headers: headers,
        body: formData
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Court updated successfully!');
      
    } else {
      response = await fetch(`${API_URL}/courts`, {
        method: 'POST',
        headers: headers,
        body: formData
      });
       if (!response.ok) throw new Error(await response.text());
       toast.success('Court added successfully!');
    }
    
    if (!response.ok) {
         const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
         throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    await fetchCourts();
    closeModal();
  } catch (error) {
    console.error('Error submitting court:', error);
    let errorMessage = 'Failed to save court. Please try again.';
    try {
        const errorJson = JSON.parse(error.message || '{}'); 
        if (errorJson.message) errorMessage = errorJson.message;
        if (errorJson.details?.errors) {
            Object.keys(errorJson.details.errors).forEach(key => {
                formErrors.value[key] = errorJson.details.errors[key].message;
            });
            errorMessage = 'Please check the form for errors.';
        }
    } catch /* istanbul ignore next */ {
        if (typeof error.message === 'string') errorMessage = error.message;
    }
    
    toast.error(errorMessage);
  } finally {
    isSubmitting.value = false;
  }
};
</script>
// src/components/ImageUpload.vue
<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-white mb-2">{{ label }}</label>
    <div
      :class="[
        'border-2 border-dashed rounded-lg p-4 hover:border-green-500 transition-colors duration-200 cursor-pointer',
        variantClasses,
        error && 'border-red-500 hover:border-red-500'
      ]"
      @dragover.prevent
      @drop.prevent="handleDrop"
      @click="$refs.fileInput.click()"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        :multiple="multiple"
        class="hidden"
        @change="handleFileChange"
      >
      <div class="text-center">
        <ImageIcon :class="['w-12 h-12 mx-auto', iconTextColorClass]" />
        <p :class="['mt-2 text-sm', placeholderTextColorClass]">
          {{ placeholder || 'Drag and drop images here, or click to select files' }}
        </p>
        <p :class="['mt-1 text-xs', subTextColorClass]">
          Supported formats: {{ acceptedFormats }} (Max {{ maxFiles }} {{ maxFiles === 1 ? 'file' : 'files' }})
        </p>
      </div>
    </div>

    <div v-if="modelValue.length > 0" class="mt-4 grid grid-cols-4 gap-4">
      <div
        v-for="(file, index) in previewUrls"
        :key="index"
        class="relative group cursor-pointer"
        @click="showImagePreview(getPreviewUrl(file))"
      >
        <img
          :src="getPreviewUrl(file)"
          class="w-full h-24 object-cover rounded-lg"
          :alt="`Preview ${index + 1}`"
        >
        <button
          @click.stop="removeFile(index)"
          class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1
                 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <XIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <p v-if="props.error" class="mt-2 text-sm text-red-400">{{ props.error }}</p>

    <div v-if="showPreview" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" @click="closeImagePreview">
      <div class="relative bg-gray-800 rounded-lg p-6 max-w-4xl max-h-full overflow-auto">
        <img :src="previewImageUrl" alt="Full Preview" class="rounded-lg max-w-full max-h-[80vh] block mx-auto">
        <button @click.stop="closeImagePreview" class="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full p-2"> <XIcon class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { ImageIcon, XIcon } from 'lucide-vue-next'
import { getAssetUrl } from '@/config/api'

const props = defineProps({
  modelValue: {
    type: Array,
    required: true
  },
  label: {
    type: String,
    default: 'Upload Images'
  },
  accept: {
    type: String,
    default: 'image/*'
  },
  multiple: {
    type: Boolean,
    default: true
  },
  maxFiles: {
    type: Number,
    default: 5
  },
  maxSize: {
    type: Number,
    default: 5 * 1024 * 1024 // 5MB
  },
  placeholder: String,
  acceptedFormats: {
    type: String,
    default: 'JPG, PNG'
  },
  variant: { // New variant prop
    type: String,
    default: 'default',
    validator: value => ['default', 'glass'].includes(value)
  },
  error: String // Prop for parent error
})

const emit = defineEmits(['update:modelValue', 'error'])

const fileInput = ref(null)
const filePreviewMap = ref(new Map()) // Store file preview URLs

// Modified previewUrls computed property
const previewUrls = computed(() => {
  return props.modelValue
})

// Function to get preview URL for a file
const getPreviewUrl = (file) => {
  if (typeof file === 'string') {
    // If it's a string, assume it's a URL path from the server
    return getAssetUrl(file);
  }

  // For File objects, create object URL
  if (!filePreviewMap.value.has(file)) {
    const url = URL.createObjectURL(file);
    filePreviewMap.value.set(file, url);
  }
  return filePreviewMap.value.get(file);
};

// Modified showImagePreview function
const showImagePreview = (url) => {
  previewImageUrl.value = url
  showPreview.value = true
}

// Function to clean up URLs
const cleanupUrls = () => {
  filePreviewMap.value.forEach(url => {
    URL.revokeObjectURL(url)
  })
  filePreviewMap.value.clear()
}

// Cleanup when component is unmounted
onBeforeUnmount(() => {
  cleanupUrls()
})

// Modified watch for modelValue
watch(() => props.modelValue, (newFiles, oldFiles) => {
  // Cleanup old URLs that are no longer needed
  if (oldFiles) {
    oldFiles.forEach(oldFile => {
      if (!newFiles.includes(oldFile) && filePreviewMap.value.has(oldFile)) {
        URL.revokeObjectURL(filePreviewMap.value.get(oldFile))
        filePreviewMap.value.delete(oldFile)
      }
    })
  }
}, { deep: true })

const validateFile = (file) => {
  if (file.size > props.maxSize) {
    emit('error', `File size should not exceed ${props.maxSize / (1024 * 1024)}MB`)
    return false
  }

  if (!file.type.startsWith('image/')) {
    emit('error', 'Only image files are allowed')
    return false
  }

  return true
}

const handleFileChange = (event) => {
  handleFiles(Array.from(event.target.files))
  event.target.value = '' // Reset input
}

const handleDrop = (event) => {
  handleFiles(Array.from(event.dataTransfer.files))
}

const handleFiles = (files) => {
  if (props.modelValue.length + files.length > props.maxFiles) {
    emit('error', `Maximum ${props.maxFiles} files allowed`)
    return
  }

  const validFiles = files.filter(validateFile)
  if (validFiles.length) {
    // Create preview URLs for new files
    validFiles.forEach(file => {
      if (!filePreviewMap.value.has(file)) {
        filePreviewMap.value.set(file, URL.createObjectURL(file))
      }
    })
    emit('update:modelValue', [...props.modelValue, ...validFiles])
  }
}

const removeFile = (index) => {
  const fileToRemove = props.modelValue[index]
  if (filePreviewMap.value.has(fileToRemove)) {
    URL.revokeObjectURL(filePreviewMap.value.get(fileToRemove))
    filePreviewMap.value.delete(fileToRemove)
  }

  const newFiles = [...props.modelValue]
  newFiles.splice(index, 1)
  emit('update:modelValue', newFiles)
}

// Cleanup preview URLs - this watch is likely redundant now with onBeforeUnmount and other cleanup
/* watch(() => props.modelValue, () => {
  previewUrls.value?.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  })
}, { deep: true }) */

const variantClasses = computed(() => {
  if (props.variant === 'glass') {
    return 'bg-white/10 border border-green-400/30 hover:border-green-400 focus:ring-1 focus:ring-green-400 backdrop-blur-lg';
  }
  return 'border-gray-600';
});

const iconTextColorClass = computed(() => {
  return props.variant === 'glass' ? 'text-white' : 'text-gray-400';
});

const placeholderTextColorClass = computed(() => {
  return props.variant === 'glass' ? 'text-white' : 'text-gray-400';
});

const subTextColorClass = computed(() => {  // New computed property for "Supported formats" text
  return props.variant === 'glass' ? 'text-white' : 'text-gray-500';
});

const previewImageUrl = ref(null);
const showPreview = ref(false);
const closeImagePreview = () => {
  showPreview.value = false;
  previewImageUrl.value = null; // Clear the URL when closing
};
</script>
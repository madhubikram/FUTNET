<template>
  <div class="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 transition-all duration-300
             hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:border-green-500/50 group">
    <div class="relative aspect-[16/9] overflow-hidden">
      <img
        :src="imageSrc"
        :alt="imageAlt"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      >
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

      <span :class="[
        'absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm flex items-center gap-1 transition-transform duration-300 hover:scale-105',
        statusColorClass
      ]">
        <span class="w-2 h-2 rounded-full" :class="statusDotClass"></span>
        {{ status }}
      </span>

      <div v-if="showAdminControls"
       class="absolute top-4 left-4 flex gap-2">
        <button
          v-if="showEditButton"
          @click.stop="$emit('edit-item')"
          class="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg
                  backdrop-blur-sm transition-all duration-200 hover:scale-105"
          :title="'Edit ' + itemType"
        >
          <EditIcon class="w-4 h-4" />
        </button>
        <button
          @click.stop="$emit('delete-item')"
          class="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg
                  backdrop-blur-sm transition-all duration-200 hover:scale-105"
          :title="'Delete ' + itemType"
        >
          <Trash2Icon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="p-6">
      <h3 class="text-xl font-semibold text-white mb-4 group-hover:text-green-400 transition-colors duration-300">
        {{ title }}
      </h3>

      <slot name="pricing" v-if="$slots.pricing"></slot>
      <slot name="tournament-details" v-if="$slots['tournament-details']"></slot>

      <div class="mt-6 flex gap-3">
        <button
          @click.stop="$emit('view-details')"
          class="flex-1 px-4 py-3 bg-green-500/10 text-green-400 rounded-lg
                  hover:bg-green-500/20 transition-all duration-300 flex items-center justify-center gap-2
                  hover:scale-[1.02] active:scale-[0.98]"
        >
          <InfoIcon class="w-4 h-4" />
          {{ detailsButtonText }}
        </button>
        <button
          v-if="showAdminControls" 
          @click.stop="$emit('view-bracket')"
          class="flex-1 px-4 py-3 bg-purple-500/10 text-purple-400 rounded-lg
                  hover:bg-purple-500/20 transition-all duration-300 flex items-center justify-center gap-2
                  hover:scale-[1.02] active:scale-[0.98]"
          :title="'View Bracket'"
        >
          <ProjectorIcon class="w-4 h-4" />
          View Bracket
        </button>
        <button
          v-if="showViewTeamsButton" 
          @click.stop="$emit('view-teams')"
          class="flex-1 px-4 py-3 bg-blue-500/10 text-blue-400 rounded-lg
                  hover:bg-blue-500/20 transition-all duration-300 flex items-center justify-center gap-2
                  hover:scale-[1.02] active:scale-[0.98]"
          :title="'View Teams'"
        >
          <UsersIcon class="w-4 h-4" />
          View Teams
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { InfoIcon, EditIcon, Trash2Icon, ProjectorIcon, UsersIcon } from 'lucide-vue-next'

defineProps({
  itemType: {
    type: String,
    required: true,
    default: 'Item'
  },
  imageSrc: {
    type: String,
    required: true
  },
  imageAlt: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  showAdminControls: {
    type: Boolean,
    default: false
  },
  showEditButton: {
    type: Boolean,
    default: true
  },
  detailsButtonText: {
    type: String,
    default: 'View Details'
  },
  statusColorClass: {
    type: String,
    required: true
  },
  statusDotClass: {
    type: String,
    required: true
  },
  showViewTeamsButton: {
    type: Boolean,
    default: false
  }
})

defineEmits(['edit-item', 'delete-item', 'view-details', 'view-bracket', 'view-teams'])
</script>

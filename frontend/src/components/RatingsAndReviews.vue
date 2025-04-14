<template>
    <div class="space-y-8">
      <!-- Enhanced Overall Rating Section -->
      <div class="bg-gray-800 rounded-xl p-8 border border-gray-700/50">
        <div class="flex items-center gap-8">
          <!-- Main Rating Display -->
          <div class="text-center">
            <div class="text-6xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              {{ averageRating }}
            </div>
            <div class="text-sm text-gray-400 mt-2">Average Rating</div>
            <div class="flex items-center justify-center mt-2">
              <StarIcon v-for="i in 5" :key="i"
                       :class="[
                         'w-5 h-5',
                         i <= Math.round(Number(averageRating))
                           ? 'text-yellow-400'
                           : 'text-gray-600'
                       ]"
              />
            </div>
          </div>
  
          <!-- Rating Distribution -->
          <div class="flex-grow">
            <div v-for="n in 5" :key="n" class="flex items-center gap-3 mb-2">
              <span class="text-sm text-gray-400 w-12">{{ 6 - n }} stars</span>
              <div class="flex-grow h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-yellow-400/80"
                  :style="{ width: `${getRatingPercentage(6 - n)}%` }"
                ></div>
              </div>
              <span class="text-sm text-gray-400 w-12">{{ getRatingCount(6 - n) }}</span>
            </div>
          </div>
        </div>
      </div>
  
      <!-- Reviews List with Enhanced Design -->
      <div class="space-y-6">
        <div 
          v-for="review in reviews" 
          :key="review._id"
          class="bg-gray-800 rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 
                 transition-all duration-300 hover:shadow-lg hover:shadow-black/20"
        >
          <div class="flex justify-between items-start mb-4">
            <div>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <UserIcon class="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div class="text-white font-medium">
                    {{ review.user?.firstName ? `${review.user.firstName} ${review.user.lastName}` : (review.user?.username || 'Anonymous') }}
                  </div>
                  <div class="flex items-center gap-1 mt-1">
                    <StarIcon 
                      v-for="i in 5" 
                      :key="i"
                      :class="[
                        'w-4 h-4',
                        i <= review.rating ? 'text-yellow-400' : 'text-gray-600'
                      ]"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div class="text-sm text-gray-400 flex items-center gap-2">
              <CalendarIcon class="w-4 h-4" />
              {{ formatDate(review.createdAt) }}
            </div>
          </div>
          <p class="text-gray-300 pl-13 mb-4">{{ review.comment }}</p>
          
          <!-- Display Replies -->
           <div v-if="review.replies && review.replies.length > 0" class="pl-13 mt-4 space-y-3">
             <div 
                v-for="reply in review.replies" 
                :key="reply._id" 
                class="bg-gray-700/50 p-3 rounded-lg relative group" 
             >
               <div class="flex justify-between items-start mb-1">
                 <div>
                   <span class="text-sm font-medium text-blue-300">{{ reply.adminUser?.futsal?.name || 'Admin' }} replied:</span>
                   <span v-if="isCurrentUserAdminReply(reply)" class="ml-2 text-xs text-yellow-400">(Your Reply)</span>
                 </div>
                 <span class="text-xs text-gray-400">{{ formatDate(reply.createdAt) }}</span>
               </div>
               <p class="text-sm text-gray-300 mb-2">{{ reply.text }}</p>

               <!-- Edit/Delete buttons for own reply -->
                <div v-if="isCurrentUserAdminReply(reply)" class="mt-2 flex justify-end gap-1">
                    <button @click="startEditReply(review._id, reply)" class="p-1 bg-gray-600/50 hover:bg-gray-500/50 rounded text-yellow-400">
                        <Edit3Icon class="w-3 h-3" />
                    </button>
                     <button @click="$emit('delete-reply', { reviewId: review._id, replyId: reply._id })" class="p-1 bg-gray-600/50 hover:bg-gray-500/50 rounded text-red-400">
                        <Trash2Icon class="w-3 h-3" />
                    </button>
                </div>

                <!-- Reply/Edit Input Area - MOVED INSIDE REPLY LOOP -->
                <div v-if="editingReplyId === reply._id" class="mt-3 space-y-2">
                  <textarea 
                    v-model="replyText" 
                    placeholder="Edit your reply..." 
                    rows="2"
                    class="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-green-500 focus:border-green-500"
                  ></textarea>
                  <div class="flex justify-end gap-2">
                     <button @click="cancelReplyOrEdit" class="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded">Cancel</button>
                     <button 
                       @click="submitEditReply(review._id)" 
                       class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded"
                      >
                       Update Reply
                     </button>
                  </div>
               </div>
                 <!-- End Moved Input Area -->
             </div>
           </div>

           <!-- Reply Section & Input (Only show Reply button if admin hasn't replied) -->
           <div class="pl-13 mt-4 pt-4 border-t border-gray-700/50">
              <!-- Show Reply button only if no reply exists from current admin AND not currently editing ANY reply-->
              <div v-if="!hasAdminReplied(review) && editingReplyId === null && replyingTo !== review._id" class="flex justify-end">
                 <button @click="startReply(review._id)" class="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                    <MessageSquareIcon class="w-4 h-4" />
                    Reply
                 </button>
              </div>
              <!-- Input for NEW reply (only shown when clicking 'Reply') -->
              <div v-else-if="replyingTo === review._id && editingReplyId === null" class="space-y-2">
                 <textarea 
                   v-model="replyText" 
                   placeholder="Write your reply..." 
                   rows="2"
                   class="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-green-500 focus:border-green-500"
                 ></textarea>
                 <div class="flex justify-end gap-2">
                    <button @click="cancelReplyOrEdit" class="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded">Cancel</button>
                    <button 
                      @click="submitReply(review._id)" 
                      class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded"
                     >
                      Submit Reply
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { computed, ref } from 'vue'
  import { StarIcon, UserIcon, CalendarIcon, MessageSquareIcon, Edit3Icon, Trash2Icon } from 'lucide-vue-next'

  const props = defineProps({
    reviews: {
      type: Array,
      default: () => []
    },
    currentUserId: {
        type: String,
        required: true
    }
  })

   // Define emits
   const emit = defineEmits(['submit-reply', 'update-reply', 'delete-reply'])

   // State for handling replies/edits
   const replyingTo = ref(null); 
   const editingReplyId = ref(null); // ID of the reply being edited
   const replyText = ref('');

   const startReply = (reviewId) => {
     replyingTo.value = reviewId;
     editingReplyId.value = null;
     replyText.value = '';
   };

   const startEditReply = (reviewId, reply) => {
     replyingTo.value = reviewId; // Need reviewId context for submission
     editingReplyId.value = reply._id;
     replyText.value = reply.text;
   };

   const cancelReplyOrEdit = () => {
     replyingTo.value = null;
     editingReplyId.value = null;
     replyText.value = '';
   };

   const submitReply = (reviewId) => {
     if (!replyText.value.trim()) return;
     emit('submit-reply', { reviewId, text: replyText.value });
     cancelReplyOrEdit(); // Clear after emitting
   };

   const submitEditReply = (reviewId) => {
     if (!replyText.value.trim() || !editingReplyId.value) return;
     emit('update-reply', { reviewId, replyId: editingReplyId.value, text: replyText.value });
      cancelReplyOrEdit(); // Clear after emitting
   };

   // Helper to check if the current admin user wrote a specific reply
   const isCurrentUserAdminReply = (reply) => {
     return reply.adminUser?._id === props.currentUserId;
   };

   // Helper to check if the current admin has replied to a review
   const hasAdminReplied = (review) => {
     return review.replies?.some(reply => reply.adminUser?._id === props.currentUserId);
   };

    const getRatingCount = (stars) => {
    return props.reviews.filter(review => review.rating === stars).length
    }

    const getRatingPercentage = (stars) => {
    if (!props.reviews.length) return 0
    return (getRatingCount(stars) / props.reviews.length) * 100
    }
  
  // Computed property for average rating
  const averageRating = computed(() => {
    if (!props.reviews.length) return '0.0'
    const total = props.reviews.reduce((sum, review) => sum + review.rating, 0)
    return (total / props.reviews.length).toFixed(1)
  })
  
  // Format date helper function
  const formatDate = (date) => {
     console.log('[RatingsAndReviews] Formatting date:', date);
     if (!date) return 'No date';
     try {
       return new Date(date).toLocaleDateString('en-US', {
         year: 'numeric',
         month: 'short',
         day: 'numeric'
       });
     } catch (e) {
        console.error('[RatingsAndReviews] Error formatting date:', e);
        return 'Invalid Date';
     }
  }
  </script>
// src/components/court-details/ReviewSection.vue

<template>
  <section id="review-section" class="bg-gray-800 rounded-xl p-6">
    <!-- Average Rating Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-semibold text-white">Reviews</h2>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-2xl font-bold text-white">
            {{ props.court.averageRating || 0 }}
          </span>
          <div class="flex">
            <StarIcon
              v-for="i in 5"
              :key="i"
              :class="[
                'w-5 h-5',
                i <= (props.court.averageRating || 0) 
                  ? 'text-yellow-400 fill-yellow-400' 
                  : 'text-gray-600'
              ]"
            />
          </div>
          <span class="text-gray-400">
            {{ props.court.reviews?.length || 0 }} reviews
          </span>
        </div>
      </div>
    </div>

    <!-- User's Review Form or Existing Review -->
    <div class="mb-6">
      <!-- New Review Form -->
      <div v-if="!userHasReviewed" class="space-y-4 p-4 bg-gray-700/50 rounded-lg">
        <div class="flex flex-col items-center">
            <!-- Star Rating Section -->
            <div class="flex items-center gap-4">
            <!-- Stars -->
            <div class="flex gap-1">
                <button
                v-for="star in 5"
                :key="star"
                @click="handleStarClick(star)"
                @mouseenter="hoverRating = star"
                @mouseleave="hoverRating = 0"
                class="p-1 transition-transform hover:scale-110"
                >
                <StarIcon
                    class="w-8 h-8"
                    :class="(hoverRating || tempRating) >= star 
                    ? 'text-yellow-400 fill-yellow-400' 
                    : 'text-gray-600'"
                />
                </button>
            </div>
            </div>

            <!-- Rating Text -->
            <p class="mt-2 text-sm text-gray-400">
            {{ tempRating ? getRatingText(tempRating) : 'Rate this court' }}
            </p>
        </div>

        <!-- Review Form - Only show when stars are selected -->
        <div v-if="tempRating" class="mt-4 space-y-4">
            <textarea
            v-model="reviewForm.comment"
            rows="3"
            placeholder="Share your experience (optional)"
            class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg 
                    text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 
                    focus:border-transparent"
            ></textarea>
            
            <!-- Action Buttons -->
            <div class="flex justify-end gap-3">
            <button
                @click="cancelRating"
                class="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
                Cancel
            </button>
            <button
                @click="submitReview"
                :disabled="isSubmitting"
                class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 
                    transition-colors flex items-center gap-2"
            >
                <Loader2Icon v-if="isSubmitting" class="animate-spin w-4 h-4" />
                Post Review
            </button>
            </div>
        </div>
        </div>

      <!-- Existing User Review -->
      <div 
        v-else 
        class="p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-white font-medium mb-2">Your Review</h3>
            
            <!-- Display Mode -->
            <div v-if="!isEditing" class="space-y-2">
              <div class="flex items-center gap-2">
                <div class="flex">
                  <StarIcon
                    v-for="i in 5"
                    :key="i"
                    :class="[
                      'w-5 h-5',
                      i <= userReview.rating 
                        ? 'text-yellow-400 fill-yellow-400' 
                        : 'text-gray-600'
                    ]"
                  />
                </div>
                <span class="text-sm text-gray-400">
                  {{ formatReviewDate(userReview.createdAt) }}
                </span>
              </div>
              <p v-if="userReview.comment" class="text-gray-300">
                {{ userReview.comment }}
              </p>
            </div>
            
            <!-- Edit Mode -->
            <div v-else class="space-y-4">
              <div class="flex gap-1">
                <button
                  v-for="star in 5"
                  :key="star"
                  @click="editForm.rating = star"
                  class="p-1 transition-transform hover:scale-110"
                >
                  <StarIcon
                    class="w-6 h-6"
                    :class="editForm.rating >= star 
                      ? 'text-yellow-400 fill-yellow-400' 
                      : 'text-gray-600'"
                  />
                </button>
              </div>
              <textarea
                v-model="editForm.comment"
                rows="3"
                class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                placeholder="Update your review (optional)"
              ></textarea>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex gap-2">
            <template v-if="!isEditing">
              <button
                @click="startEditing"
                class="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                title="Edit Review"
              >
                <PencilIcon class="w-4 h-4" />
              </button>
              <button
                @click="confirmDeleteReview"
                class="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete Review"
              >
                <TrashIcon class="w-4 h-4" />
              </button>
            </template>
            <template v-else>
              <button
                @click="cancelEditing"
                class="px-3 py-1 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                @click="updateReview"
                :disabled="isSubmitting"
                class="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 
                       transition-colors flex items-center gap-2"
              >
                <Loader2Icon v-if="isSubmitting" class="animate-spin w-4 h-4" />
                Save
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Reviews List -->
    <div class="space-y-4">
      <div 
        v-for="review in sortedReviews" 
        :key="review._id"
        class="p-4 bg-gray-700/50 rounded-lg"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="w-full">
            <div class="flex justify-between items-start">
              <span class="font-medium text-white">{{ review.user.username }}</span>
              <div v-if="review.user._id.toString() === props.currentUserId" class="flex gap-2">
                <button
                @click="startEditing"
                class="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                title="Edit Review"
                >
                <PencilIcon class="w-4 h-4" />
                </button>
                <button
                @click="confirmDeleteReview"
                class="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete Review"
                >
                <TrashIcon class="w-4 h-4" />
                </button>
            </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex">
                <StarIcon
                  v-for="i in 5"
                  :key="i"
                  :class="[
                    'w-4 h-4',
                    i <= review.rating 
                      ? 'text-yellow-400 fill-yellow-400' 
                      : 'text-gray-600'
                  ]"
                />
              </div>
              <span class="text-sm text-gray-400">
                {{ formatReviewDate(review.createdAt) }}
              </span>
            </div>
            <p v-if="review.comment" class="text-gray-300 mt-2">
              {{ review.comment }}
            </p>
          </div>
        </div>
        
        <!-- Review Reactions -->
        <div class="flex items-center gap-4 mt-3 pt-3 border-t border-gray-600">
            <button
                @click="toggleReaction(review._id, 'like')"
                :class="[
                    'flex items-center gap-1 px-2 py-1 rounded transition-colors',
                    reactionStates.get(review._id)?.liked
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'hover:bg-gray-600/50 text-gray-400'
                ]"
                >
            <ThumbsUpIcon 
              class="w-4 h-4" 
              :fill="hasUserReaction(review._id, 'like') ? 'currentColor' : 'none'" 
            />
            <span>{{ getReactionCount(review._id, 'like') }}</span>
          </button>
          
          <button
            @click="toggleReaction(review._id, 'dislike')"
            :class="[
              'flex items-center gap-1 px-2 py-1 rounded transition-colors',
              hasUserReaction(review._id, 'dislike')
                ? 'bg-red-500/20 text-red-400'
                : 'hover:bg-gray-600/50 text-gray-400'
            ]"
          >
            <ThumbsDownIcon 
              class="w-4 h-4" 
              :fill="hasUserReaction(review._id, 'dislike') ? 'currentColor' : 'none'" 
            />
            <span>{{ getReactionCount(review._id, 'dislike') }}</span>
          </button>
        </div>

        <!-- Admin Replies Section -->
        <div v-if="review.replies?.length > 0" class="mt-4 pl-8 space-y-3">
          <div 
            v-for="reply in review.replies" 
            :key="reply._id" 
            class="bg-gray-600/30 p-3 rounded-lg border-l-2 border-blue-400/50"
          >
            <div class="flex justify-between items-center mb-1">
              <span class="text-sm font-medium text-blue-300">
                <!-- Prefer Futsal name if available, fallback to username -->
                {{ reply.adminUser?.futsal?.name || reply.adminUser?.username || 'Admin' }} replied:
              </span>
              <span class="text-xs text-gray-400">
                {{ formatReviewDate(reply.createdAt) }}
              </span>
            </div>
            <p class="text-sm text-gray-300">{{ reply.text }}</p>
          </div>
        </div>
        <!-- End Admin Replies Section -->

      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { 
  StarIcon, PencilIcon, TrashIcon,
  ThumbsUpIcon, ThumbsDownIcon, Loader2Icon,  
} from 'lucide-vue-next'
import { useTimeFormatting } from '@/composables/useTimeFormatting'
import API_URL from '@/config/api'

const { formatDate: formatReviewDate } = useTimeFormatting()

const props = defineProps({
  court: {
    type: Object,
    required: true
  },
  currentUserId: {
    type: String,
    required: true,
     default: ''
  }
})


const localReviews = ref([...props.court.reviews || []]);
const emit = defineEmits([
  'submit-review',
  'update-review',
  'delete-review',
  'toggle-reaction'
])

const cancelRating = () => {
  tempRating.value = 0
  reviewForm.value = { rating: 0, comment: '' }
  hoverRating.value = 0
}

// State management
const tempRating = ref(0)
const hoverRating = ref(0)
const isEditing = ref(false)
const isSubmitting = ref(false)
const reviewForm = ref({ rating: 0, comment: '' })
const editForm = ref({ rating: 0, comment: '' })

const userHasReviewed = computed(() => {
  if (!props.currentUserId) {
    return false;
  }
  return Boolean(localReviews.value?.some(review => {
    const reviewUserId = review.user._id?.toString().trim();
    const currentUserId = props.currentUserId.trim();
    return reviewUserId === currentUserId;
  }));
});

const userReview = computed(() => {
  return localReviews.value?.find(review => 
    review.user._id?.toString() === props.currentUserId?.toString()
  );
});
const sortedReviews = computed(() => {
  return [...(props.court.reviews || [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

// Methods
const handleStarClick = (rating) => {
  tempRating.value = rating
  reviewForm.value.rating = rating
}

const getRatingText = (rating) => {
  const texts = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  }
  return texts[rating] || 'Select a rating'
}

const startEditing = () => {
  editForm.value = {
    rating: userReview.value.rating,
    comment: userReview.value.comment
  }
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
  editForm.value = { rating: 0, comment: '' }
}

const submitReview = async () => {
  if (!props.currentUserId) {
    console.error('Cannot submit review: Please log in first');
    return;
  }

  if (!tempRating.value) {
    console.error('Cannot submit review: Rating is required');
    return;
  }
  
  try {
    isSubmitting.value = true;
    await emit('submit-review', {
      rating: tempRating.value,
      comment: reviewForm.value.comment?.trim() || ''
    });
    
    // Reset form after successful submission
    tempRating.value = 0;
    reviewForm.value = { rating: 0, comment: '' };
  } catch (error) {
    console.error('Error submitting review:', error);
    // Handle error appropriately
  } finally {
    isSubmitting.value = false;
  }
};

const updateReview = async () => {
  if (!editForm.value.rating) return
  
  try {
    isSubmitting.value = true
    await emit('update-review', {
      rating: editForm.value.rating,
      comment: editForm.value.comment?.trim() || ''
    })
    isEditing.value = false
  } finally {
    isSubmitting.value = false
  }
}

const reactionStates = computed(() => {
  const states = new Map();
  localReviews.value.forEach(review => {
    states.set(review._id, {
      liked: hasUserReaction(review._id, 'like'),
      disliked: hasUserReaction(review._id, 'dislike')
    });
  });
  return states;
});


const confirmDeleteReview = () => {
  if (window.confirm('Are you sure you want to delete your review?')) {
    emit('delete-review')
  }
}

const hasUserReaction = (reviewId, type) => {
  const review = localReviews.value.find(r => r._id === reviewId);
  return review?.reactions?.some(r => 
    r.user === props.currentUserId && r.type === type
  );
};

const getReactionCount = (reviewId, type) => {
  const review = props.court.reviews?.find(r => r._id === reviewId)
  return review?.reactions?.filter(r => r.type === type).length || 0
}

watch(
  () => props.court.reviews,
  (newReviews) => {
    localReviews.value = [...newReviews || []];
  }
);

// In ReviewSection.vue, modify the toggleReaction function:
const toggleReaction = async (reviewId, type) => {
  const review = localReviews.value.find(r => r._id === reviewId);
  if (!review) return;
  
  // Optimistically update UI
  const existingReaction = review.reactions?.find(r => 
    r.user === props.currentUserId && r.type === type
  );
  
  if (existingReaction) {
    review.reactions = review.reactions.filter(r => 
      !(r.user === props.currentUserId && r.type === type)
    );
  } else {
    review.reactions = [...(review.reactions || []), {
      user: props.currentUserId,
      type
    }];
  }

  try {
    const response = await fetch(
      `${API_URL}/api/player/courts/${props.court._id}/reviews/${reviewId}/reactions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to toggle reaction');
    }
    
    const updatedCourt = await response.json();
    const updatedReview = updatedCourt.reviews.find(r => r._id === reviewId);
    if (updatedReview) {
      review.reactions = updatedReview.reactions;
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    // Optionally, revert optimistic update or notify the parent
    emit('toggle-reaction', { reviewId, type });
  }
};
</script>
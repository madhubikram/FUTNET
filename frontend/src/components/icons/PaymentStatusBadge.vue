<template>
    <span :class="badgeClasses" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium">
       <component :is="icon" class="w-3 h-3" />
      {{ capitalizedStatus }}
    </span>
  </template>
  
  <script setup>
  import { computed } from 'vue';
  import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-vue-next';
  
  const props = defineProps({
    status: {
      type: String,
      required: true,
      default: 'pending'
    }
  });
  
  const statusMap = {
    pending: { text: 'Pending', icon: Clock, classes: 'bg-yellow-500/20 text-yellow-400' },
    paid: { text: 'Paid', icon: CheckCircle, classes: 'bg-emerald-500/20 text-emerald-400' },
    unpaid: { text: 'Unpaid', icon: AlertCircle, classes: 'bg-orange-500/20 text-orange-400' },
    refunded: { text: 'Refunded', icon: RefreshCw, classes: 'bg-blue-500/20 text-blue-400' },
    failed: { text: 'Failed', icon: AlertCircle, classes: 'bg-red-500/20 text-red-400' }
  };
  
  const badgeConfig = computed(() => statusMap[props.status] || statusMap.pending);
  
  const badgeClasses = computed(() => badgeConfig.value.classes);
  const icon = computed(() => badgeConfig.value.icon);
  const capitalizedStatus = computed(() => badgeConfig.value.text);
  </script>
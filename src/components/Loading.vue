<script setup>

import Spinner from "./Spinner.vue"

defineProps({
    label: {
        type: String,
        default: 'Loading...'
    }
})

</script>

<template>
    <div
        class="gs-absolute gs-top-[calc(50%-20px)] gs-left-[calc(50%-40px)] gs-shadow gs-w-[80px] gs-h-[40px] gs-bg-color gs-text-color gs-bg-opacity-80 gs-flex gs-flex-col gs-items-center gs-justify-center gs-rounded"
    >
        <span class="gs-text-[12px]">{{ label }}</span>
        <spinner />
    </div>
</template>

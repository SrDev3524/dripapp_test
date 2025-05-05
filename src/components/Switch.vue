<script setup>
import {computed} from 'vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: true
    },
    disabled: {
        type: Boolean,
        default: false
    },
    label: {
        type: String,
        default: "Switch"
    }
});

const emit = defineEmits(['update:modelValue'])

const value = computed({
    get: () => Boolean(props.modelValue),
    set: (value) => {
        if (!props.disabled) {
            emit('update:modelValue', value)
        }
    }
})

</script>

<template>
    <div class="gs-flex gs-w-full gs-justify-between gs-items-center">
        <span class="gs-text-[14px]"> {{ label }} </span>
        <label
            :class="['gs-relative gs-inline-flex gs-w-[40px] gs-h-[22px] gs-rounded-full', disabled ? 'gs-cursor-not-allowed gs-opacity-50' : 'gs-cursor-pointer', value ? 'gs-bg-color': 'gs-bg-color gs-opacity-30']">
            <input type="checkbox" v-model="value" :checked="value" :disabled="disabled" class="sr-only peer hidden" style="display: none!important;"/>
            <span class="gs-absolute gs-transition-all gs-duration-50 gs-w-[18px] gs-h-[18px] gs-top-[2px] gs-bg-white gs-rounded-full !gs-flex"
                  :class="[value ? 'gs-left-[20px]': 'gs-left-[2px]']"></span>
        </label>
    </div>
</template>

<template>
    <svg-icon type="mdi" :path="path"></svg-icon>
</template>

<script>
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiTrayArrowUp } from '@mdi/js';

export default {
    name: "CloseIcon",
    components: {
        SvgIcon
    },
    data() {
        return {
            path: mdiTrayArrowUp,
        }
    }
}
</script>

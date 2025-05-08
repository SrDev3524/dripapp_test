<script setup>
import { computed, nextTick, ref } from 'vue'
import { useDropzone } from "vue3-dropzone"

import UploadIcon from './components/icons/UploadIcon.vue'
import CloseIcon from './components/icons/CloseIcon.vue'
import FullScreenExitIcon from "./components/icons/FullscreenExitIcon.vue"
import FullScreenIcon from "./components/icons/FullscreenIcon.vue";
import AlertCircleOutlineIcon from './components/icons/AlertCircleOutlineIcon.vue'

import Spinner from './components/Spinner.vue'
import Switch from './components/Switch.vue'
import Loading from "./components/Loading.vue"

import PlusIcon from "./components/icons/PlusIcon.vue"
import InformationOutlineIcon from "./components/icons/InformationOutlineIcon.vue"

import { gangSheetBuilder } from "./gang-sheet"
import { APP_PROXIES } from "./constants"
import { fetchCart } from "./utils.js"

const CONSTANTS = {
    MAX_LIMIT: 100000,
    MAX_FILE_SIZE: 100 * 1024 * 1024,
    DEFAULT_RESOLUTION: 300,
    IMGIX_LIMIT_PIXEL: 8192,
}

const shop = gangSheetBuilder.shop
const product = gangSheetBuilder.product
const bgWarningMsg = gangSheetBuilder.translation("Background Warning")

const isValidProduct = ref(product.type === 7);
const selectedPredefinedSizeIndex = ref(-1)

const productSettings = {
    maxWidth: (product.settings.printerWidth ?? 22) - (product.settings.artboardMargin ?? 0) * 2,
    maxHeight: (product.settings.maxHeight ?? 22) - (product.settings.artboardMargin ?? 0) * 2,
    unit: product.settings.unit ?? 'in',
    bgRemove: (!product.settings.disableBackgroundRemoveTool && product.settings.enableBgRemove) ?? false,
    disableBackgroundRemoveTool: product.settings.disableBackgroundRemoveTool ?? false,
    enablePriceBreakdown: product.settings.enablePriceBreakdown ?? true,
    enableEachPricePerItem: product.settings.enableEachPricePerItem ?? true,
    upscale: product.settings.enableUpscale ?? false,
    fileTypes: product.settings.file_types ?? ["image/svg+xml", "image/jpg,image/jpeg", "image/png"],
    pricing: {
        type: product.settings.pricing?.type ?? 'flat',
        prices: product.settings.pricing?.prices ?? [],
        price: product.settings.pricing?.price ?? 0.01,
        matrixData: product.settings.pricing?.matrixData
    },
    sizes: [],
    predefinedSizes: {
        enabled: product.settings.predefinedSizes?.enabled ?? false,
        sizes: product.settings.predefinedSizes?.sizes ?? []
    }
}

const shopSettings = {
    currencySymbol: shop.currencySymbol ?? '$',
}

const defaultImage = {
    file: null,

    // base
    id: null,
    unit: productSettings.unit,
    resolution: CONSTANTS.DEFAULT_RESOLUTION,
    inputResolution: null,
    quantity: 1,

    imgix_url: null,
    url: null,
    width: 0,
    height: 0,
    ratio: 0,
    realWidth: 0,
    realHeight: 0,

    // status
    progress: 0,
    uploaded: false,
    loading: false,
    isSvg: false,

    // customize
    bgRemove: productSettings.bgRemove,
    upscale: productSettings.upscale,
    keepAspectRatio: true,
    w: 0,
    h: 0,

    // pricing
    eachArea: 0,
    totalArea: 0,
    price: 0,
    priceTotal: 0,

    hasBackground: true,
    isOverFlowing: false,
}

const errors = ref({})
const isAddingToCart = ref(false)

const images = ref([{...defaultImage}])

const activeImageIndex = ref(0)
const fullScreenMode = ref(false)

const convertDimensionRate = computed(() => {
    switch (productSettings.unit) {
        case 'in':
            return 1
        case 'cm':
            return 1 / 2.54
        case 'mm':
            return 1 / 25.4
        default:
            return 1
    }
})

const activeImage = computed({
    get: () => {
        const image = images.value[activeImageIndex.value]
        if (image.uploaded) {
            const resolutionX = Math.ceil(image.realWidth / (image.w * convertDimensionRate.value))
            const resolutionY = Math.ceil(image.realHeight / (image.h * convertDimensionRate.value))

            image.resolution = Math.min(resolutionX, resolutionY)

            image.eachArea = Number(image.w * image.h)
            image.totalArea = image.eachArea * parseInt(image.quantity)

            const pricePerSquareUnit = Number(perSquarePrice.value || 0.01)
            image.price = Number(image.eachArea * pricePerSquareUnit)
            image.priceTotal = image.price * parseInt(image.quantity)
        }

        return image
    },
    set: (value) => images.value[activeImageIndex.value] = value
})

const backgroundWarning = computed(() => {
    return !productSettings.disableBackgroundRemoveTool &&
        activeImage.value.bgRemove &&
        !activeImage.value.hasBackground
})

const totalPrice = computed(() => images.value.reduce((total, image) => total + image.priceTotal, 0))
const totalArea = computed(() => images.value.reduce((total, image) => total + image.totalArea, 0))

const uploadLabel = computed(() => {
    return activeImage.value.progress < 100 ? `${parseInt(activeImage.value.progress)}%` : gangSheetBuilder.translation('Loading...')
})

const imageContainerStyle = computed(() => {
    if (!fullScreenMode.value) {
        if (activeImage.value.ratio) {
            const minWidth = (window.innerHeight * 0.9 - 120) * activeImage.value.ratio

            return {
                width: `min(100%,${minWidth}px)`,
            }
        }

        return {
            width: '100%'
        }
    }

    return {}
})

const imageWrapperStyle = computed(() => {
    if (activeImage.value.uploaded) {
        if (fullScreenMode.value) {
            const maxWidth = window.innerWidth - 80
            const maxHeight = window.innerHeight - 80

            let width = Math.min(maxWidth, activeImage.value.width)
            let height = width / activeImage.value.ratio

            if (height > maxHeight) {
                height = maxHeight
                width = height * activeImage.value.ratio
            }

            return {
                width: width + 'px',
                height: height + 'px',
            }
        } else {
            const ratio = activeImage.value.w / activeImage.value.h

            return {
                height: 0,
                width: '100%',
                paddingBottom: `${100 / ratio}%`
            }
        }
    }

    return {}
})

const unitPixels = computed(() => {
    let resolution = activeImage.value.inputResolution

    if (activeImage.value.upscale) {
        resolution = Math.max(resolution, 300)
    }

    switch (productSettings.unit) {
        case 'in':
            return resolution
        case 'cm':
            return resolution / 2.54
        case 'mm':
            return resolution / 25.4
        default:
            return resolution
    }
})

const supportedFileTypes = computed(() =>
    gangSheetBuilder.getFileTypes(productSettings.fileTypes).join(', ')
);

const round = (num, precision = 2) => {
    const factor = Math.pow(10, precision)
    return Math.round(num * factor) / factor
}

const onDrop = (files) => {
    errors.value = {}

    const file = files[0]

    if (file.size > CONSTANTS.MAX_FILE_SIZE) {
        return showError(`File - ${file.name} size exceeds 100MB limit`)
    }
    if (!productSettings.fileTypes.some(type => type.split(',').includes(file.type))) {
        return showError(`File - ${file.name} type not supported`)
    }

    activeImage.value.url = URL.createObjectURL(file)
    activeImage.value.loading = true

    const formData = new FormData()

    formData.append('image', file)
    formData.append('session_id', gangSheetBuilder.getSessionId())

    const step = 2 * 1024 * 1024 / file.size
    const progressTimer = setInterval(() => {
        activeImage.value.progress = Math.min(activeImage.value.progress + Math.round(step) + 1, 99)
    }, 200)

    gangSheetBuilder.formRequest(APP_PROXIES.GANG_UPLOAD_BY_SIZE, formData)
        .then(res => {
            clearInterval(progressTimer)
            activeImage.value.progress = 100
            const image = res.image
            activeImage.value.hasBackground = res.hasBackground
            activeImage.value.id = image.id
            activeImage.value.imgix_url = image.imgix_url
            activeImage.value.bags_url = image.url
            activeImage.value.inputResolution = image.resolution
            activeImage.value.resolution = image.resolution

            activeImage.value.width = image.width
            activeImage.value.height = image.height
            activeImage.value.ratio = image.width / image.height

            activeImage.value.realWidth = image.width
            activeImage.value.realHeight = image.height

            activeImage.value.w = round(image.width / unitPixels.value)

            if (activeImage.value.w > productSettings.maxWidth) {
                activeImage.value.w = productSettings.maxWidth
            }

            activeImage.value.h = round(activeImage.value.w / activeImage.value.ratio)

            activeImage.value.uploaded = true

            if (image.url.endsWith('.svg')) {
                activeImage.value.isSvg = true
            }

            if (image.width > CONSTANTS.IMGIX_LIMIT_PIXEL || image.height > CONSTANTS.IMGIX_LIMIT_PIXEL) {
                activeImage.value.isOverFlowing = true
                activeImage.value.loading = false
            }

            if (activeImage.value.isSvg || activeImage.value.isOverFlowing) {
                activeImage.value.bgRemove = false
                activeImage.value.upscale = false
            }

            if (!activeImage.value.hasBackground) {
                activeImage.value.bgRemove = false
            }

            handleActiveImageChange()
        })
        .catch(() => {
            showError('Unable to upload image')
            activeImage.value.url = null
            activeImage.value.progress = 0
        })
}

const {getRootProps, getInputProps} = useDropzone({
    onDrop: onDrop,
    multiple: false,
})

const inputProps = getInputProps()
const rootProps = getRootProps()

const onImageLoad = (e) => {
    if (activeImage.value.ratio === 0) {
        activeImage.value.ratio = e.target.width / e.target.height
    }
}

const handleImageDelete = () => {
    images.value.splice(activeImageIndex.value, 1)
    if (images.value.length === 0) {
        images.value.push({...defaultImage})
    }
    activeImageIndex.value = 0
}

let updateActiveImageTimer = null
let activeImageUrl = null

const updateActiveImageUrl = (newUrl) => {
    activeImageUrl = newUrl

    if (updateActiveImageTimer) {
        clearTimeout(updateActiveImageTimer)
    }

    updateActiveImageTimer = setTimeout(() => {
        activeImage.value.loading = true
        const img = new Image();
        img.onload = () => {
            if (img.src === activeImageUrl) {
                activeImage.value.width = img.naturalWidth
                activeImage.value.height = img.naturalHeight
                activeImage.value.ratio = img.naturalWidth / img.naturalHeight
                activeImage.value.realWidth = img.naturalWidth
                activeImage.value.realHeight = img.naturalHeight

                if (selectedPredefinedSizeIndex.value === -1 && activeImage.value.keepAspectRatio) {
                    activeImage.value.w = round(activeImage.value.width / unitPixels.value)

                    if (activeImage.value.w > productSettings.maxWidth) {
                        activeImage.value.w = productSettings.maxWidth
                    }
                }

                activeImage.value.h = round(activeImage.value.w / activeImage.value.ratio)

                activeImage.value.url = newUrl
                activeImage.value.loading = false
            }
        }

        img.onerror = () => {
            activeImage.value.loading = false
            activeImage.value.url = newUrl
        }

        img.src = newUrl
    }, 500)
}

const handleActiveImageChange = () => {
    if (activeImage.value.uploaded) {
        let useImgix = (activeImage.value.bgRemove || activeImage.value.upscale) &&
            !activeImage.value.isSvg &&
            !activeImage.value.isOverFlowing

        if (useImgix) {
            const newUrl = new URL(activeImage.value.imgix_url)

            if (activeImage.value.bgRemove) {
                newUrl.searchParams.set('auto', 'format')
                newUrl.searchParams.set('trim', 'color')
                newUrl.searchParams.set('trim-color', 'fff')
                newUrl.searchParams.set('fm', 'png')
                newUrl.searchParams.set('bg-remove', 'true')
            }

            if (activeImage.value.upscale) {
                newUrl.searchParams.set('upscale', 'true')
                newUrl.searchParams.set('w', activeImage.value.width.toString())
                newUrl.searchParams.set('h', activeImage.value.height.toString())
                newUrl.searchParams.set('fit', 'scale')

                if (activeImage.value.inputResolution < 300) {
                    newUrl.searchParams.set('dpi', '300')
                }
            }

            updateActiveImageUrl(newUrl.toString())
        } else {
            activeImage.value.url = activeImage.value.bags_url
            activeImage.value.loading = false
        }
    }
}

const showError = (message, id = 'any') => {
    errors.value[id] = message
    setTimeout(() => {
        delete errors.value[id]
    }, 7000)
}


const handleActiveImageWidthChange = () => {
    if (activeImage.value.w > productSettings.maxWidth) {
        showError(`Width should be less than ${productSettings.maxWidth}${activeImage.value.unit}`, 'width')
    }

    activeImage.value.w = Math.min(productSettings.maxWidth, activeImage.value.w)

    if (activeImage.value.w >= 0.5) {
        if (activeImage.value.keepAspectRatio) {
            activeImage.value.h = parseFloat((activeImage.value.w / activeImage.value.ratio).toFixed(2))

            if (activeImage.value.h > productSettings.maxHeight) {
                showError(`Height should be less than ${productSettings.maxHeight}${activeImage.value.unit}`, 'height')

                activeImage.value.h = productSettings.maxHeight
                activeImage.value.w = parseFloat((activeImage.value.h * activeImage.value.ratio).toFixed(2))
            }
        }

        activeImage.value.width = Math.round(activeImage.value.w * unitPixels.value)
        activeImage.value.height = Math.round(activeImage.value.h * unitPixels.value)
        activeImage.value.ratio = activeImage.value.width / activeImage.value.height
    } else {
        showError('Width should be greater than 0.5', 'width')
    }
}

const handleActiveImageHeightChange = () => {
    if (activeImage.value.h > productSettings.maxHeight) {
        showError(`Height should be less than ${productSettings.maxHeight}${activeImage.value.unit}`, 'height')
    }

    activeImage.value.h = parseFloat(Math.min(productSettings.maxHeight, activeImage.value.h).toFixed(2))

    if (activeImage.value.h >= 0.5) {
        if (activeImage.value.keepAspectRatio) {
            activeImage.value.w = parseFloat((activeImage.value.h * activeImage.value.ratio).toFixed(2))

            if (activeImage.value.w > productSettings.maxWidth) {
                showError(`Width should be less than ${productSettings.maxWidth}${activeImage.value.unit}`, 'width')

                activeImage.value.w = productSettings.maxWidth
                activeImage.value.h = parseFloat((activeImage.value.w / activeImage.value.ratio).toFixed(2))
            }
        }

        activeImage.value.width = Math.round(activeImage.value.w * unitPixels.value)
        activeImage.value.height = Math.round(activeImage.value.h * unitPixels.value)
        activeImage.value.ratio = activeImage.value.width / activeImage.value.height
    } else {
        showError('Height should be greater than 0.5', 'height')
    }
}

function handleFocusOut() {
    if (activeImage.value.upscale) {
        handleActiveImageChange()
    }
}

const handleClickPredefinedSize = (width, index) => {
    activeImage.value.w = width
    activeImage.value.h = parseFloat((width / activeImage.value.ratio).toFixed(2))
    activeImage.value.width = Math.round(activeImage.value.w * unitPixels.value)
    activeImage.value.height = Math.round(activeImage.value.h * unitPixels.value)
    activeImage.value.ratio = activeImage.value.width / activeImage.value.height
    selectedPredefinedSizeIndex.value = index
}

const handleCustomSize = () => {
    selectedPredefinedSizeIndex.value = -1
}

const tieredPricing = () => {
    const findPrice = productSettings.pricing.prices.find(price => price.area >= totalArea.value)
    if (findPrice) {
        return findPrice
    }

    return productSettings.pricing.prices[productSettings.pricing.prices.length - 1]
}

const matrixPricing = () => {
    const matrixData = productSettings.pricing.matrixData;

    if (matrixData) {
        const eachArea = activeImage.value.eachArea;
        const quantity = parseInt(activeImage.value.quantity);

        let sqIndex = -1;
        for (let i = 0; i < matrixData.sqInRanges.length; i++) {
            const range = matrixData.sqInRanges[i];

            if (eachArea >= range.from && (eachArea <= range.to || range.to === null)) {
                sqIndex = i;
                break;
            }
        }

        let qtyIndex = -1;
        for (let i = 0; i < matrixData.qtyRanges.length; i++) {
            const range = matrixData.qtyRanges[i];
            if (quantity >= range.from && (quantity <= range.to || range.to === null)) {
                qtyIndex = i;
                break;
            }
        }

        if (sqIndex !== -1 && qtyIndex !== -1 && matrixData.pricingMatrix[sqIndex][qtyIndex]) {
            return Number(matrixData.pricingMatrix[sqIndex][qtyIndex]);
        }
    }

    return Number(productSettings.pricing.price);
}
const perSquarePrice = computed(() => {
    if (productSettings.pricing.type === 'flat') {
        return Number(productSettings.pricing.price)
    } else if (productSettings.pricing.type === 'matrix') {
        return Number(matrixPricing());
    } else {
        return Number(tieredPricing().price)
    }
})

const handleAddMoreImages = () => {
    if (!activeImage.value.loading) {
        const lastIndex = images.value.length - 1

        if (images.value[lastIndex].uploaded) {
            images.value.push({...defaultImage})
            activeImageIndex.value = images.value.length - 1
        } else {
            activeImageIndex.value = lastIndex
        }
    }

    nextTick(() => {
        const el = document.getElementById('gs-image-picker')
        el?.click()
    })
}

const handleAddToCart = async () => {
    isAddingToCart.value = true

    const items = images.value.filter(image => image.uploaded).map(image => ({
        id: image.id,
        price: image.price,
        unit: image.unit,
        quantity: image.quantity,
        width: image.width,
        height: image.height,
        w: image.w,
        h: image.h,
        keepAspectRatio: image.keepAspectRatio,
        isSvg: image.isSvg,
        resolution: image.resolution,
        bgRemove: image.bgRemove,
        upscale: image.upscale
    }))

    gangSheetBuilder.postRequest(APP_PROXIES.CREATE_CART, {
        product_id: gangSheetBuilder.productId ?? gangSheetBuilder.product.id,
        images: items
    }).then((data) => {
        gangSheetBuilder.postRequest(gangSheetBuilder.shopRoot + 'cart/add.js', {
            items: data.line_items
        }).then(() => {
            fetchCart().then(() => {
                gangSheetBuilder.viewCartPage()
            })
        }).catch(() => {
            showError('Failed to add item to cart')
            isAddingToCart.value = false
        })
    }).catch(() => {
        showError('Failed to add item to cart')
        isAddingToCart.value = false
    })
}

function translation(text) {
    return gangSheetBuilder.translation(text)
}

</script>

<template>
    <div
        class="gs-relative gs-flex gs-flex-col gs-bg-white md:gs-rounded-lg gs-w-full gs-max-w-[800px] gs-text-[16px] max-md:gs-h-full md:gs-min-h-[min(100%,540px)] gs-max-h-full md:gs-max-h-[94%] gs-text-gray-800">
        <div class="gs-flex gs-justify-between gs-items-center gs-p-4">
            <h2 class="gs-text-[18px] gs-font-semibold">{{ translation("Upload Files") }}</h2>

            <button @click="close" class="gs-w-[32px] gs-h-[32px] gs-items-center gs-justify-center">
                <close-icon/>
            </button>
        </div>

        <hr class="gs-w-full gs-bg-color gs-opacity-60 gs-h-px"/>

        <div class="gs-flex-1 gs-h-px gs-p-6 gs-overflow-y-auto gs-flex gs-flex-col gs-tiny-scroll-bar">
            <div v-if="backgroundWarning"
                 class="gs-px-6 gs-bg-orange-300 gs-bg-opacity-50 gs-mb-4 gs-text-orange-700 gs-flex gs-justify-start gs-items-center gs-py-2 gs-rounded gs-gap-2">
                <alert-circle-outline-icon class="gs-w-8 gs-h-8 gs-inline-block gs-mr-2"/>
                <p class="gs-text-[14px] gs-w-full gs-text-center gs-text-justify gs-mr-2">{{ bgWarningMsg }}</p>
            </div>
            <div v-if="isValidProduct" class="gs-grid gs-flex-1 gs-gap-2 md:gs-grid-cols-2 gs-w-full gs-min-h-full">
                <div class="gs-h-full gs-flex-1 gs-shrink-0">
                    <div v-if="!activeImage.url" v-bind="rootProps"
                         class="gs-h-full gw-w-full gs-py-8 gs-border gs-border-gray-300 gs-border-dashed gs-rounded-lg gs-flex gs-items-center gs-justify-center gs-cursor-pointer hover:gs-bg-gray-300">
                        <input id="gs-image-picker" ref="imagePicker" v-bind="inputProps" hidden
                               :accept="productSettings.fileTypes.join(',')"/>
                        <div class="gs-space-y-2 gs-flex gs-flex-col gs-items-center">
                            <button type="button"
                                    class="gs-flex gs-gap-2 gs-border gs-border-color gs-items-center gs-bg-color gs-text-color gs-rounded-lg gs-px-4 gs-py-2">
                                <span class="gs-font-medium">{{ translation("Choose images to get started") }}</span>
                                <upload-icon/>
                            </button>
                            <p class="gs-text-[14px] gs-font-semibold gs-text-center">
                                {{ translation("or Drag & drop files here or click to select files") }}
                            </p>
                            <p class="gs-text-[14px]">{{ translation("Files supported") }}: {{ supportedFileTypes }}</p>
                            <p class="gs-text-[14px]">{{ translation("Max File Size") }}: 100MB</p>
                        </div>
                    </div>

                    <div v-else class="gs-w-full gs-pb-0">
                        <div class="gs-w-full gs-h-full gs-pl-[34px] gs-pt-[34px]"
                             :class="{'gs-fixed gs-flex gs-items-center gs-justify-center gs-p-6 gs-top-0 gs-left-0 gs-bg-white gs-w-full gs-h-full gs-z-[99999]': fullScreenMode}">
                            <div class="gs-m-auto" :style="imageContainerStyle">
                                <div
                                    class="gs-relative gs-aspect-ratio gs-transparent-pattern gs-border-color gs-border-2 gs-border-dashed gs-min-h-[50px] gs-max-h-full gs-max-w-full"
                                    :style="imageWrapperStyle">
                                    <div :class="[activeImage.uploaded ? 'gs-absolute gs-top-0 gs-left-0 gs-w-full gs-h-full': 'gs-w-full']">
                                        <div class="gs-absolute gs-top-1 gs-right-1 gs-flex gs-gap-1">
                                            <div
                                                class=" gs-bg-color gs-text-color gs-cursor-pointer gs-rounded gs-flex gs-justify-center gs-items-center"
                                                @click="fullScreenMode = !fullScreenMode">
                                                <full-screen-exit-icon v-if="fullScreenMode" size="20"/>
                                                <full-screen-icon v-else size="20"/>
                                            </div>

                                            <div
                                                v-if="!fullScreenMode"
                                                class=" gs-bg-color gs-text-color gs-top-1 gs-right-1 gs-text-red-500 gs-cursor-pointer gs-rounded gs-flex gs-justify-center gs-items-center gs-border gs-border-transparent hover:gs-border-red-500"
                                                @click="handleImageDelete">
                                                <close-icon size="20"/>
                                            </div>
                                        </div>

                                        <img :src="activeImage.url" class="gs-object-fill gs-w-full gs-h-full" alt="image" @load="onImageLoad">

                                        <div
                                            class="gs-absolute gs-bottom-[calc(100%+4px)] gs-left-0 gs-h-[30px] !gs-border-color !gs-border-l !gs-border-r gs-w-full gs-flex gs-items-center gs-justify-center after:content-[''] after:gs-w-full after:gs-h-px after:gs-bg-color gs-text-color after:gs-absolute after:gs-z-0">
                                            <span class="gs-text-[11px] gs-bg-color gs-relative gs-z-10 gs-p-1">{{ activeImage.w }}{{ activeImage.unit }}</span>
                                        </div>
                                        <div
                                            class="gs-absolute gs-right-[calc(100%+8px)] gs-top-0 gs-w-[30px] gs-border-color !gs-border-t !gs-border-b gs-h-full gs-flex gs-items-center gs-justify-center after:content-[''] after:gs-h-full after:gs-w-px after:gs-bg-color gs-text-color after:gs-absolute after:gs-z-0">
                                            <span class="gs-flex gs-text-[11px] gs-bg-color gs-relative gs-z-10 gs-p-1">{{ activeImage.h }}{{ activeImage.unit }}</span>
                                        </div>

                                        <div v-if="activeImage.loading" class="gs-flex gs-items-center gs-justify-center gs-absolute gs-top-0 ts-left-0 gs-w-full gs-h-full"
                                             :class="{'gs-bg-gray-900 gs-bg-opacity-30': activeImage.loading}">
                                            <loading :label="uploadLabel"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="gs-space-y-[10px] gs-h-full gs-flex-1 gs-shrink-0 gs-flex gs-flex-col md:gs-pl-6">
                    <template v-if="!activeImage.isSvg && !activeImage.isOverFlowing">
                        <Switch v-if="!productSettings.disableBackgroundRemoveTool"
                                v-model="activeImage.bgRemove"
                                :label="translation('Remove Background')"
                                :disabled="activeImage.loading"
                                @change="handleActiveImageChange"/>
                        <Switch v-model="activeImage.upscale"
                                :label="translation('Upscale Quality')"
                                :disabled="activeImage.loading"
                                @change="handleActiveImageChange"/>
                    </template>

                    <template v-if="activeImage.uploaded">
                        <Switch v-if="!activeImage.isOverFlowing && selectedPredefinedSizeIndex === -1"
                                v-model="activeImage.keepAspectRatio"
                                :label="translation('Keep Aspect Ratio') + ` (${activeImage.ratio.toFixed(2)})`"
                                :disabled="activeImage.loading"
                                @change="handleActiveImageChange"/>
                        <div v-if="productSettings.predefinedSizes.enabled" class="gs-flex gs-text-[14px] gs-flex-wrap gs-gap-2 gs-items-center">
                            <span v-if="productSettings.predefinedSizes.sizes.filter(size => size.enabled).length > 0"
                                  class="gs-px-4 gs-py-2 gs-bg-color gs-text-color gs-rounded-md gs-cursor-pointer"
                                  :class="selectedPredefinedSizeIndex === -1 ? 'gs-bg-color gs-text-color gs-font-semibold' : 'gs-opacity-60'"
                                  @click="handleCustomSize">
                                {{ translation("Custom") }}
                            </span>
                            <div v-for="(size, index) in productSettings.predefinedSizes.sizes" :key="size.name" class="gs-inline-flex gs-items-center">
                                <span v-if="size.enabled"
                                      class="gs-px-4 gs-py-2 gs-bg-color gs-text-color gs-rounded-md gs-cursor-pointer"
                                      :class="index === selectedPredefinedSizeIndex ? 'gs-font-semibold' : 'gs-opacity-60'"
                                      @click="handleClickPredefinedSize(size.width, index)">
                                    {{ size.name }}
                                </span>
                            </div>
                        </div>

                        <div class="gs-grid gs-grid-cols-3 gs-gap-2 gs-mt-4 gs-text-left">
                            <div>
                                <label class="gs-text-[14px]">{{ translation('Width') }} ({{ activeImage.unit }})</label>
                                <input type="number" v-model="activeImage.w" @input="handleActiveImageWidthChange" class="gs-w-full gs-text-[14px] gs-border gs-mt-1 gs-rounded-md" min="0.5"
                                       @focusout="handleFocusOut"
                                       :class="{'!gs-border-red-500': errors.width, 'gs-opacity-50': selectedPredefinedSizeIndex >= 0}"
                                       :max="productSettings.maxWidth"
                                       :disabled="selectedPredefinedSizeIndex >= 0 || activeImage.loading"
                                       step="0.5"/>
                                <span class="gs-text-gray-500 gs-text-[12px]">{{ translation("Max is") }} {{ productSettings.maxWidth }} {{ productSettings.unit }}</span>
                            </div>
                            <div>
                                <label class="gs-text-[14px]">{{ translation('Height') }} ({{ activeImage.unit }})</label>
                                <input type="number" v-model="activeImage.h" @input="handleActiveImageHeightChange" class="gs-w-full gs-text-[14px] gs-border gs-mt-1 gs-rounded-md" min="0.5"
                                       @focusout="handleFocusOut"
                                       :class="{'!gs-border-red-500': errors.height, 'gs-opacity-50': selectedPredefinedSizeIndex >= 0}"
                                       :max="productSettings.maxHeight"
                                       :disabled="selectedPredefinedSizeIndex >= 0 || activeImage.loading"
                                       step="0.5"/>
                                <span class="gs-text-gray-500 gs-text-[12px]">Max is {{ productSettings.maxHeight }} {{ productSettings.unit }}</span>
                            </div>
                            <div>
                                <label class="gs-text-[14px]">{{ translation('Quantity') }}</label>
                                <input type="number" v-model="activeImage.quantity" class="gs-w-full gs-border gs-text-[14px] gs-mt-1 gs-rounded-md" min="1"/>
                            </div>
                        </div>

                        <div v-if="activeImage.totalArea" class="gs-items-center gs-flex gs-justify-between gs-gap-2">
                            <div>{{ translation('Price') }}</div>
                            <div class="gs-whitespace-nowrap">
                                <span v-if="productSettings.enablePriceBreakdown" class="gs-text-[14px] gs-text-gray-500">
                                    {{ activeImage.eachArea.toFixed(2) }} {{ activeImage.unit }}<sup>2</sup> x
                                    {{ activeImage.quantity }}  x
                                    {{ perSquarePrice }} /{{ activeImage.unit }}<sup>2</sup> =
                                </span>
                                <b>{{ shopSettings.currencySymbol }}{{ activeImage.priceTotal.toFixed(2) }}</b>
                            </div>
                        </div>
                    </template>

                    <div class="gs-w-full gs-min-h-[30px] gs-space-y-1 gs-shrink-0">
                        <div
                            v-for="(error, key) in errors"
                            class="gs-text-white gs-flex gs-justify-between gs-items-center gs-text-[14px] gs-bg-red-500 gs-w-full gs-px-2 gs-py-px gs-rounded gs-opacity-0 gs-transition-all gs-duration-500"
                            :class="{'gs-opacity-100': error}">
                            <span>{{ error }}</span>
                            <close-icon size="14" @click="delete errors[key]"/>
                        </div>
                    </div>

                    <div class="gs-w-full">
                        <template v-if="images[0].uploaded">
                            <div class="gs-text-[13px]">
                                <div class="gs-flex gs-items-center">
                                    <span class="gs-w-[100px] gs-text-left gs-whitespace-nowrap">
                                        {{ translation('Resolution') }}
                                    </span>
                                    <span v-if="activeImage.resolution">{{ activeImage.resolution }} DPI</span>
                                </div>
                                <div class="gs-flex gs-items-center">
                                    <span v-if="productSettings.enablePriceBreakdown" class="gs-w-[100px] gs-text-left gs-whitespace-nowrap">
                                        {{ translation('Price') }} / {{ activeImage.unit }}<sup>2</sup>:
                                    </span>
                                    <span v-if="productSettings.enablePriceBreakdown">{{ shopSettings.currencySymbol }}{{ perSquarePrice }}</span>
                                </div>
                                <div v-if="productSettings.enablePriceBreakdown" class="gs-flex gs-items-center">
                                    <span class="gs-w-[100px] gs-text-left gs-whitespace-nowrap">{{ translation('Total Area') }}: </span>
                                    <span>{{ totalArea.toFixed(2) }} {{ activeImage.unit }} <sup>2</sup></span>
                                </div>
                            </div>

                            <div class="gs-flex gs-items-center gs-font-semibold gs-mb-2 gs-text-gray-900 gs-mt-2">
                                <span class="gs-w-[100px] gs-text-left gs-whitespace-nowrap">{{ translation('Total Price') }}: </span>
                                <span>{{ shopSettings.currencySymbol }}{{ totalPrice.toFixed(2) }}</span>
                            </div>

                            <div v-if="images[0].uploaded" class="gs-grid gs-grid-cols-4 gs-gap-2">
                                <div v-for="(image, index) in images" :key="image.url" class="gs-flex gs-flex-col gs-items-center">
                                    <div v-if="image.uploaded"
                                         class="gs-relative gs-transparent-pattern gs-aspect-square !gs-border gs-rounded gs-cursor-pointer hover:gs-border-color"
                                         :class="{ 'gs-border-color': index === activeImageIndex }"
                                         @click="!activeImage.loading && (activeImageIndex = index)">
                                        <img :src="image.url" class="gs-w-full gs-h-full gs-object-contain" alt="image">
                                        <div
                                            class="gs-absolute gs-right-0 gs-bottom-0 gs-bg-color gs-text-color gs-text-[12px] gs-min-w-[16px] gs-text-center">
                                            {{ image.quantity }}
                                        </div>
                                    </div>
                                    <template v-if="productSettings.enableEachPricePerItem">
                                        <div class="gs-text-[12px] gs-text-gray-700">
                                            {{ image.w }} x {{ image.h }}
                                        </div>
                                        <div class="gs-text-[12px] gs-text-gray-700">
                                            💰 {{ shopSettings.currencySymbol }}{{ image.priceTotal.toFixed(2) }}
                                        </div>
                                    </template>
                                </div>
                                <button
                                    type="button"
                                    :disabled="activeImage.loading"
                                    class="gs-aspect-square !gs-border disabled:gs-opacity-50 disabled:gs-cursor-not-allowed gs-flex gs-flex-col gs-text-center gs-items-center gs-justify-center gs-cursor-pointer gs-rounded hover:gs-border-color"
                                    @click="handleAddMoreImages">
                                    <plus-icon/>
                                    <span class="gs-text-[14px]">{{ translation("Add More") }}</span>
                                </button>
                            </div>
                        </template>

                        <div v-else>
                            <p class="gs-text-[14px]">{{ translation("Upload an image to get started") }}</p>
                        </div>
                    </div>

                    <button
                        class="gs-flex gs-justify-center !gs-border gs-border-color gs-items-center gs-gap-2 gs-bg-color gs-text-color gs-w-full gs-rounded gs-p-3 disabled:gs-opacity-60 disabled:gs-cursor-not-allowed"
                        :disabled="activeImage.loading || isAddingToCart" @click="handleAddToCart">
                        {{ translation("Add To Cart") }}
                        <span v-if="isAddingToCart"><Spinner size="18"/></span>
                    </button>
                </div>
            </div>
            <div v-else>
                <div class="gs-bg-red-300 gs-flex gs-items-center gs-rounded gs-w-full gs-p-2 gs-text-[14]">
                    <information-outline-icon size="18" class="gs-mr-2"/>
                    {{ translation("This product is not supported for custom gang size. Please contact support for more information.") }}
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
html {
    font-size: 14px;
}
</style>
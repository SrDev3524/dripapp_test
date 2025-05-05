export const PATH_PREFIX = 'http://localhost:8000/shopify'
// export const PATH_PREFIX = '/apps/gsb'

export const APP_PROXIES = {
    APP_CONFIG: `${PATH_PREFIX}/config`,
    GET_PRODUCT: `${PATH_PREFIX}/product`,
    GANG_UPLOAD: `${PATH_PREFIX}/gang/upload`,
    GANG_UPLOAD_BY_SIZE: `${PATH_PREFIX}/gang/upload-by-size`,
    CREATE_CART: `${PATH_PREFIX}/gang/create-cart`,

    ROLLING_GANG_SHEET_ADD: `${PATH_PREFIX}/gang-sheet/add-rolling-gang-sheets`,
}

export const EXTENSION_TYPES = {
    GANG_SHEET: 'gang-sheet',
    GANG_UPLOAD: 'gang-upload',
    GANG_SIZE: 'gang-size',
    IMAGE_TO_SHEET: 'image-to-sheet'
}

export const EXCEPTIONS = {
    VARIANT_THROTTLE_EXCEEDED: 'VARIANT_THROTTLE_EXCEEDED'
}

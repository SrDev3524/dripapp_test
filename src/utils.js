export const addClickEventListener = (button, callback) => {
    if (button.dataset.gsEvent !== 'click') {
        button.onclick = function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();

            if (typeof callback === 'function') {
                callback(e)
            }
        }

        button.setAttribute('data-gs-event', 'click')

        // Lock the onclick property
        Object.defineProperty(button, "onclick", {
            writable: false,
        });
    }
}

export const getSearchParams = () => {
    const gsUrlSearchParams = new URLSearchParams(window.location.search)
    return Object.fromEntries(gsUrlSearchParams.entries())
}

export const isProductPage = () => {
    const paths = decodeURI(window.location.pathname).split('/').filter((p) => p.length > 0)

    return paths.includes('products');
}

export const isCartPage = () => {
    const paths = decodeURI(window.location.pathname).split('/').filter((p) => p.length > 0);
    return paths.includes('cart');
}

// Get Buttons
export const getGangSheetButton = () => {
    let button = document.getElementById('gs-builder-btn')
    if (!button) {
        button = document.getElementById('gs-uploader-btn')
    }
    return button
}

export const getPaymentButton = () => {
    let section = getProductSectionFromPage()

    if (!section) {
        section = document;
    }

    return section.querySelector('.shopify-payment-button')
}

export const getAddToCartButton = () => {
    let section = getProductSectionFromPage()

    if (!section) {
        section = document;
    }

    let button = section.querySelector("button[id^='AddToCart']")

    if (!button) {
        button = section.querySelector("button[id^='addToCart']")
    }

    if (!button) {
        button = section.querySelector("button.product-form__submit")
    }

    if (!button) {
        button = section.querySelector("button.product-form__cart-submit")
    }

    if (!button) {
        button = section.querySelector("button.shopify-payment-button__button")
    }

    if (!button) {
        button = section.querySelector("button.btn--add-to-cart")
    }

    if (!button) {
        button = section.querySelector("button.add_to_cart")
    }

    if (!button) {
        button = section.querySelector("button.single_add_to_cart_button")
    }

    if (!button) {
        button = section.querySelector("button.add-to-cart")
    }

    if (!button) {
        button = section.querySelector("button.product-form--atc-button")
    }

    if (!button) {
        button = section.querySelector("button[data-atc-form]")
    }

    if (!button) {
        button = section.querySelector("button.btn-atc[name='add']")
    }

    if (!button) {
        button = section.querySelector("button.overlay-buy_button")
    }

    return button
}

export const getShopifyPaymentButton = () => {
    let section = getProductSectionFromPage()

    if (!section) {
        section = document;
    }

    let button = section.querySelector('.shopify-payment-button__button')

    if (!button) {
        button = section.querySelector('.shopify-payment-button')
    }

    if (!button) {
        button = section.querySelector('[data-shopify=payment-button]')
    }

    if (!button) {
        button = section.querySelector('.shopify-payment-button')
    }

    return button
}

export const getBuyNowButton = () => {
    let section = getProductSectionFromPage()

    if (!section) {
        section = document;
    }

    let button = section.querySelector("button[id^='buy-now']")

    if (!button) {
        button = section.querySelector("button.btn-buy")
    }

    return button
}

export const hideAddToCartButton = () => {
    const addToCartButton = getAddToCartButton()
    if (addToCartButton) {
        addToCartButton.style.display = 'none'
    }

    const paymentButton = getPaymentButton()
    if (paymentButton) {
        paymentButton.style.display = 'none'
    }

    const buyNowButton = getBuyNowButton()
    if (buyNowButton) {
        buyNowButton.style.display = 'none'
    }

    let style = document.createElement('style')
    style.innerHTML = '.shopify-payment-button {display: none}'
    document.head.appendChild(style)
}

// Get Sections
export const getClosestSection = (element) => {
    if (element) {
        let sectionElement = element.closest('[id^="shopify-section-"]');

        if (!sectionElement) {
            sectionElement = element.closest('[data-section-id]');
        }

        if (!sectionElement) {
            sectionElement = element.closest('.shopify-section');
        }

        return sectionElement;
    }

    return null;
}

export const getProductSectionFromPage = () => {
    let section = document.querySelector('product-info')

    if (!section) {
        // 3b81f8.myshopify.com
        section = document.querySelector('[id^="product-"][data-featured-product-se]')
    }

    if (!section) {
        // lux-label-co.myshopify.com
        section = document.querySelector('section[id^="shopify-section-template-"].main-product-section')
    }

    if (!section) {
        section = document.querySelector('.product-info')
    }

    if (!section) {
        section = document.querySelector('.product__info-container')
    }

    if (!section) {
        section = document.querySelector('.product-single')
    }

    if (!section) {
        section = document.getElementById('product-single')
    }

    if (!section) {
        // dtfreadytopress.myshopify.com
        section = document.getElementById('shopify-section-product-template')
    }

    if (!section) {
        // 413-print-press.myshopify.com
        section = document.querySelector('section#product-template')
    }

    if (!section) {
        // 613originals.myshopify.com[[MLVeda] - Focal]
        section = document.querySelector('.product__info')
    }

    return section;
}

export const getProductSectionFromButton = (button) => {
    let section = getClosestSection(button)

    if (!section) {
        section = button.closest('.shopify-section')
    }

    if (!section) {
        section = button.closest('product-info')
    }

    if (!section) {
        section = button.closest('.product-info')
    }

    if (!section) {
        section = button.closest('.product__info-container')
    }

    return section
}

export const getProductSection = () => {
    let section = null;

    const gangSheetButton = getGangSheetButton()

    if (gangSheetButton) {
        section = getClosestSection(gangSheetButton)

        if (!section) {
            section = getProductSectionFromButton(gangSheetButton)
        }
    }

    if (!section) {
        const addToCartButton = getAddToCartButton()

        if (addToCartButton) {
            section = getClosestSection(addToCartButton)

            if (!section) {
                section = getProductSectionFromButton(addToCartButton)
            }
        }
    }

    if (!section) {
        section = getProductSectionFromPage()
    }

    return section
}


// Get Forms
export const getProductFromFromButton = (button) => {
    let form = button.closest('form[action$="/cart/add"]')

    if (!form) {
        const section = getProductSectionFromButton(button)

        if (section) {
            form = section.querySelector('form[action$="/cart/add"]')
        }
    }

    return form;
}

export const getProductForm = () => {
    let form = null;

    if (isProductPage()) {
        const gangSheetButton = getGangSheetButton()

        if (gangSheetButton) {
            form = getProductFromFromButton(gangSheetButton)
        }

        if (!form) {
            const addToCartButton = getAddToCartButton()

            if (addToCartButton) {
                form = getProductFromFromButton(addToCartButton)
            }
        }

        if (!form) {
            form = document.querySelector('form[action$="/cart/add"]')
        }

        if (!form) {
            form = getProductSection()
        }
    }

    return form;
}

export const getProductFormData = () => {
    const jsonData = {}

    const form = getProductForm()

    if (form && form.tagName === 'FORM') {
        const formData = new FormData(form)
        formData.forEach((value, key) => {
            let keys = key.split('[').map(item => item.replace(']', ''))
            let obj = jsonData

            keys.forEach((k, index) => {
                if (!obj[k]) {
                    obj[k] = {}
                }

                if (index === keys.length - 1) {
                    obj[k] = value
                }

                obj = obj[k]
            })
        })
    }

    const section = getProductSection()

    if (section) {
        const inputs = section.querySelectorAll('input, select, textarea')
        inputs.forEach((input) => {
            if (input.name && input.value) {
                let keys = input.name.split('[').map(item => item.replace(']', ''))
                let obj = jsonData

                keys.forEach((k, index) => {
                    if (!obj[k]) {
                        obj[k] = {}
                    }

                    if (index === keys.length - 1) {
                        obj[k] = input.value
                    }

                    obj = obj[k]
                })
            }
        })
    }

    return jsonData
}

// Get Quantity
export const getQuantityFromSection = (section) => {
    if (section) {
        let qtyInput = section.querySelector('input[name="quantity"]')

        if (qtyInput) {
            return qtyInput.value
        }
    }

    return 1
}

export const getQuantityFromButton = (button) => {
    const section = getClosestSection(button)

    return getQuantityFromSection(section)
}

// Get Variant
export const getVariantFromSection = (section) => {
    let variants = []

    let variantInputs = section.getElementsByClassName('gs-variant')
    Array.from(variantInputs).forEach((e) => {
        variants.push({
            id: e.getAttribute('data-id'),
            size: e.value
        })
    })

    if (variants.length > 0) {
        let selectedVariantTitle = section.querySelector('variant-selects')?.querySelector('input:checked')?.value
        if (selectedVariantTitle) {
            let selectedVariant = variants.find((v) => v.size === selectedVariantTitle)
            if (selectedVariant) {
                return selectedVariant.id
            }
        }
    }

    let selectedVariantInput = section.querySelector('[name="id"]:not([disabled])');

    if (selectedVariantInput) {
        return selectedVariantInput.value
    }

    const params = getSearchParams()
    if (params.variant) {
        return params.variant
    }

    let selectedRadio = section.querySelector('input[type="radio"]:checked')

    if (selectedRadio) {
        let variant = variants.find((v) => v.size === selectedRadio.value)
        if (variant) {
            return variant.id
        }
    }

    let variantSelect = section.querySelector('select')

    if (variantSelect) {
        let variant = variants.find((v) => v.size === variantSelect.value)
        if (variant) {
            return variant.id
        }
    }

    const defaultVariantInput = section.querySelector('#gs-default-variant')

    if (defaultVariantInput) {
        return defaultVariantInput.value
    }

    return '';
}

export const getVariantFromButton = (button) => {
    const section = getClosestSection(button)

    return getVariantFromSection(section)
}

let attemptFetchCart = 0
export const fetchCart = async () => {
    attemptFetchCart++
    try {
        const response = await fetch('/cart.js', {cache: 'no-store'})
        const cart = await response.json()
        if (!Array.isArray(cart?.items)) {
            return await fetchCart()
        }

        const gangSheetItems = cart.items.filter(item => {
            const properties = item.properties ?? {};

            const printReadyFile = properties['_Print Ready'] ||
                properties['_Print Ready File']

            return Boolean(printReadyFile)
        })

        if (gangSheetItems.some(item => Number(item.price) === 0) && attemptFetchCart < 30) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return fetchCart()
        }

        localStorage.setItem('GbsCartObjects', JSON.stringify(cart))

        return cart;
    } catch (error) {
        if (attemptFetchCart < 30) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return fetchCart()
        }
        console.error('Error fetching cart:', error);
        return null;
    }
}

export const removeVariantsSelectionFromProductPage = () => {
    const productSection = getProductSectionFromPage()

    if (productSection) {
        // 3b81f8.myshopify.com
        let variantSection = productSection.querySelector('.variations')

        // dtfreadytopress.myshopify.com
        if (!variantSection) {
            variantSection = productSection.querySelector('.variant-wrapper')
        }

        // boutiquerebellion.myshopify.com
        if (!variantSection) {
            variantSection = productSection.querySelector('.selector-wrapper')
        }

        if (variantSection) {
            variantSection.style.display = 'none'
        }
    }
}

export const removeQuantitySelectorFromProductPage = () => {
    const productSection = getProductSectionFromPage()

    if (productSection) {
        let qtySection = productSection.querySelector('#Quantity-product-template')?.parentElement

        if (qtySection) {
            qtySection.style.setProperty('display', 'none', 'important')
        }
    }
}

export const removePriceFromProductPage = () => {
    const productSection = getProductSectionFromPage()

    if (productSection) {
        let priceSection = productSection.querySelector('.price__pricing-group')

        if (priceSection) {
            priceSection.style.setProperty('display', 'none', 'important')
        }
    }
}

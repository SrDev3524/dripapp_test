import {v4 as uuidv4} from "uuid";
import {cloneDeep} from "lodash";
import {createApp} from "vue";
import GangSize from "./GangSize.vue";
import {PRODUCT_TYPES, FILETYPE_MAP} from "./builder/constants.js";
import {EXTENSION_TYPES, PATH_PREFIX, APP_PROXIES} from "./constants.js";
import locales from "./locales/locales.js";

import {
    getVariantFromSection,
    getSearchParams,
    isProductPage,
    getAddToCartButton,
    getGangSheetButton,
    getProductSection,
    getProductFormData,
    getProductForm,
    fetchCart,
    hideAddToCartButton,
    removeVariantsSelectionFromProductPage, removeQuantitySelectorFromProductPage, removePriceFromProductPage
} from "./utils";

class BuildAGangSheet {
    version = 0;

    type = EXTENSION_TYPES.GANG_SHEET

    appUrl = 'https://app.dripappsserver.com'

    shopRoot = '/'

    // shop
    shopName = "gangsheet-builder-test.myshopify.com"

    currentLocale = window.Shopify?.locale || 'en'

    shop = null

    // customer
    customerId = null

    customer = null

    // product & variants
    productId = null

    product = null

    form = null

    variantId = null

    variants = []

    hiddenVariants = []

    isOldTheme = false

    constructor() {
        this.version = this.getExtensionVersion()

        this.ready = this.initialize()
    }

    getExtensionVersion() {
        const scripts = document.getElementsByTagName('script');
        const pattern = /build-a-gang-sheet-(\d+)\/assets\/gang-edit\.min\.js/;
        for (let i = 0; i < scripts.length; i++) {
            const src = scripts[i].src;
            if (src) {
                const match = src.match(pattern);
                if (match && match[1]) {
                    return parseInt(match[1], 10);
                }
            }
        }

        return 0;
    }

    initialize() {
        return new Promise((resolve) => {

                if (window.Shopify.routes?.root) {
                    this.shopRoot = window.Shopify.routes.root
                }

                if (window.__st.cid) {
                    this.customerId = window.__st.cid
                }

                let builderButton = getGangSheetButton()
                if (builderButton) {
                    if (builderButton.dataset.product) {
                        this.productId = builderButton.dataset.product;
                    }

                    if (builderButton.dataset.type) {
                        this.type = builderButton.dataset.type
                    }
                }

                const data = {
                    product_id: this.productId,
                    type: this.type,
                    path_name: window.location.pathname
                }

                const isPreview = window.location.host.includes('shopifypreview.com') || window.top !== window.self
                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

                // if (isLocal || isPreview) {
                //     return console.warn("Gang Sheet Builder doesn't work in preview mode.")
                // }

                this.postRequest(APP_PROXIES.APP_CONFIG, data).then((config) => {

                    this.appUrl = config.app_url

                    if (config.shop) {
                        this.shop = config.shop

                        if (this.shop.is_old_theme === 1) {
                            this.isOldTheme = true
                        }
                    }

                    if (config.customer) {
                        this.customerId = config.customer.id
                        this.customer = config.customer
                    }

                    if (config.product) {
                        this.product = config.product

                        if (this.product.type === PRODUCT_TYPES.UPLOAD) {
                            this.type = EXTENSION_TYPES.GANG_UPLOAD
                        }

                        if (this.product.type === PRODUCT_TYPES.IMAGE_TO_SHEET) {
                            this.type = EXTENSION_TYPES.IMAGE_TO_SHEET
                        }

                        if (config.product.variants) {
                            this.variants = config.product.variants

                            this.hiddenVariants = this.variants.filter((variant) => {
                                return variant.visible === 'Hidden'
                            })
                        }
                    }

                    const drawBuilderButton = () => {
                        builderButton = getGangSheetButton()

                        if (!builderButton && this.isOldTheme) {
                            builderButton = getAddToCartButton();

                            if (!builderButton) {
                                builderButton = document.createElement('button')
                                getProductForm().appendChild(builderButton)
                                builderButton.classList.add('gs--button')
                                builderButton.classList.add('old-theme')
                            }

                            builderButton.id = 'gs-builder-btn'
                        }

                        if (builderButton) {
                            if (this.isOldTheme) {
                                builderButton.style.backgroundColor = this.shop?.button_bg_color || '#000'
                                builderButton.style.color = this.shop?.button_fg_color || '#fff'
                            }

                            builderButton.type = 'button'
                            builderButton.classList.add('gs--button')

                            // config button label
                            if (this.type === EXTENSION_TYPES.GANG_SHEET) {
                                let customButtonLabel = null

                                if (this.isOldTheme) {
                                    customButtonLabel = this.shop.button_label
                                }

                                if (this.product?.settings?.btnLabel) {
                                    customButtonLabel = this.product.settings.btnLabel
                                }

                                if (customButtonLabel) {
                                    builderButton.textContent = customButtonLabel
                                }

                                // Prevent other scripts from modifying the label of button
                                customButtonLabel = builderButton.textContent;
                                const buttonObserver = new MutationObserver((mutations) => {
                                    console.log('DRIP - button label changed!')
                                    mutations.forEach(() => {
                                        if (builderButton.textContent !== customButtonLabel) {
                                            builderButton.textContent = customButtonLabel; // Revert changes
                                        }
                                    });
                                });
                                buttonObserver.observe(builderButton, {childList: true, subtree: true, characterData: true});

                                builderButton.style.setProperty('text-align', 'center', 'important')
                                builderButton.style.setProperty('visibility', 'visible')
                            }

                            if (this.isOldTheme) {
                                this.hideOtherButtons()
                            }

                        }
                    }

                    if (isProductPage() && this.product) {
                        if (this.type === EXTENSION_TYPES.GANG_SHEET || this.type === EXTENSION_TYPES.GANG_SIZE) {
                            drawBuilderButton();

                            if (config.app_env !== 'production' || this.shop?.plan === 'partner_test') {
                                if (builderButton && this.product?.settings?.forms?.length) {
                                    this.buildProductForm();
                                }
                            }

                            this.form = getProductForm();
                            if (builderButton && this.form) {
                                // Hide non-gang sheet Buttons in side the cart form
                                const elementsToBeHide = Array.isArray(config.shop.elements_to_be_hide)
                                    ? config.shop.elements_to_be_hide
                                    : JSON.parse(config.shop.elements_to_be_hide || '[]');

                                this.hideElements(elementsToBeHide)
                                const formObserver = new MutationObserver(() => {
                                    console.log('DRIP - form changed!')
                                    this.hideElements(elementsToBeHide)

                                    if (!getGangSheetButton()) {
                                        drawBuilderButton();
                                    }
                                })
                                const observerConfig = {attributes: true, childList: true, subtree: true}
                                formObserver.observe(this.form, observerConfig)
                            }
                        }

                        if (this.product.settings?.hideAddToCartButton) {
                            hideAddToCartButton()
                        }

                        if (this.product.type === PRODUCT_TYPES.ROLLING_GANG_SHEET || this.product.type === PRODUCT_TYPES.UPLOAD_BY_SIZE) {
                            removeVariantsSelectionFromProductPage()
                            removeQuantitySelectorFromProductPage()
                            removePriceFromProductPage()
                        }
                    }

                    window.addEventListener('message', async (e) => {
                        let data = e.data;
                        if (data && data.action) {
                            if (data.action === 'gs_close_builder') {
                                this.closeGangSheetModal()
                            }

                            if (data.action === 'gs_release_builder') {
                                window.removeEventListener('beforeunload', this.confirmLeave)
                            }
                        }
                    }, false)

                    this.insertAppleWebAppMetaTags();

                    console.info('DRIP - Gang Sheet Builder initialized. v-' + this.version)

                    resolve(this)
                });
            }
        )
    }

    request(url, options = {}) {
        return new Promise((resolve, reject) => {
            fetch(url, options)
                .then((response) => response.json())
                .then((response) => {
                    if (url.includes(PATH_PREFIX)) {
                        if (response.success) {
                            if (response.data) {
                                resolve(response.data)
                            } else {
                                resolve(response)
                            }
                        } else {
                            console.error(response.error)
                            reject(response.message)
                        }
                    } else {
                        if (response.error) {
                            reject(response.error)
                        } else {
                            resolve(response)
                        }
                    }
                })
                .catch((error) => {
                    console.error(error)
                    reject(error)
                })
        });
    }

    postRequest(url, data = {}) {

        data['shop'] = this.shopName

        return this.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
    }

    formRequest(url, formData) {
        return this.request(url, {
            method: 'POST',
            body: formData,
        });
    }

    async getProduct(productId) {
        const product = await this.postRequest(APP_PROXIES.GET_PRODUCT, {product_id: productId})
        if (product) {
            this.productId = product.id
            this.product = product
        }
        return product
    }

    buildQuantityComponent() {
        try {
            const gsQuantityInput = document.getElementById('gs-quantity-input')
            if (gsQuantityInput) {
                const gsQuantityButtonInc = document.getElementById('gs-quantity-button-inc')
                const gsQuantityButtonDec = document.getElementById('gs-quantity-button-dec')

                gsQuantityButtonInc.addEventListener('click', function () {
                    const quantity = Number(gsQuantityInput.value)
                    gsQuantityInput.value = quantity + 1
                    gsQuantityButtonDec.disabled = false
                })

                gsQuantityButtonDec.addEventListener('click', function () {
                    const quantity = Number(gsQuantityInput.value)
                    if (quantity > 1) {
                        gsQuantityInput.value = quantity - 1
                    }

                    if (gsQuantityInput.value <= 1) {
                        this.disabled = true
                    }
                })
            }
        } catch (error) {
            console.error(error)
        }
    }

    buildProductForm() {
        try {
            const gangSheetButton = getGangSheetButton()
            const section = gangSheetButton.parentElement

            const forms = this.product.settings?.forms
            const currencySymbol = this.product.settings?.currencySymbol || '$'

            if (forms && section) {
                const formContainer = document.createElement('div');
                formContainer.style.border = '1px solid #ccc';
                formContainer.style.padding = '10px';
                formContainer.style.margin = '10px auto';
                formContainer.style.width = '100%';
                formContainer.style.boxSizing = 'border-box';

                forms.forEach(form => {
                    const formGroup = document.createElement('div');
                    formGroup.style.marginBottom = '10px';

                    const createLabel = (text, price) => {
                        const label = document.createElement('label');
                        label.style.display = 'block';
                        label.style.marginBottom = '5px';
                        label.style.fontWeight = 'bold';
                        label.textContent = text;

                        if (price) {
                            const priceSpan = document.createElement('span');
                            priceSpan.style.marginLeft = '10px';
                            priceSpan.style.color = '#888';
                            priceSpan.textContent = `(${currencySymbol}${price})`;
                            label.appendChild(priceSpan);
                        }

                        return label;
                    };

                    const createInput = (type, id, name, value = '', additionalStyles = {}) => {
                        const input = document.createElement('input');
                        input.type = type;
                        input.id = id;
                        input.name = name;
                        input.value = value;
                        input.style.width = '100%';
                        input.style.padding = '5px';
                        input.style.boxSizing = 'border-box';

                        Object.assign(input.style, additionalStyles);

                        return input;
                    };

                    switch (form.type) {
                        case 'checkbox':
                            formGroup.appendChild(createLabel(form.label, form.price));

                            form.options.forEach((option, index) => {
                                const checkboxContainer = document.createElement('div');
                                checkboxContainer.style.display = 'flex';
                                checkboxContainer.style.alignItems = 'center';
                                checkboxContainer.style.marginBottom = '5px';

                                const checkbox = document.createElement('input');
                                checkbox.type = 'checkbox';
                                checkbox.id = index;
                                checkbox.name = form.label;
                                checkbox.checked = option.checked || false;
                                checkbox.style.marginRight = '5px';

                                const optionLabel = document.createElement('label');
                                optionLabel.htmlFor = index;
                                optionLabel.textContent = option.label;

                                if (option.price) {
                                    const optionPrice = document.createElement('span');
                                    optionPrice.style.marginLeft = '10px';
                                    optionPrice.style.color = '#888';
                                    optionPrice.textContent = option.priceType === 'percent'
                                        ? `(+${option.price}%)`
                                        : `(${currencySymbol}${option.price})`;
                                    optionLabel.appendChild(optionPrice);
                                }

                                checkboxContainer.appendChild(checkbox);
                                checkboxContainer.appendChild(optionLabel);
                                formGroup.appendChild(checkboxContainer);
                            });
                            break;
                        case 'text':
                            formGroup.appendChild(createLabel(form.label));
                            formGroup.appendChild(createInput('text', form.id, form.label, form.value));
                            break;
                        case 'number':
                            formGroup.appendChild(createLabel(form.label));
                            formGroup.appendChild(createInput('number', form.id, form.label, form.value));
                            break;
                        case 'dropdown':
                            formGroup.appendChild(createLabel(form.label));

                            const select = document.createElement('select');
                            select.id = form.id;
                            select.name = form.label;
                            select.style.width = '100%';
                            select.style.padding = '5px';
                            select.style.boxSizing = 'border-box';

                            const defaultOption = document.createElement('option');
                            defaultOption.value = '';
                            defaultOption.text = 'Select an option';
                            defaultOption.disabled = true;
                            defaultOption.selected = true;
                            select.appendChild(defaultOption);

                            form.options.forEach(option => {
                                const opt = document.createElement('option');
                                opt.value = option.value;
                                opt.text = option.label;

                                if (option.price) {
                                    opt.text += option.priceType === 'percent'
                                        ? ` (+${option.price}%)`
                                        : ` (${currencySymbol}${option.price})`;
                                }

                                select.add(opt);
                            });
                            formGroup.appendChild(select);
                            break;
                        case 'toggle':
                            const toggleContainer = document.createElement('div');
                            toggleContainer.style.display = 'flex';
                            toggleContainer.style.alignItems = 'center';
                            toggleContainer.style.justifyContent = 'space-between';

                            const toggleLabel = createLabel(form.label);

                            const toggleSwitch = document.createElement('span');
                            toggleSwitch.classList.add('toggle-switch');
                            toggleSwitch.style.position = 'relative';
                            toggleSwitch.style.display = 'inline-block';
                            toggleSwitch.style.width = '40px';
                            toggleSwitch.style.height = '20px';
                            toggleSwitch.style.backgroundColor = form.value ? '#4caf50' : '#ccc';
                            toggleSwitch.style.borderRadius = '20px';
                            toggleSwitch.style.cursor = 'pointer';

                            const toggleSlider = document.createElement('span');
                            toggleSlider.style.position = 'absolute';
                            toggleSlider.style.top = '2px';
                            toggleSlider.style.left = form.value ? '22px' : '2px';
                            toggleSlider.style.width = '16px';
                            toggleSlider.style.height = '16px';
                            toggleSlider.style.backgroundColor = '#fff';
                            toggleSlider.style.borderRadius = '50%';
                            toggleSlider.style.transition = 'left 0.2s';

                            toggleSwitch.appendChild(toggleSlider);
                            toggleContainer.appendChild(toggleLabel);
                            toggleContainer.appendChild(toggleSwitch);

                            toggleSwitch.addEventListener('click', () => {
                                form.value = !form.value;
                                toggleSlider.style.left = form.value ? '22px' : '2px';
                                toggleSwitch.style.backgroundColor = form.value ? '#4caf50' : '#ccc';
                            });

                            formGroup.appendChild(toggleContainer);
                            break;
                        default:
                            console.warn(`Unknown form type: ${form.type}`);
                    }

                    formContainer.appendChild(formGroup);
                });

                section.insertBefore(formContainer, gangSheetButton);
            }

        } catch (error) {
            console.error(error)
        }
    }

    getSelectedVariant() {
        if (this.shop.is_old_theme === 1 && this.form) {
            const variantInput = this.form.querySelector('[name="id"]')
            if (variantInput?.value) {
                return variantInput.value
            }
        }

        const section = getProductSection()

        return getVariantFromSection(section)
    }

    confirmLeave(e) {
        const confirmationMessage = 'Are you sure you want to leave?'
        e.returnValue = confirmationMessage
        return confirmationMessage
    }

    getGangSheetModal = (id = 'gs-builder-modal') => {
        let gsBuilderModal = document.getElementById(id)
        if (!gsBuilderModal) {
            gsBuilderModal = document.createElement('div')
            gsBuilderModal.id = id
            if (document.querySelector('html')) {
                document.querySelector('html').appendChild(gsBuilderModal)
            } else {
                document.body.appendChild(gsBuilderModal)
            }
        }

        const container = document.createElement('div')
        container.id = 'gs-app'

        gsBuilderModal.appendChild(container)

        return gsBuilderModal
    }

    closeGangSheetModal(id = 'gs-builder-modal') {
        let modal = this.getGangSheetModal(id)
        modal.style.display = 'none'
        document.body.style.overflow = 'auto'
        document.querySelector('html').style.overflow = 'auto'

        window.removeEventListener('beforeunload', this.confirmLeave)
    }

    openDesignBuilder() {
        const builderButton = getGangSheetButton()

        let product_id = builderButton.getAttribute('data-product')
        let variant_id = this.getSelectedVariant()
        let quantity = this.getQuantity()

        if (this.shop.is_old_theme === 1) {
            product_id = this.product.id
        }

        this.openProductBuilder(product_id, variant_id, quantity)
    }

    openProductBuilder(product_id, variant_id, quantity = 1) {

        if (this.shop.requireCustomerLogin && !this.customerId) {
            const productUrl = window.location.pathname

            let loginUrl = `${this.shopRoot}account?return_url=${productUrl}`
            if (this.shop.customerAccountsVersion === 'NEW_CUSTOMER_ACCOUNTS') {
                loginUrl = `${this.shopRoot}customer_identity/login?return_to=${productUrl}`
            }
            window.location.href = loginUrl
            return
        }
        if (window.location.host.includes('shopifypreview.com') || window.top !== window.self) {
            alert('Sorry, Gang Sheet Builder doesn\'t work in preview mode.')
            return
        }

        let modal = this.getGangSheetModal()
        modal.style.display = 'block'
        if (this.shop.useLogoForLoading) {
            modal.style.setProperty('--gs-builder-modal-bg', `url(${this.shop.logo_url})`)
        }
        modal.innerHTML = ''

        let iframe = document.createElement('iframe')

        const builderUrl = new URL(`${this.appUrl}/builder`)
        builderUrl.searchParams.append('shop', this.shopName)
        builderUrl.searchParams.append('domain', window.location.host)
        builderUrl.searchParams.append('product', product_id)
        builderUrl.searchParams.append('variant', variant_id)
        builderUrl.searchParams.append('quantity', parseInt(quantity))

        const params = getSearchParams()

        const customer_id = params.customer_id || window.__st.cid
        if (customer_id) {
            builderUrl.searchParams.append('customer_id', customer_id)
        }

        if (params.design_id) {
            builderUrl.searchParams.append('design_id', params.design_id)
        }

        if (params.open_designs) {
            builderUrl.searchParams.append('open_designs', 'true')
        }

        iframe.classList.add('gs-builder-iframe')
        iframe.onload = () => {
            setTimeout(() => {
                iframe.style.opacity = '1';
            }, 500)
        };
        iframe.src = builderUrl.toString()
        modal.appendChild(iframe);

        window.addEventListener('beforeunload', this.confirmLeave)

        document.body.style.overflow = 'hidden'
        document.querySelector('html').style.overflow = 'hidden'

        const currentUrl = new URL(window.location.href)
        const searchParams = currentUrl.searchParams
        searchParams.delete('design_id')
        searchParams.delete('customer_id')
        searchParams.delete('open_designs')
        currentUrl.search = searchParams.toString()
        history.replaceState(null, null, currentUrl.href)
    }

    viewCartPage() {
        window.location.href = this.shopRoot + 'cart'
    }

    hideElement(selector) {
        if (document.querySelector(selector)) {
            document.querySelector(selector).style.display = 'none'
            document.querySelector(selector).style.pointerEvents = 'none'
        }
    }

    hideElements(elementsToBeHide) {
        if (Array.isArray(elementsToBeHide)) {
            for (const element of elementsToBeHide || []) {
                this.hideElement(element)
            }
        }
    }

    hideOtherButtons() {
        const form = getProductForm()

        if (form) {
            const buttonLabels = ['add to cart', 'buy with', 'buy it now', 'more payment options']

            function removeButtons(buttons) {
                for (let i = 0; i < buttons.length; i++) {
                    if (!buttons[i].classList.contains('gs--button')) {
                        buttonLabels.forEach((label) => {
                            if (buttons[i].textContent.toLowerCase().includes(label)) {
                                buttons[i].style.setProperty('display', 'none', 'important')
                                buttons[i].style.setProperty('visibility', 'hidden')
                            }
                        })
                    }
                }
            }

            let buttons = form.getElementsByTagName('button')

            removeButtons(buttons)
        }
    }

    getQuantity() {
        if (this.shop.is_old_theme === 1 && this.form) {
            const qtyInput = this.form.querySelector('input[name="quantity"]')
            return qtyInput?.value ?? 1
        }

        let section = getProductSection()

        if (section) {
            let qtyInput = section.querySelector('input[name="quantity"]')
            if (qtyInput) {
                return qtyInput.value
            }
        }

        return 1
    }

    getFileTypes = (allowedFileTypes) => {
        return allowedFileTypes.reduce((result, item) => {
            if (FILETYPE_MAP[item] && !result.includes(FILETYPE_MAP[item])) {
                result.push(FILETYPE_MAP[item])
            }
            return result
        }, [])
    }

    async handleAddToCart(data) {
        const jsonData = getProductFormData();

        if (!data.create_new_sheet) {
            window.removeEventListener('beforeunload', this.confirmLeave);
        }

        const productType = data.product_type || 'gang-sheet';

        let lineItems = [];

        if (productType === 'rolling-gang-sheet') {
            const cartData = cloneDeep(jsonData);

            cartData['shop'] = this.shopName;
            cartData['product_id'] = data.product_id;
            cartData['line_items'] = data.line_items;

            const res = await this.postRequest(APP_PROXIES.ROLLING_GANG_SHEET_ADD, cartData);

            if (res.directCheckout) {
                window.location.href = res.checkout_url;
                return this.closeGangSheetModal();
            } else {
                lineItems = res.line_items
            }
        } else {
            const makeLineItems = (options) => {
                if (!options.variant_id || !options.preview_url || !options.download_url) {
                    return
                }

                const cartData = cloneDeep(jsonData);

                cartData['id'] = options.variant_id;
                cartData['quantity'] = options.quantity;

                const gangSheetProperties = {
                    'Preview': options.preview_url,
                    'Edit': options.edit_url,
                    '_Admin Edit': options.admin_edit_url,
                    '_Print Ready File': options.download_url
                };

                if (options.hasOverlapping) {
                    gangSheetProperties['_Has Overlapping'] = 'Yes';
                }

                if (options.hasLowResolution) {
                    gangSheetProperties['_Has Low Resolution'] = 'Yes';
                }

                if (options.hasTransparency) {
                    gangSheetProperties['_Has Transparency'] = 'Yes';
                }

                if (options.submitActualHeight) {
                    gangSheetProperties['_Actual Height'] = options.actualHeightLabel;
                }

                if (options.submitGangSheetHeight) {
                    gangSheetProperties['Gang Sheet Height'] = options.actualHeightLabel;
                }

                const shopNamesToSendDesignNames = [
                    'transferss.myshopify.com',
                    'gangsheet-builder-test.myshopify.com',
                    'gsb-demo-video-store.myshopify.com'
                ];

                if (shopNamesToSendDesignNames.includes(this.shopName) && data.design_name) {
                    gangSheetProperties['_Design Name'] = data.design_name;
                }

                cartData['properties'] = {
                    ...(cartData['properties'] ? cartData['properties'] : {}),
                    ...gangSheetProperties
                };

                lineItems.push(cartData)
            }

            if (data.submit_type === 'bulk' && (data.designs || []).length) {
                for (const design of data.designs) {
                    makeLineItems(design);
                }
            } else {
                makeLineItems(data);
            }
        }

        if (lineItems.length > 0) {
            this.postRequest(this.shopRoot + 'cart/add.js', {
                items: lineItems
            }).then(() => {
                if (!data.create_new_sheet) {
                    fetchCart().then(() => {
                        this.viewCartPage();
                    })
                }
            }).catch(err => {
                console.error(err)

                alert('Unable to add item to cart. Try again please.')
            })
        }
    }

    getSessionId() {
        let sessionId = localStorage.getItem('gbs-session-id')

        if (!sessionId) {
            sessionId = uuidv4()
            localStorage.setItem('gbs-session-id', sessionId)
        }

        return sessionId
    }

    importCssFile(path) {
        const cssUrl = `${this.appUrl}/${path}`

        let link = document.querySelector(`head[href="${cssUrl}"]`)
        if (link) return

        link = document.createElement('link')
        link.rel = 'stylesheet'
        link.type = 'text/css'
        link.href = cssUrl

        document.getElementsByTagName('head')[0].appendChild(link)
    }

    initializeGangSheetBuilderMessageHandler() {
        window.addEventListener('message', async (e) => {
            let data = e.data;
            if (data && data.action) {
                if (data.action === 'gs_add_to_cart') {
                    await this.handleAddToCart(data)
                }
            }
        }, false)
    }

    openImageUploadBySizeModal() {
        const modal = this.getGangSheetModal()
        modal.classList.add('old-theme')
        modal.style.setProperty('background-color', 'rgba(0, 0, 0, 0.5)', 'important')

        const closeModal = function () {
            modal.style.display = "none";
        }

        modal.onclick = function (event) {
            if (event.target === modal) {
                closeModal();
            }
        }

        if (modal.innerText.trim() === '') {
            const app = createApp(GangSize);

            app.mixin({
                methods: {
                    close() {
                        closeModal();
                    },
                },
            });

            app.mount(modal);
        } else {
            modal.style.display = "flex";
        }
    }

    translation(key) {
        return locales[this.currentLocale][key] || key
    }

    insertAppleWebAppMetaTags() {
        const metaCapable = document.createElement('meta');
        metaCapable.name = 'mobile-web-app-capable';
        metaCapable.content = 'yes';
        document.head.appendChild(metaCapable);

        const metaStatusBar = document.createElement('meta');
        metaStatusBar.name = 'apple-mobile-web-app-status-bar-style';
        metaStatusBar.content = 'black-translucent';
        document.head.appendChild(metaStatusBar);
    }
}

if (!window.gangSheetBuilder) {
    window.gangSheetBuilder = new BuildAGangSheet()
}

/**
 * @type {BuildAGangSheet}
 */
export let gangSheetBuilder = window.gangSheetBuilder


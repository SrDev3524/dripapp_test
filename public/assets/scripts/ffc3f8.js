(function () {
    const productId = getProductId()

    if (!productId) return;

    document.querySelector('[id^="AddToCart-"]').style.setProperty('display', 'none', 'important')
    document.querySelector('[id^="AddToCart-"]').style.pointerEvents = 'none'

    const form = document.querySelector('form[action$="/cart/add"]')

    const button = buildGangSheetButton(form, {
        getIframeLink: (form) => {

            const variantTitle = document.querySelector('input[name="Size"]:checked').value
            const variants = window.meta?.product?.variants || [];
            const selectedVariant = variants.find(variant => variant.public_title.trim().toLowerCase() === variantTitle.trim().toLowerCase())

            if (!selectedVariant) throw new Error("Can't find selected variant.")

            const quantity = 1;
            const variantId = selectedVariant.id;

            console.log(productId, variantId, quantity)

            const base_url = gs_base_url2 || gs_base_url2;

            return `${base_url}/builder?shop=${gs_shop}&domain=${gs_domain}&product=${productId}&variant=${variantId}&quantity=${quantity}`
        }
    })
    button.style.margin = 0
    button.style.width = '100%'
    button.style.height = '44px'
    button.style.display = 'flex'
    button.style.alignItems = 'center'
    button.style.justifyContent = 'center'
})();

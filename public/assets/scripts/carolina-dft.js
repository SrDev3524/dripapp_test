(function () {
    const productId = getProductId()

    if (!productId) return;

    document.querySelector('.paira-add-to-cart.add-to-cart').style.setProperty('display', 'none', 'important')
    document.querySelector('.paira-add-to-cart.add-to-cart').style.pointerEvents = 'none'

    document.querySelector('.paira-buy-now.buy-now').style.setProperty('display', 'none', 'important')
    document.querySelector('.paira-buy-now.buy-now').style.pointerEvents = 'none'


    const form = document.querySelector('.single-product .single-product-buttons')
    form.style.display = 'flex'
    form.style.alignItems = 'flex-end'

    const button = buildGangSheetButton(form, {
        getIframeLink: (form) => {
            const dataset = document.querySelector('.paira-add-to-cart.add-to-cart').dataset

            const variantId = dataset.varientId;
            const quantity = dataset.itemQuantity;

            console.log(productId, variantId, quantity)

            return `${gs_base_url}/builder?shop=${gs_shop}&domain=${gs_domain}&product=${productId}&variant=${variantId}&quantity=${quantity}`
        }
    })
    button.style.margin = 0
    button.style.width = '100%'
    button.style.height = '44px'
    button.style.display = 'flex'
    button.style.alignItems = 'center'
    button.style.justifyContent = 'center'
})();

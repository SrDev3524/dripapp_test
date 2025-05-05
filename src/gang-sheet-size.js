import {gangSheetBuilder} from './gang-sheet.js'
import {
    addClickEventListener,
    getGangSheetButton, getQuantityFromButton, getVariantFromButton, isProductPage
} from "./utils.js";
import {EXTENSION_TYPES} from "./constants.js";

function hideGangSizeVariants() {
    const dimensionPattern = /^(\d+(?:\.\d+)?|\.\d+)(?:in|cm|mm)\s*[×x]\s*(\d+(?:\.\d+)?|\.\d+)(?:in|cm|mm)(?:\s*-\s*[0-9a-f]{8})?$/i;
    const elems = document.querySelectorAll(".product-form__input--pill");
    if (elems && elems.length > 0) {
        elems.forEach((element) => {
            Array.from(element.children).forEach((child) => {
                if (child?.innerText && dimensionPattern.test(child.innerText.trim())) {
                    child.style.display = "none";
                }
            });
        });
    }
    const elems2 = document.querySelectorAll(".product-option")
    if (elems2 && elems2.length > 0) {
        elems2.forEach((element) => {
            Array.from(element.children).forEach((child) => {
                if (child?.innerText && dimensionPattern.test(child.innerText.trim())) {
                    console.log(child.innerText)
                    child.innerText = child.innerText.split('-')[0].trim();
                }
            });
        });
    }
}
document.addEventListener('DOMContentLoaded', hideGangSizeVariants);

gangSheetBuilder.ready.then((builder) => {
    console.log("Gang Sheet Builder is ready")
    if (isProductPage()) {
        const builderButton = getGangSheetButton()

        if (!builderButton || !builder.product) {
            return
        }

        addClickEventListener(builderButton, function () {
            builder.openImageUploadBySizeModal()
        })
    } else {
        const builderButtons = document.getElementsByClassName('gs--button')

        for (const builderButton of builderButtons) {
            if (builderButton.dataset.type === EXTENSION_TYPES.GANG_SIZE) {
                addClickEventListener(builderButton, function () {
                    const productId = builderButton.dataset.product
                    if (!productId) {
                        alert("Product not found")
                    }
                    builder.getProduct(productId).then((product) => {
                        if (product) {
                            builder.openImageUploadBySizeModal()
                        }
                    })
                });
            }
        }
    }
})

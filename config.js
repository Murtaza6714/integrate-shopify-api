require('dotenv').config()

exports.postShopifyProductVariantPriceUrl = (variantId) => {
    return `https://${process.env.SHOPIFY_DOMAIN}.myshopify.com/admin/api/${process.env.SHOPIFY_VERSION}/variants/${variantId}.json`
}

exports.postShopifyItemStockUrl = () => {
    return `https://${process.env.SHOPIFY_DOMAIN}.myshopify.com/admin/api/${process.env.SHOPIFY_VERSION}/inventory_levels/adjust.json`
}
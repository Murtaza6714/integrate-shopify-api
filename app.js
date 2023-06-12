require("dotenv").config();	
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const axios = require("./http-communication")
const { postShopifyProductVariantPriceUrl, postShopifyItemStockUrl } = require("./config");
require("./db")
const cron = require('node-cron');
const ProductStockPriceModel = require("./models/productPriceStock.Model")
const ShopifyProductIdModel = require("./models/shopifyProductId.Model")
const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("./db");
const logger = require("./logger");
const app = express();
let port = process.env.PORT || 4000

// ShopifyProductIdModel.belongsTo(ProductStockPriceModel, { foreignKey: "sku" })
ProductStockPriceModel.hasOne(ShopifyProductIdModel, { foreignKey: "sku", sourceKey: "sku", constraints: false })


app.get("/all-products", async (req, res, next) => {
  try {
    const shopifyUrl = `https://${process.env.SHOPIFY_DOMAIN}.myshopify.com/admin/api/${process.env.SHOPIFY_VERSION}/products.json`
    const headers = {
        'content-type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN
    }
    const products = await axios.get(shopifyUrl, '',headers)
    logger.info("Shopify Products Fetched Successfully!")
    const emptyShopifyProductIdModel = await ShopifyProductIdModel.destroy({ truncate: true }) 
  
    const params = []
      for (const product of products.products) {
        for (const variant of product.variants) {
          const currentTime = new Date().getTime();
          console.log(currentTime);
          params.push({ 
            product_id: product.id,
            variation_id: variant.id,
            sku: variant.sku,
            price: variant.price,
            stock: variant.inventory_quantity,
            inventory_item_id: variant.inventory_item_id
          })
        }
    }
    await createProductsInBatches(params, 500)
    // const productsIndserted = await ShopifyProductIdModel.bulkCreate(params)
    logger.info("Shopify Products destroyed and saved Successfully in database!")

    const virtualProductsTable = await sequelize.query("SELECT * FROM vhs_LCW_StockPrice")
    const postProductPromise = []
    for(let product of virtualProductsTable[0]) {
      const headers = {
        "content-type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
      };
      const postProductPriceParams = {
        variant: {
          price: product["Original Price"],
          compare_at_price: product["Discounted Price"],
        },
      };
      const postStockParams = {
        "location_id": process.env.SHOPIFY_LOCATION_ID,
        "inventory_item_id": product.inventory_item_id,
        "available_adjustment": product.Update_Stock
    }
      const postVariantPriceUrl = postShopifyProductVariantPriceUrl(product.variation_id);
      const postVariantStockUrl = postShopifyItemStockUrl();
      // postProductPromise.push(axios.post(postVariantUrl, postParams,headers)) 
      // postProductPromise.push(axios.put(postVariantPriceUrl, postProductPriceParams, headers)) 
      // postProductPromise.push(axios.post(postVariantStockUrl, postStockParams, headers)) 
      await axios.put(postVariantPriceUrl, postProductPriceParams, headers)
      await axios.post(postVariantStockUrl, postStockParams, headers)
      logger.info(`Product with id ${product.product_id} has been updated with price ${product["Original Price"]} and stock ${product["SysStock"]}`)

    }
    // await processPromisesInBatches(postProductPromise, 500)
    // await awaitPromisesWithDelay(postProductPromise, 3000)
    // console.log(data);
    logger.info("Shopify Products Updated Successfully!")

    return res.status(200).json(products)
  } catch (error) {
    logger.error("Error Products Update!")
    next(error)
  }
    
})

cron.schedule('0 0 * * *', async () => {
  try {
    const shopifyUrl = `https://${process.env.SHOPIFY_DOMAIN}.myshopify.com/admin/api/${process.env.SHOPIFY_VERSION}/products.json`
    const headers = {
        'content-type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN
    }
    const products = await axios.get(shopifyUrl, '',headers)
    // Empty the shopify_product_ids table
    await ShopifyProductIdModel.destroy({ truncate: true }) 
    logger.info("Shopify Products Fetched Successfully!")
  
    const params = []
      for (const product of products.products) {
        for (const variant of product.variants) {
          params.push({ 
            product_id: product.id,
            variation_id: variant.id,
            sku: variant.sku,
            price: variant.price,
            stock: variant.inventory_quantity,
            inventory_item_id: variant.inventory_item_id
          })
        }
    }
    await createProductsInBatches(params, 500)
    // const productsInserted = await ShopifyProductIdModel.bulkCreate(params)
    logger.info("Shopify Products destroyed and saved Successfully in database!")
    
    const virtualProductsTable = await sequelize.query("SELECT * FROM vhs_LCW_StockPrice")
    const postProductPromise = []

    for(let product of virtualProductsTable[0]) {
      const headers = {
        "content-type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
      };
      const postProductPriceParams = {
        variant: {
          price: product["Original Price"],
          compare_at_price: product["Discounted Price"],
        },
      };
      const postStockParams = {
        "location_id": process.env.SHOPIFY_LOCATION_ID,
        "inventory_item_id": product.inventory_item_id,
        "available_adjustment": product.Update_Stock
    }
      const postVariantPriceUrl = postShopifyProductVariantPriceUrl(product.variation_id);
      const postVariantStockUrl = postShopifyItemStockUrl();
      // postProductPromise.push(axios.post(postVariantUrl, postParams,headers)) 
      // postProductPromise.push(axios.put(postVariantPriceUrl, postProductPriceParams, headers)) 
      // postProductPromise.push(axios.post(postVariantStockUrl, postStockParams, headers)) 
      await axios.put(postVariantPriceUrl, postProductPriceParams, headers)
      await axios.post(postVariantStockUrl, postStockParams, headers)
    }
    // await processPromisesInBatches(postProductPromise, 500)
    logger.info("Shopify Products Updated Successfully!")
    
  } catch (error) {
    throw error
  }
});

const processPromisesInBatches = async (promises, batchSize) => {
  try {
    const batches = Math.ceil(promises.length / batchSize);
  for (let i = 0; i <= batches; i++) {
    const batchPromises = promises.slice(i * batchSize, (i + 1) * batchSize);
    await Promise.all(batchPromises);
  }
  } catch (error) {
    throw error
  }
  
}

const createProductsInBatches = async (products, batchSize) => {
  const batches = Math.ceil(products.length / batchSize);
  console.log("batches------------------------", batches);
  for (let i = 0; i <= batches; i++) {
    const batchProducts = products.slice(i * batchSize, (i + 1) * batchSize);
    await ShopifyProductIdModel.bulkCreate(batchProducts)
  }
}

async function awaitPromisesWithDelay(promises, delay) {
  try {
    for (let i = 0; i < promises.length; i += 2) {
      const currentPromises = promises.slice(i, i + 2);
      await Promise.all(currentPromises);
      if (i + 2 < promises.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  } catch (error) {
    throw error
  }
  
}
app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  const message = error.message || "";
  let errorData = [];
  if (error.data) {
    errorData = error.data;
  }
  if (error.response) {
    errorData = error.response.data;
  }
  res.status(status).json({
    message: message,
    status: "failure",
    statusCode: status,
    error: errorData,
  });
});

  app.listen(port, (err) => {
    if (err) {
      console.log(err);
    }
    console.log(`Server in up on port ${port}`);
  });
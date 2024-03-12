require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const axios = require("./http-communication");
const {
  postShopifyProductVariantPriceUrl,
  postShopifyItemStockUrl,
} = require("./config");
require("./db");
const cron = require("node-cron");
const ProductStockPriceModel = require("./models/productPriceStock.Model");
const ShopifyProductIdModel = require("./models/shopifyProductId.Model");
const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("./db");
const logger = require("./logger");
const app = express();
let port = process.env.PORT || 4000;

// ShopifyProductIdModel.belongsTo(ProductStockPriceModel, { foreignKey: "sku" })
// ProductStockPriceModel.hasOne(ShopifyProductIdModel, {
//   foreignKey: "sku",
//   sourceKey: "sku",
//   constraints: false,
// });

app.get("/all-paginated-products", async (req, res, next) => {
  try {
    const response = await addShopifyProductsToDatabase();
    res.status(200).json(response);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

app.get("/new-query", async (req, res, next) => {
 try {
  const virtualProductsTable = await sequelize.query(
    "select Outlet, trn from ths_salessummary"
    // "select * from ths_salessummary"
    // "select * from vhs_salesdata where docdate between getdate()-5 and getdate()"
  );
  const count = virtualProductsTable[0].length
  console.log(count);
  res.status(200).json(virtualProductsTable)
 } catch (error) {
  console.log(error);
 }
})
const addShopifyProductsToDatabase = async () => {
  try {
    const batchOfInsertion = 250;
    const emptyShopifyProductIdModel = await ShopifyProductIdModel.destroy({
      truncate: true,
    });
    const shopifyUrl = `https://${process.env.SHOPIFY_DOMAIN}.myshopify.com/admin/api/${process.env.SHOPIFY_VERSION}/products.json?limit=250`;
    const headers = {
      "content-type": "application/json",
      "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
    };
    let products = await axios.get(shopifyUrl, "", headers);
    logger.info("Shopify Products Fetched Successfully!");
    const params = [];
    for (const product of products.data.products) {
      for (const variant of product.variants) {
        params.push({
          product_id: product.id,
          variation_id: variant.id,
          sku: variant.sku,
          price: variant.price,
          compare_at_price: variant.compare_at_price,
          stock: variant.inventory_quantity,
          inventory_item_id: variant.inventory_item_id,
        });
      }
    }
    await createProductsInBatches(params, batchOfInsertion);
    let nextPageLink = products.headers.link;
    const regex = /<([^>]+)>;\s*rel="next"/;
    let match = nextPageLink?.match(regex);
    let nextUrl = match ? match[1] : null;
    while (nextUrl !== null) {
      const nextProductParams = [];
      const nextPageProducts = await axios.get(nextUrl, "", headers);
      for (const product of nextPageProducts.data.products) {
        for (const variant of product.variants) {
          nextProductParams.push({
            product_id: product.id,
            variation_id: variant.id,
            sku: variant.sku,
            price: variant.price,
            compare_at_price: variant.compare_at_price,
            stock: variant.inventory_quantity,
            inventory_item_id: variant.inventory_item_id,
          });
        }
      }
      await createProductsInBatches(nextProductParams, batchOfInsertion);
      nextPageLink = nextPageProducts.headers.link;
      match = nextPageLink.match(regex);
      nextUrl = match ? match[1] : null;
      console.log(nextUrl);
    }
    return { status: 201, message: "Products inserted successfully!!" };
  } catch (error) {
    throw error;
  }
};
function delay(seconds) {
  return new Promise(resolve => {
    setTimeout(resolve, seconds * 1000);
  });
}
const updateProductsDataToShopify = async (virtualProductsTable) => {
  try {
    for (let product of virtualProductsTable) {
      const postVariantPriceUrl = postShopifyProductVariantPriceUrl(
        product.variation_id
      );
      const postVariantStockUrl = postShopifyItemStockUrl();
      const headers = {
        "content-type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
      };
      const postProductPriceParams = {
        variant: {},
      };
      let flag = false
      if (product["Discounted Price"] > 0 && product["Original Price"] > 0) {
        postProductPriceParams.variant.price = product["Discounted Price"];
        postProductPriceParams.variant.compare_at_price = product["Original Price"];
        await axios.put(postVariantPriceUrl, postProductPriceParams, headers);
        flag = true
      } else if (product["Original Price"] > 0 && product["Discounted Price"] <= 0) {
        postProductPriceParams.variant.price = product["Original Price"];
        postProductPriceParams.variant.compare_at_price = 0;
        await axios.put(postVariantPriceUrl, postProductPriceParams, headers);
        flag = true
      }
      if(product.Update_Stock === 0) {
        logger.info(`Product with id ${product.product_id} has been ${flag? `updated with price ${postProductPriceParams.variant.price} and no stock updated`: `no stock and price updated`}`)
        continue;
      }
      const postStockParams = {
        location_id: process.env.SHOPIFY_LOCATION_ID,
        inventory_item_id: product.inventory_item_id,
        available_adjustment: product.Update_Stock,
      };
      await delay(1)
      await axios.post(postVariantStockUrl, postStockParams, headers);
      logger.info(`Product with id ${product.product_id} has been updated with stock ${product["SysStock"]} and ${flag? `with price ${postProductPriceParams.variant.price}`:`no price updated`}`);
    }
    return { status: 200, message: "Data succcessfully updated!!" }
  } catch (error) {
    throw error
  }
}
app.get("/all-products", async (req, res, next) => {
  try {
    const response = await addShopifyProductsToDatabase();

    // const productsIndserted = await ShopifyProductIdModel.bulkCreate(params)
    logger.info(
      "Shopify Products destroyed and saved Successfully in database!"
    );

    const virtualProductsTable = await sequelize.query(
      "SELECT * FROM vhs_LCW_StockPrice"
    );
    const postProductPromise = [];
    const response1 = await updateProductsDataToShopify(virtualProductsTable[0])
    logger.info("Shopify Products Updated Successfully!");

    return res.status(200).json({ ...response, data: response1 });
  } catch (error) {
    logger.error("Error Products Update!");
    console.log(error)
    next(error);
  }
});

cron.schedule("0 0 * * *", async () => {
  try {
    const response = await addShopifyProductsToDatabase();

    // const productsIndserted = await ShopifyProductIdModel.bulkCreate(params)
    logger.info(
      "Shopify Products destroyed and saved Successfully in database!"
    );

    const virtualProductsTable = await sequelize.query(
      "SELECT * FROM vhs_LCW_StockPrice"
    );
    const postProductPromise = [];
    const response1 = await updateProductsDataToShopify(virtualProductsTable[0])
    logger.info("Shopify Products Updated Successfully!");
  } catch (error) {
    throw error;
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
    throw error;
  }
};

const createProductsInBatches = async (products, batchSize) => {
  const batches = Math.ceil(products.length / batchSize);
  console.log("batches------------------------", batches);
  for (let i = 0; i <= batches; i++) {
    const batchProducts = products.slice(i * batchSize, (i + 1) * batchSize);
    await ShopifyProductIdModel.bulkCreate(batchProducts);
  }
};

async function awaitPromisesWithDelay(promises, delay) {
  try {
    for (let i = 0; i < promises.length; i += 2) {
      const currentPromises = promises.slice(i, i + 2);
      await Promise.all(currentPromises);
      if (i + 2 < promises.length) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  } catch (error) {
    throw error;
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

const Sequelize = require('sequelize');

const sequelize = require('../db');

const ShopifyProductIdModel = sequelize.define('shopify_product_id', {
    id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    product_id:{
        type: Sequelize.STRING
    },
    sku:{
        type: Sequelize.STRING
    },
    variation_id: {
        type: Sequelize.STRING,
    },
    inventory_item_id: {
        type: Sequelize.STRING,
    },
    price: {
        type: Sequelize.FLOAT,
    },
    compare_at_price: {
        type: Sequelize.FLOAT,
    },
    stock: {
        type: Sequelize.INTEGER,
    },
    date: {
        type: Sequelize.STRING,
    },
    time: {
        type: Sequelize.STRING,
      },
}, {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
});

module.exports = ShopifyProductIdModel
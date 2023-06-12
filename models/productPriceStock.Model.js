const Sequelize = require('sequelize');

const sequelize = require('../db');

const ProductStockPriceModel = sequelize.define('product_stock_price', {
    id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    sku:{
        type: Sequelize.STRING
    },
    price:{
        type: Sequelize.FLOAT

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

module.exports = ProductStockPriceModel
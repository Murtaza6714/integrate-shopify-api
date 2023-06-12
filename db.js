const { Sequelize, DataTypes } = require("sequelize");

const dialect = "mssql";
const username = process.env.DB_USERNAME
const password = process.env.DB_PASSWORD
const host = process.env.DB_SERVER
const dbName = process.env.DB_NAME
const port = process.env.DB_PORT

const sequelize = new Sequelize(dbName, username, "1nf1N1ty$#$", {
  host,
  port: 1433,
  dialect,
//   logging: false,
//   dialectOptions: {
//     options: {
//         encryption: true
//     } 
    // ssl: {
    //     require: true,
    //     rejectUnauthorized: false,
    //   },
//   },
  //   operatorsAliases: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: false
  }
});
// const sequelize = new Sequelize(`mssql://hs:1nf1N1ty$#$@192.168.5.142:1433/focus8030`, {
//   dialect: 'mssql',
//   dialectOptions: {
//     encrypt: true, // Use this option if your SQL Server requires an encrypted connection
//   },
// });

const syncDbAndAuthenticate = async () => {
  try {
    // dont manipulate this statement below
    await sequelize.sync({ force: false, alter: { drop: false } })
    console.log("re-sync db");
  } catch (error) {
    throw error
  }
}

syncDbAndAuthenticate()

sequelize.authenticate()
  .then((result) => {
    console.log("Connected To Database");
  })
  .catch((err) => {
    console.log(err);
  });
module.exports = sequelize;

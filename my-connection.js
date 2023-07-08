const mysql = require('mysql');
require('dotenv').config();

exports.connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_KEY,
  database: 'rsp_game'
});
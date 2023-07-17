const mysql = require('mysql');
require('dotenv').config();

exports.connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_KEY,
  database: 'rsp_game'
  // multipleStatements: true
});

exports.beginTransactionWithPromise = connection => {
  return new Promise((resolve, reject) => {
    connection.beginTransaction(error => {
      if (error) {
        reject(error);
        console.log('---beginTransaction error---');
        console.log(error);
        return;
      }
      resolve();
      console.log('beginTransaction');
    });
  });
};

exports.decideNewMatchIdWithPromise = connection => {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT MAX(match_id) + 1 AS newMatchId FROM matches',
      (error, results) => {
        if (error) {
          reject(error);
          console.log('---decideNewMatchIdWithPromise error---');
          console.log(error);
          return;
        }
        resolve(results[0].newMatchId);
      }
    );
  });
};

exports.insertResultWithPromise = (connection, matchResult) => {
  return new Promise((resolve, reject) => {
    connection.query(
      'INSERT INTO matches (match_id, user_id, nickname, hand, result) VALUES ?',
      [matchResult],
      (error) => {
        if (error) {
          reject(error);
          console.log('---insertResultWithPromise error---');
          console.log(error);
          return;
        }
        resolve();
      }
    );
  });
};

exports.commitWithPromise = connection => {
  return new Promise((resolve, reject) => {
    connection.commit(error => {
      if (error) {
        reject(error);
        console.log('---commitWithPromise error---');
        console.log(error);
        return;
      }
      resolve(error);
      console.log('commit');
    });
  });
};

exports.rollbackWithPromise = (connection, error) => {
  return new Promise((resolve, reject) => {
    connection.rollback(() => {
      reject(error);
      console.log('rollback');
    });
  });
};
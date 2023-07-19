const mysql = require('mysql');
require('dotenv').config();

exports.connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_KEY,
  database: 'rsp_game'
  // multipleStatements: true
});

exports.getMatchRecordsWithPromise = (connection, req) => {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT * FROM matches WHERE match_id IN (\
        SELECT match_id FROM matches WHERE user_id = ?\
      )',
      [req.session.userId],
      (error, results) => {
        if (error) {
          reject(error);
          console.log('---selectMatchRecordsWithPromise error---');
          console.log(error);
          return;
        }
        resolve(results);
      }
    );
  });
};

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

exports.insertResultWithPromise = (connection, matchResults) => {
  // バルクインサート・プレースホルダ・サブクエリを同時に利用するために、
  // クエリを分割して動的に生成する
  const statement = 'INSERT INTO matches\
    (match_id, user_id, nickname, hand, result) VALUES ';
  const placeHolder = matchResults.map((_result, index) => {
    return `((SELECT max_match_id + 1 FROM (SELECT MAX(match_id) \
      AS max_match_id FROM matches) AS tmp_table) - ${index}, ?)`;
  }).join(',');
  return new Promise((resolve, reject) => {
    connection.query(
      statement + placeHolder,
      [...matchResults],
      (error) => {
        if (error) {
          reject(error);
          console.log('---insertResultWithPromise error---\n', error);
          return;
        }
        resolve();
        console.log('---matchResults---\n', matchResults);
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
const mysql = require('mysql');
require('dotenv').config();

exports.connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_KEY,
  database: 'rsp_game'
  // multipleStatements: true
});

exports.beginTransaction = connection => {
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

exports.commit = connection => {
  return new Promise((resolve, reject) => {
    connection.commit(error => {
      if (error) {
        reject(error);
        console.log('---commit error---');
        console.log(error);
        return;
      }
      resolve(error);
      console.log('commit');
    });
  });
};

exports.rollback = (connection, error) => {
  return new Promise((resolve, reject) => {
    connection.rollback(() => {
      reject(error);
      console.log('rollback');
    });
  });
};

exports.tryRegisterUser = (connection, req, bcrypt) => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(req.body.accountPassword, 10, (error, hash) => {
      connection.query(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [req.body.username, hash],
        (error, results) => error ? reject(error) : resolve(results)
      );
    });
  });
};

exports.authenticateUser = (connection, req, bcrypt) => {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT * FROM users WHERE username = ?',
      [req.body.username],
      (error, results) => {
        if (!results.length) return reject();
        const pass = req.body.accountPassword;
        const hash = results[0].password;
        bcrypt.compare(pass, hash, (error, isEqual) => {
          isEqual ? resolve(results) : reject();
        });
      }
    );
  });
};

exports.fetchMatchRecords = (connection, req) => {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT * FROM matches WHERE match_id IN (\
        SELECT match_id FROM matches WHERE user_id = ?\
      )',
      [req.session.userId],
      (error, results) => error ? reject(error) : resolve(results)
    );
  });
};

exports.decideNewMatchId = connection => {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT MAX(match_id) + 1 AS newMatchId FROM matches FOR UPDATE',
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

exports.insertMatchResults = (connection, matchResults) => {
  return new Promise((resolve, reject) => {
    connection.query(
      'INSERT INTO matches (match_id, user_id, nickname, hand, result) VALUES ?',
      [matchResults],
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
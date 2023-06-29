const { body } = require('express-validator');

// 未使用のnameがあるとエラーになるため、分割した
exports.roomValidator = [
  body('room').isInt().not().isEmpty(),
  body('nickname').isLength({min: 1, max: 8})
  // 特殊文字を取り除く
  .blacklist(['<', '>', '&', '\'', '"', '/'])
  .not().isEmpty().isLength({min: 1, max: 8}),
  body('password').isLength({min: 0, max: 8})
  .blacklist(['<', '>', '&', '\'', '"', '/']),
];

exports.accountValidator = [
  body('username').isLength({min: 1, max: 8})
  .blacklist(['<', '>', '&', '\'', '"', '/'])
  .not().isEmpty().isLength({min: 1, max: 8}),
  body('accountPassword').isLength({min: 4, max: 16})
  .blacklist(['<', '>', '&', '\'', '"', '/'])
];
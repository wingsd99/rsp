const session = require('express-session');
require('dotenv').config();

console.log(process.env.SESSION_KEY);


exports.session = session({
  secret: process.env.SESSION_KEY,
  resave: false,
  saveUninitialized: false
});

exports.checkSession = (req, res, next) => {
  if (!req.session.userId) {
    res.locals.username = 'guest';
    res.locals.isLoggedIn = false;
  } else {
    res.locals.username = req.session.username;
    res.locals.isLoggedIn = true;
  }
  next();
};

exports.wrap = middleware => {
  return (socket, next) => middleware(socket.request, {}, next);
};

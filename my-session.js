const session = require('express-session');

exports.session = session({
  secret: '********',
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
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/yoruproxy');

var Users = new mongoose.Schema({
  screen_name : { type: String, index: true },
  apikey : { type: String },
  apisecret : { type: String },
  enable : { type: Boolean, default: true },
  created: { type: Date, default: Date.now }
});

exports.Users = db.model('users', Users );


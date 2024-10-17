const mongoose = require("mongoose");

const crackSchema = new mongoose.Schema({
  name: String,
  url: String,
  image: String,
  description: String,
  categories: String,
  date: String,
  ip: String
});

module.exports = mongoose.model('Crack', crackSchema)
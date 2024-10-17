const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema({
  author:String,
  avatar:String,
  title: String,
  image: String,
  description: String,
  date: String,
  link:{
    name:String,
    url:String,
  },
  by:String
});

module.exports = mongoose.model('News', newsSchema)
const mongoose = require('mongoose');

const SharedContactsWithSchema = new mongoose.Schema({
  UserID: {
    type: Number,
    required: true,
  },
  ContactID: {
    type: Number,
    required: true,
  },
  sharedWith: {
    type: [Number],
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('sharedcontactswith', SharedContactsWithSchema);

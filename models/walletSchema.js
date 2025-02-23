const mongoose = require("mongoose");
const { Schema } = mongoose;

const walletSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0.0,
  },
  transactions: [
    {
      amount: {
        type: Number,
        required: true,
      },
      transactionType: {
        type: String,
        enum: ['credit', 'debit'],
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
           
    
      reason: {
        type: String,
        required: true,
      },
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Wallet = mongoose.model('Wallet', walletSchema);


module.exports = Wallet;
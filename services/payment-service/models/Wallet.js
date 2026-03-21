const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, unique: true, index: true },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'LKR' },
    version: { type: Number, default: 0 },
  },
  { timestamps: true },
);

walletSchema.statics.getOrCreate = async function (customerId, currency = 'LKR') {
  let w = await this.findOne({ customerId });
  if (!w) {
    w = await this.create({ customerId, balance: 0, currency });
  }
  return w;
};

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;

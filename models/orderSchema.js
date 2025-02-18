

const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
       },

  orderedItems: [
    {
      productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
      productName: { type: String, required: true }, 
      productImage: { type: String, required: true }, 
      quantity: { type: Number, required: true },
      price: { type: Number, default: 0 },
    },
  ],
  totalPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },
  addressId: {
    type: Schema.Types.ObjectId,
    ref: "Address",
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  address: {
    name: { type: String, required: true },
    landmark: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    phone: { type: String, required: true },
  },
  invoiceDate: { type: Date, default: Date.now },
  status: {
    type: String,
    required: true,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
      "Return Request",
      "Returned",
    ],
  },
  deliveredOn:{type: Date,},
  returnReason: { type: String },
  cancelReason: { type: String },
  paymentMethod: { type: String, required: true },
  createdOn: { type: Date, default: Date.now, required: true },
  couponApplied: { type: Boolean, default: false },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;

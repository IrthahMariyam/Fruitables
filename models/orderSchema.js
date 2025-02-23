

const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
       },
 
 razorpayOrderId: { type: String },  
 razorpayPaymentId: { type: String }, 
 razorpayPaymentStatus: { type: String, enum: ['pending', 'Paid', 'Failed'] },
 paymentStatus: { type: String, enum: ['pending', 'Paid', 'Failed'] },
  orderedItems: [
    {
      productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
      productName: { type: String, required: true }, 
      productImage: { type: String, required: true }, 
      quantity: { type: Number, required: true },
      price: { type: Number, default: 0 },
      discountApplied: { type: Number, default: 0 },
    },
  ],
 
  discount: { type: Number, default: 0 },
  finalAmount: { type: Number, },
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
      'Return Approved',
      'Return Rejected',
      "Returned",
    ],
  },
  subtotal:{type:Number},
  couponCode:{type:String},
  couponDiscount:{type:Number},
  totalPrice:{type:Number,},
  
  orderDate: { type: Date, default: Date.now },
  returnReason: { type: String },
  cancelReason: { type: String },
  paymentMethod: { type: String, required: true,enum:["COD","WALLET","RAZORPAY"] },
  createdOn: { type: Date, default: Date.now, required: true },
 }, {
    timestamps: true
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;

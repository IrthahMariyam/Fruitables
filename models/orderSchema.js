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
 razorpayPaymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed'] },
 paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed'] },
 orderedItems: [
    {
      productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
      productName: { type: String, required: true }, 
      productImage: { type: String, required: true }, 
      quantity: { type: Number, required: true },
      price: { type: Number, default: 0 },
      discountApplied: { type: Number, default: 0 },
      totalPrice:{type:Number,},
      status: { 
        type: String,
        required: true,

        enum: [
          "Pending", "Processing", "Shipped","Out for Delivery", "Delivered", "Cancelled", "Return Request",'Return Approved', 'Return Rejected', "Returned", ],
    },
    cancellationReason: {
        type: String,
        default: null
      },
      returnRequestDate:{
        type:Date
      },
      returnReason: {
        type: String,
        default: null
    },
    returnDeclinedReason: {
        type: String
    },
    deliveredDateTime:{
        type:Date
    }
    },
  ],
  deliveredDateTime:{
    type:Date
},
   discount: { type: Number, default: 0 },
     subtotal:{type:Number,default:0},
     finalAmount: { type: Number, default:0},
   couponCode:{type:String,default:null},
   deliveryCharge:{type:Number,default:0},
 //  couponDiscount:{type:Number},
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
    default:"Pending",
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
 
  orderDate: { type: Date, default: Date.now },
  returnReason: { type: String },
  cancelReason: { type: String },
  paymentMethod: { type: String, required: true,enum:["COD","WALLET","RAZORPAY"] },
  refundStatus: {
    type: String,
    enum: ['Not Initiated', 'Processing', 'Completed', 'Failed'],
    default: 'Not Initiated'
}, refundedAmount: {
    type: Number,
    default: 0  // To track the refunded amount in case of return or cancellation
},
  createdOn: { type: Date, default: Date.now, required: true },
 }, {
    timestamps: true
 });

 const Order = mongoose.model("Order", orderSchema);
 module.exports = Order;

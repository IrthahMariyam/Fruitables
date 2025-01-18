const mongoose=require('mongoose')
const {Schema}=mongoose

const orderSchema = new Schema({
    orderedItems: [
        {
            product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, default: 0 },
        },
    ],
    totalPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    addressId:{
        type: Schema.Types.ObjectId,
        ref:"Address",
        required:true,
    },
    userId:{
        type: Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    
    invoiceDate: { type: Date, default: Date.now },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
    },
    paymentMethod: { type: String, required: true },
    createdOn: { type: Date, default: Date.now, required: true },
    couponApplied: { type: Boolean, default: false },
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;

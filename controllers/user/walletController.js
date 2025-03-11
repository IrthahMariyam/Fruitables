const crypto = require('crypto');
const Razorpay = require('razorpay');
const env = require("dotenv").config();
const Wallet= require('../../models/walletSchema')
const User=require('../../models/userSchema');
const Cart=require('../../models/cartSchema')


const KeyId = process.env.KEY_ID;
const SecretKey = process.env.SECRET_KEY;

const razorpay = new Razorpay({
    key_id: KeyId,
    key_secret: SecretKey,
});

//   Create Order for Adding Money
const createAddmoneyWallet = async (req, res) => {
   
    const { amount } = req.body;
    const options = {
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: `receipt_order_${Date.now()}`,
    };

    try {
        const order = await razorpay.orders.create(options);
        res.json({
            orderId: order.id,
            amount: order.amount, 
            currency: order.currency,
        });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: "Failed to create order" });
    }
};

//   Confirm Payment & Update Wallet
const addMoneyWallet = async (req, res) => {
   
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = req.body;

    const hash = crypto.createHmac("sha256", process.env.SECRET_KEY)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

if (hash !== razorpay_signature) {
    return res.json({ ok: false, msg: "Payment verification failed!" });
}


    try {
        let wallet = await Wallet.findOne({ userId: req.session.user._id });
        if (!wallet) {
            wallet = new Wallet({ userId: req.session.user._id, balance: 0, transactions: [] });
        }

        wallet.balance += Number(amount);
        wallet.transactions.push({
            amount: amount,
            transactionType: 'credit',
            description: 'Money added to wallet',
            productId: null,
            reason: 'Wallet recharge',
            date: new Date(),
        });

        await wallet.save();
        res.json({ ok: true, msg: "Money added to wallet successfully!" });
    } catch (error) {
        console.error("Error updating wallet:", error);
        res.status(500).json({ ok: false, msg: "An error occurred while updating the wallet balance." });
    }
};

// Get Wallet Details
const getWallet = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        if (!user) return res.redirect("/");

        const cart = await Cart.findOne({ userId }) || { items: [] };
        let wallet = await Wallet.findOne({ userId }).populate('transactions');

        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0, transactions: [] });
            await wallet.save();
        }

        const sortedTransactions = wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.render('wallet', {
            user,
            wallet,
            cart,
            transactions: sortedTransactions,
        });
    } catch (error) {
        console.error('Error fetching wallet:', error);
        res.status(500).send('Server Error');
    }
};

//  Money from Wallet for Shopping
const purchaseUsingWallet = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { totalAmount, productId, qty } = req.body;

        const wallet = await Wallet.findOne({ userId });
        if (!wallet || wallet.balance < totalAmount) {
            return res.json({ success: false, msg: "Insufficient wallet balance!" });
        }

        // Deduct from wallet
        wallet.balance -= totalAmount;
        wallet.transactions.push({
            amount: totalAmount,
            transactionType: 'debit',
            description: `Purchase for product ID ${productId}`,
            productId,
            reason: 'Purchase',
            qty,
            date: new Date(),
        });

        await wallet.save();
        res.json({ success: true, msg: "Purchase successful using wallet!" });
    } catch (error) {
        console.error("Error in purchase:", error);
        res.status(500).json({ success: false, msg: "Server error in purchase." });
    }
};


const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = req.body;

        const generatedSignature = crypto
            .createHmac("sha256", process.env.SECRET_KEY)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            return res.json({ ok: false, msg: "Payment verification failed!" });
        }

        // If payment is verified, add money to wallet
        const user = await User.findById(req.user.id);
        user.wallet.balance += amount;
        user.wallet.transactions.push({
            transactionType: "credit",
            amount: amount,
            description: "Added to wallet via Razorpay",
            date: new Date(),
        });

        await user.save();
        return res.json({ ok: true, msg: "Money added successfully!" });

    } catch (error) {
        console.error("Payment Verification Error:", error);
        return res.status(500).json({ ok: false, msg: "Internal Server Error!" });
    }
};

module.exports= {
    getWallet,
    createAddmoneyWallet,
    addMoneyWallet,
    purchaseUsingWallet,
    verifyPayment,
}

const crypto = require('crypto');
const Razorpay = require('razorpay');
const Wallet= require('../../models/walletSchema')
const User=require('../../models/userSchema');
const Cart=require('../../models/cartSchema')


const KeyId = process.env.KEY_ID;
const SecretKey = process.env.SECRET_KEY;

const razorpay = new Razorpay({
    key_id: KeyId,
    key_secret: SecretKey,
});

// Create Order for Adding Money
const createAddmoneyToWallet = async (req, res) => {
    

    let user = req.session?.user;

    if (!user) {
        
        return res.status(401).json({ error: "User not authenticated" });
    }

    // Verify user is not blocked before proceeding
    user = await User.findOne({ _id: user._id });
    

    if (!user || user.isBlocked) {
        
        return res.status(403).json({ error: "User blocked by admin" });
    }

    const { amount } = req.body;
    

    if (!amount || isNaN(amount) || amount <= 0) {
        
        return res.status(400).json({ error: "Invalid amount" });
    }

    const options = {
        amount: amount * 100,
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
        console.error("Failed to create order:", error);
        res.status(500).json({ error: "Failed to create order" });
    }
};

const addMoneyWallet = async (req, res) => {
    let user = req.session?.user;
    

    if (!user) {
        return res.status(401).json({ error: "User not authenticated" });
    }

    user = await User.findOne({ _id: user._id, isBlocked: false });

    if (!user) {
        return res.status(403).json({ error: "User blocked by admin" });
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = req.body;

    // **Verify Razorpay payment signature**
    const hash = crypto
        .createHmac("sha256", process.env.SECRET_KEY)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

    if (hash !== razorpay_signature) {
        return res.status(403).json({ ok: false, msg: "Payment verification failed!" });
    }

    try {
        let wallet = await Wallet.findOne({ userId: req.session.user._id });

        if (!wallet) {
            wallet = new Wallet({
                userId: req.session.user._id,
                balance: 0,
                transactions: [],
            });
        }

        const validAmount = Number(amount);
        if (isNaN(validAmount) || validAmount <= 0) {
            return res.status(400).json({ ok: false, msg: "Invalid amount specified." });
        }

        // **Update wallet balance**
        wallet.balance += validAmount;
        wallet.transactions.push({
            amount: validAmount,
            transactionType: "credit",
            description: "Money added to wallet",
            productId: null,
            reason: "Wallet recharge",
            date: new Date(),
        });

        await wallet.save();

        return res.json({ ok: true, msg: "Money added to wallet successfully!" });

    } catch (error) {
        console.error("Error in addMoneyWallet:", error);
        
        // **Ensure only one response is sent**
        if (!res.headersSent) {
            return res.status(500).json({ ok: false, msg: "An error occurred while updating the wallet balance." });
        }
    }
};

const getWallet = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        if (!user) return res.redirect("/");

        const cart = await Cart.findOne({ userId: userId }) || { items: [] };

        const page = parseInt(req.query.page) || 1; 
        const limit = 10; 
        const skip = (page - 1) * limit;

        let wallet = await Wallet.findOne({ userId: userId });

        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0, transactions: [] });
            await wallet.save();
        }

        const totalTransactions = wallet.transactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);

        
        const transactions = wallet.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date)) 
            .slice(skip, skip + limit); 

        res.render('wallet', {
            user,
            wallet,
            cart,
            transactions, 
            currentPage: page,
            totalPages
        });
    } catch (error) {
        
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
        
        return res.status(500).json({ ok: false, msg: "Internal Server Error!" });
    }
};

module.exports= {
    getWallet,
    createAddmoneyToWallet,
    addMoneyWallet,
    purchaseUsingWallet,
    verifyPayment,
}

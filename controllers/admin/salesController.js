
const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const moment = require("moment");
const PDFDocument = require("pdfkit"); 
const excelJS = require("exceljs"); 

const loadSalesPage = async (req, res) => {
    if (req.session.admin) {
        try {
            // Fetch all users and products
            const users = await User.find();
            const products = await Product.find();
            const orders = await Order.find();


            const deliveredOrdersCount = await Order.countDocuments({ status: "Delivered" });

            const totalRevenue = await Order.aggregate([
                { 
                    $group: { 
                        _id: null, 
                        totalRevenue: { $sum: "$finalAmount" } 
                    } 
                }
            ]);

            const revenueAmount = totalRevenue.length > 0 ? totalRevenue[0].totalRevenue : 0;

            // Calculate total sales and total discount
            let totalSales = 0;
            let totalDiscount = 0;

            orders.forEach(order => {
                totalSales += order.finalAmount;  // Ensure field name matches schema
                totalDiscount += order.discount;
            });

            // Get today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Get start of the week (last 7 days)
            const lastWeek = new Date();
            lastWeek.setDate(today.getDate() - 7);

            // Get start of the month
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            // Get start of the year
            const firstDayOfYear = new Date(today.getFullYear(), 0, 1);

            // Filter sales data
            const dailySales = orders.filter(order => new Date(order.createdOn) >= today);
            const weeklySales = orders.filter(order => new Date(order.createdOn) >= lastWeek);
            const monthlySales = orders.filter(order => new Date(order.createdOn) >= firstDayOfMonth);
            const yearlySales = orders.filter(order => new Date(order.createdOn) >= firstDayOfYear);

            // Calculate total amounts for each period
            const calculateTotal = (orders) => orders.reduce((sum, order) => sum + order.finalAmount, 0);

            const totalDailySales = calculateTotal(dailySales);
            const totalWeeklySales = calculateTotal(weeklySales);
            const totalMonthlySales = calculateTotal(monthlySales);
            const totalYearlySales = calculateTotal(yearlySales);

            // Render the dashboard page
            res.render("salesreport", {
                users,
                orders,
                products,
                totalSales,
                totalDiscount,
                totalDailySales,
                totalWeeklySales,
                totalMonthlySales,
                totalYearlySales,
                deliveredOrdersCount,

                revenueAmount
            });

        } catch (error) {
            console.error("Error loading dashboard:", error);
            res.redirect("/pageNotFound");
        }
    } else {
        res.redirect("/admin/login");
    }
};

const salesReport = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        let start, end;

        // const today = new Date();
        // today.setHours(0, 0, 0, 0);
        const today = moment.utc().startOf('day').toDate();
        start = new Date(0); // Unix epoch (all time)
        end = new Date(); // Current date
        switch (filter) {
            case "daily":
                // start = today;
                // end = new Date(today);
                // end.setHours(23, 59, 59, 999);
                start = today;
                end = moment.utc(today).endOf('day').toDate();
                break;
            case "weekly":
                start = new Date(today);
                start.setDate(today.getDate() - 7);
                end = today;
                break;
            case "monthly":
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case "yearly":
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date(today.getFullYear(), 11, 31);
                break;
            case "custom":
                start = new Date(startDate);
                end = new Date(endDate);
                break;
            default:
                return res.status(400).json({ message: "Invalid filter option" });
        }

        // Fetch orders within the selected date range and populate user details
        const orders = await Order.find({
            createdOn: { $gte: start, $lte: end },
            status: "Delivered"  // Filter for delivered orders only
        }).populate("userId", "name"); 
console.log("orders in sales",orders)
        // Format response data correctly
        const reportData = orders.map(order => ({
            orderId: order.orderId,   // Ensure you use the correct field name
            customerName: order.userId ? order.userId.name : "Guest",  // Fetch populated user name
            PayableAmount: order.finalAmount || 0.00,  // Use correct schema field
            discount: order.discount || 0,  // Ensure discount field is fetched correctly
            date: order.createdOn.toISOString().split('T')[0] // Format date
        }));

        res.json({ success: true, reportData });

    } catch (error) {
        console.error("Error fetching sales report:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


module.exports = {
    loadSalesPage,
    salesReport,
}



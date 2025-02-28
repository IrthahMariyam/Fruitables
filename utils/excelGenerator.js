const ExcelJS = require('exceljs');

function generateExcel(data) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 20 },
        { header: 'Client Name', key: 'clientName', width: 20 },
        { header: 'Order Date', key: 'orderDate', width: 20 },
        { header: 'Items Count', key: 'itemsCount', width: 15 },
        { header: 'Total Amount (₹)', key: 'totalAmount', width: 20 },
        { header: 'Offer Discount (₹)', key: 'offerPrice', width: 20 },
        { header: 'Coupon Discount (₹)', key: 'couponDiscount', width: 20 },
        { header: 'Delivery Charge (₹)', key: 'deliveryCharge', width: 20 },
        { header: 'Final Price (₹)', key: 'finalPrice', width: 20 },
        { header: 'Payment Method', key: 'paymentMethod', width: 20 },
        { header: 'Status', key: 'status', width: 20 }
    ];

    data.forEach(row => worksheet.addRow(row));
    return workbook.xlsx.writeBuffer();
}

module.exports = { generateExcel };
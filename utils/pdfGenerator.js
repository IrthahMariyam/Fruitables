const pdf = require('pdf-lib');
const fs = require('fs');

async function generatePDF(data) {
    const { PDFDocument } = pdf;
    const doc = await PDFDocument.create();
    const page = doc.addPage();

    let y = 750;
    page.drawText('Sales Report', { x: 50, y, size: 20 });

    y -= 50;
    data.forEach((row, index) => {
        page.drawText(
            `Order ID: ${row.orderId}, Client: ${row.clientName}, Total: ₹${row.finalPrice}`,
            { x: 50, y: y - index * 20, size: 10 }
        );
    });

    const pdfBytes = await doc.save();
    return pdfBytes;
}

module.exports = { generatePDF };
// src/utils/thermalPrinter.js

// Currency ko format karne ke liye ek chota helper function
const formatCurrency = (amount, currency = 'Rs.') => {
    return `${currency} ${Number(amount).toFixed(2)}`;
};

export const printThermalReceipt = (saleDetails, currency) => {
    const {
        shopName,
        shopAddress,
        shopPhone,
        saleId,
        saleDate,
        customerName,
        items,
        subtotal,
        discount,
        grandTotal,
        amountPaid,
    } = saleDetails;

    // Receipt ka HTML content
    let receiptContent = `
        <div style="width: 280px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000;">
            <h3 style="text-align: center; margin: 0;">${shopName || 'Your Shop'}</h3>
            <p style="text-align: center; margin: 2px 0;">${shopAddress || ''}</p>
            <p style="text-align: center; margin: 2px 0;">${shopPhone || ''}</p>
            <hr style="border-top: 1px dashed #000; margin: 10px 0;">
            <p><strong>Receipt #:</strong> ${saleId}</p>
            <p><strong>Date:</strong> ${new Date(saleDate).toLocaleString()}</p>
            <p><strong>Customer:</strong> ${customerName}</p>
            <hr style="border-top: 1px dashed #000; margin: 10px 0;">
            <table>
                <thead>
                    <tr>
                        <th style="text-align: left; width: 150px;">Item</th>
                        <th style="text-align: right;">Qty</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Har item ke liye table row
    items.forEach(item => {
        receiptContent += `
            <tr>
                <td style="text-align: left;">${item.name}</td>
                <td style="text-align: right;">${item.quantity}</td>
                <td style="text-align: right;">${formatCurrency(item.price_at_sale * item.quantity, currency)}</td>
            </tr>
        `;
    });

    receiptContent += `
                </tbody>
            </table>
            <hr style="border-top: 1px dashed #000; margin: 10px 0;">
            <div style="display: flex; justify-content: space-between;">
                <span>Subtotal:</span>
                <span>${formatCurrency(subtotal, currency)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Discount:</span>
                <span>${formatCurrency(discount, currency)}</span>
            </div>
            <hr style="border-top: 1px solid #000; margin: 5px 0;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
                <span>GRAND TOTAL:</span>
                <span>${formatCurrency(grandTotal, currency)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Amount Paid:</span>
                <span>${formatCurrency(amountPaid, currency)}</span>
            </div>
            <hr style="border-top: 1px dashed #000; margin: 10px 0;">
            <p style="text-align: center; margin-top: 10px;">Thank you for your purchase!</p>
        </div>
    `;

    // Nayi window khol kar print karein
    const printWindow = window.open('', '_blank', 'width=300,height=500');
    printWindow.document.write(`
        <html>
            <head><title>Print Receipt</title></head>
            <body style="margin: 0; padding: 5px;">
                ${receiptContent}
                <script>
                window.onload = function() {
                    // Tarteeb Theek Ki Gayi Hai:

                    // 1. Pehle browser ko batayein ke print ke baad kya karna hai.
                    window.addEventListener('afterprint', function() {
                        window.close();
                    });

                    // 2. Window par focus karein taake yeh samne aa jaye.
                    window.focus();

                    // 3. Aakhir mein print ka command dein.
                    window.print();
                }
            </script>
            </body>
        </html>
    `);
    printWindow.document.close();
};
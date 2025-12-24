// src/utils/thermalPrinter.js

import QRCode from 'qrcode'; // <--- IMPORT ADDED

// Note: Yeh function ab 'async' hai
export const printThermalReceipt = async (saleDetails, currency = 'PKR') => {
    const {
        shopName, shopAddress, shopPhone, saleId, saleDate, customerName,
        items, subtotal, discount, grandTotal, amountPaid, footerMessage, showQrCode
    } = saleDetails;

    const formatNumber = (num) => Number(num).toFixed(2);
    const formatMoney = (num) => `${currency} ${Number(num).toFixed(2)}`;

    // --- QR CODE GENERATION ---
    let qrCodeImgTag = '';
    if (showQrCode) {
        try {
            const qrDataUrl = await QRCode.toDataURL(`INV:${saleId}`, { width: 80, margin: 0 });
            qrCodeImgTag = `<img src="${qrDataUrl}" style="display: block; margin: 0 auto 10px auto; width: 80px; height: 80px;" />`;
        } catch (err) {
            console.error("QR Generation failed", err);
        }
    }

    let receiptContent = `
        <div style="width: 270px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; margin: 0 auto;">
            
            <!-- HEADER -->
            <div style="text-align: center; margin-bottom: 10px;">
                <h2 style="margin: 0; font-size: 16px; font-weight: bold;">${shopName || 'MY SHOP'}</h2>
                <p style="margin: 2px 0; font-size: 11px;">${shopAddress || ''}</p>
                <p style="margin: 2px 0; font-size: 11px;">${shopPhone || ''}</p>
            </div>

            <hr style="border-top: 1px dashed #000; margin: 5px 0;">

            <!-- QR CODE (Center mein) -->
            ${qrCodeImgTag}

            <!-- INFO -->
            <div style="font-size: 11px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Receipt #:</span>
                    <span>${saleId}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Date:</span>
                    <span>${new Date(saleDate).toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Customer:</span>
                    <span>${customerName}</span>
                </div>
            </div>

            <hr style="border-top: 1px dashed #000; margin: 5px 0;">

            <!-- ITEMS TABLE -->
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                    <tr style="border-bottom: 1px dashed #000;">
                        <th style="text-align: left; width: 55%; padding-bottom: 4px;">Item</th>
                        <th style="text-align: center; width: 15%; padding-bottom: 4px;">Qty</th>
                        <th style="text-align: right; width: 30%; padding-bottom: 4px;">Total</th>
                    </tr>
                </thead>
                <tbody>
    `;

    items.forEach(item => {
        let attrRow = '';
        if (item.attributes) {
            attrRow = `<div style="font-size: 10px; color: #000; margin-top: 2px;">(${item.attributes})</div>`;
        }
        let imeiRow = '';
        if (item.imeis && item.imeis.length > 0) {
            imeiRow = `<div style="font-size: 10px; color: #000; margin-top: 2px;">IMEI: ${item.imeis.join(', ')}</div>`;
        } else if (item.imei) {
            imeiRow = `<div style="font-size: 10px; color: #000; margin-top: 2px;">IMEI: ${item.imei}</div>`;
        }

        receiptContent += `
            <tr>
                <td style="text-align: left; padding-top: 6px; padding-bottom: 6px; vertical-align: top;">
                    <span style="font-weight: bold; font-size: 12px;">${item.name}</span>
                    ${attrRow}
                    ${imeiRow}
                </td>
                <td style="text-align: center; padding-top: 6px; vertical-align: top;">${item.quantity}</td>
                <td style="text-align: right; padding-top: 6px; vertical-align: top;">${formatNumber(item.price_at_sale * item.quantity)}</td>
            </tr>
        `;
    });

    receiptContent += `
                </tbody>
            </table>

            <hr style="border-top: 1px dashed #000; margin: 10px 0;">

            <!-- TOTALS -->
            <div style="font-size: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span>Subtotal:</span>
                    <span>${formatMoney(subtotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span>Discount:</span>
                    <span>${formatMoney(discount)}</span>
                </div>
                
                <hr style="border-top: 1px solid #000; margin: 5px 0;">
                
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin: 5px 0;">
                    <span>GRAND TOTAL:</span>
                    <span>${formatMoney(grandTotal)}</span>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
    <span>Payment Method:</span>
    <span>${saleDetails.payment_method || 'Cash'}</span>
</div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span>Amount Paid:</span>
                    <span>${formatMoney(amountPaid)}</span>
                </div>
            </div>

            <hr style="border-top: 1px dashed #000; margin: 10px 0;">

            <!-- WARRANTY POLICY -->
            ${footerMessage ? `
            <div style="text-align: left; font-size: 10px; margin-bottom: 10px;">
                <p style="font-weight: bold; margin: 0 0 2px 0;">Terms & Conditions:</p>
                <p style="margin: 0; white-space: pre-wrap;">${footerMessage}</p>
            </div>
            <hr style="border-top: 1px dashed #000; margin: 10px 0;">
            ` : ''}
            
            <!-- FOOTER -->
            <div style="text-align: center; font-size: 11px;">
                <p>Thank you for your purchase!</p>
                <p>Software by: <b>SadaPos</b></p>
            </div>
        </div>
    `;

    const printWindow = window.open('', '_blank', 'width=300,height=600');
    printWindow.document.write(`
        <html>
            <head>
                <title>Print Receipt</title>
                <style>
                    body { margin: 0; padding: 5px; background-color: #fff; }
                    @media print {
                        @page { margin: 0; size: auto; }
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                ${receiptContent}
                <script>
                    window.onload = function() {
                        window.focus();
                        setTimeout(() => { 
                            window.print(); 
                            window.close();
                        }, 500);
                    }
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
};
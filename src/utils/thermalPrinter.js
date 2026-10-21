// src/utils/thermalPrinter.js

import QRCode from 'qrcode'; 
import dayjs from 'dayjs';

// --- NAYA IZAFA: Thermal Direct Print Helper (No Popup Window / PWA & Full-Screen Friendly) ---
const printThermalDirectHtml = (htmlContent) => {
    let iframe = document.getElementById('hidden-thermal-print-iframe');
    if (iframe) {
        iframe.remove();
    }

    iframe = document.createElement('iframe');
    iframe.id = 'hidden-thermal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Print Thermal Receipt</title>
                <style>
                    body { margin: 0; padding: 5px; background-color: #fff; }
                    @media print {
                        @page { margin: 0; size: auto; }
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                ${htmlContent}
                <script>
                    window.onload = function() {
                        window.focus();
                        setTimeout(() => {
                            window.print();
                        }, 250);
                    };
                </script>
            </body>
        </html>
    `);
    doc.close();
};

// Note: Yeh function ab 'async' hai
export const printThermalReceipt = async (saleDetails, currency = 'PKR') => {
    const {
        shopName, shopAddress, shopPhone, saleId, invoice_id, saleDate, customerName,
        items, subtotal, discount, grandTotal, amountPaid, footerMessage, showQrCode,
        taxAmount, taxName, taxRate, 
        fbrInvoiceNumber, fbrFeeApplied, shopLogo // <--- NAYA IZAFA
    } = saleDetails;

    const formatNumber = (num) => Number(num).toFixed(2);
    const formatMoney = (num) => `${currency} ${Number(num).toFixed(2)}`;

    // --- QR CODE GENERATION (Caption Ke Sath) ---
    let qrCodeImgTag = '';
    if (showQrCode) {
        try {
            const qrText = fbrInvoiceNumber ? fbrInvoiceNumber : `INV:${saleId}`;
            const qrDataUrl = await QRCode.toDataURL(qrText, { width: 80, margin: 0 });
            qrCodeImgTag = `
                <div style="text-align: center; margin: 8px 0 10px 0;">
                    <img src="${qrDataUrl}" style="display: block; margin: 0 auto 3px auto; width: 75px; height: 75px;" />
                    <span style="font-size: 9px; color: #555;">Scan to Verify Invoice</span>
                </div>
            `;
        } catch (err) {
            console.error("QR Generation failed", err);
        }
    }

    let receiptContent = `
        <div style="width: 270px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; margin: 0 auto;">
            
            <!-- HEADER (Logo & Name in Single Row - Compact Paper Saving) -->
            <div style="text-align: center; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px;">
                    ${shopLogo ? `<img src="${shopLogo}" style="max-height: 32px; max-width: 32px; object-fit: contain;" />` : ''}
                    <h2 style="margin: 0; font-size: 15px; font-weight: bold; line-height: 1.2;">${shopName || 'MY SHOP'}</h2>
                </div>
                <p style="margin: 2px 0; font-size: 11px;">${shopAddress || ''}</p>
                <p style="margin: 2px 0; font-size: 11px;">${shopPhone || ''}</p>
            </div>

            <hr style="border-top: 1px dashed #000; margin: 5px 0;">

            <!-- INFO -->
            <div style="font-size: 11px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Receipt #:</span>
                    <span>${invoice_id || saleId}</span>
                </div>
                ${fbrInvoiceNumber ? `
                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                    <span>FBR Inv #:</span>
                    <span>${fbrInvoiceNumber}</span>
                </div>
                ` : ''}
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
        let warrantyRow = '';
        if (item.warranty_expiry && item.warranty_expiry !== null) {
            warrantyRow = `<div style="font-size: 10px; color: #000; margin-top: 2px;">Warranty Till: ${dayjs(item.warranty_expiry).format('DD-MMM-YYYY')}</div>`;
        }

        receiptContent += `
            <tr>
                <td style="text-align: left; padding-top: 6px; padding-bottom: 6px; vertical-align: top;">
                    <span style="font-weight: bold; font-size: 12px;">${item.name}</span>
                    ${attrRow}
                    ${imeiRow}
                    ${warrantyRow}
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
                
                <!-- NAYA IZAFA: Tax Row -->
                ${taxAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span>${taxName || 'Tax'} (${taxRate}%):</span>
                    <span>+${formatMoney(taxAmount)}</span>
                </div>
                ` : ''}
                
                <!-- NAYA IZAFA: FBR Fee Row -->
                ${fbrFeeApplied > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span>POS Service Fee:</span>
                    <span>+${formatMoney(fbrFeeApplied)}</span>
                </div>
                ` : ''}
                
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

            <!-- NAYA IZAFA: QR Code ko Grand Total ke theek neechay shift kiya gaya -->
            ${qrCodeImgTag ? `
                <hr style="border-top: 1px dashed #000; margin: 8px 0 4px 0;">
                ${qrCodeImgTag}
            ` : ''}

            <!-- WARRANTY POLICY -->
            ${footerMessage ? `
            <hr style="border-top: 1px dashed #000; margin: 8px 0;">
            <div style="text-align: left; font-size: 10px; margin-bottom: 10px;">
                <p style="font-weight: bold; margin: 0 0 2px 0;">Terms & Conditions:</p>
                <p style="margin: 0; white-space: pre-wrap;">${footerMessage}</p>
            </div>
            ` : ''}
            
            <hr style="border-top: 1px dashed #000; margin: 10px 0;">

            <!-- FOOTER -->
            <div style="text-align: center; font-size: 11px;">
                <p>Thank you for your purchase!</p>
                <p>Software by: <b>SadaPos</b></p>
            </div>
        </div>
    `;

    // NAYA IZAFA: Hidden Iframe Direct Print (No popup window)
    printThermalDirectHtml(receiptContent);
};

// --- NAYA IZAFA: Customer Payment Thermal Receipt ---
export const printThermalPaymentReceipt = async (paymentDetails, currency = 'PKR') => {
    const {
        shopName, shopAddress, shopPhone, paymentDate, customerName,
        voucher_no, amountPaid, paymentMethod, remainingBalance, footerMessage,
        shopLogo // <--- NAYA IZAFA
    } = paymentDetails;

    const formatMoney = (num) => `${currency} ${Number(num).toFixed(2)}`;

    let receiptContent = `
        <div style="width: 270px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; margin: 0 auto;">
            
            <!-- HEADER (Logo & Name in Single Row) -->
            <div style="text-align: center; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px;">
                    ${shopLogo ? `<img src="${shopLogo}" style="max-height: 32px; max-width: 32px; object-fit: contain;" />` : ''}
                    <h2 style="margin: 0; font-size: 15px; font-weight: bold; line-height: 1.2;">${shopName || 'MY SHOP'}</h2>
                </div>
                <p style="margin: 2px 0; font-size: 11px;">${shopAddress || ''}</p>
                <p style="margin: 2px 0; font-size: 11px;">${shopPhone || ''}</p>
            </div>

            <hr style="border-top: 1px dashed #000; margin: 5px 0;">
            
            <div style="text-align: center; margin: 8px 0;">
                <h3 style="margin: 0; font-size: 14px; font-weight: bold; text-decoration: underline;">PAYMENT RECEIPT</h3>
            </div>

            <!-- INFO -->
            <div style="font-size: 11px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span>Receipt #:</span>
                    <span>${voucher_no || ''}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span>Date:</span>
                    <span>${dayjs(paymentDate).format('DD-MMM-YYYY hh:mm A')}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span>Customer:</span>
                    <span>${customerName || 'Customer'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span>Payment Mode:</span>
                    <span>${paymentMethod || 'Cash'}</span>
                </div>
            </div>

            <hr style="border-top: 1px dashed #000; margin: 10px 0;">

            <!-- AMOUNT -->
            <div style="font-size: 12px;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin: 5px 0;">
                    <span>AMOUNT RECEIVED:</span>
                    <span>${formatMoney(amountPaid)}</span>
                </div>
                
                <hr style="border-top: 1px solid #000; margin: 5px 0;">

                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                    <span>Remaining Balance:</span>
                    <span style="font-weight: bold;">${formatMoney(remainingBalance)}</span>
                </div>
            </div>

            <hr style="border-top: 1px dashed #000; margin: 10px 0;">

            <!-- POLICY -->
            ${footerMessage ? `
            <div style="text-align: left; font-size: 10px; margin-bottom: 10px;">
                <p style="margin: 0; white-space: pre-wrap;">${footerMessage}</p>
            </div>
            <hr style="border-top: 1px dashed #000; margin: 10px 0;">
            ` : ''}
            
            <!-- FOOTER -->
            <div style="text-align: center; font-size: 11px;">
                <p>Thank you for your payment!</p>
                <p>Software by: <b>SadaPos</b></p>
            </div>
        </div>
    `;

    // NAYA IZAFA: Hidden Iframe Direct Print (No popup window)
    printThermalDirectHtml(receiptContent);
};
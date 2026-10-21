// src/utils/receiptGenerator.js

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode'; // <--- IMPORT ADDED
import { formatCurrency } from './currencyFormatter';
import dayjs from 'dayjs';

const safeString = (value) => String(value || '');

// --- NAYA IZAFA: Cloud Storage se logo fetch karke Base64 mein convert karne ka helper (White Background Guaranteed) ---
const getBase64ImageFromUrl = async (imageUrl) => {
  try {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        // Transparent PNG ko hamesha 100% Pure White background dena
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        // Fallback
        fetch(imageUrl)
          .then(res => res.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          })
          .catch(() => resolve(null));
      };
      img.src = imageUrl;
    });
  } catch (err) {
    console.error("Error loading logo:", err);
    return null;
  }
};

// --- NAYA IZAFA: Direct Print Helper (No New Tab / PWA & Full-Screen Friendly) ---
const printDirectPdf = (doc) => {
  try {
    doc.autoPrint();
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    let iframe = document.getElementById('hidden-pdf-print-iframe');
    if (iframe) {
      iframe.remove();
    }

    iframe = document.createElement('iframe');
    iframe.id = 'hidden-pdf-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          console.error("Direct print fallback:", err);
          window.open(blobUrl, '_blank');
        }
      }, 150);
    };
  } catch (e) {
    console.error("Error in printing PDF:", e);
  }
};

// Note: Function ab 'async' hai kyunke QR code banne mein waqt lagta hai
export const generateSaleReceipt = async (saleDetails, currency = 'PKR') => {
  if (!saleDetails) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const {
    shopName, shopAddress, shopPhone, saleId, invoice_id, saleDate, customerName,
    items, subtotal, discount, grandTotal, amountPaid, paymentStatus,
    footerMessage, showQrCode, taxAmount, taxName, taxRate, 
    fbrInvoiceNumber, fbrFeeApplied, shopLogo // <--- NAYA IZAFA
  } = saleDetails;

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // --- NAYA IZAFA: Header Left Alignment + Sleek 14x14mm Logo with White Background ---
  let textStartX = 14;
  if (shopLogo) {
    const base64Logo = await getBase64ImageFromUrl(shopLogo);
    if (base64Logo) {
      // Format 'PNG' use kiya taake black background na banay
      doc.addImage(base64Logo, 'PNG', 14, 14, 14, 14);
      textStartX = 32; // Text moves neatly to the right of logo
    }
  }

  // --- 1. HEADER SECTION (Left Aligned) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text(safeString(shopName) || 'MY SHOP', textStartX, 19);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(safeString(shopAddress) || '', textStartX, 24);
  doc.text(`Phone: ${safeString(shopPhone)}`, textStartX, 28.5);

  // Line Separator
  doc.setDrawColor(210, 210, 210);
  doc.line(14, 33, pageWidth - 14, 33);

  // --- 2. INFO SECTION ---
  const startY = 44;
  
  let qrCodeDataUrl = '';
  if (showQrCode) {
      try {
          const qrText = fbrInvoiceNumber ? fbrInvoiceNumber : `INV:${saleId}`;
          qrCodeDataUrl = await QRCode.toDataURL(qrText, { width: 100 });
      } catch (err) {
          console.error("QR Generation failed", err);
      }
  }
  
  // Left Side: Customer Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Bill To:', 14, startY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(safeString(customerName) || 'Walk-in Customer', 14, startY + 5);

  // Right Side: Invoice Details (Saaf suthra bila kisi dabaao ke)
  const textRightMargin = pageWidth - 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Invoice Details:', textRightMargin, startY, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const displayId = invoice_id || saleId;
  doc.text(`Invoice #: ${safeString(displayId)}`, textRightMargin, startY + 5, { align: 'right' });
  
  let nextY = startY + 10;
  if (fbrInvoiceNumber) {
      doc.setFont('helvetica', 'bold');
      doc.text(`FBR Inv #: ${fbrInvoiceNumber}`, textRightMargin, nextY, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      nextY += 5;
  }
  
  doc.text(`Date: ${new Date(saleDate).toLocaleString()}`, textRightMargin, nextY, { align: 'right' });

  // --- 3. ITEMS TABLE (Smart 1-Row / 2-Row Wrap + Bold Title & Normal Attributes) ---
  const bodyItems = Array.isArray(items) ? items : [];
  const tableStartY = Math.max(startY + 16, nextY + 6);

  autoTable(doc, {
    startY: tableStartY,
    head: [['Item Description', 'Qty', 'Unit Price', 'Total']],
    body: bodyItems.map(item => {
      let itemName = safeString(item?.name);
      if (item.attributes && String(item.attributes).trim().length > 0) {
          itemName += ` (${item.attributes})`;
      }
      if (item.imeis && item.imeis.length > 0) itemName += `\nIMEI: ${item.imeis.join(', ')}`;
      else if (item.imei) itemName += `\nIMEI: ${item.imei}`;
      if (item.warranty_expiry && item.warranty_expiry !== null) {
          itemName += `\nWarranty Till: ${dayjs(item.warranty_expiry).format('DD-MMM-YYYY')}`;
      }

      return [
        itemName,
        safeString(item?.quantity),
        formatCurrency(item?.price_at_sale || 0, currency),
        formatCurrency((item?.quantity || 0) * (item?.price_at_sale || 0), currency)
      ];
    }),
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4, textColor: [0, 0, 0], lineColor: [200, 200, 200], lineWidth: 0.1 },
    headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 35 },
    },
    // NAYA IZAFA: Column 0 ke default plain text ko rokay taake hum Title BOLD aur Attributes NORMAL draw karein
    willDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const item = bodyItems[data.row.index];
        if (!item) return;

        const cell = data.cell;
        const paddingLeft = cell.padding('left') || 4;
        const paddingTop = cell.padding('top') || 4;
        const startX = cell.x + paddingLeft;
        let lineY = cell.y + paddingTop + 3.2;

        const availableWidth = cell.width - paddingLeft - (cell.padding('right') || 4);
        const title = safeString(item?.name);

        // A. Product Title ko BOLD draw karna
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(20, 20, 20);
        doc.text(title, startX, lineY);

        const titleWidth = doc.getTextWidth(title);

        // B. Attributes ko NORMAL (Regular) font mein draw karna
        if (item.attributes && String(item.attributes).trim().length > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(80, 80, 80);
          const attrStr = ` (${item.attributes})`;

          if (titleWidth + doc.getTextWidth(attrStr) <= availableWidth) {
            // Aik hi line mein fit aaye to title ke barabar draw karein
            doc.text(attrStr, startX + titleWidth, lineY);
          } else {
            // Agar lamba ho to doosri line par wrap karein
            lineY += 4.2;
            const splitAttr = doc.splitTextToSize(attrStr.trim(), availableWidth);
            doc.text(splitAttr, startX, lineY);
            lineY += (splitAttr.length - 1) * 4.2;
          }
        }

        // C. IMEI (Agar ho to dedicated line par normal font)
        let imeiText = '';
        if (item.imeis && item.imeis.length > 0) imeiText = `IMEI: ${item.imeis.join(', ')}`;
        else if (item.imei) imeiText = `IMEI: ${item.imei}`;

        if (imeiText) {
          lineY += 4.2;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(70, 70, 70);
          doc.text(imeiText, startX, lineY);
        }

        // D. Warranty (Agar ho to dedicated line par normal font)
        if (item.warranty_expiry && item.warranty_expiry !== null) {
          lineY += 4.2;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(70, 70, 70);
          doc.text(`Warranty Till: ${dayjs(item.warranty_expiry).format('DD-MMM-YYYY')}`, startX, lineY);
        }
      }
    }
  });

  // --- 4. TOTALS, QR & TERMS SECTION ---
  const finalY = doc.lastAutoTable.finalY + 8;
  const rightMargin = pageWidth - 14;

  const printTotalRow = (label, value, y, isBold = false) => {
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(isBold ? 11 : 9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(label, rightMargin - 40, y, { align: 'right' });
      doc.text(value, rightMargin, y, { align: 'right' });
  };

  printTotalRow('Payment Method:', safeString(saleDetails.payment_method || 'Cash'), finalY);
  printTotalRow('Subtotal:', formatCurrency(subtotal || 0, currency), finalY + 5);
  printTotalRow('Discount:', `-${formatCurrency(discount || 0, currency)}`, finalY + 10);
  
  let currentY = finalY + 10;

  // --- NAYA IZAFA: Tax Row ---
  if (taxAmount > 0) {
      currentY += 5;
      printTotalRow(`${taxName || 'Tax'} (${taxRate}%):`, `+${formatCurrency(taxAmount || 0, currency)}`, currentY);
  }

  // --- NAYA IZAFA: FBR Fee Row ---
  if (fbrFeeApplied > 0) {
      currentY += 5;
      printTotalRow(`POS Service Fee:`, `+${formatCurrency(fbrFeeApplied || 0, currency)}`, currentY);
  }

  doc.setDrawColor(0, 0, 0);
  doc.line(rightMargin - 75, currentY + 3, rightMargin, currentY + 3);
  
  currentY += 8;
  printTotalRow('GRAND TOTAL:', formatCurrency(grandTotal || 0, currency), currentY, true);

  if (paymentStatus === 'Unpaid') {
    printTotalRow('Amount Paid:', formatCurrency(amountPaid || 0, currency), currentY + 6);
    printTotalRow('Balance Due:', formatCurrency((grandTotal || 0) - (amountPaid || 0), currency), currentY + 12);
    currentY += 12;
  } else {
    printTotalRow('Amount Paid:', formatCurrency(amountPaid || 0, currency), currentY + 6);
    currentY += 6;
  }

  // --- NAYA IZAFA: QR CODE (Bottom-Right, Totals ke theek neechay) ---
  if (qrCodeDataUrl) {
      const qrSize = 22;
      const qrX = rightMargin - qrSize - 5; // Right align slightly padded
      const qrY = currentY + 8;
      doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize); // 22x22mm QR Box
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text('Scan to Verify', qrX + (qrSize / 2), qrY + qrSize + 4, { align: 'center' });
  }

  // --- WARRANTY / POLICY SECTION (Grand Total Ke Neechay, Blue Box Wali Jagah) ---
  if (footerMessage) {
      const policyY = currentY + 8; // Grand Total & Amount Paid ke theek neechay
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text('Terms & Conditions / Warranty:', 14, policyY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(70, 70, 70);
      // Width pageWidth - 95 rakhi hai taake right side ke QR Code se na takraye
      const splitText = doc.splitTextToSize(footerMessage, pageWidth - 95);
      doc.text(splitText, 14, policyY + 5);
  }

  // --- 5. FOOTER ---
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  doc.text('Software by SadaPos', pageWidth / 2, footerY + 5, { align: 'center' });

  printDirectPdf(doc);
};
// --- NAYA IZAFA: Quotation / Estimate Generator ---
export const generateQuotationReceipt = async (saleDetails, currency = 'PKR') => {
  if (!saleDetails) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const {
    shopName, shopAddress, shopPhone, saleDate, customerName, quotation_validity_days,
    quotation_id, // Naya variable // Naya variable
    items, subtotal, discount, grandTotal, footerMessage,
    taxAmount, taxName, taxRate
  } = saleDetails;

  const pageWidth = doc.internal.pageSize.getWidth();

  // --- 1. HEADER SECTION ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text(safeString(shopName) || 'MY SHOP', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(safeString(shopAddress) || '', pageWidth / 2, 26, { align: 'center' });
  doc.text(`Phone: ${safeString(shopPhone)}`, pageWidth / 2, 31, { align: 'center' });

  // Line Separator
  doc.setDrawColor(200, 200, 200);
  doc.line(10, 36, pageWidth - 10, 36);

  // --- 2. INFO SECTION ---
  const startY = 45;
  
  // Left Side: Customer Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Quotation For:', 14, startY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(safeString(customerName) || 'Walk-in Customer', 14, startY + 6);

  // Right Side: Quotation Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(22, 119, 255); // Blue color for Quotation label
  doc.text('ESTIMATE / QUOTATION', pageWidth - 14, startY, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Quotation #: ${quotation_id || ''}`, pageWidth - 14, startY + 3, { align: 'right' });
  doc.text(`Date: ${dayjs(saleDate).format('DD-MMM-YYYY hh:mm A')}`, pageWidth - 14, startY + 8, { align: 'right' });
  doc.text(`Valid For: ${quotation_validity_days || 3} Days`, pageWidth - 14, startY + 13, { align: 'right' });

  // --- 3. ITEMS TABLE ---
  autoTable(doc, {
    startY: startY + 20,
    head: [['Item Description', 'Qty', 'Unit Price', 'Total']],
    body: items.map(item => [
      item.name + (item.attributes ? `\n(${item.attributes})` : ''),
      safeString(item.quantity),
      formatCurrency(item.price_at_sale || 0, currency),
      formatCurrency(item.total || 0, currency)
    ]),
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [70, 70, 70] },
  });

  // --- 4. TOTALS SECTION ---
  const finalY = doc.lastAutoTable.finalY + 10;
  const rightMargin = pageWidth - 14;

  const printTotalRow = (label, value, y, isBold = false) => {
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(isBold ? 12 : 10);
      doc.text(label, rightMargin - 40, y, { align: 'right' });
      doc.text(value, rightMargin, y, { align: 'right' });
  };

  printTotalRow('Subtotal:', formatCurrency(subtotal || 0, currency), finalY);
  printTotalRow('Discount:', `-${formatCurrency(discount || 0, currency)}`, finalY + 6);
  
  let currentY = finalY + 6;
  if (taxAmount > 0) {
      currentY += 6;
      printTotalRow(`${taxName || 'Tax'} (${taxRate}%):`, `+${formatCurrency(taxAmount || 0, currency)}`, currentY);
  }

  doc.setDrawColor(0, 0, 0);
  doc.line(rightMargin - 80, currentY + 3, rightMargin, currentY + 3);
  
  currentY += 10;
  printTotalRow('ESTIMATED TOTAL:', formatCurrency(grandTotal || 0, currency), currentY, true);

  // --- FOOTER NOTE ---
  const footerY = currentY + 20;
  doc.setFont('helvetica', 'bold');
  doc.text('Important Note:', 14, footerY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('1. This is only a price estimate and not a final tax invoice.', 14, footerY + 6);
  doc.text('2. Prices are subject to change based on market availability.', 14, footerY + 11);
  doc.text(footerMessage || '', 14, footerY + 16);

  printDirectPdf(doc);
};

// --- NAYA IZAFA: Customer Payment Receipt Generator ---
export const generatePaymentReceipt = async (paymentDetails, currency = 'PKR') => {
  if (!paymentDetails) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5' // Payment receipt thori choti (A5) achi lagti hai
  });

  const {
    shopName, shopAddress, shopPhone, paymentDate, customerName,
    voucher_no, amountPaid, paymentMethod, remainingBalance, footerMessage,
    shopLogo // <--- NAYA IZAFA
  } = paymentDetails;

  const pageWidth = doc.internal.pageSize.getWidth();

  // --- NAYA IZAFA: Header Y layout based on Logo for A5 ---
  let currentHeaderY = 20;
  if (shopLogo) {
    const base64Logo = await getBase64ImageFromUrl(shopLogo);
    if (base64Logo) {
      doc.addImage(base64Logo, 'JPEG', (pageWidth / 2) - 8, 10, 16, 16); // 16x16mm for A5
      currentHeaderY = 32;
    }
  }

  // --- 1. HEADER SECTION ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(safeString(shopName) || 'MY SHOP', pageWidth / 2, currentHeaderY, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(safeString(shopAddress) || '', pageWidth / 2, currentHeaderY + 6, { align: 'center' });
  doc.text(`Phone: ${safeString(shopPhone)}`, pageWidth / 2, currentHeaderY + 11, { align: 'center' });

  // Line Separator
  doc.setDrawColor(200, 200, 200);
  doc.line(10, currentHeaderY + 16, pageWidth - 10, currentHeaderY + 16);

  // --- 2. TITLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(22, 119, 255); // Blue color
  doc.text('PAYMENT RECEIPT', pageWidth / 2, 45, { align: 'center' });

  // --- 3. DETAILS SECTION ---
  const startY = 55;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  doc.text(`Receipt #: ${safeString(voucher_no)}`, 14, startY);
  doc.text(`Date: ${dayjs(paymentDate).format('DD-MMM-YYYY hh:mm A')}`, pageWidth - 14, startY, { align: 'right' });

  // --- NAYA IZAFA: Check karein ke paisa AAYA hai ya GAYA hai (isPayout) ---
  const isPayout = paymentDetails.isPayout === true;

  doc.setFont('helvetica', 'bold');
  doc.text(isPayout ? 'Paid To:' : 'Received From:', 14, startY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(safeString(customerName) || 'Customer/Supplier', 45, startY + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Payment Mode:', 14, startY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(safeString(paymentMethod) || 'Cash', 45, startY + 18);

  // --- 4. AMOUNT BOX ---
  const boxY = startY + 28;
  doc.setFillColor(245, 245, 245);
  doc.rect(14, boxY, pageWidth - 28, 20, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(isPayout ? 'Amount Paid:' : 'Amount Received:', 20, boxY + 13);
  
  doc.setFontSize(16);
  doc.setTextColor(35, 120, 4); // Green color for amount
  doc.text(formatCurrency(amountPaid || 0, currency), pageWidth - 20, boxY + 14, { align: 'right' });

  // --- 5. BALANCE SECTION ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Remaining Balance:', 14, boxY + 30);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(remainingBalance || 0, currency), 50, boxY + 30);

  // --- 6. FOOTER ---
  const footerY = doc.internal.pageSize.getHeight() - 20;
  
  if (footerMessage) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const splitText = doc.splitTextToSize(footerMessage, pageWidth - 28);
      doc.text(splitText, 14, footerY - 15);
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your payment!', pageWidth / 2, footerY, { align: 'center' });
  doc.text('Software by SadaPos', pageWidth / 2, footerY + 5, { align: 'center' });

  printDirectPdf(doc);
};
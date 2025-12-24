// src/utils/receiptGenerator.js

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode'; // <--- IMPORT ADDED
import { formatCurrency } from './currencyFormatter';

const safeString = (value) => String(value || '');

// Note: Function ab 'async' hai kyunke QR code banne mein waqt lagta hai
export const generateSaleReceipt = async (saleDetails, currency = 'PKR') => {
  if (!saleDetails) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const {
    shopName, shopAddress, shopPhone, saleId, saleDate, customerName,
    items, subtotal, discount, grandTotal, amountPaid, paymentStatus,
    footerMessage, showQrCode
  } = saleDetails;

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // --- QR CODE GENERATION ---
  // Hum 'INV:' prefix laga rahe hain taake scanner ko pata chale yeh Invoice hai
  let qrCodeDataUrl = '';
  if (showQrCode) {
      try {
          qrCodeDataUrl = await QRCode.toDataURL(`INV:${saleId}`, { width: 100 });
      } catch (err) {
          console.error("QR Generation failed", err);
      }
  }

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
  doc.text('Bill To:', 14, startY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(safeString(customerName) || 'Walk-in Customer', 14, startY + 6);

  // Right Side: Invoice Details & QR Code
  // Agar QR Code ban gaya hai to usay lagayein
  if (qrCodeDataUrl) {
      doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - 35, startY - 5, 25, 25);
  }

  // Text ko thora left shift karein taake QR code ke sath na takraye
  const textRightMargin = qrCodeDataUrl ? pageWidth - 40 : pageWidth - 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Invoice Details:', textRightMargin, startY, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Invoice #: ${safeString(saleId)}`, textRightMargin, startY + 6, { align: 'right' });
  doc.text(`Date: ${new Date(saleDate).toLocaleString()}`, textRightMargin, startY + 11, { align: 'right' });

  // --- 3. ITEMS TABLE ---
  const bodyItems = Array.isArray(items) ? items : [];

  autoTable(doc, {
    startY: startY + 25, // Thora neeche kiya taake QR code fit aaye
    head: [['Item Description', 'Qty', 'Unit Price', 'Total']],
    body: bodyItems.map(item => {
      let itemName = safeString(item?.name);
      if (item.attributes) itemName += `\n(${item.attributes})`;
      if (item.imeis && item.imeis.length > 0) itemName += `\nIMEI: ${item.imeis.join(', ')}`;
      else if (item.imei) itemName += `\nIMEI: ${item.imei}`;

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
    }
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
  
  doc.setDrawColor(0, 0, 0);
  doc.line(rightMargin - 80, finalY + 9, rightMargin, finalY + 9);
  
  printTotalRow('GRAND TOTAL:', formatCurrency(grandTotal || 0, currency), finalY + 16, true);

  printTotalRow('Payment Method:', safeString(saleDetails.payment_method || 'Cash'), finalY - 6);

  if (paymentStatus === 'Unpaid') {
    printTotalRow('Amount Paid:', formatCurrency(amountPaid || 0, currency), finalY + 24);
    printTotalRow('Balance Due:', formatCurrency((grandTotal || 0) - (amountPaid || 0), currency), finalY + 30);
  } else {
    printTotalRow('Amount Paid:', formatCurrency(amountPaid || 0, currency), finalY + 24);
  }

  // --- WARRANTY / POLICY SECTION ---
  if (footerMessage) {
      const policyY = finalY + 40;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Terms & Conditions / Warranty:', 14, policyY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const splitText = doc.splitTextToSize(footerMessage, pageWidth - 28);
      doc.text(splitText, 14, policyY + 5);
  }

  // --- 5. FOOTER ---
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  doc.text('Software by SadaPos', pageWidth / 2, footerY + 5, { align: 'center' });

  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  } catch (e) {
    console.error("Error creating PDF:", e);
    alert("Error generating receipt.");
  }
};
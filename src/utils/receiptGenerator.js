// src/utils/receiptGenerator.js

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode'; // <--- IMPORT ADDED
import { formatCurrency } from './currencyFormatter';
import dayjs from 'dayjs';

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
    shopName, shopAddress, shopPhone, saleId, invoice_id, saleDate, customerName,
    items, subtotal, discount, grandTotal, amountPaid, paymentStatus,
    footerMessage, showQrCode, taxAmount, taxName, taxRate // <--- NAYA IZAFA
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
  // Agar invoice_id (A-1234) hai to wo dikhao, warna saleId (UUID)
  const displayId = invoice_id || saleId;
  doc.text(`Invoice #: ${safeString(displayId)}`, textRightMargin, startY + 6, { align: 'right' });
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

  printTotalRow('Payment Method:', safeString(saleDetails.payment_method || 'Cash'), finalY - 6);
  printTotalRow('Subtotal:', formatCurrency(subtotal || 0, currency), finalY);
  printTotalRow('Discount:', `-${formatCurrency(discount || 0, currency)}`, finalY + 6);
  
  let currentY = finalY + 6;

  // --- NAYA IZAFA: Tax Row ---
  if (taxAmount > 0) {
      currentY += 6;
      printTotalRow(`${taxName || 'Tax'} (${taxRate}%):`, `+${formatCurrency(taxAmount || 0, currency)}`, currentY);
  }
  // ---------------------------

  doc.setDrawColor(0, 0, 0);
  doc.line(rightMargin - 80, currentY + 3, rightMargin, currentY + 3);
  
  currentY += 10;
  printTotalRow('GRAND TOTAL:', formatCurrency(grandTotal || 0, currency), currentY, true);

  if (paymentStatus === 'Unpaid') {
    printTotalRow('Amount Paid:', formatCurrency(amountPaid || 0, currency), currentY + 8);
    printTotalRow('Balance Due:', formatCurrency((grandTotal || 0) - (amountPaid || 0), currency), currentY + 14);
  } else {
    printTotalRow('Amount Paid:', formatCurrency(amountPaid || 0, currency), currentY + 8);
  }

  // --- WARRANTY / POLICY SECTION ---
  if (footerMessage) {
      const policyY = currentY + 24;
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

  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  } catch (e) {
    console.error("Error creating PDF:", e);
  }
};
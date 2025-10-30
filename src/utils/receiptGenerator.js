// src/utils/receiptGenerator.js (UPDATED CODE)

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './currencyFormatter'; // formatCurrency ko import karein

// Ek chota helper function jo null/undefined ko empty string bana dega
const safeString = (value) => String(value || '');

// Ab yeh function 'currency' bhi lega
export const generateSaleReceipt = (saleDetails, currency = 'Rs.') => {
  if (!saleDetails) {
    console.error("generateSaleReceipt was called with null saleDetails.");
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const {
    shopName, shopAddress, shopPhone, saleId, saleDate, customerName,
    items, subtotal, discount, grandTotal, amountPaid, paymentStatus
  } = saleDetails;

  // --- PDF CONTENT ---
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(safeString(shopName) || 'My Shop', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(safeString(shopAddress) || 'Shop Address', doc.internal.pageSize.getWidth() / 2, 27, { align: 'center' });
  doc.text(`Phone: ${safeString(shopPhone)}`, doc.internal.pageSize.getWidth() / 2, 32, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Sale Receipt', 14, 45);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt #: ${safeString(saleId)}`, 14, 52);
  doc.text(`Date: ${saleDate ? new Date(saleDate).toLocaleString() : ''}`, 14, 57);
  doc.text(`Customer: ${safeString(customerName) || 'Walk-in Customer'}`, 14, 62);

  const bodyItems = Array.isArray(items) ? items : [];

  autoTable(doc, {
    startY: 70,
    head: [['Item Name', 'Quantity', 'Unit Price', 'Total Price']],
    body: bodyItems.map(item => [
      safeString(item?.name),
      safeString(item?.quantity),
      // YEH LINES TABDEEL HUI HAIN
      formatCurrency(item?.price_at_sale || 0, currency),
      formatCurrency((item?.quantity || 0) * (item?.price_at_sale || 0), currency)
    ]),
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center' },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    }
  });

  const finalY = doc.lastAutoTable.finalY || 70;
  
  // YEH LINES BHI TABDEEL HUI HAIN
  const summaryRows = [
    ['Subtotal:', formatCurrency(subtotal || 0, currency)],
    ['Discount:', `- ${formatCurrency(discount || 0, currency)}`],
    ['Grand Total:', formatCurrency(grandTotal || 0, currency)],
  ];

  if (paymentStatus === 'Unpaid') {
    summaryRows.push(['Amount Paid:', formatCurrency(amountPaid || 0, currency)]);
    summaryRows.push(['Balance Due:', formatCurrency((grandTotal || 0) - (amountPaid || 0), currency)]);
  }

  autoTable(doc, {
    startY: finalY + 5,
    body: summaryRows,
    theme: 'plain',
    tableWidth: 'wrap',
    halign: 'right',
    columnStyles: {
      0: { halign: 'right', fontStyle: 'bold' },
      1: { halign: 'right' }
    },
    didParseCell: function (data) {
      if (data.cell.raw === 'Grand Total:') {
        data.cell.styles.fontSize = 12;
      }
    }
  });

  const footerY = doc.lastAutoTable.finalY || finalY + 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for your purchase!', doc.internal.pageSize.getWidth() / 2, footerY + 20, { align: 'center' });

  // --- PRINTING LOGIC ---
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, '_blank');
    if (!printWindow) {
      alert('Print window was blocked. Please allow pop-ups for this site to print receipts.');
    }
  } catch (e) {
    console.error("Error creating or opening PDF blob:", e);
    alert("An error occurred while trying to generate the receipt PDF.");
  }
};
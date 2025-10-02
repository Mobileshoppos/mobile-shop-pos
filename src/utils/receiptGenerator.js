// src/utils/receiptGenerator.js (BULLETPROOF VERSION)

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Ek chota helper function jo null/undefined ko empty string bana dega
const safeString = (value) => String(value || '');

export const generateSaleReceipt = (saleDetails) => {
  // Agar saleDetails hi null ho to foran ruk jao
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
      `Rs. ${(item?.price_at_sale || 0).toFixed(2)}`,
      `Rs. ${((item?.quantity || 0) * (item?.price_at_sale || 0)).toFixed(2)}`
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

  const finalY = doc.lastAutoTable.finalY || 70; // Fallback agar table na bane
  const summaryRows = [
    ['Subtotal:', `Rs. ${(subtotal || 0).toFixed(2)}`],
    ['Discount:', `- Rs. ${(discount || 0).toFixed(2)}`],
    ['Grand Total:', `Rs. ${(grandTotal || 0).toFixed(2)}`],
  ];

  if (paymentStatus === 'Unpaid') {
    summaryRows.push(['Amount Paid:', `Rs. ${(amountPaid || 0).toFixed(2)}`]);
    summaryRows.push(['Balance Due:', `Rs. ${((grandTotal || 0) - (amountPaid || 0)).toFixed(2)}`]);
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
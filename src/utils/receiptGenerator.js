// src/utils/receiptGenerator.js (FINAL, SYNTAX-CORRECTED VERSION)

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateSaleReceipt = (saleDetails) => {
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
  doc.text(shopName, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(shopAddress, doc.internal.pageSize.getWidth() / 2, 27, { align: 'center' });
  doc.text(`Phone: ${shopPhone}`, doc.internal.pageSize.getWidth() / 2, 32, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Sale Receipt', 14, 45);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt #: ${saleId}`, 14, 52);
  doc.text(`Date: ${new Date(saleDate).toLocaleString()}`, 14, 57);
  doc.text(`Customer: ${customerName || 'Walk-in Customer'}`, 14, 62);

  autoTable(doc, {
    startY: 70,
    head: [['Item Name', 'Quantity', 'Unit Price', 'Total Price']],
    body: items.map(item => [
      item.name,
      item.quantity,
      `Rs. ${item.price_at_sale.toFixed(2)}`,
      `Rs. ${(item.quantity * item.price_at_sale).toFixed(2)}`
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

  const finalY = doc.lastAutoTable.finalY;
  const summaryRows = [
    ['Subtotal:', `Rs. ${subtotal.toFixed(2)}`],
    ['Discount:', `- Rs. ${discount.toFixed(2)}`],
    ['Grand Total:', `Rs. ${grandTotal.toFixed(2)}`],
  ];

  if (paymentStatus === 'Unpaid') {
    summaryRows.push(['Amount Paid:', `Rs. ${amountPaid.toFixed(2)}`]);
    summaryRows.push(['Balance Due:', `Rs. ${(grandTotal - amountPaid).toFixed(2)}`]);
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

  const footerY = doc.lastAutoTable.finalY;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for your purchase!', doc.internal.pageSize.getWidth() / 2, footerY + 20, { align: 'center' });

  // --- PRINTING LOGIC (THE window.open METHOD) ---
  
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  const printWindow = window.open(blobUrl, '_blank');
  
  if (printWindow) {
    printWindow.onload = function() {
      printWindow.print();
      URL.revokeObjectURL(blobUrl);
    };
  } else {
    alert('Print window was blocked. Please allow pop-ups for this site to print receipts.');
    URL.revokeObjectURL(blobUrl);
  }
};
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { formatCurrency } from './currencyFormatter';

export const generateDamagedReportPDF = (data, stats, profile, dateRange) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- 1. HEADER SECTION ---
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text(profile?.shop_name || 'MY SHOP', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(220, 53, 69); // Red color for Title
    doc.text('DAMAGED STOCK AUDIT REPORT', pageWidth / 2, 23, { align: 'center' });
    
    // --- 2. PERIOD & GENERATION INFO ---
    doc.setFontSize(10);
    doc.setTextColor(100);
    const periodText = dateRange 
        ? `Period: ${dayjs(dateRange[0]).format('DD-MMM-YYYY')} to ${dayjs(dateRange[1]).format('DD-MMM-YYYY')}`
        : 'Period: All Time';
    doc.text(periodText, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Generated on: ${dayjs().format('DD-MMM-YYYY HH:mm')}`, pageWidth / 2, 35, { align: 'center' });

    // --- 3. SUMMARY BOX ---
    doc.setDrawColor(220, 53, 69);
    doc.setLineWidth(0.5);
    doc.rect(14, 40, pageWidth - 28, 15); // Summary Border
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`Total Damaged Units: ${stats.totalQty}`, 20, 49);
    doc.text(`Total Financial Loss: ${formatCurrency(stats.totalLoss, profile?.currency)}`, pageWidth - 20, 49, { align: 'right' });
    
    // --- 4. DATA TABLE ---
    autoTable(doc, {
        startY: 60,
        head: [['Date', 'Product / ID', 'Supplier', 'Qty', 'Unit Cost', 'Total Loss', 'Reason']],
        body: data.map(item => [
            dayjs(item.updated_at).format('DD-MMM-YY'),
            `${item.product_name}\n${item.imei ? 'IMEI: ' + item.imei : 'Inv: ' + item.invoice_id}`,
            item.supplier_name,
            item.damaged_qty,
            formatCurrency(item.purchase_price, profile?.currency),
            formatCurrency(item.total_loss, profile?.currency),
            item.adjustment_notes
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
            1: { cellWidth: 40 },
            6: { cellWidth: 35 }
        },
        alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    // --- 5. FOOTER SECTION ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text('This is a system-generated inventory audit report.', 14, pageHeight - 10);
    }

    doc.save(`Damaged_Report_${dayjs().format('DD_MMM_YYYY')}.pdf`);
};
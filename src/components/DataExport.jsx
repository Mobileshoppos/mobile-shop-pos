import React from 'react';
// NAYA: 'message' hata kar 'App' import kiya hai
import { Button, Space, App, Tooltip, theme } from 'antd';
import { PrinterOutlined, FileExcelOutlined } from '@ant-design/icons'; // NAYA: Printer icon import kiya
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// NAYA IZAFA: 'reportSubtitle' prop ko shamil kiya gaya hai
const DataExport = ({ data, exportColumns, fileName = 'Export_Data', reportTitle = 'Data Report', reportSubtitle = '' }) => {
  const { token } = theme.useToken();
  const { message } = App.useApp(); // <--- NAYA IZAFA: Theme-aware message ke liye

  // NAYA: PDF Download ki jagah ab yeh Print karega
  const handlePrint = () => {
    if (!data || data.length === 0) {
      message.warning('No data available to print.');
      return;
    }

    try {
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text(reportTitle, 14, 22);
      
      // NAYA IZAFA: Dynamic StartY aur Subtitle rendering
      let startY = 35;
      if (reportSubtitle) {
          doc.setFontSize(9);
          doc.setTextColor(80); // Dark gray color
          doc.text(reportSubtitle, 14, 28);
          doc.setTextColor(100);
          doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 34);
          startY = 39; // Table thora neechay se shuru hoga
      } else {
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
          startY = 35;
      }

      const tableColumn = exportColumns.map(col => col.title);
      const tableRows = [];

      data.forEach(item => {
        const rowData = exportColumns.map(col => {
            let val = item[col.dataIndex];
            if (val === null || val === undefined) val = '-';
            if (Array.isArray(val)) return val.join(', ');
            return val;
        });
        tableRows.push(rowData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY, // <--- NAYA IZAFA: Dynamic StartY use ho raha hai
        theme: 'grid',
        headStyles: { fillColor: [26, 182, 201] }, // Aap ke theme ka colorPrimary (#1AB6C9)
        styles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      // --- NAYA IZAFA: Download karne ke bajaye naye tab mein khol kar Print command bhejna ---
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
      
      message.success('Print document prepared!');
    } catch (error) {
      console.error(error);
      message.error('Failed to prepare print document');
    }
  };

  // Excel Banane ka function (Yeh waisa hi rahega)
  const handleExportExcel = () => {
    if (!data || data.length === 0) {
      message.warning('No data available to export.');
      return;
    }

    try {
      const headers = exportColumns.map(col => col.title);
      const rows = data.map(item => {
        const row = {};
        exportColumns.forEach(col => {
            let val = item[col.dataIndex];
            if (val === null || val === undefined) val = '-';
            if (Array.isArray(val)) val = val.join(', ');
            row[col.title] = val;
        });
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
      message.success('Excel downloaded successfully!');
    } catch (error) {
      console.error(error);
      message.error('Failed to export Excel');
    }
  };

  return (
    <Space size="small">
      {/* NAYA: Printer Icon aur Tooltip */}
      <Tooltip title="Print List">
        <Button 
          icon={<PrinterOutlined />} 
          onClick={handlePrint} 
          type="text" 
          size="small" 
          style={{ color: token.colorTextSecondary }} // Aap ki theme ke mutabiq standard color
        />
      </Tooltip>

      <Tooltip title="Export as Excel">
        <Button 
          icon={<FileExcelOutlined />} 
          onClick={handleExportExcel} 
          type="text" 
          size="small" 
          style={{ color: token.colorSuccess }} 
        />
      </Tooltip>
    </Space>
  );
};

export default DataExport;
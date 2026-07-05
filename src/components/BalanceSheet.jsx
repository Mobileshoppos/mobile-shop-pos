import React, { useState, useEffect } from 'react';
import { Card, Typography, Spin, Row, Col, Button, Space, Select, App, Divider } from 'antd';
import { PrinterOutlined, FileExcelOutlined, LayoutOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import DataService from '../DataService';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text } = Typography;

const BalanceSheet = () => {
  const { message } = App.useApp();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [template, setTemplate] = useState('t-shape'); // Default 2-column design

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const bsData = await DataService.getBalanceSheetData();
        setData(bsData);
      } catch (error) {
        message.error("Failed to load Balance Sheet data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- THEME CONFIGURATIONS ---
  const themes = {
    'corporate': { name: 'Corporate Blue (Vertical)', primary: '#1890ff', secondary: '#f0f5ff', text: '#000000', headerText: '#ffffff' },
    't-shape': { name: 'Classic T-Shape (Horizontal)', primary: '#08979c', secondary: '#e6fffb', text: '#000000', headerText: '#ffffff' },
    'executive': { name: 'Executive Gold (Premium)', primary: '#141414', secondary: '#fffbe6', text: '#d4b106', headerText: '#d4b106' },
    'formal': { name: 'Formal Crimson (Standard)', primary: '#cf1322', secondary: '#fff1f0', text: '#000000', headerText: '#ffffff' },
  };

  const currentTheme = themes[template];

  // --- COLORFUL EXCEL EXPORT (HTML to XLS Trick) ---
  const handleExcelExport = () => {
    if (!data) return;
    const curr = profile?.currency || '';
    const shopName = profile?.shop_name || 'My Shop';
    const dateStr = dayjs(data.date).format('DD MMM YYYY, hh:mm A');
    
    // Excel ke liye HTML Table banayenge taake colors aur design barkarar rahein
    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><style>
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
        th, td { border: 1px solid #dddddd; padding: 8px; }
        .header { background-color: ${currentTheme.primary}; color: ${currentTheme.headerText}; font-size: 20px; font-weight: bold; text-align: center; }
        .sub-header { background-color: ${currentTheme.secondary}; color: #333333; font-weight: bold; text-align: center; }
        .section-title { background-color: ${currentTheme.primary}; color: ${currentTheme.headerText}; font-weight: bold; }
        .total-row { font-weight: bold; background-color: #f5f5f5; border-top: 2px solid #000; border-bottom: 4px double #000; }
        .amount { text-align: right; }
      </style></head><body>
      <table>
        <tr><td colspan="${template === 't-shape' ? 4 : 2}" class="header">${shopName} - Balance Sheet</td></tr>
        <tr><td colspan="${template === 't-shape' ? 4 : 2}" class="sub-header">As of: ${dateStr}</td></tr>
        <tr><td colspan="${template === 't-shape' ? 4 : 2}"></td></tr>
    `;

    if (template === 't-shape') {
      htmlContent += `
        <tr>
          <td class="section-title">ASSETS</td><td class="section-title amount">Amount (${curr})</td>
          <td class="section-title">LIABILITIES & EQUITY</td><td class="section-title amount">Amount (${curr})</td>
        </tr>
        <tr>
          <td>Cash in Hand</td><td class="amount">${data.assets.cash}</td>
          <td>Accounts Payable</td><td class="amount">${data.liabilities.payables}</td>
        </tr>
        <tr>
          <td>Bank & Wallets</td><td class="amount">${data.assets.bank}</td>
          <td>Total Equity (Net Worth)</td><td class="amount">${data.equity}</td>
        </tr>
        <tr>
          <td>Accounts Receivable</td><td class="amount">${data.assets.receivables}</td>
          <td></td><td></td>
        </tr>
        <tr>
          <td>Inventory (Stock Value)</td><td class="amount">${data.assets.inventory}</td>
          <td></td><td></td>
        </tr>
        <tr class="total-row">
          <td>Total Assets</td><td class="amount">${data.totalAssets}</td>
          <td>Total Liabilities & Equity</td><td class="amount">${data.totalLiabilitiesAndEquity}</td>
        </tr>
      `;
    } else {
      htmlContent += `
        <tr><td class="section-title">Particulars</td><td class="section-title amount">Amount (${curr})</td></tr>
        <tr><td colspan="2" style="font-weight:bold; background:#eeeeee;">ASSETS</td></tr>
        <tr><td>Cash in Hand</td><td class="amount">${data.assets.cash}</td></tr>
        <tr><td>Bank & Wallets</td><td class="amount">${data.assets.bank}</td></tr>
        <tr><td>Accounts Receivable</td><td class="amount">${data.assets.receivables}</td></tr>
        <tr><td>Inventory (Stock Value)</td><td class="amount">${data.assets.inventory}</td></tr>
        <tr class="total-row"><td>Total Assets</td><td class="amount">${data.totalAssets}</td></tr>
        <tr><td colspan="2"></td></tr>
        <tr><td colspan="2" style="font-weight:bold; background:#eeeeee;">LIABILITIES & EQUITY</td></tr>
        <tr><td>Accounts Payable</td><td class="amount">${data.liabilities.payables}</td></tr>
        <tr><td>Total Equity (Net Worth)</td><td class="amount">${data.equity}</td></tr>
        <tr class="total-row"><td>Total Liabilities & Equity</td><td class="amount">${data.totalLiabilitiesAndEquity}</td></tr>
      `;
    }

    htmlContent += `</table></body></html>`;
    
    // Download as XLS file
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Balance_Sheet_${dayjs().format('YYYY-MM-DD')}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    message.success("Colorful Excel Downloaded!");
  };

  // --- COLORFUL PDF EXPORT ---
  const handlePdfExport = () => {
    if (!data) return;
    const doc = new jsPDF();
    const curr = profile?.currency || '';
    const asOfDate = dayjs(data.date).format('DD MMM YYYY, hh:mm A');

    // Convert hex to RGB for jsPDF
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0,0,0];
    };
    const primaryRgb = hexToRgb(currentTheme.primary);
    const textRgb = hexToRgb(currentTheme.text);

    // Header
    doc.setFillColor(...primaryRgb);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(...hexToRgb(currentTheme.headerText));
    doc.text(profile?.shop_name || 'My Shop', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`BALANCE SHEET`, 105, 28, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`As of: ${asOfDate}`, 105, 34, { align: 'center' });

    if (template === 't-shape') {
      autoTable(doc, {
        startY: 45,
        head: [['ASSETS', `Amount (${curr})`, 'LIABILITIES & EQUITY', `Amount (${curr})`]],
        body: [
          ['Cash in Hand', formatCurrency(data.assets.cash, curr), 'Accounts Payable', formatCurrency(data.liabilities.payables, curr)],
          ['Bank & Wallets', formatCurrency(data.assets.bank, curr), 'Total Equity', formatCurrency(data.equity, curr)],
          ['Accounts Receivable', formatCurrency(data.assets.receivables, curr), '', ''],
          ['Inventory (Stock Value)', formatCurrency(data.assets.inventory, curr), '', ''],
        ],
        foot: [['Total Assets', formatCurrency(data.totalAssets, curr), 'Total Liab. & Equity', formatCurrency(data.totalLiabilitiesAndEquity, curr)]],
        theme: 'grid',
        headStyles: { fillColor: primaryRgb, textColor: hexToRgb(currentTheme.headerText) },
        footStyles: { fillColor: [240,240,240], textColor: [0,0,0], fontStyle: 'bold' },
      });
    } else {
      autoTable(doc, {
        startY: 45,
        head: [['Particulars', `Amount (${curr})`]],
        body: [
          [{ content: 'ASSETS', colSpan: 2, styles: { fillColor: [230,230,230], fontStyle: 'bold', textColor: [0,0,0] } }],
          ['Cash in Hand', formatCurrency(data.assets.cash, curr)],
          ['Bank & Wallets', formatCurrency(data.assets.bank, curr)],
          ['Accounts Receivable', formatCurrency(data.assets.receivables, curr)],
          ['Inventory (Stock Value)', formatCurrency(data.assets.inventory, curr)],
          [{ content: 'Total Assets', styles: { fontStyle: 'bold' } }, { content: formatCurrency(data.totalAssets, curr), styles: { fontStyle: 'bold' } }],
          [{ content: 'LIABILITIES & EQUITY', colSpan: 2, styles: { fillColor: [230,230,230], fontStyle: 'bold', textColor: [0,0,0] } }],
          ['Accounts Payable', formatCurrency(data.liabilities.payables, curr)],
          ['Total Equity (Net Worth)', formatCurrency(data.equity, curr)],
          [{ content: 'Total Liabilities & Equity', styles: { fontStyle: 'bold' } }, { content: formatCurrency(data.totalLiabilitiesAndEquity, curr), styles: { fontStyle: 'bold' } }],
        ],
        theme: 'grid',
        headStyles: { fillColor: primaryRgb, textColor: hexToRgb(currentTheme.headerText) },
      });
    }

    doc.save(`Balance_Sheet_${dayjs().format('YYYY-MM-DD')}.pdf`);
    message.success("Premium PDF Downloaded!");
  };

  if (loading || !data) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

  // --- RENDER SCREEN TEMPLATES ---
  const renderTemplate = () => {
    const curr = profile?.currency || '';
    
    const headerStyle = {
      background: currentTheme.primary,
      color: currentTheme.headerText,
      padding: '20px',
      textAlign: 'center',
      borderTopLeftRadius: '8px',
      borderTopRightRadius: '8px',
      marginBottom: '20px'
    };

    const sectionTitleStyle = {
      background: currentTheme.secondary,
      padding: '10px 15px',
      fontWeight: 'bold',
      borderLeft: `4px solid ${currentTheme.primary}`,
      marginBottom: '10px'
    };

    const rowStyle = { padding: '12px 15px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' };
    const totalStyle = { ...rowStyle, fontWeight: 'bold', background: '#fafafa', borderTop: '2px solid #ddd', borderBottom: '4px double #ccc', fontSize: '16px' };

    if (template === 't-shape') {
      return (
        <div style={{ border: '1px solid #e8e8e8', borderRadius: '8px', background: '#fff' }}>
          <div style={headerStyle}>
            <Title level={3} style={{ color: currentTheme.headerText, margin: 0 }}>{profile?.shop_name || 'My Shop'}</Title>
            <Text style={{ color: currentTheme.headerText, opacity: 0.8 }}>Balance Sheet as of {dayjs(data.date).format('DD MMM YYYY')}</Text>
          </div>
          <Row>
            {/* ASSETS COLUMN */}
            <Col span={12} style={{ borderRight: '1px solid #e8e8e8', padding: '0 20px 20px 20px' }}>
              <div style={{ ...sectionTitleStyle, textAlign: 'center' }}>ASSETS</div>
              <div style={rowStyle}><span>Cash in Hand</span><span>{formatCurrency(data.assets.cash, curr)}</span></div>
              <div style={rowStyle}><span>Bank & Wallets</span><span>{formatCurrency(data.assets.bank, curr)}</span></div>
              <div style={rowStyle}><span>Accounts Receivable</span><span>{formatCurrency(data.assets.receivables, curr)}</span></div>
              <div style={rowStyle}><span>Inventory (Stock Value)</span><span>{formatCurrency(data.assets.inventory, curr)}</span></div>
              <div style={{ height: '45px' }}></div> {/* Spacer to align totals */}
              <div style={totalStyle}><span>Total Assets</span><span style={{ color: currentTheme.primary }}>{formatCurrency(data.totalAssets, curr)}</span></div>
            </Col>
            
            {/* LIABILITIES COLUMN */}
            <Col span={12} style={{ padding: '0 20px 20px 20px' }}>
              <div style={{ ...sectionTitleStyle, textAlign: 'center' }}>LIABILITIES & EQUITY</div>
              <div style={rowStyle}><span>Accounts Payable</span><span>{formatCurrency(data.liabilities.payables, curr)}</span></div>
              <div style={rowStyle}><span>Total Equity (Net Worth)</span><span>{formatCurrency(data.equity, curr)}</span></div>
              <div style={{ height: '45px' }}></div>
              <div style={{ height: '45px' }}></div>
              <div style={totalStyle}><span>Total Liab. & Equity</span><span style={{ color: currentTheme.primary }}>{formatCurrency(data.totalLiabilitiesAndEquity, curr)}</span></div>
            </Col>
          </Row>
        </div>
      );
    }

    // Vertical Templates (Corporate, Executive, Formal)
    return (
      <div style={{ border: '1px solid #e8e8e8', borderRadius: '8px', background: template === 'executive' ? '#141414' : '#fff', color: template === 'executive' ? '#fff' : '#000' }}>
        <div style={headerStyle}>
          <Title level={3} style={{ color: currentTheme.headerText, margin: 0 }}>{profile?.shop_name || 'My Shop'}</Title>
          <Text style={{ color: currentTheme.headerText, opacity: 0.8 }}>Balance Sheet as of {dayjs(data.date).format('DD MMM YYYY')}</Text>
        </div>
        <div style={{ padding: '0 20px 20px 20px' }}>
          <div style={sectionTitleStyle}>ASSETS</div>
          <div style={rowStyle}><span>Cash in Hand</span><span>{formatCurrency(data.assets.cash, curr)}</span></div>
          <div style={rowStyle}><span>Bank & Wallets</span><span>{formatCurrency(data.assets.bank, curr)}</span></div>
          <div style={rowStyle}><span>Accounts Receivable</span><span>{formatCurrency(data.assets.receivables, curr)}</span></div>
          <div style={rowStyle}><span>Inventory (Stock Value)</span><span>{formatCurrency(data.assets.inventory, curr)}</span></div>
          <div style={{ ...totalStyle, background: template === 'executive' ? '#262626' : '#fafafa' }}>
            <span>Total Assets</span><span style={{ color: currentTheme.text }}>{formatCurrency(data.totalAssets, curr)}</span>
          </div>
          
          <div style={{ height: '20px' }}></div>

          <div style={sectionTitleStyle}>LIABILITIES & EQUITY</div>
          <div style={rowStyle}><span>Accounts Payable (Liabilities)</span><span>{formatCurrency(data.liabilities.payables, curr)}</span></div>
          <div style={rowStyle}><span>Total Equity (Net Worth)</span><span>{formatCurrency(data.equity, curr)}</span></div>
          <div style={{ ...totalStyle, background: template === 'executive' ? '#262626' : '#fafafa' }}>
            <span>Total Liabilities & Equity</span><span style={{ color: currentTheme.text }}>{formatCurrency(data.totalLiabilitiesAndEquity, curr)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card 
      title={<Text strong style={{ fontSize: '18px' }}><LayoutOutlined /> Premium Balance Sheet</Text>}
      extra={
        <Space wrap>
          <Text type="secondary">Design:</Text>
          <Select value={template} onChange={setTemplate} style={{ width: 220 }} size="middle">
            {Object.keys(themes).map(key => (
              <Select.Option key={key} value={key}>{themes[key].name}</Select.Option>
            ))}
          </Select>
          <Button type="primary" icon={<PrinterOutlined />} onClick={handlePdfExport}>Export PDF</Button>
          <Button type="primary" style={{ backgroundColor: '#1d6f42' }} icon={<FileExcelOutlined />} onClick={handleExcelExport}>Export Excel</Button>
        </Space>
      }
      style={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' }}
    >
      <Row justify="center">
        <Col xs={24} md={22} lg={18}>
          {renderTemplate()}
        </Col>
      </Row>
    </Card>
  );
};

export default BalanceSheet;
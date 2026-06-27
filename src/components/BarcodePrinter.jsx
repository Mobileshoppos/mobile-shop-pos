import React, { useState, useEffect } from 'react';
import { Modal, Button, InputNumber, Typography, Space, App, Switch, Select, Row, Col, theme, Checkbox, List } from 'antd';
import { PrinterOutlined, SettingOutlined } from '@ant-design/icons';
import Barcode from 'react-barcode';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';

const { Text } = Typography;
const { Option } = Select;

const BarcodePrinter = ({ visible, onClose, product, variant, bulkItems }) => {
  const { profile } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  
  // Customization States (Settings)
  const [copies, setCopies] = useState(1);
  const [showShopName, setShowShopName] = useState(false);
  const [showName, setShowName] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showWarranty, setShowWarranty] = useState(false);
  const [showBatch, setShowBatch] = useState(false); // <--- NAYA IZAFA
  const [showExpiry, setShowExpiry] = useState(false); // <--- NAYA IZAFA
  const [stickerSize, setStickerSize] = useState('50x25');

  // Bulk State
  const [bulkList, setBulkList] = useState([]);
  const isBulk = bulkItems && bulkItems.length > 0;

  useEffect(() => {
    if (isBulk) {
      setBulkList(bulkItems.map(item => ({
        ...item,
        // Agar item par barcode nahi hai, to usay tick mat lagao
        selected: !!item.barcode, 
        printQty: item.quantity || 1
      })));
    } else {
      setBulkList([]);
      // NAYA IZAFA: Single mode mein quantity ko khud-ba-khud stock ke barabar karna
      if (variant && visible) {
          // System check karega ke item ki kitni quantity available hai
          const stockQty = variant.display_quantity || variant.available_qty || variant.quantity || 1;
          // Agar stock 0 se zyada hai to utni copies set karega, warna 1
          setCopies(stockQty > 0 ? stockQty : 1);
      }
    }
  }, [bulkItems, isBulk, variant, visible]);

  // Agar modal band ho to kuch render na karein
  if (!visible) return null;
  // Agar single mode hai aur variant ya barcode nahi hai to bhi render na karein
  if (!isBulk && (!variant || !variant.barcode)) return null;

  const isA4 = stickerSize === 'A4-40';
  const widthMm = isA4 ? '52.5' : stickerSize.split('x')[0];
  const heightMm = isA4 ? '29.7' : stickerSize.split('x')[1];

  const handlePrint = () => {
    if (isBulk) {
        const totalToPrint = bulkList.filter(i => i.selected).reduce((sum, i) => sum + i.printQty, 0);
        if (totalToPrint < 1) {
            message.error("Please select at least one item to print.");
            return;
        }
    } else {
        if (copies < 1) {
            message.error("Please enter a valid number of copies.");
            return;
        }
    }

    // Hidden container se saara HTML utha lein (Jisme tamam stickers shamil hain)
    const printContent = document.getElementById('hidden-print-container').innerHTML;
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            @page { 
                size: ${isA4 ? 'A4' : `${widthMm}mm ${heightMm}mm`}; 
                margin: ${isA4 ? '10mm' : '0'}; 
            }
            body { 
              margin: 0; 
              padding: 0; 
              display: flex; 
              flex-direction: ${isA4 ? 'row' : 'column'}; 
              flex-wrap: ${isA4 ? 'wrap' : 'nowrap'};
              align-items: ${isA4 ? 'flex-start' : 'center'}; 
              justify-content: ${isA4 ? 'flex-start' : 'center'}; 
              font-family: sans-serif; 
              text-align: center; 
              background-color: white;
            }
            .sticker { 
              width: ${widthMm}mm; 
              height: ${heightMm}mm; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              overflow: hidden; 
              box-sizing: border-box;
              ${isA4 ? 'border: 1px dashed #ccc; margin: 1.5mm;' : 'page-break-after: always;'}
            }
            .shop-name {
              font-size: 11px;
              font-weight: 900;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 90%;
              margin-bottom: 2px;
              color: black;
              text-transform: uppercase;
            }
            .title { 
              font-size: 10px; 
              font-weight: bold; 
              white-space: nowrap; 
              overflow: hidden; 
              text-overflow: ellipsis; 
              max-width: 90%; 
              margin-bottom: 2px;
              color: black;
            }
            .price { 
              font-size: 11px; 
              font-weight: bold; 
              margin-top: 1px;
              color: black;
            }
            .barcode-svg {
                display: block;
                margin: 0 auto;
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    iframe.contentWindow.document.close();
    
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    
    setTimeout(() => { document.body.removeChild(iframe); }, 1000);
  };

  const handleBulkSelect = (index, checked) => {
      const newList = [...bulkList];
      newList[index].selected = checked;
      setBulkList(newList);
  };

  const handleBulkQtyChange = (index, val) => {
      const newList = [...bulkList];
      newList[index].printQty = val;
      setBulkList(newList);
  };

  // Sticker ka design jo hidden container mein render hoga
  const renderStickerContent = (itemName, itemBrand, itemBarcode, itemPrice, itemWarranty, itemBatch, itemExpiry) => (
      <div style={{ textAlign: 'center' }}>
          {showShopName && (
              <div className="shop-name" style={{ fontSize: '13px', fontWeight: 900, color: 'black', textTransform: 'uppercase', marginBottom: '2px' }}>
                  {profile?.shop_name || 'MY SHOP'}
              </div>
          )}
          {showName && (
              <div className="title" style={{ fontSize: '12px', fontWeight: 'bold', color: 'black', marginBottom: '2px' }}>
                  {itemName} {itemBrand ? `(${itemBrand})` : ''}
              </div>
          )}
          <div className="barcode-svg">
              <Barcode 
                value={itemBarcode || '00000000'} 
                width={(stickerSize === '38x25' || stickerSize === 'A4-40') ? 1.2 : 1.5} 
                height={(stickerSize === '58x40') ? 50 : 35} 
                fontSize={11} 
                margin={0} 
                background="transparent"
                lineColor="black"
              />
          </div>
          {/* NAYA IZAFA: Price, Date, Warranty, Batch, Expiry ko dikhana */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
              {showPrice && (
                  <div className="price" style={{ fontSize: '12px', fontWeight: 'bold', color: 'black' }}>
                      {formatCurrency(itemPrice, profile?.currency)}
                  </div>
              )}
              {showDate && (
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'black', alignSelf: 'center' }}>
                      D: {dayjs().format('DD/MM/YY')}
                  </div>
              )}
              {showWarranty && itemWarranty > 0 && (
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'black', alignSelf: 'center' }}>
                      W: {itemWarranty} Days
                  </div>
              )}
              {showBatch && itemBatch && (
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'black', alignSelf: 'center' }}>
                      B: {itemBatch}
                  </div>
              )}
              {showExpiry && itemExpiry && (
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'black', alignSelf: 'center' }}>
                      Exp: {dayjs(itemExpiry).format('MM/YY')}
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <Modal
      title={isBulk ? "Print Bulk Barcodes" : "Print Barcode Sticker"}
      open={visible}
      onCancel={onClose}
      width={isBulk ? 700 : 550}
      footer={[
        <Button key="cancel" onClick={onClose}>Cancel</Button>,
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
          {isBulk ? 'Print Selected' : `Print (${copies} Copies)`}
        </Button>
      ]}
    >
      <Row gutter={24} style={{ marginTop: '15px' }}>
        {/* Left Side: Settings Panel */}
        <Col span={isBulk ? 10 : 12}>
          <div style={{ padding: '15px', background: token.colorFillAlter, borderRadius: '8px', height: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong><SettingOutlined /> Sticker Settings</Text>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Shop Name ({profile?.shop_name || 'My Shop'}):</Text>
                <Switch checked={showShopName} onChange={setShowShopName} size="small" />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Show Item Name:</Text>
                <Switch checked={showName} onChange={setShowName} size="small" />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Show Price:</Text>
                <Switch checked={showPrice} onChange={setShowPrice} size="small" />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Show Date:</Text>
                <Switch checked={showDate} onChange={setShowDate} size="small" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Show Warranty:</Text>
                <Switch checked={showWarranty} onChange={setShowWarranty} size="small" />
              </div>

              {profile?.enable_batch_expiry && (
                  <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text>Show Batch No:</Text>
                        <Switch checked={showBatch} onChange={setShowBatch} size="small" />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text>Show Expiry Date:</Text>
                        <Switch checked={showExpiry} onChange={setShowExpiry} size="small" />
                      </div>
                  </>
              )}

              <div>
                <Text style={{ display: 'block', marginBottom: '4px' }}>Sticker/Page Size:</Text>
                <Select value={stickerSize} onChange={setStickerSize} style={{ width: '100%' }} size="small">
                  <Option value="50x25">50mm x 25mm (Thermal Roll)</Option>
                  <Option value="38x25">38mm x 25mm (Thermal Roll)</Option>
                  <Option value="58x40">58mm x 40mm (Thermal Roll)</Option>
                  <Option value="A4-40">A4 Sheet (40 Stickers)</Option>
                </Select>
              </div>

              {/* Single mode mein Number of copies ka box dikhayein */}
              {!isBulk && (
                  <div>
                    <Text style={{ display: 'block', marginBottom: '4px' }}>Number of Copies:</Text>
                    <InputNumber min={1} max={500} value={copies} onChange={setCopies} style={{ width: '100%' }} size="small" />
                  </div>
              )}
            </Space>

            {/* NAYA IZAFA: Bulk Mode mein chota sa Preview Left Side par dikhayein */}
            {isBulk && bulkList.length > 0 && (
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: '12px', marginBottom: '8px' }}>Sample Preview</Text>
                    <div style={{ 
                        border: `1px dashed ${token.colorBorder}`, 
                        padding: '10px', 
                        borderRadius: '8px', 
                        backgroundColor: 'white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transform: 'scale(0.9)' /* Thora chota kar diya taake jagah kam gheray */
                    }}>
                        {renderStickerContent(bulkList[0].product_name, bulkList[0].product_brand, bulkList[0].barcode, bulkList[0].sale_price, bulkList[0].warranty_days || 0, bulkList[0].batch_number, bulkList[0].expiry_date)}
                    </div>
                </div>
            )}

          </div>
        </Col>

        {/* Right Side: Preview or Bulk List */}
        <Col span={isBulk ? 14 : 12} style={{ display: 'flex', flexDirection: 'column', height: isBulk ? '400px' : 'auto' }}>
          {isBulk ? (
              <>
                  <Text type="secondary" style={{ marginBottom: '10px' }}>Select Items & Quantity</Text>
                  <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${token.colorBorder}`, borderRadius: '8px', padding: '10px' }}>
                      <List
                          dataSource={bulkList}
                          renderItem={(item, idx) => (
                              <List.Item style={{ padding: '8px 0', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                      <Checkbox 
                                          checked={item.selected} 
                                          onChange={(e) => handleBulkSelect(idx, e.target.checked)}
                                          disabled={!item.barcode}
                                      />
                                      <div style={{ flex: 1, marginLeft: '10px', display: 'flex', flexDirection: 'column' }}>
                                          <Text strong style={{ fontSize: '13px' }}>{item.product_name}</Text>
                                          <Text type={item.barcode ? "secondary" : "danger"} style={{ fontSize: '11px' }}>
                                              {item.barcode ? `Barcode: ${item.barcode}` : 'No Barcode (Generate first)'}
                                          </Text>
                                      </div>
                                      <div style={{ width: '70px' }}>
                                          <InputNumber 
                                              min={1} 
                                              value={item.printQty} 
                                              onChange={(val) => handleBulkQtyChange(idx, val)}
                                              disabled={!item.selected}
                                              size="small"
                                              style={{ width: '100%' }}
                                          />
                                      </div>
                                  </div>
                              </List.Item>
                          )}
                      />
                  </div>
              </>
          ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Text type="secondary" style={{ marginBottom: '10px' }}>Live Preview</Text>
                  <div style={{ 
                      border: `1px dashed ${token.colorBorder}`, 
                      padding: '10px', 
                      borderRadius: '8px', 
                      backgroundColor: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                      {renderStickerContent(product?.name, product?.brand, variant?.barcode, variant?.sale_price, variant?.warranty_days || product?.default_warranty_days || 0, variant?.batch_number, variant?.expiry_date)}
                  </div>
              </div>
          )}
        </Col>
      </Row>

      {/* HIDDEN PRINT CONTAINER: Yeh screen par nazar nahi aayega, sirf print ke liye HTML banayega */}
      <div id="hidden-print-container" style={{ display: 'none' }}>
         {isBulk ? (
             bulkList.filter(item => item.selected && item.printQty > 0 && item.barcode).map((item, idx) => (
                 Array(item.printQty).fill(0).map((_, copyIdx) => (
                     <div className="sticker" key={`bulk-${idx}-${copyIdx}`}>
                         {renderStickerContent(item.product_name, item.product_brand, item.barcode, item.sale_price, item.warranty_days || 0, item.batch_number, item.expiry_date)}
                     </div>
                 ))
             ))
         ) : (
             Array(copies).fill(0).map((_, copyIdx) => (
                 <div className="sticker" key={`single-${copyIdx}`}>
                     {renderStickerContent(product?.name, product?.brand, variant?.barcode, variant?.sale_price, variant?.warranty_days || product?.default_warranty_days || 0, variant?.batch_number, variant?.expiry_date)}
                 </div>
             ))
         )}
      </div>
    </Modal>
  );
};

export default BarcodePrinter;
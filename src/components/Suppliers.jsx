// src/components/Suppliers.jsx (Final Corrected Code for form prop and warnings)

import React, { useState, useEffect } from 'react';
import { Button, Table, Modal, Form, Input, App as AntApp, Space, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import DataService from '../DataService';

const Suppliers = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm();
    const { notification, modal } = AntApp.useApp();

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const data = await DataService.getSuppliers();
            setSuppliers(data || []);
        } catch (error) {
            notification.error({ message: 'Error', description: 'Failed to fetch suppliers.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSuppliers(); }, [notification]);
    
    const handleAddNew = () => { setEditingSupplier(null); form.resetFields(); setIsModalVisible(true); };
    const handleEdit = (record) => { setEditingSupplier(record); form.setFieldsValue(record); setIsModalVisible(true); };

    const handleDelete = async (id) => {
        try {
            await DataService.deleteSupplier(id);
            setSuppliers(prev => prev.filter(item => item.id !== id));
            notification.success({ message: 'Success', description: 'Supplier deleted successfully.' });
        } catch (error) {
            notification.error({ message: 'Error', description: 'Failed to delete supplier.' });
        }
    };

    const confirmDelete = (record) => {
        modal.confirm({
            title: 'Are you sure you want to delete this supplier?', content: `Supplier: "${record.name}"`,
            okText: 'Yes, Delete', okType: 'danger', cancelText: 'No', onOk: () => handleDelete(record.id),
        });
    };

    const handleModalOk = () => {
        form.validateFields()
            .then(async (values) => {
                try {
                    if (editingSupplier) {
                        const updated = await DataService.updateSupplier(editingSupplier.id, values);
                        setSuppliers(prev => prev.map(item => (item.id === editingSupplier.id ? updated : item)));
                        notification.success({ message: 'Success', description: 'Supplier updated successfully.' });
                    } else {
                        const newSupplier = await DataService.addSupplier(values);
                        setSuppliers(prev => [newSupplier, ...prev]);
                        notification.success({ message: 'Success', description: `Supplier "${newSupplier.name}" added.` });
                    }
                    setIsModalVisible(false);
                } catch (error) { notification.error({ message: 'Error', description: 'Failed to save supplier.' }); }
            })
            .catch(info => console.log('Validate Failed:', info));
    };

    const handleModalCancel = () => { setIsModalVisible(false); };

    const columns = [
        { 
            title: 'Supplier Name', dataIndex: 'name', key: 'name', 
            render: (name, record) => <Link to={`/suppliers/${record.id}`}>{name}</Link>,
            sorter: (a, b) => a.name.localeCompare(b.name) 
        },
        {
            title: 'Balance Due',
            dataIndex: 'balance_due',
            key: 'balance_due',
            align: 'right',
            sorter: (a, b) => a.balance_due - b.balance_due,
            render: (amount) => (
                <Typography.Text type={amount > 0 ? 'danger' : 'secondary'} strong>
                    {`Rs. ${amount.toLocaleString()}`}
                </Typography.Text>
            ),
        },
        { title: 'Contact Person', dataIndex: 'contact_person', key: 'contact_person' },
        { title: 'Phone', dataIndex: 'phone', key: 'phone' },
        { title: 'Address', dataIndex: 'address', key: 'address' },
        {
            title: 'Actions', key: 'actions', align: 'center',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)}>Edit</Button>
                    <Button icon={<DeleteOutlined />} danger onClick={() => confirmDelete(record)}>Delete</Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNew} style={{ marginBottom: 16 }}>Add Supplier</Button>
            <Table columns={columns} dataSource={suppliers} rowKey="id" loading={loading} scroll={{ x: true }} />
            <Modal title={editingSupplier ? "Edit Supplier" : "Add New Supplier"} open={isModalVisible} onOk={handleModalOk} onCancel={handleModalCancel} okText="Save" destroyOnHidden>
                <Form form={form} layout="vertical" name="supplier_form" style={{ marginTop: '24px' }}>
                    <Form.Item name="name" label="Supplier Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="contact_person" label="Contact Person"><Input /></Form.Item>
                    <Form.Item name="phone" label="Phone Number"><Input /></Form.Item>
                    <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
};
export default Suppliers;
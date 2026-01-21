import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Typography, Modal, Form, Input, Select, InputNumber, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { collection, onSnapshot, addDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

const { Text } = Typography;
const { Option } = Select;

const RoomList = () => {
    const [rooms, setRooms] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // Real-time Fetch
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "rooms"), (snapshot) => {
            const roomData = snapshot.docs.map(doc => ({
                key: doc.id,
                ...doc.data()
            }));
            // Sort by Room ID
            roomData.sort((a, b) => a.id.localeCompare(b.id));
            setRooms(roomData);
        });
        return () => unsubscribe();
    }, []);

    const handleAddRoom = async (values) => {
        setLoading(true);
        try {
            // Use setDoc with room ID as document ID for easier lookup by ID
            await setDoc(doc(db, "rooms", values.id), {
                id: values.id,
                type: values.type,
                price: values.price,
                status: 'Vacant', // Default status
                tenant: '-',
                createdAt: new Date()
            });
            message.success('เพิ่มห้องสำเร็จ');
            setIsModalVisible(false);
            form.resetFields();
        } catch (error) {
            console.error(error);
            message.error('เพิ่มห้องไม่สำเร็จ: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (roomId) => {
        try {
            await deleteDoc(doc(db, "rooms", roomId));
            message.success('ลบห้องสำเร็จ');
        } catch (error) {
            message.error('ลบห้องไม่สำเร็จ');
        }
    };

    const columns = [
        { title: 'ห้อง', dataIndex: 'id', key: 'id', render: (t) => <Text className="font-black text-slate-800">{t}</Text> },
        { title: 'ประเภท', dataIndex: 'type', key: 'type', render: (t) => <Text className="text-[10px] font-bold text-slate-400 uppercase">{t}</Text> },
        { title: 'ราคา', dataIndex: 'price', key: 'price', render: (v) => <Text className="font-bold">฿{v.toLocaleString()}</Text> },
        {
            title: 'สถานะ',
            dataIndex: 'status',
            key: 'status',
            render: (s) => (
                <Tag className="rounded-full border-none px-3 text-[10px] font-black" color={s === 'Occupied' ? '#fee2e2' : s === 'Vacant' ? '#f0fdf4' : '#f8fafc'}>
                    <span style={{ color: s === 'Occupied' ? '#dc2626' : s === 'Vacant' ? '#16a34a' : '#64748b' }}>{s ? s.toUpperCase() : 'UNKNOWN'}</span>
                </Tag>
            )
        },
        { title: 'ผู้เช่า', dataIndex: 'tenant', key: 'tenant', render: (t) => t === '-' || !t ? <Text className="text-slate-300">-</Text> : <Text className="font-medium">{t}</Text> },
        {
            title: '',
            key: 'action',
            render: (_, record) => (
                <Popconfirm title="แน่ใจนะว่าจะลบห้องนี้?" onConfirm={() => handleDelete(record.id)} okText="ลบ" cancelText="ยกเลิก">
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        }
    ];

    return (
        <>
            <Card bordered={false} title={<Text className="font-black text-lg">การจัดการห้องพัก</Text>} extra={
                <Button
                    type="primary"
                    danger
                    icon={<PlusOutlined />}
                    className="rounded-xl font-bold border-none shadow-md shadow-red-100"
                    onClick={() => setIsModalVisible(true)}
                >
                    เพิ่มห้องใหม่
                </Button>
            } className="shadow-sm rounded-2xl">
                <Table columns={columns} dataSource={rooms} pagination={{ pageSize: 5 }} />
            </Card>

            <Modal
                title="เพิ่มห้องพักใหม่"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form layout="vertical" onFinish={handleAddRoom} form={form}>
                    <Form.Item name="id" label="เลขห้อง" rules={[{ required: true, message: 'ระบุเลขห้อง' }]}>
                        <Input placeholder="เช่น 101" />
                    </Form.Item>
                    <Form.Item name="type" label="ประเภทห้อง" initialValue="Studio Standard">
                        <Select>
                            <Option value="Studio Standard">Studio Standard</Option>
                            <Option value="Studio Premium">Studio Premium</Option>
                            <Option value="Suite Luxury">Suite Luxury</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="price" label="ราคาเช่า (บาท)" initialValue={4200} rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} formatter={value => `฿ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\฿\s?|(,*)/g, '')} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block danger className="h-10 font-bold">บันทึกข้อมูล</Button>
                </Form>
            </Modal>
        </>
    );
};

export default RoomList;

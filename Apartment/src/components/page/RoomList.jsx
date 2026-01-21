import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Typography, Modal, Form, Input, Select, InputNumber, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, CheckSquareOutlined, CloseOutlined } from '@ant-design/icons';
import { collection, onSnapshot, doc, deleteDoc, setDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

const { Text } = Typography;
const { Option } = Select;

const RoomList = () => {
    const [rooms, setRooms] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // Filters
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');

    // Selection
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

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

    // Filter Logic
    const filteredRooms = rooms.filter(room => {
        const matchesSearch = room.id.toLowerCase().includes(searchText.toLowerCase()) ||
            (room.tenant && room.tenant.toLowerCase().includes(searchText.toLowerCase()));
        const matchesStatus = statusFilter === 'All' || room.status === statusFilter;
        const matchesType = typeFilter === 'All' || room.type === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    const handleSaveRoom = async (values) => {
        setLoading(true);
        try {
            if (editingRoom) {
                // Update existing room
                await updateDoc(doc(db, "rooms", editingRoom.id), {
                    type: values.type,
                    price: values.price,
                    status: values.status,
                });

                // Trigger Notification if Maintenance
                if (values.status === 'Maintenance' && editingRoom.status !== 'Maintenance') {
                    await addDoc(collection(db, "notifications"), {
                        type: 'maintenance',
                        title: `แจ้งซ่อม ห้อง ${editingRoom.id}`,
                        message: `ห้อง ${editingRoom.id} ถูกเปลี่ยนสถานะเป็น "ซ่อมบำรุง"`,
                        read: false,
                        createdAt: new Date()
                    });
                }

                message.success('แก้ไขข้อมูลสำเร็จ');
            } else {
                // Create new room
                await setDoc(doc(db, "rooms", values.id), {
                    id: values.id,
                    type: values.type,
                    price: values.price,
                    status: values.status || 'Vacant',
                    tenant: '-',
                    createdAt: new Date()
                });
                message.success('เพิ่มห้องสำเร็จ');
            }
            setIsModalVisible(false);
            setEditingRoom(null);
            form.resetFields();
        } catch (error) {
            console.error(error);
            message.error('บันทึกไม่สำเร็จ: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (record) => {
        setEditingRoom(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = async (roomId) => {
        try {
            await deleteDoc(doc(db, "rooms", roomId));
            message.success('ลบห้องสำเร็จ');
        } catch (error) {
            message.error('ลบห้องไม่สำเร็จ');
        }
    };

    const handleBulkDelete = async () => {
        try {
            await Promise.all(selectedRowKeys.map(key => deleteDoc(doc(db, "rooms", key))));
            message.success(`ลบ ${selectedRowKeys.length} รายการสำเร็จ`);
            setSelectedRowKeys([]);
        } catch (error) {
            message.error('ลบไม่สำเร็จ');
        }
    };

    const openModal = () => {
        setEditingRoom(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const onSelectChange = (newSelectedRowKeys) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        if (isSelectionMode) {
            setSelectedRowKeys([]);
        }
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
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
                <Space>
                    <Button type="text" icon={<EditOutlined />} className="text-slate-400" onClick={() => handleEdit(record)} />
                    <Popconfirm title="แน่ใจนะว่าจะลบห้องนี้?" onConfirm={() => handleDelete(record.id)} okText="ลบ" cancelText="ยกเลิก">
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <>
            <Card bordered={false} title={<Text className="font-black text-lg">การจัดการห้องพัก</Text>} extra={
                <Space>
                    <Button
                        onClick={toggleSelectionMode}
                        icon={isSelectionMode ? <CloseOutlined /> : <CheckSquareOutlined />}
                        className={isSelectionMode ? "text-slate-500" : "text-blue-600 bg-blue-50 border-blue-200"}
                    >
                        {isSelectionMode ? 'ยกเลิก' : 'เลือก'}
                    </Button>
                    {selectedRowKeys.length > 0 && (
                        <Popconfirm title={`ลบ ${selectedRowKeys.length} รายการ?`} onConfirm={handleBulkDelete} okText="ลบเลย" cancelText="ไม่">
                            <Button danger type="dashed" icon={<DeleteOutlined />}>ลบ ({selectedRowKeys.length})</Button>
                        </Popconfirm>
                    )}
                    <Button
                        type="primary"
                        danger
                        icon={<PlusOutlined />}
                        className="rounded-xl font-bold border-none shadow-md shadow-red-100"
                        onClick={openModal}
                    >
                        เพิ่มห้องใหม่
                    </Button>
                </Space>
            } className="shadow-sm rounded-2xl">
                <div className="mb-4 flex flex-wrap gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <Input
                        placeholder="🔍 ค้นหาห้อง / ผู้เช่า..."
                        style={{ width: 200 }}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        className="rounded-lg"
                    />
                    <Select
                        defaultValue="All"
                        style={{ width: 150 }}
                        onChange={setStatusFilter}
                        className="rounded-lg"
                    >
                        <Option value="All">ทุกสถานะ</Option>
                        <Option value="Vacant">ว่าง (Vacant)</Option>
                        <Option value="Occupied">มีผู้เช่า (Occupied)</Option>
                        <Option value="Maintenance">ซ่อมบำรุง</Option>
                    </Select>
                    <Select
                        defaultValue="All"
                        style={{ width: 180 }}
                        onChange={setTypeFilter}
                        className="rounded-lg"
                    >
                        <Option value="All">ทุกประเภทห้อง</Option>
                        <Option value="Studio Standard">Studio Standard</Option>
                        <Option value="Studio Premium">Studio Premium</Option>
                        <Option value="Suite Luxury">Suite Luxury</Option>
                    </Select>
                    <div className="flex-1 text-right text-xs text-slate-400 self-center">
                        เจอทั้งหมด {filteredRooms.length} ห้อง
                    </div>
                </div>
                <Table
                    rowSelection={isSelectionMode ? rowSelection : null}
                    columns={columns}
                    dataSource={filteredRooms}
                    pagination={{ pageSize: 10 }} // Increased default page size
                />
            </Card>

            <Modal
                title={editingRoom ? "แก้ไขข้อมูลห้องพัก" : "เพิ่มห้องพักใหม่"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form layout="vertical" onFinish={handleSaveRoom} form={form}>
                    <Form.Item name="id" label="เลขห้อง" rules={[{ required: true, message: 'ระบุเลขห้อง' }]}>
                        <Input placeholder="เช่น 101" disabled={!!editingRoom} />
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
                    <Form.Item name="status" label="สถานะ" initialValue="Vacant">
                        <Select>
                            <Option value="Vacant">ว่าง (Vacant)</Option>
                            <Option value="Occupied">มีผู้เช่า (Occupied)</Option>
                            <Option value="Maintenance">ซ่อมบำรุง (Maintenance)</Option>
                        </Select>
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block danger className="h-10 font-bold">บันทึกข้อมูล</Button>
                </Form>
            </Modal>
        </>
    );
};

export default RoomList;

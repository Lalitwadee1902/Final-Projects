import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Typography, Modal, Form, Input, Select, InputNumber, message, Popconfirm, Space, Tabs, List, Descriptions, Avatar, Badge, Empty, Tooltip, Upload } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, CheckSquareOutlined, CloseOutlined, UserOutlined, FileTextOutlined, BellOutlined, DisconnectOutlined, SearchOutlined, SafetyCertificateOutlined, HistoryOutlined, UploadOutlined, FilePdfOutlined } from '@ant-design/icons';
import { collection, onSnapshot, doc, deleteDoc, setDoc, updateDoc, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

const { Text } = Typography;
const { Option } = Select;

const RoomList = () => {
    const [rooms, setRooms] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // Detail Modal State
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRoom, setDetailRoom] = useState(null);
    const [tenantInfo, setTenantInfo] = useState(null);
    const [roomBills, setRoomBills] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Contract Preview
    const [contractVisible, setContractVisible] = useState(false);
    const [previewContract, setPreviewContract] = useState(null);

    const fetchRoomDetails = async (room) => {
        setLoadingDetails(true);
        setDetailRoom(room);
        setDetailVisible(true);
        setTenantInfo(null);
        setRoomBills([]);

        try {
            // 1. Fetch Tenant Info
            if (room.tenant && room.tenant !== '-') {
                const qUser = query(collection(db, "users"), where("roomNumber", "==", room.id));
                const userSnapshot = await getDocs(qUser);
                if (!userSnapshot.empty) {
                    setTenantInfo(userSnapshot.docs[0].data());
                }
            }

            // 2. Fetch Bills
            const qBills = query(collection(db, "bills"), where("room", "==", room.id));
            const billSnapshot = await getDocs(qBills);
            const bills = billSnapshot.docs.map(doc => ({ key: doc.id, ...doc.data() }));
            bills.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
            setRoomBills(bills);

        } catch (error) {
            console.error("Error fetching details:", error);
            message.error("ดึงข้อมูลไม่สำเร็จ");
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleRemoveTenant = async () => {
        if (!detailRoom) return;
        try {
            // 1. Update Room
            await updateDoc(doc(db, "rooms", detailRoom.id), {
                status: 'Vacant',
                tenant: '-'
            });

            // 2. Update User (if found)
            if (tenantInfo) {
                // Find user doc id (we need to query again or store ID, assuming we query)
                const qUser = query(collection(db, "users"), where("roomNumber", "==", detailRoom.id));
                const userSnapshot = await getDocs(qUser);
                if (!userSnapshot.empty) {
                    const userDocId = userSnapshot.docs[0].id;
                    await updateDoc(doc(db, "users", userDocId), {
                        roomNumber: null
                    });
                }
            }

            message.success(`เอาผู้เช่าออกจากห้อง ${detailRoom.id} เรียบร้อย`);
            setDetailVisible(false);
        } catch (error) {
            console.error(error);
            message.error("เกิดข้อผิดพลาด");
        }
    };

    const handleSendReminder = async (bill) => {
        try {
            await addDoc(collection(db, "notifications"), {
                type: 'payment_reminder',
                title: `แจ้งเตือนชำระเงิน ห้อง ${detailRoom.id}`,
                message: `กรุณาชำระบิลรอบเดือน ${dayjs(bill.dueDate).format('MMMM')} จำนวน ฿${bill.amount.toLocaleString()}`,
                read: false,
                createdAt: new Date()
            });
            message.success("ส่งแจ้งเตือนแล้ว");
        } catch (error) {
            message.error("ส่งไม่สำเร็จ");
        }
    };

    const handleUploadContract = async (file) => {
        if (!detailRoom) return;
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = reader.result;
                await updateDoc(doc(db, "rooms", detailRoom.id), {
                    contractUrl: base64,
                    contractUpdatedAt: new Date()
                });
                setDetailRoom(prev => ({ ...prev, contractUrl: base64 }));
                message.success('อัปโหลดสัญญาเรียบร้อย');
            };
        } catch (error) {
            console.error(error);
            message.error('อัปโหลดล้มเหลว');
        }
        return false;
    };

    const handleDeleteContract = async () => {
        if (!detailRoom) return;
        try {
            await updateDoc(doc(db, "rooms", detailRoom.id), {
                contractUrl: null,
                contractUpdatedAt: null
            });
            setDetailRoom(prev => ({ ...prev, contractUrl: null }));
            message.success('ลบสัญญาเรียบร้อย');
        } catch (error) {
            message.error('ลบล้มเหลว');
        }
    };

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
                    <Tooltip title="ดูรายละเอียด">
                        <Button type="primary" shape="circle" icon={<SearchOutlined />} onClick={() => fetchRoomDetails(record)} className="bg-indigo-500 border-indigo-500" />
                    </Tooltip>
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

            <Modal
                title={
                    <div className="flex items-center gap-3">
                        <Avatar shape="square" size="large" className="bg-gradient-to-br from-indigo-500 to-purple-600" icon={<UserOutlined />} />
                        <div className="flex flex-col">
                            <Text className="font-black text-lg">รายละเอียดห้อง {detailRoom?.id}</Text>
                            <Text className="text-xs text-slate-400 font-normal">{detailRoom?.type} • {detailRoom?.status}</Text>
                        </div>
                    </div>
                }
                open={detailVisible}
                onCancel={() => setDetailVisible(false)}
                footer={null}
                width={700}
                centered
            >
                {detailRoom && (
                    <Tabs defaultActiveKey="1" items={[
                        {
                            key: '1',
                            label: <span><UserOutlined /> ข้อมูลผู้เช่า</span>,
                            children: (
                                <div className="space-y-6 pt-4">
                                    {detailRoom.status === 'Occupied' ? (
                                        <>
                                            <Card className="bg-slate-50 border-slate-100 rounded-2xl">
                                                <Descriptions title="ข้อมูลสัญญา" column={1}>
                                                    <Descriptions.Item label="ชื่อผู้เช่า">{detailRoom.tenant}</Descriptions.Item>
                                                    <Descriptions.Item label="เบอร์โทร">{tenantInfo?.phoneNumber || '-'}</Descriptions.Item>
                                                    <Descriptions.Item label="Line ID">{tenantInfo?.lineId || '-'}</Descriptions.Item>
                                                    <Descriptions.Item label="เริ่มสัญญา">{tenantInfo?.moveInDate || 'ไม่ระบุ'}</Descriptions.Item>
                                                </Descriptions>
                                            </Card>
                                            <div className="flex justify-end">
                                                <Popconfirm
                                                    title="ต้องการลบผู้เช่าคนนี้?"
                                                    description="การกระทำนี้จะทำให้ห้องว่างทันที"
                                                    onConfirm={handleRemoveTenant}
                                                    okText="ยืนยัน"
                                                    cancelText="ยกเลิก"
                                                >
                                                    <Button danger type="dashed" icon={<DisconnectOutlined />}>
                                                        ยกเลิกสัญญา / ย้ายออก
                                                    </Button>
                                                </Popconfirm>
                                            </div>
                                        </>
                                    ) : (
                                        <Empty description="ห้องว่าง (Vacant)" />
                                    )}
                                </div>
                            )
                        },
                        {
                            key: '2',
                            label: <span><HistoryOutlined /> ประวัติการชำระเงิน</span>,
                            children: (
                                <List
                                    className="pt-4"
                                    itemLayout="horizontal"
                                    dataSource={roomBills}
                                    renderItem={item => (
                                        <List.Item
                                            className="border-b border-slate-50 last:border-none hover:bg-slate-50 px-4 rounded-xl transition-colors"
                                            actions={[
                                                item.status === 'Pending' && (
                                                    <Button type="link" size="small" icon={<BellOutlined />} onClick={() => handleSendReminder(item)}>
                                                        ทวงถาม
                                                    </Button>
                                                )
                                            ]}
                                        >
                                            <List.Item.Meta
                                                avatar={
                                                    <Avatar
                                                        icon={item.status === 'Paid' ? <CheckSquareOutlined /> : <FileTextOutlined />}
                                                        className={item.status === 'Paid' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"}
                                                    />
                                                }
                                                title={<Text className="font-bold">{item.type} - {dayjs(item.dueDate).format('MMM YY')}</Text>}
                                                description={
                                                    <Space>
                                                        <Tag color={item.status === 'Paid' ? 'green' : 'orange'} className="border-none rounded-sm text-[10px] font-bold">
                                                            {item.status}
                                                        </Tag>
                                                        <Text className="text-xs text-slate-400">ครบกำหนด: {dayjs(item.dueDate).format('DD/MM/YYYY')}</Text>
                                                    </Space>
                                                }
                                            />
                                            <div className="text-right">
                                                <Text className="font-black block">฿{item.amount.toLocaleString()}</Text>
                                            </div>
                                        </List.Item>
                                    )}
                                />
                            )
                        },
                        {
                            key: '3',
                            label: <span><FilePdfOutlined /> เอกสารสัญญา</span>,
                            children: (
                                <div className="space-y-6 pt-4">
                                    {detailRoom.contractUrl ? (
                                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-4">
                                            <FilePdfOutlined className="text-6xl text-red-400" />
                                            <div className="text-center">
                                                <Text className="block font-bold text-lg">มีเอกสารสัญญาแล้ว</Text>
                                                <Text className="text-slate-400 text-xs">อัปโหลดเมื่อ: {detailRoom.contractUpdatedAt ? dayjs(detailRoom.contractUpdatedAt.toDate()).format('DD/MM/YYYY HH:mm') : 'ไม่ระบุ'}</Text>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button type="primary" onClick={() => {
                                                    setPreviewContract(detailRoom.contractUrl);
                                                    setContractVisible(true);
                                                }}>
                                                    เปิดดูสัญญา
                                                </Button>
                                                <Popconfirm title="ลบสัญญา?" onConfirm={handleDeleteContract}>
                                                    <Button danger>ลบ</Button>
                                                </Popconfirm>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
                                            <FilePdfOutlined className="text-4xl text-slate-300" />
                                            <div>
                                                <Text className="block font-bold text-slate-600">ยังไม่มีเอกสารสัญญา</Text>
                                                <Text className="text-slate-400 text-xs">อัปโหลดไฟล์ PDF หรือรูปภาพสัญญาเช่าที่นี่</Text>
                                            </div>
                                            <Upload
                                                showUploadList={false}
                                                beforeUpload={handleUploadContract}
                                                accept=".pdf,image/*"
                                            >
                                                <Button icon={<UploadOutlined />}>อัปโหลดสัญญา</Button>
                                            </Upload>
                                        </div>
                                    )}
                                </div>
                            )
                        }
                    ]} />
                )}
            </Modal>

            <Modal
                title="เอกสารสัญญา"
                open={contractVisible}
                onCancel={() => setContractVisible(false)}
                footer={null}
                width={800}
                centered
                className="top-5"
            >
                {previewContract && (
                    previewContract.startsWith('data:image') ? (
                        <img src={previewContract} alt="Contract" className="w-full rounded-lg" />
                    ) : (
                        <iframe src={previewContract} className="w-full h-[70vh] rounded-lg border-none" title="Contract PDF" />
                    )
                )}
            </Modal>
        </>
    );
};

export default RoomList;

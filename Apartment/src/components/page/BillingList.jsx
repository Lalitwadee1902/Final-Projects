import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Typography, Space, Modal, Form, Input, InputNumber, DatePicker, Select, message, Popconfirm, Image, Popover } from 'antd';
import { PlusOutlined, FileTextOutlined, CheckCircleOutlined, DeleteOutlined, CheckSquareOutlined, CloseOutlined } from '@ant-design/icons';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

const BillingList = ({ initialFilters }) => {
    const [bills, setBills] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    // Filters
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [monthFilter, setMonthFilter] = useState(null);

    // Apply initial filters if provided
    useEffect(() => {
        if (initialFilters) {
            if (initialFilters.status) setStatusFilter(initialFilters.status);
            if (initialFilters.month) setMonthFilter(dayjs(initialFilters.month));
        }
    }, [initialFilters]);

    // Selection
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Fetch Bills Real-time
    useEffect(() => {
        // Query bills ordered by createdAt desc if possible, or just default
        const q = query(collection(db, "bills"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const billData = snapshot.docs.map(doc => ({
                key: doc.id,
                ...doc.data()
            }));
            setBills(billData);
        }, (error) => {
            // Fallback if index is missing
            console.log("Index might be missing, trying without order", error);
            const unsubscribeNoOrder = onSnapshot(collection(db, "bills"), (snapshot) => {
                const billData = snapshot.docs.map(doc => ({
                    key: doc.id,
                    ...doc.data()
                }));
                // Sort client side
                billData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
                setBills(billData);
            });
            return () => unsubscribeNoOrder();
        });
        return () => unsubscribe();
    }, []);

    // Fetch Rooms for Dropdown
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "rooms"), (snapshot) => {
            const roomData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            roomData.sort((a, b) => a.id.localeCompare(b.id));
            setRooms(roomData);
        });
        return () => unsubscribe();
    }, []);

    // Filter Logic
    const filteredBills = bills.filter(bill => {
        const matchesSearch = bill.room.toString().toLowerCase().includes(searchText.toLowerCase());
        const matchesStatus = statusFilter === 'All' || bill.status === statusFilter;

        let matchesMonth = true;
        if (monthFilter) {
            const billDate = dayjs(bill.dueDate);
            matchesMonth = billDate.format('YYYY-MM') === monthFilter.format('YYYY-MM');
        }

        return matchesSearch && matchesStatus && matchesMonth;
    });

    const handleCreateBill = async (values) => {
        setLoading(true);
        try {
            const rent = values.rent || 0;
            const water = values.water || 0;
            const electricity = values.electricity || 0;
            const totalAmount = rent + water + electricity;

            await addDoc(collection(db, "bills"), {
                room: values.room,
                amount: totalAmount,
                details: {
                    rent: rent,
                    water: water,
                    electricity: electricity
                },
                dueDate: values.dueDate.format('YYYY-MM-DD'),
                status: 'Pending',
                type: 'Rent+Utilities',
                createdAt: new Date()
            });
            message.success('สร้างบิลสำเร็จ');
            setIsModalVisible(false);
            form.resetFields();
        } catch (error) {
            console.error(error);
            message.error('สร้างบิลไม่สำเร็จ');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsPaid = async (id) => {
        try {
            await updateDoc(doc(db, "bills", id), {
                status: 'Paid',
                paidAt: new Date()
            });

            // Find bill details for notification (Simplified, typically we'd fetch or pass obj)
            const bill = bills.find(b => b.key === id);
            if (bill) {
                await addDoc(collection(db, "notifications"), {
                    type: 'payment',
                    title: `ชำระเงินแล้ว ห้อง ${bill.room}`,
                    message: `บิลยอด ฿${bill.amount.toLocaleString()} ได้รับการยืนยันการชำระ`,
                    read: false,
                    createdAt: new Date()
                });
            }

            message.success('อัปเดตสถานะเรียบร้อย');
        } catch (error) {
            message.error('เกิดข้อผิดพลาด');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, "bills", id));
            message.success('ลบบิลสำเร็จ');
        } catch (error) {
            message.error('ลบไม่สำเร็จ');
        }
    };

    const handleBulkDelete = async () => {
        try {
            await Promise.all(selectedRowKeys.map(key => deleteDoc(doc(db, "bills", key))));
            message.success(`ลบ ${selectedRowKeys.length} รายการสำเร็จ`);
            setSelectedRowKeys([]);
        } catch (error) {
            message.error('ลบไม่สำเร็จ');
        }
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

    // Image Preview
    const [previewImage, setPreviewImage] = useState('');
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);

    const handlePreview = (url) => {
        setPreviewImage(url);
        setIsPreviewVisible(true);
    };

    const columns = [
        {
            title: 'ห้อง',
            dataIndex: 'room',
            key: 'room',
            render: (t) => <Text className="font-black text-slate-800">{t}</Text>
        },
        {
            title: 'รายการ',
            dataIndex: 'type',
            key: 'type',
            render: (t) => <Text className="text-slate-500">{t || 'Rent'}</Text>
        },
        {
            title: 'ยอดชำระ',
            dataIndex: 'amount',
            key: 'amount',
            render: (v, record) => (
                <Popover
                    content={
                        record.details ? (
                            <div className="text-xs space-y-1">
                                <div className="flex justify-between gap-4"><Text>ค่าห้อง:</Text> <Text>฿{record.details.rent?.toLocaleString()}</Text></div>
                                <div className="flex justify-between gap-4"><Text>ค่าน้ำ:</Text> <Text>฿{record.details.water?.toLocaleString()}</Text></div>
                                <div className="flex justify-between gap-4"><Text>ค่าไฟ:</Text> <Text>฿{record.details.electricity?.toLocaleString()}</Text></div>
                            </div>
                        ) : 'ไม่มีรายละเอียด'
                    }
                    title="รายละเอียดยอดชำระ"
                >
                    <Text className="font-bold text-slate-900 cursor-pointer underline decoration-dotted">฿{v.toLocaleString()}</Text>
                </Popover>
            )
        },
        {
            title: 'หลักฐาน',
            key: 'proof',
            render: (_, record) => record.proofUrl ? (
                <Button
                    type="link"
                    icon={<FileTextOutlined />}
                    onClick={() => handlePreview(record.proofUrl)}
                    className="text-blue-500"
                >
                    ดูสลิป
                </Button>
            ) : <Text className="text-slate-300">-</Text>
        },
        {
            title: 'กำหนดชำระ',
            dataIndex: 'dueDate',
            key: 'dueDate',
            render: (t) => <Text className="text-slate-500 text-xs">{t}</Text>
        },
        {
            title: 'สถานะ',
            dataIndex: 'status',
            key: 'status',
            render: (s) => (
                <Tag className="rounded-full border-none px-3 text-[10px] font-black"
                    color={s === 'Paid' ? '#f0fdf4' : s === 'Pending' ? '#fefce8' : s === 'Waiting for Review' ? '#eff6ff' : '#fee2e2'}
                >
                    <span style={{ color: s === 'Paid' ? '#16a34a' : s === 'Pending' ? '#ca8a04' : s === 'Waiting for Review' ? '#2563eb' : '#dc2626' }}>
                        {s === 'Waiting for Review' ? 'รอตรวจสอบ' : s.toUpperCase()}
                    </span>
                </Tag>
            )
        },
        {
            title: 'วันที่จ่าย',
            key: 'paidAt',
            render: (_, record) => {
                if (record.status !== 'Paid') return <Text className="text-slate-300">-</Text>;
                if (record.paidAt) {
                    return (
                        <div className="flex flex-col">
                            <Text className="text-xs font-bold text-slate-700">{dayjs(record.paidAt.toDate()).format('DD/MM/YYYY')}</Text>
                            <Text className="text-[10px] text-slate-400">{dayjs(record.paidAt.toDate()).format('HH:mm')}</Text>
                        </div>
                    );
                }
                return <Text className="text-slate-300 text-xs">-</Text>;
            }
        },
        {
            title: '',
            key: 'action',
            render: (_, record) => (
                <Space>
                    {record.status !== 'Paid' && (
                        <Button
                            type="text"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            icon={<CheckCircleOutlined />}
                            onClick={() => handleMarkAsPaid(record.key)}
                        >
                            ยืนยันยอด
                        </Button>
                    )}
                    <Popconfirm title="ลบบิลนี้?" onConfirm={() => handleDelete(record.key)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <>
            <Card
                bordered={false}
                title={
                    <div className="flex flex-col">
                        <Text className="font-black text-lg">รายการบิลเรียกเก็บ</Text>
                        <Text className="text-xs text-slate-400 font-normal">จัดการบิลค่าเช่าและค่าน้ำค่าไฟ</Text>
                    </div>
                }
                extra={
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
                            className="rounded-xl font-bold border-none shadow-md shadow-red-100 flex items-center"
                            icon={<PlusOutlined />}
                            onClick={() => setIsModalVisible(true)}
                        >
                            สร้างบิลใหม่
                        </Button>
                    </Space>
                }
                className="shadow-sm rounded-2xl"
            >
                <div className="mb-4 flex flex-wrap gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <Input
                        placeholder="🔍 ค้นหาห้อง..."
                        style={{ width: 150 }}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        className="rounded-lg"
                    />
                    <Select
                        defaultValue="All"
                        value={statusFilter}
                        style={{ width: 150 }}
                        onChange={setStatusFilter}
                        className="rounded-lg"
                    >
                        <Option value="All">ทุกสถานะ</Option>
                        <Option value="Pending">รอชำระ (Pending)</Option>
                        <Option value="Paid">ชำระแล้ว (Paid)</Option>
                        <Option value="Overdue">เกินกำหนด (Overdue)</Option>
                    </Select>
                    <DatePicker
                        picker="month"
                        placeholder="เลือกเดือน"
                        onChange={setMonthFilter}
                        value={monthFilter}
                        className="rounded-lg w-[150px]"
                        format={'MMM YYYY'}
                    />
                    <div className="flex-1 text-right text-xs text-slate-400 self-center">
                        เจอทั้งหมด {filteredBills.length} รายการ
                    </div>
                </div>
                <Table
                    rowSelection={isSelectionMode ? rowSelection : null}
                    columns={columns}
                    dataSource={filteredBills}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title="สร้างบิลใหม่"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form layout="vertical" onFinish={handleCreateBill} form={form} initialValues={{ rent: 4500, water: 100, electricity: 500 }}>
                    <Form.Item name="room" label="ห้อง" rules={[{ required: true, message: 'กรุณาเลือกห้อง' }]}>
                        <Select placeholder="เลือกห้อง">
                            {rooms.map(r => (
                                <Option key={r.id} value={r.id}>{r.id} ({r.tenant})</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <div className="flex gap-2">
                        <Form.Item name="rent" label="ค่าห้อง" className="flex-1" rules={[{ required: true }]}>
                            <InputNumber style={{ width: '100%' }} formatter={value => `฿ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\฿\s?|(,*)/g, '')} />
                        </Form.Item>
                        <Form.Item name="water" label="ค่าน้ำ" className="flex-1" rules={[{ required: true }]}>
                            <InputNumber style={{ width: '100%' }} formatter={value => `฿ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\฿\s?|(,*)/g, '')} />
                        </Form.Item>
                        <Form.Item name="electricity" label="ค่าไฟ" className="flex-1" rules={[{ required: true }]}>
                            <InputNumber style={{ width: '100%' }} formatter={value => `฿ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\฿\s?|(,*)/g, '')} />
                        </Form.Item>
                    </div>

                    <Form.Item name="dueDate" label="กำหนดชำระ" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.rent !== curValues.rent || prevValues.water !== curValues.water || prevValues.electricity !== curValues.electricity}>
                        {() => {
                            const rent = form.getFieldValue('rent') || 0;
                            const water = form.getFieldValue('water') || 0;
                            const electricity = form.getFieldValue('electricity') || 0;
                            const total = rent + water + electricity;
                            return (
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center mb-4">
                                    <Text className="text-slate-500 font-bold">ยอดสุทธิ (Total)</Text>
                                    <Text className="text-2xl font-black text-slate-800">฿{total.toLocaleString()}</Text>
                                </div>
                            );
                        }}
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={loading} block danger className="h-10 font-bold">สร้างบิล</Button>
                </Form>
            </Modal>

            <Modal
                open={isPreviewVisible}
                footer={null}
                onCancel={() => setIsPreviewVisible(false)}
                centered
            >
                <img alt="proof" style={{ width: '100%' }} src={previewImage} />
            </Modal>
        </>
    );
};

export default BillingList;

import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Typography, Space, Modal, Form, Input, InputNumber, DatePicker, Select, message, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, CloseOutlined, FileSearchOutlined } from '@ant-design/icons';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');
const { Text } = Typography;
const { Option } = Select;

const BillingList = () => {
    const [bills, setBills] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    // Filters
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // Fetch Bills Real-time
    useEffect(() => {
        const q = query(collection(db, "bills"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const billData = snapshot.docs.map(doc => ({
                key: doc.id,
                ...doc.data()
            }));
            setBills(billData);
        }, (error) => {
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

    // Grouping Logic
    const groupedBills = Object.values(bills.reduce((acc, bill) => {
        const monthKey = `ค่าเช่าเดือน ${dayjs(bill.dueDate).format('MMMM YYYY')}`;
        const key = `${bill.room}-${monthKey}`;

        if (!acc[key]) {
            acc[key] = {
                key: key,
                room: bill.room,
                month: monthKey,
                rawDate: bill.dueDate,
                totalAmount: 0,
                billIds: [],
                bills: [],
                status: 'Paid', // Default to Paid, downgrade if any pending
                hasPendingReview: false
            };
        }

        acc[key].billIds.push(bill.key);
        acc[key].bills.push(bill);
        acc[key].totalAmount += Number(bill.amount || 0);

        // Status Hierarchy: Overdue > Pending > Pending Review > Paid
        const currentStatus = acc[key].status;
        if (bill.status === 'Overdue') {
            acc[key].status = 'Overdue';
        } else if (bill.status === 'Pending' && currentStatus !== 'Overdue') {
            acc[key].status = 'Pending';
        } else if (bill.status === 'Pending Review' && currentStatus !== 'Overdue' && currentStatus !== 'Pending') {
            acc[key].status = 'Pending Review';
            acc[key].hasPendingReview = true;
        } else if (bill.status !== 'Paid' && currentStatus === 'Paid') {
            acc[key].status = bill.status; // First non-paid status found
        }

        return acc;
    }, {}));

    // Filter Logic on Grouped Data
    const filteredGroupedBills = groupedBills.filter(group => {
        const matchesSearch = group.room.toString().toLowerCase().includes(searchText.toLowerCase()) ||
            group.month.toLowerCase().includes(searchText.toLowerCase());

        let matchesStatus = true;
        if (statusFilter !== 'All') {
            // Exact match for status filter or mapped
            matchesStatus = group.status === statusFilter;
            if (statusFilter === 'Pending' && group.status === 'Pending Review') matchesStatus = false;
        }

        return matchesSearch && matchesStatus;
    });

    // Sort: Date Descending
    filteredGroupedBills.sort((a, b) => dayjs(b.rawDate).unix() - dayjs(a.rawDate).unix());


    const handleCreateBill = async (values) => {
        setLoading(true);
        try {
            await addDoc(collection(db, "bills"), {
                room: values.room,
                amount: values.amount,
                dueDate: values.dueDate.format('YYYY-MM-DD'),
                status: 'Pending',
                type: values.type || 'Rent',
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

    const handleVerifyGroup = async (group) => {
        try {
            const updatePromises = group.billIds.map(id =>
                updateDoc(doc(db, "bills", id), {
                    status: 'Paid',
                    paidAt: new Date()
                })
            );
            await Promise.all(updatePromises);

            // Notification
            await addDoc(collection(db, "notifications"), {
                type: 'payment_verified',
                title: `ยืนยันการชำระเงิน: ห้อง ${group.room}`,
                message: `ยอด ${group.month} จำนวน ฿${group.totalAmount.toLocaleString()} ครบถ้วน`,
                roomId: group.room,
                read: false,
                createdAt: new Date()
            });

            message.success(`ยืนยันยอดห้อง ${group.room} เรียบร้อย`);
        } catch (error) {
            message.error('เกิดข้อผิดพลาด');
        }
    };

    const handleDeleteGroup = async (billIds) => {
        try {
            await Promise.all(billIds.map(id => deleteDoc(doc(db, "bills", id))));
            message.success('ลบบิลเรียบร้อย');
        } catch (error) {
            message.error('ลบไม่สำเร็จ');
        }
    };

    const columns = [
        {
            title: 'ห้อง',
            dataIndex: 'room',
            key: 'room',
            render: (t) => <Text className="font-black text-slate-800 text-lg">{t}</Text>
        },
        {
            title: 'ประจำเดือน',
            dataIndex: 'month',
            key: 'month',
            render: (t) => <Text className="font-bold text-slate-600">{t}</Text>
        },
        {
            title: 'ยอดรวม',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (v) => <Text className="font-black text-slate-900 text-lg">฿{v.toLocaleString()}</Text>
        },
        {
            title: 'สถานะ',
            dataIndex: 'status',
            key: 'status',
            render: (s) => (
                <Tag className="rounded-full border-none px-3 text-[10px] font-black"
                    color={s === 'Paid' ? '#f0fdf4' : s === 'Pending' ? '#fefce8' : s === 'Pending Review' ? '#fff7ed' : '#fee2e2'}
                >
                    <span style={{
                        color: s === 'Paid' ? '#16a34a' :
                            s === 'Pending' ? '#ca8a04' :
                                s === 'Pending Review' ? '#ea580c' : '#dc2626'
                    }}>
                        {s === 'Pending Review' ? 'รอตรวจสอบ' : s === 'Pending' ? 'รอชำระ' : s === 'Paid' ? 'ชำระแล้ว' : 'เกินกำหนด'}
                    </span>
                </Tag>
            )
        },
        {
            title: 'การกระทำ',
            key: 'action',
            render: (_, record) => (
                <Space>
                    {record.status === 'Pending Review' && (
                        <Button
                            type="primary"
                            className="bg-orange-500 hover:bg-orange-600 border-none font-bold shadow-md shadow-orange-200"
                            icon={<FileSearchOutlined />}
                            onClick={() => {
                                // View Slip Logic - Could open a modal with the slip image from the first bill that has one
                                const billWithSlip = record.bills.find(b => b.paymentSlip);
                                if (billWithSlip?.paymentSlip) {
                                    Modal.info({
                                        title: 'หลักฐานการโอนเงิน',
                                        content: <img src={billWithSlip.paymentSlip} alt="slip" className="w-full rounded-lg" />,
                                        width: 400,
                                        okText: 'ปิด',
                                        maskClosable: true
                                    });
                                } else {
                                    message.info('ไม่พบหลักฐานการโอน');
                                }
                            }}
                        >
                            ดูสลิป
                        </Button>
                    )}
                    {record.status !== 'Paid' && (
                        <Popconfirm title="ยืนยันว่าชำระครบถ้วนแล้ว?" onConfirm={() => handleVerifyGroup(record)}>
                            <Button
                                type="text"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                icon={<CheckCircleOutlined />}
                            >
                                ยืนยัน
                            </Button>
                        </Popconfirm>
                    )}
                    <Popconfirm title="ลบบิลทั้งหมดในเดือนนี้?" onConfirm={() => handleDeleteGroup(record.billIds)}>
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
                        <Text className="font-black text-lg">รายการบิลเรียกเก็บ (รายเดือน)</Text>
                        <Text className="text-xs text-slate-400 font-normal">จัดการบิลค่าเช่ารวมตามห้องพัก</Text>
                    </div>
                }
                extra={
                    <Button
                        type="primary"
                        danger
                        className="rounded-xl font-bold border-none shadow-md shadow-red-100 flex items-center"
                        icon={<PlusOutlined />}
                        onClick={() => setIsModalVisible(true)}
                    >
                        สร้างบิลเพิ่ม
                    </Button>
                }
                className="shadow-sm rounded-2xl"
            >
                <div className="mb-4 flex flex-wrap gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <Input
                        placeholder="🔍 ค้นหาห้อง หรือ เดือน..."
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
                        <Option value="Pending Review">รอตรวจสอบ</Option>
                        <Option value="Pending">รอชำระ</Option>
                        <Option value="Paid">ชำระแล้ว</Option>
                        <Option value="Overdue">เกินกำหนด</Option>
                    </Select>
                    <div className="flex-1 text-right text-xs text-slate-400 self-center">
                        เจอทั้งหมด {filteredGroupedBills.length} รายการ (เดือน)
                    </div>
                </div>
                <Table
                    columns={columns}
                    dataSource={filteredGroupedBills}
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
                <Form layout="vertical" onFinish={handleCreateBill} form={form}>
                    <p className="text-xs text-slate-400 mb-4 bg-yellow-50 p-2 rounded border border-yellow-100 text-orange-600">
                        * บิลจะถูกรวมยอดอัตโนมัติตาม "ห้อง" และ "เดือนที่กำหนดชำระ" ในหน้าลาร์บิล
                    </p>
                    <Form.Item name="room" label="ห้อง" rules={[{ required: true, message: 'กรุณาเลือกห้อง' }]}>
                        <Select placeholder="เลือกห้อง">
                            {rooms.map(r => (
                                <Option key={r.id} value={r.id}>{r.id} ({r.tenant})</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="type" label="ประเภทยอด" initialValue="ค่าเช่า (Rent)">
                        <Select>
                            <Option value="ค่าเช่า (Rent)">ค่าเช่า (Rent)</Option>
                            <Option value="ค่าน้ำ/ไฟ (Utilities)">ค่าน้ำ/ไฟ (Utilities)</Option>
                            <Option value="ซ่อมบำรุง (Maintenance)">ซ่อมบำรุง (Maintenance)</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="amount" label="จำนวนเงิน (บาท)" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} formatter={value => `฿ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\฿\s?|(,*)/g, '')} />
                    </Form.Item>

                    <Form.Item name="dueDate" label="กำหนดชำระ" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={loading} block danger className="h-10 font-bold">สร้างบิล</Button>
                </Form>
            </Modal>
        </>
    );
};

export default BillingList;

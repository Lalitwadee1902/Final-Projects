import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Typography, Space, Modal, Form, Input, InputNumber, DatePicker, Select, message, Popconfirm, Image, Popover, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, CloseOutlined, FileSearchOutlined, FileTextOutlined, CheckSquareOutlined } from '@ant-design/icons';
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
                <Form layout="vertical" onFinish={handleCreateBill} form={form} initialValues={{ rent: 4500, water: 100, electricity: 500 }}>
                    <p className="text-xs text-slate-400 mb-4 bg-yellow-50 p-2 rounded border border-yellow-100 text-orange-600">
                        * บิลจะถูกรวมยอดอัตโนมัติตาม "ห้อง" และ "เดือนที่กำหนดชำระ" ในหน้ารวมบิล
                    </p>
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
        </>
    );
};

export default BillingList;

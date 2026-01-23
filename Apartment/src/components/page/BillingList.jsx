import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Typography, Space, Modal, Form, Input, InputNumber, DatePicker, Select, message, Popconfirm, Image, Tooltip, Badge } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, CloseOutlined, FileSearchOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
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
    const [monthFilter, setMonthFilter] = useState(null);

    // Image Preview State
    const [previewImage, setPreviewImage] = useState('');
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);

    const handlePreview = (url) => {
        setPreviewImage(url);
        setIsPreviewVisible(true);
    };

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
    const [userMap, setUserMap] = useState({});

    // Fetch Rooms and Users for Dropdown Sync
    useEffect(() => {
        // 1. Fetch Rooms
        const unsubRooms = onSnapshot(collection(db, "rooms"), (snapshot) => {
            const roomData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            roomData.sort((a, b) => a.id.localeCompare(b.id));
            setRooms(roomData);
        });

        // 2. Fetch Users to Map Tenant Names (Source of Truth)
        const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            const mapping = {};
            snapshot.docs.forEach(doc => {
                const u = doc.data();
                if (u.roomNumber) {
                    // Prefer displayName, then name, then 'User'
                    mapping[u.roomNumber] = u.displayName || u.name || 'ผู้เช่า';
                }
            });
            setUserMap(mapping);
        });

        return () => {
            unsubRooms();
            unsubUsers();
        };
    }, []);

    // Grouping Logic
    const groupedBills = Object.values(bills.reduce((acc, bill) => {
        // Support both roomNumber (new) and room (legacy)
        const targetRoom = bill.roomNumber || bill.room;
        if (!targetRoom) return acc;

        const monthKey = `ค่าเช่าเดือน ${dayjs(bill.dueDate).format('MMMM YYYY')}`;
        const key = `${targetRoom}-${monthKey}`;

        if (!acc[key]) {
            acc[key] = {
                key: key,
                room: targetRoom,
                month: monthKey,
                rawDate: bill.dueDate,
                totalAmount: 0,
                billIds: [],
                bills: [],
                status: 'Paid', // Default to Paid, downgrade if any pending
                paymentSlip: null,
                paidAt: null
            };
        }

        acc[key].billIds.push(bill.key);
        acc[key].bills.push(bill);
        acc[key].totalAmount += Number(bill.amount || 0);

        // Capture slip if any bill in group has it
        if (bill.paymentSlip) acc[key].paymentSlip = bill.paymentSlip;
        if (bill.paidAt && !acc[key].paidAt) acc[key].paidAt = bill.paidAt;

        // Status Hierarchy: Overdue > Pending > Pending Review > Paid
        const currentStatus = acc[key].status;
        if (bill.status === 'Overdue') {
            acc[key].status = 'Overdue';
        } else if (bill.status === 'Pending' && currentStatus !== 'Overdue') {
            acc[key].status = 'Pending';
        } else if (bill.status === 'Pending Review' && currentStatus !== 'Overdue' && currentStatus !== 'Pending') {
            acc[key].status = 'Pending Review';
        } else if (bill.status !== 'Paid' && currentStatus === 'Paid') {
            acc[key].status = bill.status;
        }

        return acc;
    }, {}));

    // Filter Logic on Grouped Data
    const filteredGroupedBills = groupedBills.filter(group => {
        const matchesSearch = group.room.toString().toLowerCase().includes(searchText.toLowerCase()) ||
            group.month.toLowerCase().includes(searchText.toLowerCase());

        let matchesStatus = true;
        if (statusFilter !== 'All') {
            matchesStatus = group.status === statusFilter;
            if (statusFilter === 'Pending' && group.status === 'Pending Review') matchesStatus = false;
        }

        let matchesMonth = true;
        if (monthFilter) {
            const groupDate = dayjs(group.rawDate);
            matchesMonth = groupDate.format('YYYY-MM') === monthFilter.format('YYYY-MM');
        }

        return matchesSearch && matchesStatus && matchesMonth;
    });

    // Sort: Date Descending
    filteredGroupedBills.sort((a, b) => dayjs(b.rawDate).unix() - dayjs(a.rawDate).unix());


    const handleCreateBill = async (values) => {
        setLoading(true);
        try {
            const commonData = {
                room: values.room, // Maintain legacy field
                roomNumber: values.room, // Add requested field
                dueDate: values.dueDate.format('YYYY-MM-DD'),
                status: 'Pending',
                createdAt: new Date()
            };

            const billsToCreate = [];

            if (values.rentAmount > 0) {
                billsToCreate.push({ ...commonData, amount: values.rentAmount, type: 'ค่าเช่า (Rent)' });
            }
            if (values.waterAmount > 0) {
                billsToCreate.push({ ...commonData, amount: values.waterAmount, type: 'ค่าน้ำ (Water)' });
            }
            if (values.elecAmount > 0) {
                billsToCreate.push({ ...commonData, amount: values.elecAmount, type: 'ค่าไฟ (Electricity)' });
            }
            if (values.maintenanceAmount > 0) {
                billsToCreate.push({ ...commonData, amount: values.maintenanceAmount, type: 'ซ่อมบำรุง (Maintenance)' });
            }

            if (billsToCreate.length === 0) {
                message.warning('กรุณาระบุยอดเงินอย่างน้อย 1 รายการ');
                setLoading(false);
                return;
            }

            await Promise.all(billsToCreate.map(b => addDoc(collection(db, "bills"), b)));

            message.success(`สร้างบิล ${billsToCreate.length} รายการสำเร็จ`);
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

    // Expanded Row: Shows details of bills in the group
    const expandedRowRender = (record) => {
        return (
            <div className="space-y-3 p-2 bg-white rounded-2xl">
                {record.bills.map((bill, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <Text className="font-bold text-slate-700 text-base">{bill.type || 'ค่าใช้จ่ายทั่วไป'}</Text>
                                <Text className="text-xs text-slate-400">ครบกำหนด: {dayjs(bill.dueDate).format('D MMM YYYY')}</Text>
                            </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                            <Text className="font-black text-slate-800 text-base">฿{bill.amount.toLocaleString()}</Text>
                            <Tag className="m-0 rounded-full text-[10px] font-bold border-none px-2.5 py-0.5"
                                color={bill.status === 'Paid' ? '#dcfce7' : bill.status === 'Pending Review' ? '#ffedd5' : '#fee2e2'}
                            >
                                <span style={{ color: bill.status === 'Paid' ? '#15803d' : bill.status === 'Pending Review' ? '#c2410c' : '#b91c1c' }}>
                                    {bill.status === 'Pending' ? 'รอชำระ' : bill.status === 'Paid' ? 'ตรวจสอบแล้ว' : bill.status === 'Pending Review' ? 'รอตรวจสอบ' : 'เกินกำหนด'}
                                </span>
                            </Tag>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Columns for the Main Table (Groups)
    const columns = [
        {
            title: 'ห้อง',
            dataIndex: 'room',
            key: 'room',
            render: (t) => <Text className="font-black text-slate-800 text-lg">{t}</Text>
        },
        {
            title: 'รายการ',
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
            title: 'กำหนดชำระ',
            dataIndex: 'rawDate',
            key: 'rawDate',
            render: (d) => <Text className="text-slate-500 font-bold">{dayjs(d).format('D MMM YYYY')}</Text>
        },
        {
            title: 'ชำระเมื่อ',
            key: 'paidAt',
            render: (_, record) => record.paidAt ? (
                <Text className="text-slate-500 text-xs">
                    {dayjs(record.paidAt.toDate ? record.paidAt.toDate() : record.paidAt).format('D MMM YYYY HH:mm')}
                </Text>
            ) : <Text className="text-slate-300">-</Text>
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
            title: 'ข้อมูล',
            key: 'info',
            render: (_, record) => record.paymentSlip && (
                <Tooltip title="กดเพื่อดูสลิป">
                    <Button
                        type="dashed"
                        shape="circle"
                        icon={<FileSearchOutlined />}
                        onClick={() => handlePreview(record.paymentSlip)}
                        className="border-slate-300 text-slate-500 hover:text-blue-500 hover:border-blue-500 bg-white"
                    />
                </Tooltip>
            )
        },
        {
            title: 'การกระทำ',
            key: 'action',
            render: (_, record) => (
                <Space>
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
                variant="borderless"
                title={
                    <div className="flex flex-col">
                        <Text className="font-black text-lg">รายการบิลเรียกเก็บ (รายเดือน)</Text>
                        <Text className="text-xs text-slate-400 font-normal">จัดการบิลค่าเช่าและค่าน้ำค่าไฟ</Text>
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
                        placeholder="🔍 ค้นหาห้อง..."
                        style={{ width: 150 }}
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
                    <DatePicker
                        picker="month"
                        placeholder="เลือกเดือน"
                        onChange={setMonthFilter}
                        className="rounded-lg w-[150px]"
                        format={'MMM YYYY'}
                    />
                    <div className="flex-1 text-right text-xs text-slate-400 self-center">
                        เจอทั้งหมด {filteredGroupedBills.length} รายการ (เดือน)
                    </div>
                </div>
                <Table
                    columns={columns}
                    dataSource={filteredGroupedBills}
                    pagination={{ pageSize: 10 }}
                    expandable={{
                        expandedRowRender,
                        expandIcon: ({ expanded, onExpand, record }) =>
                            expanded ? (
                                <DownOutlined onClick={e => onExpand(record, e)} />
                            ) : (
                                <RightOutlined onClick={e => onExpand(record, e)} />
                            )
                    }}
                />
            </Card>

            <Modal
                title="สร้างบิลใหม่"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                destroyOnHidden
            >
                <Form layout="vertical" onFinish={handleCreateBill} form={form}>
                    <p className="text-xs text-slate-400 mb-4 bg-blue-50 p-2 rounded border border-blue-100 text-blue-600">
                        * สามารถระบุยอดหลายรายการพร้อมกันได้ ระบบจะสร้างบิลแยกแต่ละรายการให้อัตโนมัติ
                    </p>

                    <Space className="w-full mb-2" align="start">
                        <Form.Item name="room" label="ห้อง" rules={[{ required: true, message: 'เลือกห้อง' }]} className="w-[150px]">
                            <Select placeholder="เลือกห้อง" showSearch optionFilterProp="children">
                                {rooms.map(r => {
                                    // Use name from User table if available, else fallback to room's tenant field or '-'
                                    const tenantName = userMap[r.id] || r.tenant || '-';
                                    const display = r.id + (tenantName !== '-' ? ` (${tenantName})` : ' (-)');
                                    return <Option key={r.id} value={r.id}>{display}</Option>;
                                })}
                            </Select>
                        </Form.Item>
                        <Form.Item name="dueDate" label="กำหนดชำระ" rules={[{ required: true, message: 'เลือกวันที่' }]} className="flex-1">
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Space>

                    <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                        <Form.Item name="rentAmount" label="🏡 ค่าเช่า - Rent (บาท)" className="mb-2">
                            <InputNumber style={{ width: '100%' }} placeholder="0.00" formatter={value => `฿ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\฿\s?|(,*)/g, '')} />
                        </Form.Item>

                        <Space className="w-full" align="baseline">
                            <Form.Item name="waterAmount" label="💧 ค่าน้ำ - Water" className="mb-0 flex-1">
                                <InputNumber style={{ width: '100%' }} placeholder="0.00" />
                            </Form.Item>
                            <Form.Item name="elecAmount" label="⚡ ค่าไฟ - Electricity" className="mb-0 flex-1">
                                <InputNumber style={{ width: '100%' }} placeholder="0.00" />
                            </Form.Item>
                        </Space>

                        <Form.Item name="maintenanceAmount" label="🔧 ซ่อมบำรุง - Maintenance (ถ้ามี)" className="mb-0 mt-2">
                            <InputNumber style={{ width: '100%' }} placeholder="0.00" />
                        </Form.Item>
                    </div>

                    <Button type="primary" htmlType="submit" loading={loading} block danger className="h-10 font-bold mt-4">บันทึกบิล</Button>
                </Form>
            </Modal>

            <Modal
                open={isPreviewVisible}
                title="หลักฐานการโอนเงิน (Slip)"
                footer={null}
                onCancel={() => setIsPreviewVisible(false)}
                centered
                width={450}
            >
                {previewImage ? (
                    <div className="flex flex-col gap-2">
                        <img
                            src={previewImage}
                            alt="Slip"
                            className="w-full rounded-lg shadow-sm"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://placehold.co/400x600?text=Image+Error";
                            }}
                        />
                        <a href={previewImage} download="slip.png" target="_blank" rel="noreferrer" className="text-center text-blue-500 text-xs mt-2 hover:underline">
                            เปิดรูปภาพในแท็บใหม่ / ดาวน์โหลด
                        </a>
                    </div>
                ) : (
                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                        <FileSearchOutlined className="text-4xl mb-2" />
                        <Text className="block text-sm">ไม่พบรูปภาพสลิป</Text>
                        <Text className="text-xs text-slate-300">อาจเกิดจากรูปแบบไฟล์ไม่ถูกต้องหรือลิงก์เสีย</Text>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default BillingList;

import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Typography, message, Popconfirm, Space } from 'antd';
import { ToolOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { collection, onSnapshot, doc, updateDoc, addDoc, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';

const { Text, Title } = Typography;

const MaintenanceList = () => {
    const [maintenanceRooms, setMaintenanceRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Query for rooms with status 'Maintenance'
        const q = query(collection(db, "rooms"), where("status", "==", "Maintenance"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rooms = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMaintenanceRooms(rooms);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleFinishRepair = async (room) => {
        try {
            // Determine new status based on tenant presence
            const newStatus = room.tenant && room.tenant !== '-' ? 'Occupied' : 'Vacant';

            // 1. Update Room Status
            await updateDoc(doc(db, "rooms", room.id), {
                status: newStatus
            });

            // 2. Send Notification
            await addDoc(collection(db, "notifications"), {
                type: 'maintenance',
                title: `การซ่อมบำรุงเสร็จสิ้น ห้อง ${room.id}`,
                message: `ห้อง ${room.id} ได้รับการซ่อมแซมเรียบร้อยแล้ว (สถานะ: ${newStatus === 'Occupied' ? 'ไม่ว่าง' : 'ว่าง'})`,
                read: false,
                createdAt: new Date()
            });

            message.success(`ห้อง ${room.id} ซ่อมเสร็จเรียบร้อย!`);
        } catch (error) {
            console.error("Error finishing repair:", error);
            message.error("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
        }
    };

    const columns = [
        {
            title: 'หมายเลขห้อง',
            dataIndex: 'id',
            key: 'id',
            width: 150,
            render: (text) => <Text strong className="text-lg text-slate-700">{text}</Text>,
            sorter: (a, b) => a.id.localeCompare(b.id),
        },
        {
            title: 'ประเภทห้อง',
            dataIndex: 'type',
            key: 'type',
            render: (type) => <Tag color="blue" className="rounded-full px-3">{type}</Tag>
        },
        {
            title: 'ผู้เช่า',
            dataIndex: 'tenant',
            key: 'tenant',
            render: (tenant) => tenant !== '-' ? <Text>{tenant}</Text> : <Text type="secondary">-</Text>
        },
        {
            title: 'ดำเนินการ',
            key: 'action',
            render: (_, record) => (
                <Popconfirm
                    title="ยืนยันการซ่อมเสร็จ?"
                    description={`ห้อง ${record.id} จะถูกปรับสถานะเป็น "${record.tenant && record.tenant !== '-' ? 'ไม่ว่าง' : 'ว่าง'}"`}
                    onConfirm={() => handleFinishRepair(record)}
                    okText="ยืนยัน"
                    cancelText="ยกเลิก"
                >
                    <Button type="primary" className="bg-green-500 hover:bg-green-600 border-none rounded-xl font-bold shadow-md shadow-green-200" icon={<CheckCircleOutlined />}>
                        ซ่อมเสร็จ
                    </Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Space align="center">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                        <ToolOutlined className="text-xl" />
                    </div>
                    <div>
                        <Title level={4} className="m-0 text-slate-800">รายการแจ้งซ่อม</Title>
                        <Text type="secondary" className="text-xs">จัดการงานซ่อมบำรุงทั้งหมด ({maintenanceRooms.length} รายการ)</Text>
                    </div>
                </Space>
            </div>

            <Card bordered={false} className="shadow-sm rounded-3xl overflow-hidden">
                <Table
                    columns={columns}
                    dataSource={maintenanceRooms}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                    rowClassName="hover:bg-slate-50 transition-colors cursor-pointer"
                />
            </Card>
        </div>
    );
};

export default MaintenanceList;

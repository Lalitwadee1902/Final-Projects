import React from 'react';
import { Card, Table, Tag, Button, Typography } from 'antd';

const { Text } = Typography;

const initialRooms = [
    { key: '1', id: '101', type: 'Studio Premium', price: 4500, status: 'Occupied', tenant: 'สมชาย รักดี' },
    { key: '2', id: '102', type: 'Studio Standard', price: 4200, status: 'Vacant', tenant: '-' },
    { key: '3', id: '103', type: 'Suite Luxury', price: 7500, status: 'Maintenance', tenant: '-' },
    { key: '4', id: '201', type: 'Studio Standard', price: 4200, status: 'Occupied', tenant: 'วิไล พรหมมา' },
];

const RoomList = () => {
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
                    <span style={{ color: s === 'Occupied' ? '#dc2626' : s === 'Vacant' ? '#16a34a' : '#64748b' }}>{s.toUpperCase()}</span>
                </Tag>
            )
        },
        { title: 'ผู้เช่า', dataIndex: 'tenant', key: 'tenant', render: (t) => t === '-' ? <Text className="text-slate-300">-</Text> : <Text className="font-medium">{t}</Text> },
        { title: '', key: 'action', render: () => <Button type="text" className="text-slate-400 font-bold text-xs">จัดการ</Button> }
    ];

    return (
        <Card bordered={false} title={<Text className="font-black text-lg">การจัดการห้องพัก</Text>} extra={<Button type="primary" danger className="rounded-xl font-bold border-none shadow-md shadow-red-100">เพิ่มห้องใหม่</Button>} className="shadow-sm rounded-2xl">
            <Table columns={columns} dataSource={initialRooms} pagination={{ pageSize: 5 }} />
        </Card>
    );
};

export default RoomList;

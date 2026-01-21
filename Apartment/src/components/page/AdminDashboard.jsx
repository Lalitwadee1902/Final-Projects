import React from 'react';
import { Row, Col, Card, Typography, Space } from 'antd';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import CleanStat from '../CleanStat';

const { Text } = Typography;

const monthlyData = [
    { name: 'ม.ค.', income: 45000, expenses: 12000 },
    { name: 'ก.พ.', income: 52000, expenses: 15000 },
    { name: 'มี.ค.', income: 48000, expenses: 11000 },
    { name: 'เม.ย.', income: 61000, expenses: 18000 },
    { name: 'พ.ค.', income: 55000, expenses: 14000 },
    { name: 'มิ.ย.', income: 58000, expenses: 15500 },
];

const roomStatusData = [
    { name: 'ว่าง (Vacant)', value: 5, color: '#fca5a5' },
    { name: 'ไม่ว่าง (Occupied)', value: 20, color: '#dc2626' },
    { name: 'ซ่อมบำรุง (Fix)', value: 3, color: '#1f2937' },
];

const AdminDashboard = () => (
    <div className="space-y-6">
        <Row gutter={[20, 20]}>
            <Col xs={24} sm={12} lg={6}><CleanStat label="รายได้รายเดือน" value={58400} prefix="฿" isUp={true} /></Col>
            <Col xs={24} sm={12} lg={6}><CleanStat label="อัตราการเข้าพัก" value={82} prefix="" isUp={true} /></Col>
            <Col xs={24} sm={12} lg={6}><CleanStat label="ห้องว่าง" value={5} prefix="" isUp={false} /></Col>
            <Col xs={24} sm={12} lg={6}><CleanStat label="รายการแจ้งซ่อม" value={3} prefix="" isUp={false} /></Col>
        </Row>

        <Row gutter={[20, 20]}>
            <Col xs={24} lg={16}>
                <Card bordered={false} title={<Text className="font-black uppercase tracking-tight text-xs text-slate-500">กระแสรายได้ (Revenue Stream)</Text>} className="shadow-sm rounded-2xl h-[400px]">
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Tooltip
                                    cursor={{ fill: '#fef2f2' }}
                                    contentStyle={{ border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Bar
                                    dataKey="income"
                                    name="รายได้"
                                    fill="#dc2626"
                                    radius={[6, 6, 0, 0]}
                                    barSize={40}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </Col>
            <Col xs={24} lg={8}>
                <Card bordered={false} title={<Text className="font-black uppercase tracking-tight text-xs text-slate-500">สัดส่วนห้องพัก</Text>} className="shadow-sm rounded-2xl h-[400px]">
                    <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={roomStatusData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                                    {roomStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-4">
                        {roomStatusData.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                                <Space size="small"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} /><Text className="text-slate-500">{item.name}</Text></Space>
                                <Text strong>{item.value}</Text>
                            </div>
                        ))}
                    </div>
                </Card>
            </Col>
        </Row>
    </div>
);

export default AdminDashboard;

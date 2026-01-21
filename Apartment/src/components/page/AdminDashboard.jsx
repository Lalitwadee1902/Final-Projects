import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Space, Spin, Button, message, Popconfirm } from 'antd';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { ReloadOutlined, DatabaseOutlined } from '@ant-design/icons';
import CleanStat from '../CleanStat';
import { collection, onSnapshot, setDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

const { Text } = Typography;

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [stats, setStats] = useState({
        income: 0,
        occupancy: 0,
        vacant: 0,
        maintenance: 0,
        totalRooms: 0
    });
    const [monthlyData, setMonthlyData] = useState([]);
    const [roomStatusData, setRoomStatusData] = useState([]);

    // Maintenance Modal State
    const [maintenanceList, setMaintenanceList] = useState([]);
    const [isMaintenanceModalVisible, setIsMaintenanceModalVisible] = useState(false);

    useEffect(() => {
        setLoading(true);
        // define functions to process data
        const processDashboardData = (rooms, bills) => {
            // 1. Room Stats
            const totalRooms = rooms.length;
            const vacant = rooms.filter(r => r.status === 'Vacant').length;
            const occupied = rooms.filter(r => r.status === 'Occupied').length;
            const maintenance = rooms.filter(r => r.status === 'Maintenance');

            // Update Maintenance List State
            setMaintenanceList(maintenance);

            const occupancy = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

            const statusChart = [
                { name: 'ว่าง (Vacant)', value: vacant, color: '#34d399' }, // Emerald 400
                { name: 'ไม่ว่าง (Occupied)', value: occupied, color: '#f87171' }, // Red 400
                { name: 'ซ่อมบำรุง (Maintenance)', value: maintenance.length, color: '#fbbf24' }, // Amber 400
            ].filter(item => item.value > 0); // Only show statuses with values

            // 2. Financial Stats (Income)
            const paidBills = bills.filter(b => b.status === 'Paid');
            const totalIncome = paidBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);

            // 3. Monthly Income Chart (Last 6 months)
            const months = {};
            // Initialize last 6 months
            for (let i = 5; i >= 0; i--) {
                const d = dayjs().subtract(i, 'month');
                const key = d.format('MMM'); // ม.ค., ก.พ.
                months[key] = 0;
            }

            // Limit to current year for simplicity in this chart or rolling window
            // Let's do rolling window based on bill due date for simplicity
            paidBills.forEach(bill => {
                if (bill.dueDate) {
                    const d = dayjs(bill.dueDate);
                    const key = d.format('MMM');
                    if (months.hasOwnProperty(key)) {
                        months[key] += (Number(bill.amount) || 0);
                    }
                }
            });

            const incomeChart = Object.keys(months).map(m => ({
                name: m,
                income: months[m]
            }));

            setStats({
                income: totalIncome,
                occupancy,
                vacant,
                maintenance: maintenance.length,
                totalRooms
            });
            setRoomStatusData(statusChart);
            setMonthlyData(incomeChart);
            setLoading(false);
        };

        // Listeners
        const unsubRooms = onSnapshot(collection(db, "rooms"), (roomSnap) => {
            const rooms = roomSnap.docs.map(d => d.data());
            // We need bills too, so we nest or separate listeners?
            // Since we need to join logic, let's keep local state or just separate listeners.
            // Separating listeners might cause double renders but is cleaner.
            // Let's simpler approach: Listener for rooms, Listener for bills.
            // But we need to combine them for the single 'loading' state maybe?
            // Actually, stats are independent except the final render.
            // Let's use a ref or just updating state independently is fine.
            // To simplify, let's just trigger update when either changes.
            // But we need both data sets.
            // We can use a simpler pattern: 
            // Just update room stats here.
        });

        // Better Implementation: Parallel Subscriptions
        let roomsData = [];
        let billsData = [];

        const updateAll = () => processDashboardData(roomsData, billsData);

        const u1 = onSnapshot(collection(db, "rooms"), (snap) => {
            roomsData = snap.docs.map(doc => doc.data());
            updateAll();
        });

        const u2 = onSnapshot(collection(db, "bills"), (snap) => {
            billsData = snap.docs.map(doc => doc.data());
            updateAll();
        });

        return () => {
            u1();
            u2();
        };

    }, []);

    const handleSeedData = async () => {
        setSeeding(true);
        message.loading({ content: 'กำลังสร้างข้อมูลตัวอย่าง...', key: 'seed' });
        try {
            const tenantNames = ['สมชาย', 'วิไล', 'กานดา', 'ประวิทย์', 'มานี', 'ชูใจ', 'ปิติ', 'วีระ', 'ดวงใจ', 'นภา', 'ก้องภพ', 'อาทิตย์'];
            const roomTypes = ['Studio Standard', 'Studio Premium', 'Suite Luxury'];

            // 1. Generate Rooms (Floors 1-4, 5 rooms each) - Total 20 rooms
            const roomsToCreate = [];
            for (let floor = 1; floor <= 4; floor++) {
                for (let num = 1; num <= 5; num++) {
                    const roomId = `${floor}0${num}`;
                    // 70% Occupied, 20% Vacant, 10% Maintenance
                    const rand = Math.random();
                    let status = 'Occupied';
                    if (rand > 0.9) status = 'Maintenance';
                    else if (rand > 0.7) status = 'Vacant';

                    const type = roomTypes[Math.floor(Math.random() * roomTypes.length)];
                    const price = type === 'Suite Luxury' ? 7500 : type === 'Studio Premium' ? 5500 : 4200;
                    const tenant = status === 'Occupied' ? tenantNames[Math.floor(Math.random() * tenantNames.length)] : '-';

                    roomsToCreate.push({
                        id: roomId,
                        type,
                        price,
                        status,
                        tenant,
                        createdAt: new Date()
                    });
                }
            }

            // Save Rooms
            for (const r of roomsToCreate) {
                await setDoc(doc(db, "rooms", r.id), r);
            }

            // 2. Generate Bills (Backdate 6 months for occupied rooms)
            const billsToCreate = [];
            roomsToCreate.filter(r => r.status === 'Occupied').forEach(r => {
                for (let i = 0; i < 6; i++) {
                    const billDate = dayjs().subtract(i, 'month');
                    const isPaid = i > 0 || Math.random() > 0.5; // Older bills are paid

                    billsToCreate.push({
                        room: r.id,
                        amount: r.price + Math.floor(Math.random() * 500) + 100, // Rent + Random Utilities
                        dueDate: billDate.endOf('month').format('YYYY-MM-DD'),
                        status: isPaid ? 'Paid' : (i === 0 && Math.random() > 0.8) ? 'Overdue' : 'Pending',
                        type: 'Rent+Utilities',
                        createdAt: billDate.toDate(),
                        paidAt: isPaid ? billDate.add(2, 'day').toDate() : null
                    });
                }
            });

            // Save Bills
            for (const b of billsToCreate) {
                await addDoc(collection(db, "bills"), b);
            }

            message.success({ content: 'สร้างข้อมูลตัวอย่างสำเร็จ!', key: 'seed' });
        } catch (error) {
            console.error(error);
            message.error({ content: 'เกิดข้อผิดพลาดในการสร้างข้อมูล', key: 'seed' });
        } finally {
            setSeeding(false);
        }
    };

    if (loading) return <div className="p-10 flex justify-center"><Spin size="large" /></div>;

    const maintenanceDetailsModal = (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsMaintenanceModalVisible(false)} style={{ display: isMaintenanceModalVisible ? 'flex' : 'none' }}>
            <div className="bg-white rounded-2xl p-6 w-[400px] shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <Text className="text-lg font-black text-slate-700">รายการแจ้งซ่อม ({maintenanceList.length})</Text>
                    <Button type="text" shape="circle" onClick={() => setIsMaintenanceModalVisible(false)}>✕</Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-3">
                    {maintenanceList.length > 0 ? maintenanceList.map(room => (
                        <div key={room.id} className="flex justify-between items-center p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <div className="flex flex-col">
                                <Text className="font-bold text-slate-800">ห้อง {room.id}</Text>
                                <Text className="text-xs text-slate-500">{room.type}</Text>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">แจ้งซ่อม</div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-slate-400">ไม่มีรายการแจ้งซ่อม</div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 relative">
            {maintenanceDetailsModal}
            <div className="flex justify-end">
                <Popconfirm
                    title="สร้างข้อมูลตัวอย่าง?"
                    description="ข้อมูลเดิมอาจถูกทับ หรือเพิ่มซ้ำ"
                    onConfirm={handleSeedData}
                    okText="สร้างเลย"
                    cancelText="ยกเลิก"
                >
                    <Button
                        icon={<DatabaseOutlined />}
                        loading={seeding}
                        type="dashed"
                        size="small"
                        className="text-slate-400"
                    >
                        Generate Mock Data
                    </Button>
                </Popconfirm>
            </div>

            <Row gutter={[20, 20]}>
                <Col xs={24} sm={12} lg={6}><CleanStat label="รายได้รวม (ทั้งหมด)" value={stats.income} prefix="฿" isUp={true} /></Col>
                <Col xs={24} sm={12} lg={6}><CleanStat label="อัตราการเข้าพัก" value={stats.occupancy} prefix="" suffix="%" isUp={stats.occupancy > 50} /></Col>
                <Col xs={24} sm={12} lg={6}><CleanStat label="ห้องว่าง" value={stats.vacant} prefix="" isUp={false} /></Col>
                <Col xs={24} sm={12} lg={6}>
                    <div onClick={() => setIsMaintenanceModalVisible(true)} className="cursor-pointer transition-transform hover:scale-105 active:scale-95">
                        <CleanStat label="รายการแจ้งซ่อม" value={stats.maintenance} prefix="" isUp={false} />
                    </div>
                </Col>
            </Row>

            <Row gutter={[20, 20]}>
                <Col xs={24} lg={16}>
                    <Card bordered={false} title={<Text className="font-black uppercase tracking-tight text-xs text-slate-500">กระแสรายได้ (6 เดือนล่าสุด)</Text>} className="shadow-sm rounded-2xl">
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
                    <Card bordered={false} title={<Text className="font-black uppercase tracking-tight text-xs text-slate-500">สัดส่วนห้องพัก</Text>} className="shadow-sm rounded-2xl">
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
                        {roomStatusData.length === 0 && <div className="text-center text-xs text-slate-400 mt-4">รอข้อมูลห้องพัก...</div>}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default AdminDashboard;

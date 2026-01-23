import { Row, Col, Card, Button, Form, Input, Select, Typography, Space, Spin, Empty, Image, Tag, Upload, message, Modal } from 'antd';
import {
    HomeOutlined, ThunderboltOutlined, LineChartOutlined, GiftOutlined, CheckCircleOutlined, UploadOutlined, ShopOutlined,
    ToolOutlined, FileTextOutlined, PhoneOutlined, RightOutlined, BellOutlined
} from '@ant-design/icons';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, updateDoc, limit } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import 'dayjs/locale/th';

// Ensure dayjs locale is set
dayjs.locale('th');

const { Title, Text } = Typography;
const { Option } = Select;

// Mock Data for Expense Chart
const MOCK_EXPENSE_DATA = [
    { name: 'ส.ค.', rent: 5500, utilities: 600 },
    { name: 'ก.ย.', rent: 5500, utilities: 500 },
    { name: 'ต.ค.', rent: 5500, utilities: 650 },
    { name: 'พ.ย.', rent: 5500, utilities: 450 },
    { name: 'ธ.ค.', rent: 5500, utilities: 750 },
    { name: 'ม.ค.', rent: 5500, utilities: 560 },
];



const QuickAccessCard = ({ icon, title, subtitle, color, bg, border, onClick }) => (
    <div
        className={`${bg} ${border} border rounded-[1.5rem] p-6 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 h-36 flex flex-col justify-between items-start relative overflow-hidden`}
        onClick={onClick}
    >
        <div className={`text-3xl ${color}`}>
            {icon}
        </div>
        <div>
            <Text className={`font-black text-xl block ${color} mb-1`}>{title}</Text>
            <Text className={`text-sm ${color} opacity-75 font-medium`}>{subtitle}</Text>
        </div>
    </div>
);

const TenantPortal = ({ onNavigate }) => {
    const [roomData, setRoomData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bills, setBills] = useState([]);
    const [parcels, setParcels] = useState([]);
    const [marketItems, setMarketItems] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');

    const handleQuickAccess = (key) => {
        if (key === 'repair') {
            setModalTitle('แจ้งซ่อมบำรุง / Cleaning');
            setModalOpen(true);
        } else if (key === 'phone') {
            // Navigate to PhoneBook page
            if (onNavigate) {
                onNavigate('tenant_phonebook');
            } else {
                message.error('Navigation not available');
            }
        } else {
            message.info('ฟีเจอร์นี้กำลังพัฒนา');
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            let foundRealData = false;
            const unsubscribeFunctions = [];

            if (auth.currentUser) {
                try {
                    // 1. Get User Profile to find Room Number
                    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const roomNumber = userData.roomNumber;

                        if (roomNumber) {
                            foundRealData = true;
                            // Set basic data from Profile first
                            setRoomData({
                                id: roomNumber,
                                status: 'Occupied', // Default
                                type: 'Standard',   // Default
                                tenant: userData.name || userData.displayName || 'Tenant'
                            });

                            // 2. Get Room Data (Enrichment)
                            const roomDoc = await getDoc(doc(db, "rooms", roomNumber));
                            if (roomDoc.exists()) {
                                // Merge real room data, ensuring ID is preserved/consistent
                                setRoomData(prev => ({ ...prev, ...roomDoc.data(), id: roomDoc.id }));
                            }

                            // 3. Watch Bills
                            const qBills = query(
                                collection(db, "bills"),
                                where("room", "==", roomNumber),
                                where("status", "in", ["Pending", "Waiting for Review"])
                            );
                            const unsubBills = onSnapshot(qBills, (snap) => {
                                const data = snap.docs.map(d => ({ key: d.id, ...d.data() }));
                                data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
                                setBills(data);
                            });
                            unsubscribeFunctions.push(unsubBills);

                            // 4. Watch Parcels
                            const qParcels = query(
                                collection(db, "parcels"),
                                where("roomId", "==", roomNumber)
                            );
                            const unsubParcels = onSnapshot(qParcels, (snap) => {
                                const data = snap.docs.map(d => ({ key: d.id, ...d.data() }));
                                data.sort((a, b) => b.arrivedAt?.seconds - a.arrivedAt?.seconds);
                                setParcels(data);
                            });
                            unsubscribeFunctions.push(unsubParcels);
                        }
                    }

                    // 5. Watch Marketplace (Global)
                    const qMarket = query(collection(db, "market_items"), orderBy("createdAt", "desc"), limit(3));
                    const unsubMarket = onSnapshot(qMarket, (snap) => {
                        if (!snap.empty) {
                            const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                            setMarketItems(items);
                        } else {
                            setMarketItems([
                                { id: 1, title: 'ตู้เย็น Mini Bar', price: 2500, sellerName: 'ห้อง 304', imageUrl: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=300&q=80' },
                                { id: 2, title: 'พัดลม Hatari', price: 450, sellerName: 'ห้อง 201', imageUrl: 'https://images.unsplash.com/photo-1565128032194-9f268b8b8f2d?w=300&q=80' },
                                { id: 3, title: 'ราวตากผ้า', price: 200, sellerName: 'ห้อง 112', imageUrl: null }
                            ]);
                        }
                    });
                    unsubscribeFunctions.push(unsubMarket);

                } catch (error) {
                    console.error("Error fetching tenant data:", error);
                }
            }

            if (!foundRealData) {
                // FALLBACK: Use Mock Data
                setRoomData({
                    id: '101',
                    type: 'Studio Premium',
                    status: 'Occupied',
                    price: 5500,
                    tenant: 'คุณตัวอย่าง'
                });
                setBills([
                    { key: 'b1', type: 'ค่าเช่า', amount: 5500, dueDate: dayjs().format('YYYY-MM-DD'), status: 'Pending' }
                ]);
            }

            setLoading(false);
            return () => unsubscribeFunctions.forEach(fn => fn && fn());
        };
        const cleanup = fetchData();
        return () => cleanup && cleanup.then(fn => fn && fn());
    }, []);

    if (loading) return <div className="flex justify-center p-10"><Spin /></div>;
    if (!roomData) return null;

    const totalDue = bills
        .filter(b => b.status === 'Pending')
        .reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-0 relative">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-0 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Title level={2} className="m-0 font-black text-slate-800 tracking-tight">ห้อง {roomData.id}</Title>
                        <Tag color={roomData.status === 'Occupied' ? 'success' : 'warning'} className="rounded-full px-3 border-none font-bold">
                            {roomData.status === 'Occupied' ? 'ปกติ' : roomData.status}
                        </Tag>
                    </div>
                </div>
                <div className="text-right">
                    <Text className="text-slate-400 text-xs font-black uppercase tracking-widest block mb-1">ยอดชำระทั้งหมด</Text>
                    <div className="flex items-center gap-1 justify-end">
                        <Title level={1} className="m-0 font-black text-slate-800 tracking-tighter">฿{totalDue.toLocaleString()}</Title>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <Row gutter={[20, 20]}>
                {/* Left Col: Chart & Market */}
                <Col xs={24} lg={16} className="space-y-6">
                    {/* Expense Chart */}
                    <Card bordered={false} className="shadow-sm rounded-2xl" title={<Text className="font-black uppercase tracking-tight text-xs text-slate-500">ค่าใช้จ่ายรอบ 6 เดือน (Expenses)</Text>}>
                        <div className="h-[300px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={MOCK_EXPENSE_DATA}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="rent" stackId="a" fill="#dc2626" radius={[0, 0, 4, 4]} barSize={40} name="ค่าเช่า" />
                                    <Bar dataKey="utilities" stackId="a" fill="#fee2e2" radius={[4, 4, 0, 0]} barSize={40} name="ค่าน้ำ/ไฟ" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Community Market (Replaced Pending Bills) */}
                    <Card bordered={false} className="shadow-sm rounded-2xl"
                        title={<div className="flex justify-between items-center"><Text className="font-black uppercase tracking-tight text-xs text-slate-500">ตลาดชุมชน (Community Market)</Text><Button type="link" size="small" className="text-xs p-0 text-slate-400">ดูทั้งหมด</Button></div>}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {marketItems.map(m => (
                                <div key={m.id} className="flex flex-col gap-2 cursor-pointer group p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                    <div className="w-full h-32 rounded-xl bg-slate-100 shrink-0 overflow-hidden relative">
                                        {m.imageUrl && <img src={m.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={m.title} />}
                                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                                            ฿{m.price}
                                        </div>
                                    </div>
                                    <div>
                                        <Text className="font-bold text-slate-700 text-sm block group-hover:text-blue-500 transition-colors truncate">{m.title}</Text>
                                        <Text className="text-xs text-slate-400 flex items-center gap-1"><ShopOutlined /> {m.sellerName}</Text>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>

                {/* Right Col: Quick Access & Parcels */}
                <Col xs={24} lg={8} className="space-y-6">
                    {/* Quick Access Grid - Pastel Style (Moved to Sidebar) */}
                    <Row gutter={[16, 16]}>
                        <Col span={12}>
                            <QuickAccessCard
                                icon={<ToolOutlined />}
                                title="แจ้งซ่อม"
                                subtitle="เรียกช่าง"
                                color="text-orange-500"
                                bg="bg-[#FFF0E6]" // Custom Pastel Orange
                                border="border-orange-100"
                                onClick={() => handleQuickAccess('repair')}
                            />
                        </Col>
                        <Col span={12}>
                            <QuickAccessCard
                                icon={<GiftOutlined />}
                                title="พัสดุ"
                                subtitle={`${parcels.length} รายการ`}
                                color="text-blue-500"
                                bg="bg-[#E3F2FD]" // Custom Pastel Blue
                                border="border-blue-100"
                                onClick={() => { }}
                            />
                        </Col>
                        <Col span={12}>
                            <QuickAccessCard
                                icon={<FileTextOutlined />}
                                title="สัญญาเช่า"
                                subtitle="ดูออนไลน์"
                                color="text-purple-500"
                                bg="bg-[#F3E5F5]" // Custom Pastel Purple
                                border="border-purple-100"
                                onClick={() => { }}
                            />
                        </Col>
                        <Col span={12}>
                            <QuickAccessCard
                                icon={<PhoneOutlined />}
                                title="สมุดโทรศัพท์"
                                subtitle="เบอร์สำคัญ"
                                color="text-emerald-500"
                                bg="bg-[#E8F5E9]" // Custom Pastel Green
                                border="border-emerald-100"
                                onClick={() => handleQuickAccess('phone')}
                            />
                        </Col>
                    </Row>

                    {/* Parcels */}
                    <Card bordered={false} className="shadow-sm rounded-2xl" title={<Text className="font-black uppercase tracking-tight text-xs text-slate-500">พัสดุมาใหม่ (New Parcels)</Text>}>
                        {parcels.length > 0 ? (
                            <div className="space-y-3">
                                {parcels.map(p => (
                                    <div key={p.key} className="p-3 rounded-xl border border-slate-100 flex gap-3 items-center">
                                        <div className="w-12 h-12 bg-slate-100 rounded-lg shrink-0 overflow-hidden">
                                            <Image src={p.imageUrl} width="100%" height="100%" className="object-cover" fallback="https://placehold.co/100" preview={false} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <Text className="font-bold text-slate-700 block text-xs truncate">{p.carrier}</Text>
                                            <Text className="text-[10px] text-slate-400 block">{dayjs(p.arrivedAt?.toDate()).fromNow()}</Text>
                                        </div>
                                        {p.status === 'Arrived' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 text-xs">ไม่มีพัสดุตกค้าง</div>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Modals */}
            <Modal
                title={modalTitle}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                centered
                className="rounded-2xl"
            >
                {modalTitle.includes('แจ้งซ่อม') && (
                    <Form layout="vertical" className="mt-4">
                        <Form.Item label="เรื่องที่ต้องการแจ้ง">
                            <Select placeholder="เลือกประเภท..." className="h-10">
                                <Option value="repair">🛠️ แจ้งซ่อมบำรุง</Option>
                                <Option value="electric">⚡ ไฟฟ้าขัดข้อง</Option>
                                <Option value="water">💧 น้ำประปา/ท่อรั่ว</Option>
                                <Option value="clean">🧹 ทำความสะอาด</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label="รายละเอียดเพิ่มเติม">
                            <Input.TextArea rows={4} placeholder="ระบุรายละเอียด..." />
                        </Form.Item>
                        <Form.Item label="แนบรูปภาพ (ถ้ามี)">
                            <Upload>
                                <Button icon={<UploadOutlined />}>คลิกเพื่ออัปโหลด</Button>
                            </Upload>
                        </Form.Item>
                        <Button type="primary" block size="large" className="bg-slate-900 mt-2 h-12 text-lg font-bold">ส่งเรื่อง</Button>
                    </Form>
                )}
            </Modal>
        </div>
    );
};

export default TenantPortal;

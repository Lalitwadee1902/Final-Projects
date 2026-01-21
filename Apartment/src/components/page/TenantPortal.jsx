import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Button, Form, Input, Select, Typography, Space, Spin, Empty } from 'antd';
import {
    HomeOutlined, ThunderboltOutlined, LineChartOutlined
} from '@ant-design/icons';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';

const { Title, Text } = Typography;
const { Option } = Select;

const TenantPortal = () => {
    const [roomData, setRoomData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!auth.currentUser) return;
            try {
                // 1. Get User Profile to find Room Number
                const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const roomNumber = userData.roomNumber;

                    if (roomNumber) {
                        // 2. Get Room Data
                        const roomDoc = await getDoc(doc(db, "rooms", roomNumber));
                        if (roomDoc.exists()) {
                            setRoomData(roomDoc.data());
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching tenant data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="flex justify-center p-10"><Spin /></div>;

    if (!roomData) return (
        <div className="text-center p-20">
            <Empty description="ไม่พบข้อมูลห้องพักของคุณ (กรุณาติดต่อเจ้าหน้าที่)" />
        </div>
    );

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-50 flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-red-50 rounded-full -mr-20 -mt-20 blur-3xl opacity-50" />
                <div className="space-y-2 relative z-10 text-center md:text-left">
                    <Text className="text-red-600 font-black tracking-widest text-[10px] uppercase">สถานะการพักอาศัย</Text>
                    <Title level={2} className="m-0 font-black tracking-tight text-4xl">สวัสดีครับ, ห้อง {roomData.id}</Title>
                    <Text className="text-slate-400 text-base">{roomData.type} • สถานะ: {roomData.status}</Text>
                </div>
                <div className="mt-8 md:mt-0 bg-slate-900 text-white p-8 rounded-3xl min-w-[260px] relative z-10">
                    <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-2">ยอดที่ต้องชำระ</Text>
                    <div className="text-4xl font-black mb-6 tracking-tighter">฿{(roomData.price + 950).toLocaleString()}</div>
                    <Button block danger type="primary" className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest">ชำระเงินทันที</Button>
                </div>
            </div>

            <Row gutter={[24, 24]}>
                <Col xs={24} md={16}>
                    <div className="space-y-4">
                        <Text className="font-black uppercase tracking-widest text-[10px] text-slate-400 px-4">สรุปค่าใช้จ่าย</Text>
                        {[
                            { label: 'ค่าเช่าห้อง', val: roomData.price, icon: <HomeOutlined /> },
                            { label: 'ค่าไฟ (120 หน่วย)', val: 840, icon: <ThunderboltOutlined /> },
                            { label: 'ค่าน้ำ (เหมาจ่าย)', val: 110, icon: <LineChartOutlined /> },
                        ].map((item, i) => (
                            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 flex justify-between items-center group hover:border-red-200 transition-all cursor-default">
                                <Space size="large">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-red-500 transition-colors">{item.icon}</div>
                                    <div>
                                        <Text className="font-black text-slate-800 block text-base">{item.label}</Text>
                                        <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ค่าบริการรายเดือน</Text>
                                    </div>
                                </Space>
                                <Text className="text-xl font-black text-slate-700">฿{item.val.toLocaleString()}</Text>
                            </div>
                        ))}
                    </div>
                </Col>
                <Col xs={24} md={8}>
                    <div className="space-y-4">
                        <Text className="font-black uppercase tracking-widest text-[10px] text-slate-400 px-4">บริการช่วยเหลือ</Text>
                        <Card bordered={false} className="rounded-3xl shadow-sm border border-slate-50">
                            <Form layout="vertical">
                                <Form.Item label={<Text className="text-[10px] font-bold uppercase text-slate-400">ประเภทปัญหา</Text>}>
                                    <Select defaultValue="repair" className="rounded-xl h-11"><Option value="repair">แจ้งซ่อมบำรุง</Option></Select>
                                </Form.Item>
                                <Form.Item label={<Text className="text-[10px] font-bold uppercase text-slate-400">รายละเอียด</Text>}>
                                    <Input.TextArea rows={4} placeholder="ระบุอาการเสีย..." className="rounded-xl border-slate-100" />
                                </Form.Item>
                                <Button block className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest border-slate-200 text-slate-500">ส่งเรื่องแจ้งซ่อม</Button>
                            </Form>
                        </Card>
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default TenantPortal;

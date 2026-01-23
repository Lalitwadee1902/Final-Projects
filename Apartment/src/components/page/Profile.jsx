import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, message, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebase';

const { Title, Text } = Typography;

const Profile = ({ userData }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userData) {
            form.setFieldsValue({
                displayName: userData.displayName || userData.name || '',
                email: userData.email || auth.currentUser?.email || '',
                tel: userData.tel || '',
                roomNumber: userData.roomNumber || ''
            });
        }
    }, [userData, form]);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            if (!auth.currentUser) return;
            const userRef = doc(db, "users", auth.currentUser.uid);

            // Prepare update data
            // We mainly update displayName as requested. 
            // Usually email/roomNumber are not editable by user easily or handled elsewhere, but for name:
            await updateDoc(userRef, {
                displayName: values.displayName,
                // name: values.displayName // Sync if you use 'name' field too, but 'displayName' is standard-ish
            });
            message.success('อัปเดตข้อมูลโปรไฟล์สำเร็จ');
        } catch (error) {
            console.error(error);
            message.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center md:text-left">
                <Text className="text-red-600 font-black tracking-widest text-[10px] uppercase">การจัดการบัญชี</Text>
                <Title level={2} className="m-0 font-black tracking-tight text-4xl">ข้อมูลส่วนตัว</Title>
            </div>

            <Card className="rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 p-4 md:p-10">
                <div className="flex flex-col items-center mb-10">
                    <div className="relative">
                        <Avatar
                            size={120}
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.role || 'user'}`}
                            icon={<UserOutlined />}
                            className="bg-slate-50 border-4 border-white shadow-xl"
                        />
                        <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 border-4 border-white rounded-full"></div>
                    </div>
                    <div className="mt-4 text-center">
                        <Title level={4} className="m-0 font-black text-slate-800">{userData?.displayName || userData?.name || 'ผู้ใช้งาน'}</Title>
                        <Text type="secondary" className="text-xs uppercase font-bold tracking-widest">{userData?.role === 'admin' ? 'Administrator' : 'Tenant'}</Text>
                    </div>
                </div>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    className="space-y-4"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item
                            name="displayName"
                            label={<Text className="font-bold uppercase text-[10px] text-slate-400 tracking-widest">ชื่อ - นามสกุล</Text>}
                            rules={[{ required: true, message: 'กรุณาระบุชื่อ' }]}
                            className="md:col-span-2"
                        >
                            <Input size="large" className="rounded-2xl h-12 font-semibold text-slate-700 bg-slate-50 border-slate-200 focus:bg-white" placeholder="สมชาย ใจดี" />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            label={<Text className="font-bold uppercase text-[10px] text-slate-400 tracking-widest">อีเมล</Text>}
                        >
                            <Input size="large" className="rounded-2xl h-12 font-medium text-slate-500 bg-slate-50 border-transparent" disabled />
                        </Form.Item>

                        <Form.Item
                            name="roomNumber"
                            label={<Text className="font-bold uppercase text-[10px] text-slate-400 tracking-widest">หมายเลขห้อง</Text>}
                        >
                            <Input size="large" className="rounded-2xl h-12 font-medium text-slate-500 bg-slate-50 border-transparent" disabled />
                        </Form.Item>
                    </div>

                    <div className="pt-4">
                        <Button type="primary" htmlType="submit" loading={loading} block size="large" className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-900 hover:bg-slate-800 border-none shadow-xl shadow-slate-200">
                            บันทึกการเปลี่ยนแปลง
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default Profile;

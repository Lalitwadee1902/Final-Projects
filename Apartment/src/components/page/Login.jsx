import React, { useState } from 'react';
import { Card, Typography, Form, Input, Button, Tabs, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Login = ({ onLogin }) => {
    const [loading, setLoading] = useState(false);

    const handleSubmit = (values, role) => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            onLogin(role);
            message.success(`ยินดีต้อนรับเข้าสู่ระบบในฐานะ ${role === 'admin' ? 'เจ้าของหอพัก' : 'ผู้พักอาศัย'}`);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-red-100 rounded-full blur-[100px] opacity-50 pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-blue-50 rounded-full blur-[120px] opacity-60 pointer-events-none" />

            <Card bordered={false} className="w-full max-w-md shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] rounded-[2rem] overflow-hidden relative z-10">
                <div className="text-center mb-8 pt-4">
                    <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-200 transform rotate-12 mx-auto mb-6">
                        <ThunderboltOutlined className="text-white text-3xl" />
                    </div>
                    <Text className="font-black text-xl tracking-tighter text-slate-800 uppercase block">Apt<span className="text-red-600">Pure</span></Text>
                    <Text className="text-slate-400 text-xs font-bold tracking-widest uppercase">ระบบจัดการหอพักอัจฉริยะ</Text>
                </div>

                <Tabs
                    defaultActiveKey="admin"
                    centered
                    className="custom-tabs mb-6"
                    items={[
                        {
                            key: 'admin',
                            label: <span className="font-bold tracking-wide">เจ้าของหอพัก</span>,
                            children: (
                                <Form
                                    name="admin_login"
                                    layout="vertical"
                                    onFinish={(v) => handleSubmit(v, 'admin')}
                                    size="large"
                                    className="mt-4"
                                >
                                    <Form.Item name="username" rules={[{ required: true, message: 'กรุณากรอกชื่อผู้ใช้' }]}>
                                        <Input prefix={<UserOutlined className="text-slate-400" />} placeholder="ชื่อผู้ใช้ (Admin)" className="rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400 text-sm font-medium" />
                                    </Form.Item>
                                    <Form.Item name="password" rules={[{ required: true, message: 'กรุณากรอกรหัสผ่าน' }]}>
                                        <Input.Password prefix={<LockOutlined className="text-slate-400" />} placeholder="รหัสผ่าน" className="rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400 text-sm font-medium" />
                                    </Form.Item>
                                    <Form.Item>
                                        <div className="flex justify-between items-center">
                                            <Checkbox className="text-xs text-slate-500 font-medium">จำรหัสผ่าน</Checkbox>
                                            <a href="#" className="text-xs font-bold text-red-500">ลืมรหัสผ่าน?</a>
                                        </div>
                                    </Form.Item>
                                    <Form.Item>
                                        <Button type="primary" htmlType="submit" loading={loading} block className="h-12 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-200 border-none">
                                            เข้าสู่ระบบ
                                        </Button>
                                    </Form.Item>
                                </Form>
                            )
                        },
                        {
                            key: 'tenant',
                            label: <span className="font-bold tracking-wide">ผู้พักอาศัย</span>,
                            children: (
                                <Form
                                    name="tenant_login"
                                    layout="vertical"
                                    onFinish={(v) => handleSubmit(v, 'tenant')}
                                    size="large"
                                    className="mt-4"
                                >
                                    <Form.Item name="room_id" rules={[{ required: true, message: 'กรุณากรอกเลขห้อง' }]}>
                                        <Input prefix={<HomeOutlined className="text-slate-400" />} placeholder="เลขห้อง (เช่น 101)" className="rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400 text-sm font-medium" />
                                    </Form.Item>
                                    <Form.Item name="password" rules={[{ required: true, message: 'กรุณากรอกเบอร์โทรศัพท์' }]}>
                                        <Input.Password prefix={<LockOutlined className="text-slate-400" />} placeholder="รหัสผ่าน / เบอร์โทรศัพท์" className="rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400 text-sm font-medium" />
                                    </Form.Item>
                                    <Form.Item>
                                        <Button type="primary" htmlType="submit" loading={loading} block className="h-12 rounded-xl font-black text-xs uppercase tracking-widest bg-red-600 hover:bg-red-500 shadow-lg shadow-red-200 border-none">
                                            เข้าสู่ระบบ
                                        </Button>
                                    </Form.Item>
                                </Form>
                            )
                        }
                    ]}
                />

                <div className="text-center mt-4 border-t border-slate-50 pt-6">
                    <Text className="text-[10px] text-slate-400 font-medium">Pure & Noble Apartment OS — Ver 2.0</Text>
                </div>
            </Card>

            {/* Home Icon for import fix locally if needed, though Antd handles global imports nicely usually, 
          but here I just need to make sure HomeOutlined is defined if I used it inside the children prop.
          Wait, I used HomeOutlined in the render but didn't import it in the top level import destructuring for 'icons'.
          Let me fix the import line.
      */}
        </div>
    );
};

// Fix missing import
import { HomeOutlined } from '@ant-design/icons';

export default Login;

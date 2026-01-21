import React, { useState } from 'react';
import { Card, Typography, Form, Input, Button, Tabs, Checkbox, message, Switch } from 'antd';
import { UserOutlined, LockOutlined, ThunderboltOutlined, HomeOutlined, MailOutlined } from '@ant-design/icons';
import bcrypt from 'bcryptjs';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';

const { Title, Text } = Typography;

const Login = ({ onLogin }) => {
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false); // Toggle between Login/Register

    // Unified Handler for both Admin and Tenant
    const handleAuth = async (values, role) => {
        setLoading(true);
        try {
            if (isRegistering) {
                // --- REGISTER ---
                if (values.password !== values.confirmPassword) {
                    message.error('รหัสผ่านไม่ตรงกัน');
                    setLoading(false);
                    return;
                }

                // 1. Create User in Auth
                const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
                const user = userCredential.user;

                // 2. Prepare User Data
                const salt = bcrypt.genSaltSync(10);
                const hashedPassword = bcrypt.hashSync(values.password, salt);

                const userData = {
                    email: user.email,
                    role: role,
                    password: hashedPassword, // Store hashed password
                    createdAt: new Date()
                };

                // Add Room ID for Tenant
                if (role === 'tenant' && values.room_id) {
                    userData.roomNumber = values.room_id;
                }

                // 3. Save Role to Firestore
                await setDoc(doc(db, "users", user.uid), userData);

                message.success('สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...');
            } else {
                // --- LOGIN ---
                const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);

                // Update password in Firestore on login (to backfill existing users or update changed passwords)
                try {
                    const salt = bcrypt.genSaltSync(10);
                    const hashedPassword = bcrypt.hashSync(values.password, salt);

                    await setDoc(doc(db, "users", userCredential.user.uid), {
                        password: hashedPassword
                    }, { merge: true });
                } catch (e) {
                    console.error("Error saving password to Firestore:", e);
                }

                message.success('เข้าสู่ระบบสำเร็จ');
            }
            // Note: App.jsx listener will pick up the auth state change
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/email-already-in-use') {
                message.error('อีเมลนี้ถูกใช้งานแล้ว');
            } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                message.error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
            } else {
                message.error('เกิดข้อผิดพลาด: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const renderAuthForm = (role) => (
        <div className="mt-4">
            <div className="flex justify-center mb-6">
                <div className="bg-slate-100 p-1 rounded-xl flex items-center">
                    <button onClick={() => setIsRegistering(false)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!isRegistering ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>เข้าสู่ระบบ</button>
                    <button onClick={() => setIsRegistering(true)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isRegistering ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>ลงทะเบียนใหม่</button>
                </div>
            </div>

            <Form
                name={`${role}_auth`}
                layout="vertical"
                onFinish={(values) => handleAuth(values, role)}
                size="large"
                initialValues={{ remember: true }}
            >
                <Form.Item name="email" rules={[{ required: true, message: 'กรุณากรอกอีเมล' }, { type: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' }]}>
                    <Input prefix={<MailOutlined className="text-slate-400" />} placeholder="อีเมล (name@example.com)" className="rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400 text-sm font-medium" />
                </Form.Item>

                {/* Show Room ID field only for Tenant Registration */}
                {role === 'tenant' && isRegistering && (
                    <Form.Item name="room_id" rules={[{ required: true, message: 'กรุณากรอกเลขห้อง' }]}>
                        <Input prefix={<HomeOutlined className="text-slate-400" />} placeholder="เลขห้อง (เช่น 101)" className="rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400 text-sm font-medium" />
                    </Form.Item>
                )}

                <Form.Item name="password" rules={[{ required: true, message: 'กรุณากรอกรหัสผ่าน' }, { min: 6, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }]}>
                    <Input.Password prefix={<LockOutlined className="text-slate-400" />} placeholder="รหัสผ่าน" className="rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400 text-sm font-medium" />
                </Form.Item>

                {isRegistering && (
                    <Form.Item name="confirmPassword" rules={[{ required: true, message: 'กรุณายืนยันรหัสผ่าน' }]}>
                        <Input.Password prefix={<LockOutlined className="text-slate-400" />} placeholder="ยืนยันรหัสผ่าน" className="rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400 text-sm font-medium" />
                    </Form.Item>
                )}

                {!isRegistering && (
                    <Form.Item>
                        <div className="flex justify-between items-center">
                            <Checkbox className="text-xs text-slate-500 font-medium">จำรหัสผ่าน</Checkbox>
                            <a href="#" className="text-xs font-bold text-red-500">ลืมรหัสผ่าน?</a>
                        </div>
                    </Form.Item>

                )}

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block className={`h-12 rounded-xl font-black text-xs uppercase tracking-widest border-none shadow-lg ${role === 'admin' ? 'bg-slate-900 hover:bg-slate-800 shadow-slate-200' : 'bg-red-600 hover:bg-red-500 shadow-red-200'}`}>
                        {isRegistering ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-red-100 rounded-full blur-[100px] opacity-50 pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-blue-50 rounded-full blur-[120px] opacity-60 pointer-events-none" />

            <Card bordered={false} className="w-full max-w-md shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] rounded-[2rem] overflow-hidden relative z-10">
                <div className="text-center mb-6 pt-4">
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
                            children: renderAuthForm('admin')
                        },
                        {
                            key: 'tenant',
                            label: <span className="font-bold tracking-wide">ผู้พักอาศัย</span>,
                            children: renderAuthForm('tenant')
                        }
                    ]}
                />

                <div className="text-center mt-4 border-t border-slate-50 pt-6">
                    <Text className="text-[10px] text-slate-400 font-medium">Pure & Noble Apartment OS — Ver 2.0</Text>
                </div>
            </Card>
        </div>
    );
};


export default Login;

import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Button, Checkbox, message } from 'antd';
import { LockOutlined, ThunderboltOutlined, HomeOutlined, MailOutlined, UserOutlined, PhoneOutlined } from '@ant-design/icons';
import bcrypt from 'bcryptjs';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';

const { Title, Text } = Typography;

const Login = ({ onLogin }) => {
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false); // Toggle between Login/Register

    // Unified Handler
    const handleAuth = async (values) => {
        setLoading(true);
        // Default role for new registrations via this form is 'tenant'
        // Admins are assumed to be pre-created or require backend setup
        const role = 'tenant';

        try {
            if (isRegistering) {
                // --- REGISTER ---
                if (values.password !== values.confirmPassword) {
                    message.error('รหัสผ่านไม่ตรงกัน');
                    setLoading(false);
                    return;
                }

                // 0. Pre-check: Validate Room Validity & Vacancy
                const roomRef = doc(db, "rooms", values.room_id);
                const roomSnap = await getDoc(roomRef);

                if (!roomSnap.exists()) {
                    message.error('ไม่พบเลขห้องนี้ในระบบ');
                    setLoading(false);
                    return;
                }

                if (roomSnap.data().status !== 'Vacant') {
                    message.error('ห้องนี้มีผู้เช่าแล้ว ไม่สามารถลงทะเบียนได้');
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
                    displayName: values.name, // Save Real Name
                    phoneNumber: values.phone, // Save Phone
                    roomNumber: values.room_id,
                    role: role,
                    password: hashedPassword,
                    createdAt: new Date()
                };

                // 3. Save User to Firestore
                await setDoc(doc(db, "users", user.uid), userData);

                // 4. Update Room Status -> Occupied
                await updateDoc(roomRef, {
                    status: 'Occupied',
                    tenant: values.name // Link Name to Room for display
                });

                message.success('สมัครสมาชิกและเช็คอินเข้าห้องสำเร็จ!');
            } else {
                // --- LOGIN ---
                const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);

                // Update password in Firestore on login (optional sync)
                try {
                    const salt = bcrypt.genSaltSync(10);
                    const hashedPassword = bcrypt.hashSync(values.password, salt);

                    await setDoc(doc(db, "users", userCredential.user.uid), {
                        password: hashedPassword
                    }, { merge: true });
                } catch (e) {
                    // console.error("Error saving password to Firestore:", e);
                }

                message.success('เข้าสู่ระบบสำเร็จ');
            }
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

    // Seed Admin Accounts
    useEffect(() => {
        const seedAdmins = async () => {
            const adminsToSeed = [
                { email: "Admin1@gmail.com", password: "123456" },
                { email: "Admin2@gmail.com", password: "123456" }
            ];

            for (const admin of adminsToSeed) {
                try {
                    // Try to create the admin user
                    const userCredential = await createUserWithEmailAndPassword(auth, admin.email, admin.password);

                    // If successful (didn't throw), set up Firestore
                    const salt = bcrypt.genSaltSync(10);
                    const hashedPassword = bcrypt.hashSync(admin.password, salt);

                    await setDoc(doc(db, "users", userCredential.user.uid), {
                        email: admin.email,
                        role: 'admin',
                        password: hashedPassword,
                        createdAt: new Date()
                    });

                    message.success(`Admin Account seeded: ${admin.email}`);
                } catch (error) {
                    if (error.code !== 'auth/email-already-in-use') {
                        // console.error(`Admin seeding failed for ${admin.email}:`, error);
                    }
                    // If already in use, we do nothing.
                }
            }
        };

        seedAdmins();
    }, []);


    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-red-100 rounded-full blur-[100px] opacity-50 pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-blue-50 rounded-full blur-[120px] opacity-60 pointer-events-none" />

            <Card variant="borderless" className="w-full max-w-md shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] rounded-[2rem] overflow-hidden relative z-10">
                <div className="text-center mb-6 pt-4">
                    <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-200 transform rotate-12 mx-auto mb-6">
                        <ThunderboltOutlined className="text-white text-3xl" />
                    </div>
                    <Text className="font-black text-xl tracking-tighter text-slate-800 uppercase block">Apt<span className="text-red-600">Pure</span></Text>
                    <Text className="text-slate-400 text-xs font-bold tracking-widest uppercase">ระบบจัดการหอพักอัจฉริยะ</Text>
                </div>

                <div className="mt-4 px-6">
                    {/* Segmented Control / Pill Toggle */}


                    <Form
                        name="auth_form"
                        layout="vertical"
                        onFinish={handleAuth}
                        size="large"
                        initialValues={{ remember: true }}
                        requiredMark={false}
                    >
                        {isRegistering && (
                            <>
                                <Form.Item name="name" rules={[{ required: true, message: 'กรุณากรอกชื่อ-นามสกุล' }]}>
                                    <Input prefix={<UserOutlined className="text-slate-400" />} placeholder="ชื่อ-นามสกุล (Name-Surname)" className="rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400 text-sm font-medium h-12" />
                                </Form.Item>
                                <Form.Item name="phone" rules={[{ required: true, message: 'กรุณากรอกเบอร์โทร' }]}>
                                    <Input prefix={<PhoneOutlined className="text-slate-400" />} placeholder="เบอร์โทรศัพท์ (Phone)" className="rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400 text-sm font-medium h-12" />
                                </Form.Item>
                            </>
                        )}

                        <Form.Item
                            name="email"
                            rules={[{ required: true, message: 'กรุณากรอกอีเมล' }, { type: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' }]}
                        >
                            <Input prefix={<MailOutlined className="text-slate-400" />} placeholder="อีเมล (name@example.com)" className="rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400 text-sm font-medium h-12" />
                        </Form.Item>

                        {/* Show Room ID field only for Registration (Tenant) */}
                        {isRegistering && (
                            <Form.Item name="room_id" rules={[{ required: true, message: 'กรุณากรอกเลขห้อง' }]}>
                                <Input prefix={<HomeOutlined className="text-slate-400" />} placeholder="เลขห้อง (เช่น 101)" className="rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400 text-sm font-medium h-12" />
                            </Form.Item>
                        )}

                        <Form.Item name="password" rules={[{ required: true, message: 'กรุณากรอกรหัสผ่าน' }, { min: 6, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }]}>
                            <Input.Password prefix={<LockOutlined className="text-slate-400" />} placeholder="รหัสผ่าน" className="rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400 text-sm font-medium h-12" />
                        </Form.Item>

                        {isRegistering && (
                            <Form.Item name="confirmPassword" rules={[{ required: true, message: 'กรุณายืนยันรหัสผ่าน' }]}>
                                <Input.Password prefix={<LockOutlined className="text-slate-400" />} placeholder="ยืนยันรหัสผ่าน" className="rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400 text-sm font-medium h-12" />
                            </Form.Item>
                        )}

                        {!isRegistering && (
                            <Form.Item className="mb-6">
                                <div className="flex justify-between items-center">
                                    <Checkbox className="text-xs text-slate-500 font-medium">จำรหัสผ่าน</Checkbox>
                                    <a href="#" className="text-xs font-bold text-red-500 hover:text-red-600">ลืมรหัสผ่าน?</a>
                                </div>
                            </Form.Item>

                        )}

                        <Form.Item className="mb-2">
                            <Button type="primary" htmlType="submit" loading={loading} block className="h-12 rounded-xl font-black text-xs uppercase tracking-widest border-none shadow-lg bg-red-600 hover:bg-red-500 shadow-red-200 transition-all hover:scale-[1.02] active:scale-95">
                                {isRegistering ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
                            </Button>
                        </Form.Item>
                    </Form>

                    <div className="text-center mt-6">
                        <Text className="text-slate-500 text-xs">
                            {isRegistering ? 'มีบัญชีผู้ใช้งานแล้ว? ' : 'ยังไม่มีบัญชีผู้ใช้งาน? '}
                            <span
                                onClick={() => setIsRegistering(!isRegistering)}
                                className="text-red-600 font-bold cursor-pointer hover:underline transition-colors"
                            >
                                {isRegistering ? 'เข้าสู่ระบบ' : 'ลงทะเบียนผู้เช่าใหม่'}
                            </span>
                        </Text>
                    </div>
                </div>

                <div className="text-center mt-4 border-t border-slate-50 pt-6 pb-2">
                    <Text className="text-[10px] text-slate-400 font-medium">Pure & Noble Apartment OS — Ver 2.0</Text>
                </div>
            </Card>
        </div>
    );
};


export default Login;

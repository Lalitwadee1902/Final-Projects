import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Modal, Form, Input, Upload, message, Popconfirm, Image, Tag, Avatar, Badge, Empty, InputNumber, TimePicker, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, ShopOutlined, UserOutlined, PhoneOutlined, SafetyCertificateOutlined, LineOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const Marketplace = ({ userRole }) => {
    const [items, setItems] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    // Get Current User Info
    useEffect(() => {
        const fetchUser = async () => {
            if (auth.currentUser) {
                const docRef = doc(db, "users", auth.currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setCurrentUser({ uid: auth.currentUser.uid, ...docSnap.data() });
                } else {
                    // Fallback for admin if not in users collection or just use auth
                    setCurrentUser({ uid: auth.currentUser.uid, role: 'admin' });
                }
            }
        };
        fetchUser();
    }, []);

    // Real-time Fetch Market Items
    useEffect(() => {
        const q = query(collection(db, "market_items"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                key: doc.id,
                ...doc.data()
            }));
            setItems(data);
        }, (error) => {
            console.log(error);
            // Fallback
            const unsubscribeNoOrder = onSnapshot(collection(db, "market_items"), (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    key: doc.id,
                    ...doc.data()
                }));
                data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
                setItems(data);
            });
            return () => unsubscribeNoOrder();
        });
        return () => unsubscribe();
    }, []);

    const getBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });

    const handleAddItem = async (values) => {
        if (fileList.length === 0) {
            message.error('กรุณาใส่รูปสินค้าอย่างน้อย 1 รูป');
            return;
        }

        setLoading(true);
        try {
            const file = fileList[0].originFileObj;
            const imageUrl = await getBase64(file);

            let sellerName = 'Admin';
            if (currentUser && currentUser.roomNumber) {
                sellerName = `ห้อง ${currentUser.roomNumber}`;
            }

            await addDoc(collection(db, "market_items"), {
                title: values.title,
                price: values.price,
                description: values.description || '',
                lineId: values.lineId || '',
                phoneNumber: values.phoneNumber || '',
                openingDays: values.openingDays || [],
                openingHours: values.openingHours ? values.openingHours.map(t => t.format('HH:mm')) : null,
                imageUrl: imageUrl,
                sellerId: auth.currentUser.uid,
                sellerName: sellerName,
                createdAt: new Date()
            });

            message.success('ลงขายสินค้าเรียบร้อย');
            setIsModalVisible(false);
            form.resetFields();
            setFileList([]);
        } catch (error) {
            console.error(error);
            message.error('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, "market_items", id));
            message.success('ลบสินค้าเรียบร้อย');
        } catch (error) {
            message.error('ลบไม่สำเร็จ');
        }
    };

    // Permission Check
    const canDelete = (item) => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true; // Admin deletes all
        return currentUser.uid === item.sellerId; // Owner deletes own
    };

    return (
        <div className="space-y-6">
            <Card bordered={false} className="shadow-sm rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 border-none relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
                <div className="flex justify-between items-center relative z-10 px-4 py-2">
                    <div className="text-white">
                        <Title level={2} className="m-0 text-white font-black tracking-tight flex items-center gap-3">
                            <ShopOutlined /> ตลาดลูกบ้าน
                        </Title>
                        <Text className="text-indigo-100 opacity-80 block mt-1">ซื้อขายแลกเปลี่ยนของใช้ภายในหอพัก</Text>
                    </div>
                    <Button
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => setIsModalVisible(true)}
                        className="bg-white text-indigo-600 border-none font-black hover:bg-indigo-50 shadow-lg h-12 px-6 rounded-xl"
                    >
                        ลงขายของ
                    </Button>
                </div>
            </Card>

            {items.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <Empty description="ยังไม่มีสินค้าวางขาย มาเป็นคนแรกสิ!" />
                    <Button type="primary" className="mt-4" onClick={() => setIsModalVisible(true)}>เริ่มลงขายเลย</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {items.map(item => (
                        <div key={item.key} className="bg-white rounded-3xl overflow-hidden border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
                            <div className="relative aspect-square overflow-hidden bg-slate-100">
                                <Image
                                    src={item.imageUrl}
                                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                                    width="100%"
                                    height="100%"
                                />
                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black shadow-sm text-slate-700">
                                    {dayjs(item.createdAt?.toDate()).fromNow()}
                                </div>
                                {canDelete(item) && (
                                    <div className="absolute top-3 left-3">
                                        <Popconfirm title="ลบสินค้านี้?" onConfirm={() => handleDelete(item.key)} okText="ลบ" cancelText="ไม่">
                                            <Button type="primary" danger shape="circle" icon={<DeleteOutlined />} size="small" />
                                        </Popconfirm>
                                    </div>
                                )}
                            </div>

                            <div className="p-5 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <Text className="font-bold text-lg leading-tight line-clamp-1 flex-1 mr-2">{item.title}</Text>
                                    <Text className="text-emerald-500 font-black text-lg whitespace-nowrap">฿{item.price.toLocaleString()}</Text>
                                </div>

                                <Paragraph className="text-slate-400 text-sm line-clamp-2 mb-4 flex-1 h-[2.5em]">
                                    {item.description}
                                </Paragraph>

                                <div className="pt-4 border-t border-slate-50 mt-auto space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Avatar size="small" icon={<UserOutlined />} className="bg-indigo-50 text-indigo-500" />
                                        <span>ผู้ขาย: <span className="font-bold text-slate-700">{item.sellerName}</span></span>
                                    </div>
                                    <div className="space-y-1">
                                        {item.phoneNumber && (
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Avatar size="small" icon={<PhoneOutlined />} className="bg-emerald-50 text-emerald-500" />
                                                <span>โทร: <span className="font-bold text-slate-700 select-all">{item.phoneNumber}</span></span>
                                            </div>
                                        )}
                                        {item.lineId && (
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Avatar size="small" icon={<LineOutlined />} className="bg-green-50 text-green-500" />
                                                <span>Line: <span className="font-bold text-slate-700 select-all">{item.lineId}</span></span>
                                            </div>
                                        )}
                                    </div>
                                    {item.openingHours && (
                                        <div className="flex flex-col gap-1 mt-1 bg-orange-50/50 p-2 rounded-lg border border-orange-100">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Avatar size="small" icon={<ClockCircleOutlined />} className="bg-orange-100 text-orange-500" />
                                                <div className="flex flex-col">
                                                    {item.openingDays && item.openingDays.length > 0 && (
                                                        <span className="font-bold text-slate-700 mb-0.5">
                                                            {item.openingDays.length === 7 ? 'ทุกวัน' : item.openingDays.join(', ')}
                                                        </span>
                                                    )}
                                                    <span className="text-slate-600 font-medium">{item.openingHours[0]} - {item.openingHours[1]} น.</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                title={
                    <div className="flex items-center gap-2 text-indigo-600">
                        <ShopOutlined className="text-xl" />
                        <span className="font-black text-xl">ลงขายสินค้าใหม่</span>
                    </div>
                }
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                centered
            >
                <Form layout="vertical" onFinish={handleAddItem} form={form}>
                    <Form.Item name="title" label="ชื่อสินค้า" rules={[{ required: true, message: 'กรุณาระบุชื่อสินค้า' }]}>
                        <Input placeholder="เช่น ตู้เย็นมินิ, หนังสือเรียน" size="large" className="rounded-xl" />
                    </Form.Item>

                    <Form.Item name="price" label="ราคา (บาท)" rules={[{ required: true, message: 'กรุณาระบุราคา' }]}>
                        <InputNumber
                            style={{ width: '100%' }}
                            size="large"
                            className="rounded-xl"
                            formatter={value => `฿ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/\฿\s?|(,*)/g, '')}
                        />
                    </Form.Item>

                    <Form.Item name="description" label="รายละเอียดสินค้า">
                        <TextArea rows={3} placeholder="สภาพสินค้า, อายุการใช้งาน, เหตุผลที่ขาย..." className="rounded-xl" />
                    </Form.Item>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item
                            name="phoneNumber"
                            label="เบอร์โทรศัพท์"
                            rules={[
                                { pattern: /^\d{10}$/, message: 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (value || getFieldValue('lineId')) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('ต้องกรอกเบอร์โทร หรือ Line ID อย่างน้อยหนึ่งอย่าง'));
                                    },
                                }),
                            ]}
                        >
                            <Input prefix={<PhoneOutlined className="text-slate-400" />} placeholder="08xxxxxxxx" size="large" className="rounded-xl" maxLength={10} />
                        </Form.Item>

                        <Form.Item
                            name="lineId"
                            label="Line ID"
                            rules={[
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (value || getFieldValue('phoneNumber')) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('ต้องกรอกเบอร์โทร หรือ Line ID อย่างน้อยหนึ่งอย่าง'));
                                    },
                                }),
                            ]}
                        >
                            <Input prefix={<LineOutlined className="text-slate-400" />} placeholder="ไอดีไลน์" size="large" className="rounded-xl" />
                        </Form.Item>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item name="openingDays" label="วันทำการ (Optional)">
                            <Select mode="multiple" placeholder="เลือกวันที่เปิด" allowClear size="large" className="rounded-xl" maxTagCount="responsive">
                                {['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'].map(day => (
                                    <Select.Option key={day} value={day}>{day}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="openingHours" label="เวลาทำการ (Optional)">
                            <TimePicker.RangePicker format="HH:mm" className="w-full rounded-xl" size="large" placeholder={['เวลาเปิด', 'เวลาปิด']} />
                        </Form.Item>
                    </div>

                    <Form.Item label="รูปภาพสินค้า" required>
                        <Upload
                            listType="picture-card"
                            fileList={fileList}
                            onChange={({ fileList }) => setFileList(fileList)}
                            beforeUpload={() => false}
                            maxCount={1}
                        >
                            {fileList.length < 1 && (
                                <div>
                                    <PlusOutlined />
                                    <div style={{ marginTop: 8 }}>เพิ่มรูป</div>
                                </div>
                            )}
                        </Upload>
                    </Form.Item>

                    <Button type="primary" htmlType="submit" block size="large" loading={loading} className="bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl h-12 shadow-lg shadow-indigo-100 border-none">
                        ลงขายทันที
                    </Button>
                </Form>
            </Modal>
        </div>
    );
};

export default Marketplace;

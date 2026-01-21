import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Typography, Modal, Form, Select, Upload, message, Popconfirm, Image, Space, Input } from 'antd';
import { PlusOutlined, DeleteOutlined, GiftOutlined, InboxOutlined, UploadOutlined, SearchOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

const { Text, Title } = Typography;
const { Option } = Select;

const ParcelList = () => {
    const [parcels, setParcels] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState([]);

    // Real-time Fetch Parcels
    useEffect(() => {
        const q = query(collection(db, "parcels"), orderBy("arrivedAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const parcelData = snapshot.docs.map(doc => ({
                key: doc.id,
                ...doc.data()
            }));
            setParcels(parcelData);
        }, (error) => {
            console.log(error);
            // Fallback if index missing
            const unsubscribeNoOrder = onSnapshot(collection(db, "parcels"), (snapshot) => {
                const parcelData = snapshot.docs.map(doc => ({
                    key: doc.id,
                    ...doc.data()
                }));
                parcelData.sort((a, b) => b.arrivedAt?.seconds - a.arrivedAt?.seconds);
                setParcels(parcelData);
            });
            return () => unsubscribeNoOrder();
        });
        return () => unsubscribe();
    }, []);

    // Fetch Rooms
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "rooms"), (snapshot) => {
            const roomData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            roomData.sort((a, b) => a.id.localeCompare(b.id));
            setRooms(roomData);
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

    const handleAddParcel = async (values) => {
        if (fileList.length === 0) {
            message.error('กรุณาถ่ายรูปหรืออัปโหลดรูปพัสดุ');
            return;
        }

        setLoading(true);
        try {
            const file = fileList[0].originFileObj;
            const imageUrl = await getBase64(file);

            // 1. Add Parcel
            await addDoc(collection(db, "parcels"), {
                roomId: values.roomId,
                imageUrl: imageUrl, // Storing Base64 directly for MVP simplicity. For prod, use Storage.
                status: 'Arrived',
                arrivedAt: new Date(),
                note: values.note || '',
                carrier: values.carrier || 'Unknown'
            });

            // 2. Notify User
            await addDoc(collection(db, "notifications"), {
                type: 'parcel',
                roomId: values.roomId, // Ideally we target user ID, but simplified to room logic for now
                title: 'มีพัสดุมาส่งครับ 📦',
                message: `พัสดุของคุณ (ห้อง ${values.roomId}) มาถึงแล้ว กรุณาติดต่อรับที่ฝ่ายนิติฯ`,
                read: false,
                createdAt: new Date()
            });

            message.success('บันทึกพัสดุเรียบร้อย');
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

    const handleMarkPickedUp = async (id) => {
        try {
            await updateDoc(doc(db, "parcels", id), {
                status: 'PickedUp',
                pickedUpAt: new Date()
            });
            message.success('อัปเดตสถานะเป็นรับแล้ว');
        } catch (error) {
            message.error('เกิดข้อผิดพลาด');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, "parcels", id));
            message.success('ลบรายการเรียบร้อย');
        } catch (error) {
            message.error('ลบไม่สำเร็จ');
        }
    };

    const columns = [
        {
            title: 'รูปพัสดุ',
            dataIndex: 'imageUrl',
            key: 'imageUrl',
            render: (url) => (
                <Image
                    src={url}
                    width={80}
                    height={80}
                    className="object-cover rounded-xl border border-slate-200"
                    fallback="https://placehold.co/100?text=No+Image"
                />
            )
        },
        {
            title: 'ห้อง',
            dataIndex: 'roomId',
            key: 'roomId',
            render: (t) => <Tag color="blue" className="font-bold text-lg px-2 py-1 rounded-lg">{t}</Tag>
        },
        {
            title: 'ขนส่ง / รายละเอียด',
            key: 'info',
            render: (_, r) => (
                <div className="flex flex-col">
                    <Text className="font-bold">{r.carrier}</Text>
                    <Text className="text-xs text-slate-400">{r.note}</Text>
                    <Text className="text-[10px] text-slate-400 mt-1">
                        มาถึง: {dayjs(r.arrivedAt?.toDate()).format('D MMM HH:mm')}
                    </Text>
                </div>
            )
        },
        {
            title: 'สถานะ',
            dataIndex: 'status',
            key: 'status',
            render: (s) => (
                <Tag className="rounded-full border-none px-3 py-1 text-xs font-black"
                    color={s === 'Arrived' ? '#fefce8' : '#f0fdf4'}
                >
                    <span style={{ color: s === 'Arrived' ? '#ca8a04' : '#16a34a' }}>
                        {s === 'Arrived' ? 'รอมารับ (Waiting)' : 'รับแล้ว (Picked Up)'}
                    </span>
                </Tag>
            )
        },
        {
            title: '',
            key: 'action',
            render: (_, r) => (
                <Space>
                    {r.status === 'Arrived' && (
                        <Button
                            type="primary"
                            className="bg-green-500 hover:bg-green-600 border-none shadow-md shadow-green-100"
                            icon={<CheckCircleOutlined />}
                            onClick={() => handleMarkPickedUp(r.key)}
                        >
                            รับแล้ว
                        </Button>
                    )}
                    <Popconfirm title="ลบรายการนี้?" onConfirm={() => handleDelete(r.key)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <>
            <Card
                bordered={false}
                className="shadow-sm rounded-2xl"
                title={
                    <div className="flex flex-col">
                        <Text className="font-black text-lg">📦 จัดการพัสดุ (Parcels)</Text>
                        <Text className="text-xs text-slate-400 font-normal">บันทึกพัสดุเข้าและแจ้งเตือนลูกบ้าน</Text>
                    </div>
                }
                extra={
                    <Button
                        type="primary"
                        danger
                        icon={<PlusOutlined />}
                        className="rounded-xl font-bold border-none shadow-md shadow-red-100 h-10 px-6"
                        onClick={() => setIsModalVisible(true)}
                    >
                        รับพัสดุใหม่
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={parcels}
                    pagination={{ pageSize: 5 }}
                />
            </Card>

            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <div className="bg-red-50 p-2 rounded-full text-red-500"><InboxOutlined /></div>
                        <Text className="font-bold text-lg">บันทึกพัสดุใหม่</Text>
                    </div>
                }
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form layout="vertical" onFinish={handleAddParcel} form={form}>
                    <Form.Item name="roomId" label="ห้องปลายทาง" rules={[{ required: true, message: 'ระบุห้อง' }]}>
                        <Select
                            showSearch
                            placeholder="พิมพ์เลขห้อง..."
                            optionFilterProp="children"
                        >
                            {rooms.map(r => (
                                <Option key={r.id} value={r.id}>{r.id} ({r.tenant})</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="carrier" label="บริษัทขนส่ง" initialValue="Kerry">
                        <Select>
                            <Option value="Kerry">Kerry</Option>
                            <Option value="Flash">Flash Express</Option>
                            <Option value="Shopee">Shopee Express</Option>
                            <Option value="Lazada">Lazada Express</Option>
                            <Option value="ThaiPost">ไปรษณีย์ไทย</Option>
                            <Option value="Other">อื่นๆ</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="note" label="รายละเอียดเพิ่มเติม">
                        <Input placeholder="เช่น กล่องใหญ่, ฝากไว้ที่ป้อมยาม" />
                    </Form.Item>

                    <Form.Item label="รูปถ่ายพัสดุ" required>
                        <Upload
                            listType="picture-card"
                            fileList={fileList}
                            onChange={({ fileList }) => setFileList(fileList)}
                            beforeUpload={() => false} // Prevent auto upload
                            maxCount={1}
                        >
                            {fileList.length < 1 && (
                                <div>
                                    <PlusOutlined />
                                    <div style={{ marginTop: 8 }}>ถ่ายรูป</div>
                                </div>
                            )}
                        </Upload>
                    </Form.Item>

                    <Button type="primary" htmlType="submit" block danger size="large" loading={loading} className="font-bold rounded-xl h-12">
                        บันทึกและส่งแจ้งเตือน
                    </Button>
                </Form>
            </Modal>
        </>
    );
};

export default ParcelList;

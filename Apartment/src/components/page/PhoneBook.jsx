import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Form, Modal, message, Typography, Row, Col, Tag, Popconfirm, Select, Space } from 'antd';
import { PhoneOutlined, PlusOutlined, DeleteOutlined, EditOutlined, SafetyCertificateOutlined, ToolOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';

const { Title, Text } = Typography;
const { Option } = Select;

const PhoneBook = ({ userRole }) => {
    const [contacts, setContacts] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        const q = query(collection(db, "contacts"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setContacts(data);
        });
        return () => unsubscribe();
    }, []);

    const handleAdd = () => {
        setEditingContact(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (contact) => {
        setEditingContact(contact);
        form.setFieldsValue(contact);
        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, "contacts", id));
            message.success('ลบผู้ติดต่อสำเร็จ');
        } catch (error) {
            message.error('เกิดข้อผิดพลาดในการลบ');
        }
    };

    const handleSave = async (values) => {
        try {
            if (editingContact) {
                await updateDoc(doc(db, "contacts", editingContact.id), values);
                message.success('อัปเดตข้อมูลสำเร็จ');
            } else {
                await addDoc(collection(db, "contacts"), {
                    ...values,
                    createdAt: new Date()
                });
                message.success('เพิ่มผู้ติดต่อสำเร็จ');
            }
            setIsModalVisible(false);
        } catch (error) {
            message.error('เกิดข้อผิดพลาด');
        }
    };

    const getIcon = (category) => {
        switch (category) {
            case 'Emergeny': return <MedicineBoxOutlined />;
            case 'Service': return <ToolOutlined />;
            case 'Official': return <SafetyCertificateOutlined />;
            default: return <PhoneOutlined />;
        }
    };

    const getColor = (category) => {
        switch (category) {
            case 'Emergency': return 'red';
            case 'Service': return 'blue';
            case 'Official': return 'purple';
            default: return 'default';
        }
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div>
                    <Title level={2} className="m-0 font-black tracking-tighter text-slate-800">สมุดโทรศัพท์</Title>
                    <Text className="text-slate-400">รวมเบอร์โทรฉุกเฉินและบริการต่างๆ</Text>
                </div>
                {userRole === 'admin' && (
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                        className="bg-slate-900 border-none rounded-2xl h-12 px-6 font-bold shadow-xl shadow-slate-200"
                    >
                        เพิ่มเบอร์โทร
                    </Button>
                )}
            </div>

            <Row gutter={[24, 24]}>
                {contacts.map(contact => (
                    <Col xs={24} sm={12} lg={8} key={contact.id}>
                        <Card variant="borderless" className="shadow-sm border border-slate-50 rounded-3xl hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-${getColor(contact.category)}-50 text-${getColor(contact.category)}-500`}>
                                    {getIcon(contact.category)}
                                </div>
                                {userRole === 'admin' && (
                                    <Space>
                                        <Button type="text" shape="circle" icon={<EditOutlined />} onClick={() => handleEdit(contact)} />
                                        <Popconfirm title="ลบรายชื่อนี้?" onConfirm={() => handleDelete(contact.id)} okText="ลบ" cancelText="ยกเลิก">
                                            <Button type="text" shape="circle" danger icon={<DeleteOutlined />} />
                                        </Popconfirm>
                                    </Space>
                                )}
                            </div>

                            <Title level={4} className="m-0 mb-1 text-slate-800">{contact.name}</Title>
                            <Tag color={getColor(contact.category)} className="border-none rounded-full px-2 text-[10px] font-bold uppercase mb-4">{contact.category || 'General'}</Tag>

                            <Text className="block text-slate-400 text-sm mb-6 min-h-[40px]">{contact.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</Text>

                            <Button
                                block
                                type="primary"
                                size="large"
                                icon={<PhoneOutlined />}
                                href={`tel:${contact.number}`}
                                className={`rounded-xl h-12 font-bold bg-${getColor(contact.category) === 'red' ? 'red' : 'slate'}-500 hover:bg-${getColor(contact.category) === 'red' ? 'red' : 'slate'}-600 border-none shadow-lg shadow-${getColor(contact.category) === 'red' ? 'red' : 'slate'}-200`}
                            >
                                {contact.number}
                            </Button>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Modal
                title={editingContact ? "แก้ไขรายชื่อ" : "เพิ่มรายชื่อใหม่"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                centered
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="name" label="ชื่อผู้ติดต่อ/บริการ" rules={[{ required: true }]}>
                        <Input className="rounded-xl" placeholder="เช่น ช่างประปา, นิติบุคคล, สายด่วนตำรวจ" />
                    </Form.Item>
                    <Form.Item name="number" label="เบอร์โทรศัพท์" rules={[{ required: true }]}>
                        <Input className="rounded-xl" placeholder="0xx-xxx-xxxx" />
                    </Form.Item>
                    <Form.Item name="category" label="หมวดหมู่" rules={[{ required: true }]}>
                        <Select className="rounded-xl h-10">
                            <Option value="General">ทั่วไป (General)</Option>
                            <Option value="Emergency">ฉุกเฉิน (Emergency)</Option>
                            <Option value="Service">บริการ/ช่าง (Service)</Option>
                            <Option value="Official">นิติ/ส่วนกลาง (Official)</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="description" label="รายละเอียดเพิ่มเติม">
                        <Input.TextArea rows={2} className="rounded-xl" placeholder="เวลาทำการ, หมายเหตุ..." />
                    </Form.Item>
                    <Form.Item className="mb-0 text-right">
                        <Space>
                            <Button onClick={() => setIsModalVisible(false)} className="rounded-xl">ยกเลิก</Button>
                            <Button type="primary" htmlType="submit" className="bg-slate-900 rounded-xl">บันทึก</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default PhoneBook;

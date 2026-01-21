import React, { useState, useEffect } from 'react';
import { Card, Button, Input, List, Avatar, Typography, Space, Modal, Form, message, Tag } from 'antd';
import { UserOutlined, SendOutlined, PlusOutlined, LockOutlined, MessageOutlined } from '@ant-design/icons';
import { collection, onSnapshot, addDoc, query, orderBy, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const Community = ({ userRole }) => {
    const [posts, setPosts] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [commentText, setCommentText] = useState({}); // Map of post ID to comment text

    useEffect(() => {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPosts(postsData);
        });

        return () => unsubscribe();
    }, []);

    const handleCreatePost = async (values) => {
        try {
            await addDoc(collection(db, "posts"), {
                title: values.title,
                content: values.content,
                author: 'Admin', // In a real app, get from user profile
                role: 'admin',
                createdAt: new Date(),
                comments: []
            });
            message.success('โพสต์ประกาศสำเร็จ');
            setIsModalVisible(false);
            form.resetFields();
        } catch (error) {
            console.error("Error creating post:", error);
            message.error("เกิดข้อผิดพลาดในการโพสต์");
        }
    };

    const handleComment = async (postId) => {
        const text = commentText[postId];
        if (!text || text.trim() === '') return;

        try {
            let authorName = 'ลูกบ้าน';
            if (userRole === 'admin') authorName = 'Admin';

            // If tenant, try to get room number
            if (userRole !== 'admin' && auth.currentUser) {
                const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                if (userDoc.exists()) {
                    authorName = `ห้อง ${userDoc.data().roomNumber || '?'}`;
                }
            }

            const newComment = {
                author: authorName,
                role: userRole,
                content: text,
                createdAt: new Date()
            };

            await updateDoc(doc(db, "posts", postId), {
                comments: arrayUnion(newComment)
            });

            setCommentText(prev => ({ ...prev, [postId]: '' }));
            message.success('ส่งความคิดเห็นแล้ว');
        } catch (error) {
            console.error("Error adding comment:", error);
            message.error("เกิดข้อผิดพลาด");
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div>
                    <Title level={2} className="m-0 font-black tracking-tighter text-slate-800">ชุมชนชาวหอ</Title>
                    <Text className="text-slate-400">ข่าวสาร ประกาศ และพื้นที่พูดคุย</Text>
                </div>
                {userRole === 'admin' && (
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => setIsModalVisible(true)}
                        className="bg-slate-900 border-none rounded-2xl h-12 px-6 font-bold shadow-xl shadow-slate-200"
                    >
                        สร้างประกาศ
                    </Button>
                )}
            </div>

            <div className="space-y-6">
                {posts.map(post => (
                    <Card key={post.id} bordered={false} className="shadow-sm border border-slate-50 rounded-[2rem] overflow-hidden">
                        <div className="flex items-start mb-4">
                            <Avatar
                                size={48}
                                icon={post.role === 'admin' ? <LockOutlined /> : <UserOutlined />}
                                className={`flex-shrink-0 ${post.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'}`}
                            />
                            <div className="ml-4 flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <Text className="text-lg font-black text-slate-800 block">{post.title}</Text>
                                        <Space size="small">
                                            <Tag color={post.role === 'admin' ? "red" : "blue"} className="rounded-full border-none m-0 px-2 text-[10px] font-bold uppercase">{post.author}</Tag>
                                            <Text className="text-slate-400 text-xs">{dayjs(post.createdAt?.toDate()).fromNow()}</Text>
                                        </Space>
                                    </div>
                                </div>
                                <Paragraph className="text-slate-600 mt-4 text-base leading-relaxed whitespace-pre-line">
                                    {post.content}
                                </Paragraph>
                            </div>
                        </div>

                        {/* Comments Section */}
                        <div className="bg-slate-50 rounded-2xl p-6 mt-6">
                            <div className="space-y-4 mb-6">
                                {post.comments && post.comments.map((comment, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <Avatar
                                            size={32}
                                            icon={<UserOutlined />}
                                            className={`${comment.role === 'admin' ? 'bg-slate-700' : 'bg-white text-slate-400 border border-slate-200'}`}
                                        />
                                        <div className="bg-white px-4 py-2 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex-1">
                                            <div className="flex justify-between items-baseline">
                                                <Text className="font-bold text-xs text-slate-700">{comment.author}</Text>
                                                <Text className="text-[10px] text-slate-300">{dayjs(comment.createdAt?.toDate ? comment.createdAt.toDate() : comment.createdAt).fromNow()}</Text>
                                            </div>
                                            <Text className="text-sm text-slate-600 block mt-1">{comment.content}</Text>
                                        </div>
                                    </div>
                                ))}
                                {(!post.comments || post.comments.length === 0) && (
                                    <div className="text-center py-4">
                                        <Text className="text-slate-300 text-xs italic">ยังไม่มีความคิดเห็น เริ่มต้นพูดคุยได้เลย!</Text>
                                    </div>
                                )}
                            </div>

                            {/* Comment Input */}
                            <div className="flex gap-2">
                                <Avatar src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userRole}`} />
                                <div className="flex-1 relative">
                                    <Input
                                        placeholder="แสดงความคิดเห็น..."
                                        className="rounded-full bg-white border-slate-200 pr-10"
                                        value={commentText[post.id] || ''}
                                        onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                                        onPressEnter={() => handleComment(post.id)}
                                    />
                                    <Button
                                        type="text"
                                        shape="circle"
                                        icon={<SendOutlined className="text-slate-400" />}
                                        className="absolute right-1 top-1"
                                        onClick={() => handleComment(post.id)}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Modal
                title="สร้างประกาศใหม่"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                centered
            >
                <Form form={form} layout="vertical" onFinish={handleCreatePost}>
                    <Form.Item name="title" label="หัวข้อประกาศ" rules={[{ required: true, message: 'กรุณาระบุหัวข้อ' }]}>
                        <Input placeholder="เช่น แจ้งปิดปรับปรุงระบบน้ำ" className="rounded-xl" />
                    </Form.Item>
                    <Form.Item name="content" label="รายละเอียด" rules={[{ required: true, message: 'กรุณาระบุรายละเอียด' }]}>
                        <TextArea rows={4} placeholder="รายละเอียดเพิ่มเติม..." className="rounded-xl" />
                    </Form.Item>
                    <Form.Item className="mb-0 text-right">
                        <Space>
                            <Button onClick={() => setIsModalVisible(false)} className="rounded-xl">ยกเลิก</Button>
                            <Button type="primary" htmlType="submit" className="bg-slate-900 rounded-xl">โพสต์ประกาศ</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Community;

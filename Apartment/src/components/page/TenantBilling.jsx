import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Tag, Checkbox, Modal, Upload, message, Divider, Empty, Spin, Statistic } from 'antd';
import { QrcodeOutlined, UploadOutlined, CheckCircleOutlined, InfoCircleOutlined, WalletOutlined, DollarOutlined } from '@ant-design/icons';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');
const { Title, Text } = Typography;

const TenantBilling = ({ roomNumber }) => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBillIds, setSelectedBillIds] = useState([]);
    const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fileList, setFileList] = useState([]);

    // Listen to bills for this room
    useEffect(() => {
        if (!roomNumber) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "bills"),
            where("room", "==", roomNumber)
            // Note: Compound queries with orderBy might require index. 
            // We'll sort via JS to avoid immediate index errors for user.
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const billData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort by Date Descending
            billData.sort((a, b) => dayjs(b.dueDate).unix() - dayjs(a.dueDate).unix());

            setBills(billData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomNumber]);

    // State for expanded months
    const [expandedMonths, setExpandedMonths] = useState({});

    const toggleMonth = (month) => {
        setExpandedMonths(prev => ({
            ...prev,
            [month]: !prev[month]
        }));
    };

    // Group bills by Month (e.g., "มกราคม 2026")
    const groupedBills = bills.reduce((acc, bill) => {
        // const monthKey = dayjs(bill.dueDate).format('MMMM BBBB');
        const monthKey = `ค่าเช่าเดือน ${dayjs(bill.dueDate).format('MMMM YYYY')}`;
        if (!acc[monthKey]) acc[monthKey] = [];
        acc[monthKey].push(bill);
        return acc;
    }, {});

    const handleSelectBill = (billId, checked) => {
        if (checked) {
            setSelectedBillIds([...selectedBillIds, billId]);
        } else {
            setSelectedBillIds(selectedBillIds.filter(id => id !== billId));
        }
    };

    const handlePayment = async () => {
        if (fileList.length === 0) {
            message.error('กรุณาแนบหลักฐานการโอนเงิน');
            return;
        }

        setUploading(true);
        try {
            // Convert to Base64 for demo/portability (instead of Storage)
            const getBase64 = (file) =>
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = (error) => reject(error);
                });

            // Use the actual file object for conversion
            const slipUrl = await getBase64(fileList[0].originFileObj || fileList[0]);

            // Calculate Total
            const selectedBillsData = bills.filter(b => selectedBillIds.includes(b.id));
            const totalAmount = selectedBillsData.reduce((sum, b) => sum + (b.amount || 0), 0);

            // 1. Update Bills Status
            const updatePromises = selectedBillIds.map(id =>
                updateDoc(doc(db, "bills", id), {
                    status: 'Pending Review',
                    paymentSlip: slipUrl, // Save Base64 string
                    paidAt: new Date()
                })
            );
            await Promise.all(updatePromises);

            // 2. Notify Admin
            await addDoc(collection(db, "notifications"), {
                type: 'payment',
                title: `แจ้งชำระเงิน: ห้อง ${roomNumber}`,
                message: `ชำระยอดรวม ฿${totalAmount.toLocaleString()} รอการตรวจสอบ`,
                roomId: roomNumber,
                read: false,
                createdAt: new Date()
            });

            message.success('ส่งหลักฐานการชำระเงินเรียบร้อย รอแอดมินตรวจสอบ');
            setIsPaymentModalVisible(false);
            setSelectedBillIds([]);
            setFileList([]);
        } catch (error) {
            console.error(error);
            message.error('เกิดข้อผิดพลาดในการส่งข้อมูล');
        } finally {
            setUploading(false);
        }
    };

    const totalSelectedAmount = bills
        .filter(b => selectedBillIds.includes(b.id))
        .reduce((sum, b) => sum + (b.amount || 0), 0);

    const handleSeedMockData = async () => {
        if (!roomNumber) return;
        setLoading(true);
        try {
            const months = [
                { date: dayjs().subtract(3, 'month'), amount: 4500, type: 'ค่าเช่า (Rent)' },
                { date: dayjs().subtract(2, 'month'), amount: 4500, type: 'ค่าเช่า (Rent)' },
                { date: dayjs().subtract(2, 'month'), amount: 500, type: 'ค่าน้ำ/ไฟ (Utilities)' },
                { date: dayjs().subtract(1, 'month'), amount: 4500, type: 'ค่าเช่า (Rent)' },
                { date: dayjs().subtract(1, 'month'), amount: 650, type: 'ค่าน้ำ/ไฟ (Utilities)' },
            ];

            const promises = months.map(m => addDoc(collection(db, "bills"), {
                room: roomNumber,
                amount: m.amount,
                dueDate: m.date.format('YYYY-MM-DD'),
                status: 'Overdue', // Simulate overdue
                type: m.type,
                createdAt: new Date()
            }));

            await Promise.all(promises);
            message.success('เพิ่มข้อมูลทดสอบเรียบร้อย');
        } catch (error) {
            console.error(error);
            message.error('เพิ่มข้อมูลไม่สำเร็จ');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Spin size="large" /></div>;
    if (!roomNumber) return <div className="text-center p-10"><Text type="secondary">ไม่พบข้อมูลห้องพัก</Text></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button size="small" type="dashed" onClick={handleSeedMockData}>+ เพิ่มข้อมูลทดสอบ (Mock Data)</Button>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <Text className="text-slate-400 font-bold uppercase tracking-widest text-xs">ยอดค้างชำระทั้งหมด</Text>
                    <Title level={2} className="m-0 text-red-600 font-black tracking-tighter">
                        ฿{bills.filter(b => b.status === ('Pending') || b.status === 'Overdue').reduce((sum, b) => sum + (b.amount || 0), 0).toLocaleString()}
                    </Title>
                </div>
                <div className="text-right mt-4 md:mt-0">
                    <Text className="block text-slate-500 font-bold">ห้อง {roomNumber}</Text>
                    <Tag color="blue" className="rounded-full px-3 border-none bg-blue-100 text-blue-700 font-bold">Tenant</Tag>
                </div>
            </div>

            {Object.keys(groupedBills).length === 0 ? (
                <Empty description="ไม่มีรายการบิล" className="py-20" />
            ) : (
                Object.entries(groupedBills).map(([month, monthBills]) => {
                    const monthTotal = monthBills.reduce((sum, b) => sum + b.amount, 0);
                    const isAllPaid = monthBills.every(b => b.status === 'Paid');
                    const hasPending = monthBills.some(b => b.status === 'Pending' || b.status === 'Overdue');
                    const isExpanded = expandedMonths[month];

                    // Check if all pending bills in this month are selected
                    const pendingBills = monthBills.filter(b => b.status === 'Pending' || b.status === 'Overdue');
                    const isMonthSelected = pendingBills.length > 0 && pendingBills.every(b => selectedBillIds.includes(b.id));

                    const handleSelectMonth = (e) => {
                        e.stopPropagation();
                        const ids = pendingBills.map(b => b.id);
                        if (e.target.checked) {
                            // Add unique IDs to selection
                            setSelectedBillIds(prev => [...new Set([...prev, ...ids])]);
                        } else {
                            // Remove IDs from selection
                            setSelectedBillIds(prev => prev.filter(id => !ids.includes(id)));
                        }
                    };

                    return (
                        <Card
                            key={month}
                            className={`rounded-3xl border-none shadow-sm overflow-hidden transition-all duration-300 ${isAllPaid ? 'opacity-75' : ''}`}
                            styles={{ body: { padding: isExpanded ? '24px' : '0px', display: isExpanded ? 'block' : 'none' } }}
                            title={
                                <div className="flex justify-between items-center py-4">
                                    <div className="flex items-center gap-4">
                                        {/* Month Selection Checkbox */}
                                        {!isAllPaid && hasPending && (
                                            <Checkbox
                                                checked={isMonthSelected}
                                                onChange={handleSelectMonth}
                                                className="scale-150 mr-2"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}

                                        <div
                                            className="flex items-center gap-4 cursor-pointer select-none"
                                            onClick={() => toggleMonth(month)}
                                        >
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isAllPaid ? 'bg-green-100' : 'bg-red-50'}`}>
                                                {isAllPaid ? <CheckCircleOutlined className="text-green-600 text-xl" /> : <WalletOutlined className="text-red-500 text-xl" />}
                                            </div>
                                            <div>
                                                <Text className="block font-black text-lg text-slate-800 tracking-tight">{month}</Text>
                                                <div className="flex items-center gap-2">
                                                    <Text className="text-xs text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-lg">{monthBills.length} รายการ</Text>
                                                    {!isExpanded && <Text className="text-[10px] text-slate-400">คลิกเพื่อดูรายละเอียด</Text>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right cursor-pointer" onClick={() => toggleMonth(month)}>
                                        <Text className={`font-black text-2xl tracking-tighter ${isAllPaid ? 'text-green-600' : 'text-slate-900'}`}>
                                            ฿{monthTotal.toLocaleString()}
                                        </Text>
                                    </div>
                                </div>
                            }
                        >
                            <div className="space-y-3">
                                {monthBills.map(bill => (
                                    <div key={bill.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-100">
                                        <div className="flex items-center gap-4">
                                            {/* Item Checkbox Removed as per request */}
                                            <div className="flex flex-col">
                                                <Text className="font-bold text-slate-700 text-base">{bill.type || 'ค่าใช้จ่ายทั่วไป'}</Text>
                                                <Text className="text-xs text-slate-400">ครบกำหนด: {dayjs(bill.dueDate).format('D MMM YYYY')}</Text>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <Text className="font-black text-slate-800 text-base">฿{bill.amount.toLocaleString()}</Text>
                                            <Tag className="m-0 rounded-full text-[10px] font-bold border-none px-2.5 py-0.5"
                                                color={bill.status === 'Paid' ? '#dcfce7' : bill.status === 'Pending Review' ? '#ffedd5' : '#fee2e2'}
                                            >
                                                <span className={bill.status === 'Paid' ? 'text-green-700' : bill.status === 'Pending Review' ? 'text-orange-700' : 'text-red-700'}>
                                                    {bill.status === 'Pending' ? 'รอชำระ' : bill.status === 'Paid' ? 'ชำระแล้ว' : bill.status === 'Pending Review' ? 'รอตรวจสอบ' : 'เกินกำหนด'}
                                                </span>
                                            </Tag>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    );
                })
            )}

            {/* Sticky Bottom Bar for Payment */}
            {selectedBillIds.length > 0 && (
                <div className="fixed bottom-10 left-0 right-0 px-4 flex justify-center z-50 animate-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between w-full max-w-md backdrop-blur-md bg-opacity-95">
                        <div className="flex flex-col px-4">
                            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">ยอดชำระที่เลือก</Text>
                            <Text className="text-2xl font-black text-white">฿{totalSelectedAmount.toLocaleString()}</Text>
                        </div>
                        <Button
                            type="primary"
                            size="large"
                            className="bg-red-600 hover:bg-red-500 border-none rounded-2xl h-12 px-8 font-bold shadow-lg shadow-red-900/50"
                            onClick={() => setIsPaymentModalVisible(true)}
                        >
                            ชำระเงิน ({selectedBillIds.length})
                        </Button>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            <Modal
                title={null}
                open={isPaymentModalVisible}
                onCancel={() => setIsPaymentModalVisible(false)}
                footer={null}
                centered
                className="payment-modal rounded-3xl overflow-hidden"
                width={400}
            >
                <div className="text-center pt-6 pb-2">
                    <Title level={4} className="m-0 font-black">สแกนจ่ายเงิน</Title>
                    <Text className="text-slate-400 text-xs">PromptPay QR Code</Text>
                </div>

                <div className="bg-white p-6 flex flex-col items-center gap-6">
                    <div className="bg-white p-4 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100">
                        {/* Mock QR Code */}
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PromptPay-Apartment-${totalSelectedAmount}`}
                            alt="QR Code"
                            className="w-48 h-48 rounded-xl mix-blend-multiply opacity-90"
                        />
                    </div>

                    <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                        <Text className="block text-slate-400 text-xs font-bold uppercase mb-1">ยอดต้องชำระ</Text>
                        <Text className="text-3xl font-black text-slate-800">฿{totalSelectedAmount.toLocaleString()}</Text>
                    </div>

                    <Divider className="my-0">แนบหลักฐาน</Divider>

                    <Upload
                        onRemove={(file) => {
                            const index = fileList.indexOf(file);
                            const newFileList = fileList.slice();
                            newFileList.splice(index, 1);
                            setFileList(newFileList);
                        }}
                        maxCount={1}
                        listType="picture-card"
                        className="w-full"
                        accept="image/*"
                        beforeUpload={(file) => {
                            const isImage = file.type.startsWith('image/');
                            if (!isImage) {
                                message.error('สามารถอัปโหลดได้เฉพาะไฟล์รูปภาพเท่านั้น');
                                return Upload.LIST_IGNORE;
                            }
                            setFileList([...fileList, file]);
                            return false;
                        }}
                    >
                        {fileList.length < 1 && (
                            <div className="flex flex-col items-center justify-center text-slate-400">
                                <UploadOutlined className="text-xl mb-2" />
                                <div className="text-xs">อัปโหลดสลิป</div>
                            </div>
                        )}
                    </Upload>

                    <Button
                        type="primary"
                        block
                        size="large"
                        loading={uploading}
                        onClick={handlePayment}
                        className="bg-green-600 hover:bg-green-500 h-14 rounded-2xl font-black text-lg shadow-xl shadow-green-100"
                    >
                        แจ้งชำระเงิน
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default TenantBilling;

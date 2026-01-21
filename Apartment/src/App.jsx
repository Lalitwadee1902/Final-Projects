import React, { useState, useEffect } from 'react';
import { 
  Layout, Menu, Card, Row, Col, Statistic, Table, Tag, Button, 
  Form, Input, Select, Badge, Tabs, Typography, 
  Upload, InputNumber, Switch, Space, Divider, ConfigProvider, Avatar
} from 'antd';
import {
  DashboardOutlined,
  HomeOutlined,
  FileTextOutlined,
  ToolOutlined,
  UserOutlined,
  PlusOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  LogoutOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  BellOutlined,
  SearchOutlined,
  CreditCardOutlined
} from '@ant-design/icons';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const { Header, Content, Sider, Footer } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// --- ข้อมูลจำลอง (Mock Data) ---
const monthlyData = [
  { name: 'ม.ค.', income: 45000, expenses: 12000 },
  { name: 'ก.พ.', income: 52000, expenses: 15000 },
  { name: 'มี.ค.', income: 48000, expenses: 11000 },
  { name: 'เม.ย.', income: 61000, expenses: 18000 },
  { name: 'พ.ค.', income: 55000, expenses: 14000 },
  { name: 'มิ.ย.', income: 58000, expenses: 15500 },
];

const roomStatusData = [
  { name: 'ว่าง (Vacant)', value: 5, color: '#fca5a5' },
  { name: 'ไม่ว่าง (Occupied)', value: 20, color: '#dc2626' },
  { name: 'ซ่อมบำรุง (Fix)', value: 3, color: '#1f2937' },
];

const initialRooms = [
  { key: '1', id: '101', type: 'Studio Premium', price: 4500, status: 'Occupied', tenant: 'สมชาย รักดี' },
  { key: '2', id: '102', type: 'Studio Standard', price: 4200, status: 'Vacant', tenant: '-' },
  { key: '3', id: '103', type: 'Suite Luxury', price: 7500, status: 'Maintenance', tenant: '-' },
  { key: '4', id: '201', type: 'Studio Standard', price: 4200, status: 'Occupied', tenant: 'วิไล พรหมมา' },
];

// --- Component แสดงสถิติแบบสะอาดตา ---
const CleanStat = ({ label, value, prefix, color, isUp }) => (
  <Card bordered={false} className="shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl">
    <div className="flex flex-col space-y-1">
      <Text className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">{label}</Text>
      <div className="flex items-baseline space-x-1">
        {prefix && <Text className="text-sm font-medium text-slate-400">{prefix}</Text>}
        <Text className="text-2xl font-black text-slate-800 tracking-tighter">{value.toLocaleString()}</Text>
      </div>
      <div className={`text-[10px] font-bold ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
        {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />} 4.2% <span className="text-slate-300 font-normal">เทียบกับเดือนก่อน</span>
      </div>
    </div>
  </Card>
);

// --- หน้า Dashboard ของ Admin ---
const AdminDashboard = () => (
  <div className="space-y-6">
    <Row gutter={[20, 20]}>
      <Col xs={24} sm={12} lg={6}><CleanStat label="รายได้รายเดือน" value={58400} prefix="฿" isUp={true} /></Col>
      <Col xs={24} sm={12} lg={6}><CleanStat label="อัตราการเข้าพัก" value={82} prefix="" isUp={true} /></Col>
      <Col xs={24} sm={12} lg={6}><CleanStat label="ห้องว่าง" value={5} prefix="" isUp={false} /></Col>
      <Col xs={24} sm={12} lg={6}><CleanStat label="รายการแจ้งซ่อม" value={3} prefix="" isUp={false} /></Col>
    </Row>

    <Row gutter={[20, 20]}>
      <Col xs={24} lg={16}>
        <Card bordered={false} title={<Text className="font-black uppercase tracking-tight text-xs text-slate-500">กระแสรายได้ (Revenue Stream)</Text>} className="shadow-sm rounded-2xl h-[400px]">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip 
                  cursor={{ fill: '#fef2f2' }}
                  contentStyle={{ border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                />
                <Bar 
                  dataKey="income" 
                  name="รายได้" 
                  fill="#dc2626" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card bordered={false} title={<Text className="font-black uppercase tracking-tight text-xs text-slate-500">สัดส่วนห้องพัก</Text>} className="shadow-sm rounded-2xl h-[400px]">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={roomStatusData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                  {roomStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {roomStatusData.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <Space size="small"><div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}} /><Text className="text-slate-500">{item.name}</Text></Space>
                <Text strong>{item.value}</Text>
              </div>
            ))}
          </div>
        </Card>
      </Col>
    </Row>
  </div>
);

// --- หน้าจัดการห้องพัก ---
const RoomList = () => {
  const columns = [
    { title: 'ห้อง', dataIndex: 'id', key: 'id', render: (t) => <Text className="font-black text-slate-800">{t}</Text> },
    { title: 'ประเภท', dataIndex: 'type', key: 'type', render: (t) => <Text className="text-[10px] font-bold text-slate-400 uppercase">{t}</Text> },
    { title: 'ราคา', dataIndex: 'price', key: 'price', render: (v) => <Text className="font-bold">฿{v.toLocaleString()}</Text> },
    { 
      title: 'สถานะ', 
      dataIndex: 'status', 
      key: 'status', 
      render: (s) => (
        <Tag className="rounded-full border-none px-3 text-[10px] font-black" color={s === 'Occupied' ? '#fee2e2' : s === 'Vacant' ? '#f0fdf4' : '#f8fafc'}>
          <span style={{color: s === 'Occupied' ? '#dc2626' : s === 'Vacant' ? '#16a34a' : '#64748b'}}>{s.toUpperCase()}</span>
        </Tag>
      )
    },
    { title: 'ผู้เช่า', dataIndex: 'tenant', key: 'tenant', render: (t) => t === '-' ? <Text className="text-slate-300">-</Text> : <Text className="font-medium">{t}</Text> },
    { title: '', key: 'action', render: () => <Button type="text" className="text-slate-400 font-bold text-xs">จัดการ</Button> }
  ];

  return (
    <Card bordered={false} title={<Text className="font-black text-lg">การจัดการห้องพัก</Text>} extra={<Button type="primary" danger className="rounded-xl font-bold border-none shadow-md shadow-red-100">เพิ่มห้องใหม่</Button>} className="shadow-sm rounded-2xl">
      <Table columns={columns} dataSource={initialRooms} pagination={{ pageSize: 5 }} />
    </Card>
  );
};

// --- หน้าสำหรับผู้เช่า ---
const TenantPortal = () => (
  <div className="space-y-8 max-w-5xl mx-auto">
    <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-50 flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-red-50 rounded-full -mr-20 -mt-20 blur-3xl opacity-50" />
      <div className="space-y-2 relative z-10 text-center md:text-left">
        <Text className="text-red-600 font-black tracking-widest text-[10px] uppercase">สถานะการพักอาศัย</Text>
        <Title level={2} className="m-0 font-black tracking-tight text-4xl">สวัสดีครับ คุณสมชาย</Title>
        <Text className="text-slate-400 text-base">ห้อง 101 • สัญญาเช่าปัจจุบันสิ้นสุด มีนาคม 2025</Text>
      </div>
      <div className="mt-8 md:mt-0 bg-slate-900 text-white p-8 rounded-3xl min-w-[260px] relative z-10">
        <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-2">ยอดที่ต้องชำระ</Text>
        <div className="text-4xl font-black mb-6 tracking-tighter">฿5,450.00</div>
        <Button block danger type="primary" className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest">ชำระเงินทันที</Button>
      </div>
    </div>

    <Row gutter={[24, 24]}>
      <Col xs={24} md={16}>
        <div className="space-y-4">
          <Text className="font-black uppercase tracking-widest text-[10px] text-slate-400 px-4">สรุปค่าใช้จ่าย</Text>
          {[
            { label: 'ค่าเช่าห้อง', val: 4500, icon: <HomeOutlined /> },
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

// --- Layout หลักของแอป ---
const App = () => {
  const [role, setRole] = useState('admin');
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState('dashboard');

  useEffect(() => { setMenu(role === 'admin' ? 'dashboard' : 'tenant_home'); }, [role]);

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#dc2626', borderRadius: 16, fontFamily: "'Plus Jakarta Sans', 'Kanit', sans-serif" } }}>
      <Layout className="min-h-screen bg-white">
        <Sider theme="light" width={260} collapsed={collapsed} onCollapse={setCollapsed} className="border-r border-slate-50 fixed h-full z-50 shadow-none">
          <div className="p-10 flex flex-col items-center">
             <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-200 transform rotate-12 mb-4">
                <ThunderboltOutlined className="text-white text-2xl" />
             </div>
             {!collapsed && <Text className="font-black text-xl tracking-tighter text-slate-800 uppercase">Apt<span className="text-red-600">Pure</span></Text>}
          </div>
          
          <Menu mode="inline" selectedKeys={[menu]} onClick={({key}) => setMenu(key)} className="border-none px-6 mt-4 space-y-2">
            {role === 'admin' ? (
              <>
                <Menu.Item key="dashboard" icon={<DashboardOutlined />}>ภาพรวม</Menu.Item>
                <Menu.Item key="rooms" icon={<HomeOutlined />}>จัดการห้อง</Menu.Item>
                <Menu.Item key="billing" icon={<FileTextOutlined />}>ออกบิล</Menu.Item>
              </>
            ) : (
              <>
                <Menu.Item key="tenant_home" icon={<HomeOutlined />}>หน้าหลัก</Menu.Item>
                <Menu.Item key="tenant_bill" icon={<CreditCardOutlined />}>การชำระเงิน</Menu.Item>
              </>
            )}
          </Menu>

          <div className="absolute bottom-10 w-full px-8">
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
               <Text className="text-[8px] font-black uppercase text-slate-400 block mb-3 text-center tracking-widest">โหมดการใช้งาน</Text>
               <div className="flex bg-white p-1 rounded-2xl shadow-inner border border-slate-100">
                  <button onClick={() => setRole('admin')} className={`flex-1 py-2 text-[9px] font-black rounded-xl transition-all ${role === 'admin' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>ADMIN</button>
                  <button onClick={() => setRole('tenant')} className={`flex-1 py-2 text-[9px] font-black rounded-xl transition-all ${role === 'tenant' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>TENANT</button>
               </div>
            </div>
          </div>
        </Sider>

        <Layout className="bg-white ml-0 transition-all" style={{ marginLeft: collapsed ? 80 : 260 }}>
          <Header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 px-10 flex justify-between items-center h-20 border-b border-slate-50">
            <div className="flex items-center bg-slate-50 px-6 py-2 rounded-2xl border border-slate-100 w-96">
              <SearchOutlined className="text-slate-300 mr-3" />
              <input type="text" placeholder="ค้นหาห้อง หรือ บิล..." className="bg-transparent border-none outline-none text-xs w-full font-medium" />
            </div>
            <Space size="large">
              <Badge count={2} dot color="red"><Button shape="circle" type="text" icon={<BellOutlined className="text-lg text-slate-400" />} /></Badge>
              <Avatar size={40} className="border-2 border-white shadow-md" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`} />
            </Space>
          </Header>

          <Content className="p-10 bg-[#fafafa]/30">
            <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <Text className="text-red-600 font-black tracking-widest text-[10px] uppercase">ศูนย์ควบคุม</Text>
                  <Title level={2} className="m-0 font-black tracking-tighter text-4xl text-slate-900">{menu === 'dashboard' ? 'แดชบอร์ด' : menu === 'rooms' ? 'ห้องพัก' : 'หน้าหลักผู้เช่า'}</Title>
                </div>
              </div>

              {menu === 'dashboard' && <AdminDashboard />}
              {menu === 'rooms' && <RoomList />}
              {role === 'tenant' && menu === 'tenant_home' && <TenantPortal />}
            </div>
          </Content>

          <Footer className="text-center py-10 text-slate-300 text-[10px] font-black uppercase tracking-[0.4em]">
            Pure & Noble Apartment OS — Ver 2.0
          </Footer>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
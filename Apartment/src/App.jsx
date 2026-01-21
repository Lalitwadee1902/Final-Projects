import React, { useState, useEffect } from 'react';
import {
  Layout, Menu, Typography, Badge, Button, Space, Avatar, ConfigProvider, Spin, message, List, Popover, Empty
} from 'antd';
import {
  DashboardOutlined,
  HomeOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  ThunderboltOutlined,
  BellOutlined,
  SearchOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, orderBy, limit, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import AdminDashboard from './components/page/AdminDashboard';
import RoomList from './components/page/RoomList';
import TenantPortal from './components/page/TenantPortal';
import Login from './components/page/Login';
import BillingList from './components/page/BillingList';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/th';

dayjs.extend(relativeTime);
dayjs.locale('th');

const { Header, Content, Sider, Footer } = Layout;
const { Title, Text } = Typography;

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Listen to top 20 recent notifications
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    });
    return () => unsubscribe();
  }, []);

  const handleMarkAsRead = async () => {
    // Mark all visible as read
    const unread = notifications.filter(n => !n.read);
    unread.forEach(async (n) => {
      await updateDoc(doc(db, "notifications", n.id), { read: true });
    });
  };

  const content = (
    <div className="w-[300px]">
      <div className="flex justify-between items-center mb-2 px-1">
        <Text strong>การแจ้งเตือน</Text>
        <Button type="link" size="small" onClick={handleMarkAsRead} disabled={unreadCount === 0}>อ่านทั้งหมด</Button>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        <List
          dataSource={notifications}
          renderItem={item => (
            <List.Item className={`px-2 py-3 cursor-pointer hover:bg-slate-50 transition-colors rounded-lg mb-1 ${!item.read ? 'bg-red-50/50' : ''}`}>
              <List.Item.Meta
                avatar={
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.type === 'payment' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                    {item.type === 'payment' ? <CheckCircleOutlined /> : <ToolOutlined />}
                  </div>
                }
                title={<Text className="text-xs font-bold text-slate-700">{item.title}</Text>}
                description={
                  <div className="flex flex-col">
                    <Text className="text-[10px] text-slate-500">{item.message}</Text>
                    <Text className="text-[9px] text-slate-300 mt-1">{dayjs(item.createdAt?.toDate()).fromNow()}</Text>
                  </div>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีการแจ้งเตือน" /> }}
        />
      </div>
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottomRight" arrow={false} overlayInnerStyle={{ padding: '12px', borderRadius: '16px' }}>
      <Badge count={unreadCount} overflowCount={99} color="#ef4444">
        <Button shape="circle" type="text" icon={<BellOutlined className={`text-lg transition-colors ${unreadCount > 0 ? 'text-slate-600 animate-pulse-slow' : 'text-slate-400'}`} />} />
      </Badge>
    </Popover>
  );
};

// --- Layout หลักของแอป ---
const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [role, setRole] = useState('admin');
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState('dashboard');

  useEffect(() => {
    let unsubDoc; // Variable to hold the snapshot unsubscribe function

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // --- User is Signed In ---
        const userRef = doc(db, "users", user.uid);

        // Unsubscribe previous listener if exists
        if (unsubDoc) unsubDoc();

        unsubDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const userRole = userData.role || 'admin';
            setRole(userRole);
            setMenu(userRole === 'admin' ? 'dashboard' : 'tenant_home');
            setIsLoggedIn(true);
          } else {
            console.log("Waiting for user profile creation...");
          }
          // Stop loading once we have the user data (or lack thereof)
          setIsAuthChecking(false);
        });

      } else {
        // --- User is Signed Out ---
        if (unsubDoc) unsubDoc();
        setIsLoggedIn(false);
        setRole('admin');
        setIsAuthChecking(false);
      }
    });

    return () => {
      // Cleanup
      if (unsubDoc) unsubDoc();
      unsubscribe();
    };
  }, []);

  useEffect(() => { setMenu(role === 'admin' ? 'dashboard' : 'tenant_home'); }, [role]);

  // Callback for Tenant Login (Mock) or explicit set
  const handleManualLogin = (userRole) => {
    setRole(userRole);
    setIsLoggedIn(true);
    setMenu(userRole === 'admin' ? 'dashboard' : 'tenant_home');
  };

  const handleLogout = async () => {
    if (auth.currentUser) {
      await signOut(auth);
    }
    setIsLoggedIn(false);
    setRole('admin');
    setMenu('dashboard');
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" fullscreen tip="กำลังโหลด..." />
      </div>
    );
  }

  // If not logged in, show Login page
  if (!isLoggedIn) {
    return (
      <ConfigProvider theme={{ token: { colorPrimary: '#dc2626', borderRadius: 16, fontFamily: "'Plus Jakarta Sans', 'Kanit', sans-serif" } }}>
        <Login onLogin={handleManualLogin} />
      </ConfigProvider>
    );
  }

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

          <Menu mode="inline" selectedKeys={[menu]} onClick={({ key }) => setMenu(key)} className="border-none px-6 mt-4 space-y-2">
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
            <Button
              block
              type="text"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              className="rounded-2xl h-12 font-bold bg-red-50 hover:bg-red-100 hover:text-red-700 transition-all flex items-center justify-center"
            >
              {!collapsed && "ออกจากระบบ"}
            </Button>
          </div>
        </Sider>

        <Layout className="bg-white ml-0 transition-all" style={{ marginLeft: collapsed ? 80 : 260 }}>
          <Header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 px-10 flex justify-between items-center h-20 border-b border-slate-50">
            <div className="flex items-center bg-slate-50 px-6 py-2 rounded-2xl border border-slate-100 w-96">
              <SearchOutlined className="text-slate-300 mr-3" />
              <input type="text" placeholder="ค้นหาห้อง หรือ บิล..." className="bg-transparent border-none outline-none text-xs w-full font-medium" />
            </div>
            <Space size="large">
              <NotificationBell />
              <Space className="cursor-pointer hover:bg-slate-50 p-2 rounded-full transition-all pr-4 pl-1" onClick={handleLogout}>
                <Avatar size={40} className="border-2 border-white shadow-md bg-slate-200" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`} />
                <div className="flex flex-col text-right hidden lg:flex">
                  <Text className="text-xs font-black text-slate-700">{role === 'admin' ? 'ผู้ดูแลระบบ' : 'คุณสมชาย'}</Text>
                  <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{role === 'admin' ? 'Admin' : 'Tenant'}</Text>
                </div>
              </Space>
            </Space>
          </Header>

          <Content className="p-10 bg-[#fafafa]/30">
            <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <Text className="text-red-600 font-black tracking-widest text-[10px] uppercase">ศูนย์ควบคุม</Text>
                  <Title level={2} className="m-0 font-black tracking-tighter text-4xl text-slate-900">{menu === 'dashboard' ? 'แดชบอร์ด' : menu === 'rooms' ? 'ห้องพัก' : menu === 'billing' ? 'การจัดการบิล' : 'หน้าหลักผู้เช่า'}</Title>
                </div>
              </div>

              {menu === 'dashboard' && <AdminDashboard />}
              {menu === 'rooms' && <RoomList />}
              {menu === 'billing' && <BillingList />}
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
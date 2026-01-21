import React, { useState, useEffect } from 'react';
import {
  Layout, Menu, Typography, Badge, Button, Space, Avatar, ConfigProvider, Spin, message
} from 'antd';
import {
  DashboardOutlined,
  HomeOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  ThunderboltOutlined,
  BellOutlined,
  SearchOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import AdminDashboard from './components/page/AdminDashboard';
import RoomList from './components/page/RoomList';
import TenantPortal from './components/page/TenantPortal';
import Login from './components/page/Login';

const { Header, Content, Sider, Footer } = Layout;
const { Title, Text } = Typography;

// --- Layout หลักของแอป ---
const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [role, setRole] = useState('admin');
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // --- User is Signed In ---
        // Listen to Firestore changes (Real-time) to handle race condition on Registration
        const userRef = doc(db, "users", user.uid);
        const unsubDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const userRole = userData.role || 'admin';
            setRole(userRole);
            setMenu(userRole === 'admin' ? 'dashboard' : 'tenant_home');
            setIsLoggedIn(true);
          } else {
            console.log("Waiting for user profile creation...");
            // Don't set isLoggedIn=true yet if it's registration flow? 
            // Or set it but default to loading/admin?
            // Better to just wait. But if it's a legacy user with no doc?
            // For safety, if after 2 seconds no doc, default to admin?
            // For simplicity: Let's wait. But to invalid blocking, we can set default.
            // Actually, if we just wait, the spinner continues? 
            // No, we need to stop spinner.
          }
        });

        return () => unsubDoc();
      } else {
        setIsLoggedIn(false);
        setRole('admin');
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
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
        <Spin size="large" tip="กำลังโหลด..." />
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
              <Badge count={2} dot color="red"><Button shape="circle" type="text" icon={<BellOutlined className="text-lg text-slate-400" />} /></Badge>
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
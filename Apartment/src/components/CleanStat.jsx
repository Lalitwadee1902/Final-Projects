import React from 'react';
import { Card, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Text } = Typography;

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

export default CleanStat;

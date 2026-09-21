import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';

// const API_BASE = 'http://localhost:3001';
// const WS_BASE = 'ws://localhost:3001';
// const API_BASE = 'https://dancesyncrecclub-production.up.railway.app';
// const WS_BASE = 'wss://dancesyncrecclub-production.up.railway.app';
const API_BASE = process.env.REACT_APP_API_URL;
const WS_BASE = process.env.REACT_APP_WS_URL;

const formatBeijingTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return beijingTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const SignInRecords = () => {
    const navigate = useNavigate();
    const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const wsRef = useRef(null);

    const fetchRecords = async (start, end) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/api/scan/all-history?start=${start}&end=${end}`);
            if (res.data.code === 0) {
                setRecords(res.data.data || []);
            } else {
                setRecords([]);
            }
        } catch (error) {
            console.error('获取签到记录失败:', error);
            setRecords([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRecords(startDate, endDate);
    }, []);

    // WebSocket 实时更新
    useEffect(() => {
        const ws = new WebSocket(WS_BASE);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'new_checkin') {
                    fetchRecords(startDate, endDate);
                }
            } catch (e) {
                console.error('WebSocket 消息解析失败:', e);
            }
        };

        ws.onerror = (err) => {
            console.error('WebSocket 错误:', err);
        };

        return () => {
            ws.close();
        };
    }, [startDate, endDate]);

    const handleQuery = () => {
        fetchRecords(startDate, endDate);
    };

    return (
        // <div className="min-h-screen bg-gray-100 flex flex-col">
        //     <Navbar />

        //     <div className="bg-gray-800 text-white px-8 py-4 flex-shrink-0 flex items-center justify-between">
        //         <div>
        //             <h1 className="text-3xl font-bold">📋 签到信息</h1>
        //             <p className="text-gray-400 text-sm">查看所有会员的签到记录</p>
        //         </div>
        //         <button
        //             className="px-6 py-2 bg-slate-500 hover:bg-slate-600 rounded-lg transition"
        //             onClick={() => navigate('/admin')}
        //         >
        //             ⬅ 返回
        //         </button>
        //     </div>

        <div className="min-h-screen bg-gray-800 flex flex-col">
            <Navbar />

            {/* 标题栏 */}
            <div className="bg-sky-300 text-white px-8 py-2 flex-shrink-0 flex items-center justify-between">
                <button
                    className="px-6 py-2 bg-slate-500 hover:bg-slate-600 rounded-lg transition"
                    onClick={() => navigate('/admin')}
                >
                    ⬅ 返回
                </button>
                {/* <h2 className="text-3xl reddit-mono font-bold bg-slate-200 px-10 py-3 rounded-lg text-gray-800">
                    📋 签到信息
                </h2> */}
                {/* <h2 className="text-3xl reddit-mono font-bold bg-slate-200 px-10 py-3 rounded-lg text-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-200">
                    📋 签到信息
                    <span className="block text-sm text-gray-500 font-normal reddit-mono mt-1.5">
                        查看所有会员的签到记录
                    </span>
                </h2> */}
                <div className="inline-block">
                    <h2 className="text-3xl reddit-mono font-bold bg-slate-200 px-10 py-2 rounded-lg text-sky-500 shadow-lg hover:shadow-xl transition-shadow duration-200">
                        📋 签到信息
                    </h2>
                    <p className="text-sm text-gray-500 font-normal reddit-mono mt-1.5 text-center">
                        查看所有会员的签到记录
                    </p>
                </div>
                {/* 右侧占位，保持居中对称 */}
                <div className="w-28"></div>
            </div>

            <div className="flex-1 p-6 overflow-auto">
                {/* 日期筛选 */}
                <div className="bg-white rounded-xl shadow-md p-4 mb-4 flex items-center gap-4">
                    <label className="font-medium text-gray-700">开始日期</label>
                    <input
                        type="date"
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                    <label className="font-medium text-gray-700">结束日期</label>
                    <input
                        type="date"
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                    <button
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                        onClick={handleQuery}
                    >
                        查询
                    </button>
                    <span className="text-gray-500 text-sm ml-auto">
                        共 {records.length} 条记录
                    </span>
                </div>

                {/* 表格 */}
                <div className="bg-white rounded-xl shadow-md p-4">
                    {loading ? (
                        <div className="text-center py-8 text-gray-400">⏳ 加载中...</div>
                    ) : records.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">📭 暂无签到记录</div>
                    ) : (
                        <div className="space-y-2 max-h-[70vh] overflow-auto">
                            <div className="flex justify-between items-center border-b-2 border-gray-300 pb-2 mb-2 font-bold text-gray-600 text-sm sticky top-0 bg-white">
                                <div className="w-12 text-center">序号</div>
                                <div className="flex-1 text-center">昵称</div>
                                <div className="flex-1 text-center">卡项名称</div>
                                <div className="flex-1 text-center">剩余/已用</div>
                                <div className="flex-1 text-center">扣票数量</div>
                                <div className="flex-1 text-center">签到方式</div>
                                <div className="flex-1 text-center">签到时间</div>
                            </div>
                            {records.map((item, index) => (
                                <div key={item.id} className="flex justify-between items-center border-b pb-2">
                                    <div className="w-12 text-center text-gray-500">{index + 1}</div>
                                    <div className="flex-1 text-center font-medium text-pink-600">
                                        {item.nickname || '未设置'}
                                    </div>
                                    <div className="flex-1 text-center text-gray-700">
                                        {item.card_name || '未知卡'}
                                    </div>
                                    <div className="flex-1 text-center text-sm">
                                        <span className="text-blue-600 font-bold">{item.remaining_after || 0}</span>次/
                                        <span className="text-orange-600 font-bold">{item.used_after || 0}</span>次
                                    </div>
                                    <div className="flex-1 text-center text-sm text-purple-600">
                                        {item.consume_count > 0 ? `扣${item.consume_count}次` : '月卡签到'}
                                    </div>
                                    <div className="flex-1 text-center text-xs text-cyan-600">
                                        {item.source === 'user' ? '手机自扫' : '前台机扫'}
                                    </div>
                                    <div className="flex-1 text-center text-xs text-gray-400">
                                        {item.consume_date.slice(5)} {formatBeijingTime(item.created_at).slice(0, 5)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default SignInRecords;
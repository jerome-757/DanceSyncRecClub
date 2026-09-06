import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';

const API_BASE = 'http://localhost:3001';

const AdminHomePage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        monthly_new: 0,
        active: 0,
        monthly_income: 0
    });
    const [statusDistribution, setStatusDistribution] = useState([]);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [expiringMembers, setExpiringMembers] = useState([]);

    // ===== 获取仪表板数据 =====
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // 并行请求所有数据
            const [statsRes, statusRes, trendRes, expiringRes] = await Promise.all([
                axios.get(`${API_BASE}/api/dashboard/stats`),
                axios.get(`${API_BASE}/api/dashboard/status-distribution`),
                axios.get(`${API_BASE}/api/dashboard/monthly-trend`),
                axios.get(`${API_BASE}/api/dashboard/expiring-members`)
            ]);

            if (statsRes.data.code === 0) setStats(statsRes.data.data);
            if (statusRes.data.code === 0) setStatusDistribution(statusRes.data.data);
            if (trendRes.data.code === 0) setMonthlyTrend(trendRes.data.data);
            if (expiringRes.data.code === 0) setExpiringMembers(expiringRes.data.data);
        } catch (error) {
            console.error('获取仪表板数据失败:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // ===== 状态颜色 =====
    const statusColor = (status) => {
        switch (status) {
            case '活跃': return 'bg-green-500';
            case '冻结': return 'bg-yellow-500';
            case '过期': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    // ===== 功能卡片 =====
    const features = [
        { path: '/admin-finances', icon: '💰', label: '财务管理' },
        { path: '/card-types', icon: '📋', label: '卡种管理' },
        { path: '/member-management', icon: '👥', label: '会员管理' },
        { path: '/practiceCalendar', icon: '📅', label: '日程管理' },
        { path: '/communication', icon: '💬', label: '消息中心' },
    ];

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <Navbar />

            {/* 标题栏 */}
            <div className="bg-gray-800 text-white px-8 py-4 flex-shrink-0 flex flex-col items-center">
                <h1 className="text-3xl font-bold">📊 管理仪表板</h1>
                <p className="text-gray-400 text-sm">星发欢迎您回来</p>
            </div>

            {/* 主内容 */}
            <div className="flex-1 p-6 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-gray-400 text-xl">⏳ 加载数据中...</div>
                    </div>
                ) : (
                    <>
                        {/* ===== 统计卡片 ===== */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                                <div className="text-gray-500 text-sm">总会员数</div>
                                <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                            </div>
                            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                                <div className="text-gray-500 text-sm">本月新增</div>
                                <div className="text-3xl font-bold text-green-600">+{stats.monthly_new}</div>
                            </div>
                            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                                <div className="text-gray-500 text-sm">活跃会员</div>
                                <div className="text-3xl font-bold text-purple-600">{stats.active}</div>
                            </div>
                            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                                <div className="text-gray-500 text-sm">本月收入</div>
                                <div className="text-3xl font-bold text-orange-600">¥{stats.monthly_income}</div>
                            </div>
                        </div>

                        {/* ===== 两列布局 ===== */}
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            {/* 状态分布 */}
                            <div className="bg-white rounded-xl shadow-md p-6">
                                <h2 className="text-lg font-bold text-gray-700 mb-4">📌 会员状态分布</h2>
                                <div className="space-y-3">
                                    {statusDistribution.map((item, idx) => (
                                        <div key={idx} className="flex items-center">
                                            <span className={`w-3 h-3 rounded-full ${statusColor(item.status)} mr-3`}></span>
                                            <span className="flex-1 text-gray-700">{item.status}</span>
                                            <span className="font-bold text-lg">{item.count}</span>
                                            <span className="text-gray-400 text-sm ml-2">
                                                ({stats.total > 0 ? Math.round(item.count / stats.total * 100) : 0}%)
                                            </span>
                                        </div>
                                    ))}
                                    {statusDistribution.length === 0 && (
                                        <p className="text-gray-400 text-center py-4">暂无数据</p>
                                    )}
                                </div>
                            </div>

                            {/* 即将过期会员 */}
                            <div className="bg-white rounded-xl shadow-md p-6">
                                <h2 className="text-lg font-bold text-gray-700 mb-4">⏰ 即将过期会员（7天内）</h2>
                                {expiringMembers.length === 0 ? (
                                    <p className="text-gray-400 text-center py-4">🎉 暂无即将过期的会员</p>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-auto">
                                        {expiringMembers.map((member) => (
                                            <div key={member.id} className="flex justify-between items-center border-b pb-2">
                                                <span className="font-medium">{member.name}</span>
                                                <span className="text-sm text-gray-500">{member.phone}</span>
                                                <span className="text-sm text-red-500 font-bold">
                                                    {member.expiry_date}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ===== 月度趋势 ===== */}
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div className="bg-white rounded-xl shadow-md p-6 col-span-2">
                                <h2 className="text-lg font-bold text-gray-700 mb-4">📈 近6个月会员增长趋势</h2>
                                <div className="flex items-end h-48 gap-4">
                                    {monthlyTrend.map((item, idx) => {
                                        const maxCount = Math.max(...monthlyTrend.map(i => i.count), 1);
                                        const height = Math.max((item.count / maxCount) * 100, 5);
                                        return (
                                            <div key={idx} className="flex-1 flex flex-col items-center">
                                                <div className="text-sm font-medium text-gray-600">{item.count}</div>
                                                <div
                                                    className="w-full bg-blue-400 rounded-t"
                                                    style={{ height: `${height}%`, minHeight: '8px' }}
                                                ></div>
                                                <div className="text-sm text-gray-500 mt-1">{item.month}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* ===== 功能快捷入口 ===== */}
                        <div className="grid grid-cols-5 gap-4">
                            {features.map((item, idx) => (
                                <Link
                                    key={idx}
                                    to={item.path}
                                    className="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition hover:scale-105"
                                >
                                    <div className="text-4xl mb-2">{item.icon}</div>
                                    <div className="text-gray-700 font-medium">{item.label}</div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <Footer />
        </div>
    );
};

export default AdminHomePage;
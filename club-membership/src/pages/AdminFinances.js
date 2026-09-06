import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';

const API_BASE = 'http://localhost:3001';

const AdminFinances = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        monthly_income: 0,
        monthly_expense: 0,
        monthly_profit: 0,
        total_balance: 0
    });
    const [trend, setTrend] = useState([]);
    const [records, setRecords] = useState([]);
    const [fixedExpenses, setFixedExpenses] = useState([]);
    const [showAddPopup, setShowAddPopup] = useState(false);
    const [showFixedPopup, setShowFixedPopup] = useState(false);
    const [editingFixed, setEditingFixed] = useState(null);
    const [recordType, setRecordType] = useState('income');

    // ===== 获取所有财务数据 =====
    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [statsRes, trendRes, recordsRes, fixedRes] = await Promise.all([
                axios.get(`${API_BASE}/api/finances/stats`),
                axios.get(`${API_BASE}/api/finances/trend`),
                axios.get(`${API_BASE}/api/finances`),
                axios.get(`${API_BASE}/api/finances/fixed-expenses`)
            ]);

            if (statsRes.data.code === 0) setStats(statsRes.data.data);
            if (trendRes.data.code === 0) setTrend(trendRes.data.data);
            // if (recordsRes.data.code === 0) setRecords(recordsRes.data.data || []); # records 不是数组，records.map 无法执行。这说明后端返回的数据格式和前端预期不一致。
            if (recordsRes.data.code === 0) {
                const data = recordsRes.data.data;
                // 如果 data 是数组就用它，否则用空数组
                setRecords(Array.isArray(data) ? data : []);
            } else {
                setRecords([]);
            }
            if (fixedRes.data.code === 0) setFixedExpenses(fixedRes.data.data || []);
        } catch (error) {
            console.error('获取财务数据失败:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // ===== 添加收支记录 =====
    const addRecord = async (event) => {
        event.preventDefault();
        const form = event.target;
        const data = {
            type: form.type.value,
            category: form.category.value,
            amount: parseInt(form.amount.value),
            description: form.description.value || '',
            date: form.date.value,
            payment_method: form.payment_method.value || ''
        };

        try {
            const res = await axios.post(`${API_BASE}/api/finances`, data);
            if (res.data.code === 0) {
                await fetchAllData();
                setShowAddPopup(false);
                form.reset();
                alert('✅ 记录添加成功');
            } else {
                alert('添加失败: ' + res.data.message);
            }
        } catch (error) {
            console.error('添加失败:', error);
            alert('添加失败，请检查网络');
        }
    };

    // ===== 删除记录 =====
    const deleteRecord = async (id) => {
        if (!window.confirm('确定要删除这条记录吗？')) return;
        try {
            const res = await axios.delete(`${API_BASE}/api/finances/${id}`);
            if (res.data.code === 0) {
                await fetchAllData();
                alert('✅ 删除成功');
            } else {
                alert('删除失败: ' + res.data.message);
            }
        } catch (error) {
            console.error('删除失败:', error);
            alert('删除失败，请检查网络');
        }
    };

    // ===== 自动记录固定支出 =====
    const autoRecordFixed = async () => {
        if (!window.confirm('将把本月所有固定支出记录到收支明细中，确定吗？')) return;
        try {
            const res = await axios.post(`${API_BASE}/api/finances/auto-record-fixed`);
            if (res.data.code === 0) {
                await fetchAllData();
                alert(`✅ ${res.data.message}`);
            } else {
                alert('操作失败: ' + res.data.message);
            }
        } catch (error) {
            console.error('操作失败:', error);
            alert('操作失败，请检查网络');
        }
    };

    // ===== 添加/修改固定支出 =====
    const submitFixed = async (event) => {
        event.preventDefault();
        const form = event.target;
        const data = {
            category: form.category.value,
            amount: parseInt(form.amount.value),
            due_day: parseInt(form.due_day.value),
            description: form.description.value || ''
        };

        try {
            let res;
            if (editingFixed) {
                res = await axios.put(`${API_BASE}/api/finances/fixed-expenses/${editingFixed.id}`, data);
            } else {
                res = await axios.post(`${API_BASE}/api/finances/fixed-expenses`, data);
            }
            if (res.data.code === 0) {
                await fetchAllData();
                setShowFixedPopup(false);
                setEditingFixed(null);
                form.reset();
                alert('✅ 保存成功');
            } else {
                alert('保存失败: ' + res.data.message);
            }
        } catch (error) {
            console.error('保存失败:', error);
            alert('保存失败，请检查网络');
        }
    };

    // ===== 删除固定支出 =====
    const deleteFixed = async (id) => {
        if (!window.confirm('确定要删除这条固定支出配置吗？')) return;
        try {
            const res = await axios.delete(`${API_BASE}/api/finances/fixed-expenses/${id}`);
            if (res.data.code === 0) {
                await fetchAllData();
                alert('✅ 删除成功');
            } else {
                alert('删除失败: ' + res.data.message);
            }
        } catch (error) {
            console.error('删除失败:', error);
            alert('删除失败，请检查网络');
        }
    };

    // ===== 打开固定支出弹窗 =====
    const openFixedPopup = (item = null) => {
        setEditingFixed(item);
        setShowFixedPopup(true);
    };

    // ===== 收入/支出分类 =====
    const incomeCategories = ['会费', '按次收费', '课程费', '其他收入'];
    const expenseCategories = ['场地租金', '教练工资', '活动费用', '其他支出'];

    // ===== 类型图标 =====
    const typeIcon = (type) => type === 'income' ? '📈' : '📉';
    const typeColor = (type) => type === 'income' ? 'text-green-600' : 'text-red-600';

    // ===== 格式化金额 =====
    const formatAmount = (amount) => {
        const num = Math.abs(amount);
        return `¥${num.toFixed(0)}`;
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <Navbar />

            {/* 标题栏 */}
            <div className="bg-sky-300 text-white px-8 py-2 flex-shrink-0 flex items-center justify-between">
                <button
                    className="px-6 py-2 bg-slate-500 hover:bg-slate-600 rounded-lg transition"
                    onClick={() => navigate('/admin')}
                >
                    ⬅ 返回
                </button>
                <div className="inline-block">
                    <h2 className="text-3xl reddit-mono font-bold bg-slate-200 px-10 py-2 rounded-lg text-sky-500 shadow-lg hover:shadow-xl transition-shadow duration-200">
                        💰 财务管理
                    </h2>
                    <p className="text-sm text-gray-500 font-normal reddit-mono mt-1.5 text-center">
                        舞厅收支总览
                    </p>
                </div>
                {/* 右侧占位，保持居中对称 */}
                <div className="w-28"></div>
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
                            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                                <div className="text-gray-500 text-sm">本月收入</div>
                                <div className="text-2xl font-bold text-green-600">{formatAmount(stats.monthly_income)}</div>
                            </div>
                            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
                                <div className="text-gray-500 text-sm">本月支出</div>
                                <div className="text-2xl font-bold text-red-600">{formatAmount(stats.monthly_expense)}</div>
                            </div>
                            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                                <div className="text-gray-500 text-sm">本月利润</div>
                                <div className={`text-2xl font-bold ${stats.monthly_profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    {formatAmount(stats.monthly_profit)}
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                                <div className="text-gray-500 text-sm">累计结余</div>
                                <div className="text-2xl font-bold text-purple-600">{formatAmount(stats.total_balance)}</div>
                            </div>
                        </div>


                        {/* ===== 月度趋势 ===== */}
                        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                            <h2 className="text-lg font-bold text-gray-700 mb-4">📈 近6个月收支趋势</h2>
                            <div className="flex items-end h-52 gap-3">
                                {trend.map((item, idx) => {
                                    const maxVal = Math.max(...trend.map(i => Math.max(i.income, i.expense)), 1);
                                    const incomeH = Math.max((item.income / maxVal) * 100, 3);
                                    const expenseH = Math.max((item.expense / maxVal) * 100, 3);
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center">
                                            <div className="w-full flex flex-col items-center gap-1">
                                                <div className="w-8 bg-green-400 rounded-t" style={{ height: `${incomeH}px`, minHeight: '4px' }}></div>
                                                <div className="w-8 bg-red-400 rounded-t" style={{ height: `${expenseH}px`, minHeight: '4px' }}></div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">{item.month}</div>
                                            <div className="text-xs text-gray-400">{formatAmount(item.income)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-center gap-6 mt-2 text-sm">
                                <span><span className="inline-block w-3 h-3 bg-green-400 rounded mr-1"></span> 收入</span>
                                <span><span className="inline-block w-3 h-3 bg-red-400 rounded mr-1"></span> 支出</span>
                            </div>
                        </div>


                        {/* ===== 收支明细 ===== */}
                        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                            <h2 className="text-lg font-bold text-gray-700 mb-4">📋 收支明细</h2>
                            <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                <table className="w-full border-collapse text-sm">
                                    <thead className="sticky top-0 bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-center">日期</th>
                                            <th className="p-3 text-center">类型</th>
                                            <th className="p-3 text-center">分类</th>
                                            <th className="p-3 text-center">金额</th>
                                            <th className="p-3 text-center">方式</th>
                                            <th className="p-3 text-center">备注</th>
                                            <th className="p-3 text-center">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="text-center py-8 text-gray-400">暂无记录</td>
                                            </tr>
                                        ) : (
                                            records.map((item) => (
                                                <tr key={item.id} className="border-b hover:bg-gray-50">
                                                    <td className="p-3">{item.date}</td>
                                                    <td className="p-3">
                                                        <span className={typeColor(item.type)}>
                                                            {typeIcon(item.type)} {item.type === 'income' ? '收入' : '支出'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">{item.category}</td>
                                                    <td className={`p-3 text-right font-bold ${typeColor(item.type)}`}>
                                                        {item.type === 'income' ? '+' : '-'}{formatAmount(item.amount)}
                                                    </td>
                                                    <td className="p-3">{item.payment_method || '-'}</td>
                                                    <td className="p-3 text-gray-500 max-w-[150px] truncate">{item.description || '-'}</td>
                                                    <td className="p-3 text-center">
                                                        <button
                                                            onClick={() => deleteRecord(item.id)}
                                                            className="text-red-500 hover:text-red-700 text-sm"
                                                        >
                                                            删除
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ===== 固定支出列表 ===== */}
                        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                            <h2 className="text-lg font-bold text-gray-700 mb-4">📋 固定支出配置</h2>
                            {fixedExpenses.length === 0 ? (
                                <p className="text-gray-400 text-center py-2">暂无固定支出配置</p>
                            ) : (
                                <div className="grid grid-cols-5 gap-3">
                                    {fixedExpenses.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center border-b pb-2 px-2">
                                            <div>
                                                <span className="font-medium">{item.category}</span>
                                                <span className="text-sm text-gray-500 ml-2">每月{item.due_day}号</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-red-600">{formatAmount(item.amount)}</span>
                                                <button
                                                    onClick={() => openFixedPopup(item)}
                                                    className="text-blue-500 hover:text-blue-700 text-sm"
                                                >
                                                    编辑
                                                </button>
                                                <button
                                                    onClick={() => deleteFixed(item.id)}
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                >
                                                    删除
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>


                        {/* ===== 快捷操作 ===== */}
                        <div className="flex gap-3 mb-6 flex-wrap justify-center text-center">
                            <button
                                onClick={() => { setRecordType('income'); setShowAddPopup(true); }}
                                className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition font-medium"
                            >
                                📥 记一笔收入
                            </button>
                            <button
                                onClick={() => { setRecordType('expense'); setShowAddPopup(true); }}
                                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition font-medium"
                            >
                                📤 记一笔支出
                            </button>
                            <button
                                onClick={autoRecordFixed}
                                className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition font-medium"
                            >
                                🔄 记录本月固定支出
                            </button>
                            <button
                                onClick={() => openFixedPopup()}
                                className="px-5 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition font-medium"
                            >
                                ⚙️ 管理固定支出
                            </button>
                        </div>

                    </>
                )}
            </div>

            <Footer />

            {/* ===== 添加收支弹窗 ===== */}
            {showAddPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowAddPopup(false)}>
                    <div className="bg-white rounded-2xl p-8 w-[460px] max-w-[95%] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-2xl font-bold text-gray-800">
                                {recordType === 'income' ? '📥 记一笔收入' : '📤 记一笔支出'}
                            </h2>
                            <button onClick={() => setShowAddPopup(false)} className="text-red-500 hover:text-red-700 text-4xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={addRecord} className="space-y-4">
                            <input type="hidden" name="type" value={recordType} />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">分类 *</label>
                                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" name="category" required>
                                    <option value="">请选择</option>
                                    {(recordType === 'income' ? incomeCategories : expenseCategories).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">金额 *</label>
                                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" type="number" name="amount" placeholder="请输入金额" min="1" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">日期 *</label>
                                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">支付方式</label>
                                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" name="payment_method">
                                    <option value="">未选择</option>
                                    <option value="现金">现金</option>
                                    <option value="微信">微信</option>
                                    <option value="支付宝">支付宝</option>
                                    <option value="银行转账">银行转账</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" type="text" name="description" placeholder="备注信息（选填）" />
                            </div>
                            <button type="submit" className="w-full py-4 rounded-lg bg-blue-500 hover:bg-blue-600 transition text-white font-bold text-xl">
                                ✅ 确认添加
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== 固定支出弹窗 ===== */}
            {showFixedPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => { setShowFixedPopup(false); setEditingFixed(null); }}>
                    <div className="bg-white rounded-2xl p-8 w-[460px] max-w-[95%] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-2xl font-bold text-gray-800">
                                {editingFixed ? '✏️ 编辑固定支出' : '⚙️ 添加固定支出'}
                            </h2>
                            <button onClick={() => { setShowFixedPopup(false); setEditingFixed(null); }} className="text-red-500 hover:text-red-700 text-4xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={submitFixed} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">分类 *</label>
                                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" name="category" defaultValue={editingFixed?.category || ''} required>
                                    <option value="">请选择</option>
                                    <option value="场地租金">场地租金</option>
                                    <option value="教练工资">教练工资</option>
                                    <option value="活动费用">活动费用</option>
                                    <option value="其他支出">其他支出</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">金额（元）*</label>
                                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" type="number" name="amount" defaultValue={editingFixed?.amount || ''} placeholder="请输入金额" min="1" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">每月几号扣款 *</label>
                                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" type="number" name="due_day" defaultValue={editingFixed?.due_day || ''} placeholder="如 5" min="1" max="31" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" type="text" name="description" defaultValue={editingFixed?.description || ''} placeholder="备注信息（选填）" />
                            </div>
                            <button type="submit" className="w-full py-4 rounded-lg bg-purple-500 hover:bg-purple-600 transition text-white font-bold text-xl">
                                💾 保存
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFinances;
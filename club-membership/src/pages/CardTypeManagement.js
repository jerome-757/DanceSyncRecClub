import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';

const API_BASE = 'https://dancesyncrecclub-production.up.railway.app';

const CardTypeManagement = () => {
    const navigate = useNavigate();
    const [cardTypes, setCardTypes] = useState([]);
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
    const [loading, setLoading] = useState(true);
    const [showPopup, setShowPopup] = useState(false);
    const [editingItem, setEditingItem] = useState(null);


    const fetchData = async () => {
        setLoading(true);
        
        // 先获取卡种列表
        try {
            const typesRes = await axios.get(`${API_BASE}/api/card-types`);
            if (typesRes.data.code === 0) {
                console.log('✅ 卡种数据:', typesRes.data.data);
                setCardTypes(typesRes.data.data || []);
            } else {
                setCardTypes([]);
            }
        } catch (error) {
            console.error('❌ 获取卡种列表失败:', error);
            setCardTypes([]);
        }

        // 再获取统计信息
        try {
            const statsRes = await axios.get(`${API_BASE}/api/card-types/stats`);
            if (statsRes.data.code === 0) {
                setStats(statsRes.data.data || { total: 0, active: 0, inactive: 0 });
            } else {
                setStats({ total: 0, active: 0, inactive: 0 });
            }
        } catch (error) {
            console.error('❌ 获取统计信息失败:', error);
            setStats({ total: 0, active: 0, inactive: 0 });
        }

        setLoading(false);
    };

    //  这段删掉界面会一直显示加载中
    useEffect(() => {
        fetchData();
    }, []);
    

    // ===== 新增/编辑卡种 =====
    const openPopup = (item = null) => {
        setEditingItem(item);
        setShowPopup(true);
    };

    const closePopup = () => {
        setShowPopup(false);
        setEditingItem(null);
    };

    const submitCardType = async (event) => {
        event.preventDefault();
        const form = event.target;
        const data = {
            name: form.name.value,
            card_category: form.card_category.value,
            total_count: parseInt(form.total_count.value) || 0,
            price: parseInt(form.price.value),
            sort_order: parseInt(form.sort_order.value) || 0,
            status: form.status.value,
            description: form.description.value || ''
        };

        try {
            let res;
            if (editingItem) {
                res = await axios.put(`${API_BASE}/api/card-types/${editingItem.id}`, data);
            } else {
                res = await axios.post(`${API_BASE}/api/card-types`, data);
            }
            if (res.data.code === 0) {
                await fetchData();
                closePopup();
                form.reset();
                alert(editingItem ? '✅ 卡种更新成功' : '✅ 卡种添加成功');
            } else {
                alert('操作失败: ' + res.data.message);
            }
        } catch (error) {
            console.error('操作失败:', error);
            alert('操作失败，请检查网络');
        }
    };

    // ===== 删除卡种 =====
    const deleteCardType = async (id, name) => {
        if (!window.confirm(`确定要删除卡种 "${name}" 吗？\n（删除后不可恢复）`)) return;
        try {
            const res = await axios.delete(`${API_BASE}/api/card-types/${id}`);
            if (res.data.code === 0) {
                await fetchData();
                alert('✅ 删除成功');
            } else {
                alert('删除失败: ' + res.data.message);
            }
        } catch (error) {
            console.error('删除失败:', error);
            alert('删除失败，请检查网络');
        }
    };

    // ===== 状态颜色 =====
    const statusBadge = (status) => {
        if (status === '启用') return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">🟢 启用</span>;
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">🔴 停用</span>;
    };

    // ===== 类型标签 =====
    const typeBadge = (category, count) => {
        if (category === 'fixed') return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">计次 {count}次</span>;
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">不限次</span>;
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
                        📋 卡种管理
                    </h2>
                    <p className="text-sm text-gray-500 font-normal reddit-mono mt-1.5 text-center">
                        管理所有可售卖的会员卡类型
                    </p>
                </div>
                {/* 右侧占位，保持居中对称 */}
                <div className="w-28"></div>
            </div>

            {/* 主内容 */}
            <div className="flex-1 p-6 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-gray-400 text-xl">⏳ 加载中...</div>
                    </div>
                ) : (
                    <>
                        {/* 统计卡片 */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                                <div className="text-gray-500 text-sm">卡种总数</div>
                                <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                            </div>
                            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                                <div className="text-gray-500 text-sm">已启用</div>
                                <div className="text-3xl font-bold text-green-600">{stats.active}</div>
                            </div>
                            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
                                <div className="text-gray-500 text-sm">已停用</div>
                                <div className="text-3xl font-bold text-red-600">{stats.inactive}</div>
                            </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => openPopup()}
                                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition flex items-center gap-2"
                            >
                                <span className="text-xl">＋</span> 添加卡种
                            </button>
                        </div>

                        {/* 卡种列表 */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden">
                            <table className="w-full border-collapse">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="p-4 text-left font-bold text-gray-700">序号</th>
                                        <th className="p-4 text-left font-bold text-gray-700">卡种名称</th>
                                        <th className="p-4 text-left font-bold text-gray-700">类型</th>
                                        <th className="p-4 text-left font-bold text-gray-700">价格</th>
                                        <th className="p-4 text-left font-bold text-gray-700">状态</th>
                                        <th className="p-4 text-left font-bold text-gray-700">说明</th>
                                        <th className="p-4 text-center font-bold text-gray-700">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cardTypes.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-12 text-gray-400 text-lg">
                                                📭 暂无卡种，点击 "添加卡种" 创建
                                            </td>
                                        </tr>
                                    ) : (
                                        cardTypes.map((item) => (
                                            <tr key={item.id} className="border-b hover:bg-gray-50 transition">
                                                <td className="p-4 text-gray-500">{item.sort_order || '-'}</td>
                                                <td className="p-4 font-medium text-gray-800">{item.name}</td>
                                                <td className="p-4">{typeBadge(item.card_category, item.total_count)}</td>
                                                <td className="p-4 font-bold text-gray-700">¥{item.price || 0}</td>
                                                <td className="p-4">{statusBadge(item.status)}</td>
                                                <td className="p-4 text-gray-500 text-sm max-w-[150px] truncate">{item.description || '-'}</td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => openPopup(item)}
                                                            className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition"
                                                        >
                                                            编辑
                                                        </button>
                                                        <button
                                                            onClick={() => deleteCardType(item.id, item.name)}
                                                            className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition"
                                                        >
                                                            删除
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <Footer />

            {/* ===== 新增/编辑弹窗 ===== */}
            {showPopup && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                    onClick={closePopup}
                >
                    <div
                        className="bg-white rounded-2xl p-8 w-[635px] max-w-[95%] max-h-[90vh] overflow-y-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-2xl font-bold text-gray-800">
                                {editingItem ? '✏️ 编辑卡种' : '➕ 添加卡种'}
                            </h2>
                            <button onClick={closePopup} className="text-red-500 hover:text-red-700 text-4xl leading-none">
                                &times;
                            </button>
                        </div>
                        <form onSubmit={submitCardType} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">卡种名称 *</label>
                                <input
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    type="text"
                                    name="name"
                                    defaultValue={editingItem?.name || ''}
                                    placeholder="如：10次卡 / 月卡 / 年卡"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">卡分类 *</label>
                                <select
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    name="card_category"
                                    defaultValue={editingItem?.card_category || 'fixed'}
                                    required
                                >
                                    <option value="fixed">计次卡（可自定义扣次|无时间限制）</option>
                                    <option value="unlimited">期限卡（固定扣1次|每日最多2次）</option>
                                </select>
                                <p className="text-xs text-gray-400 mt-1">计次卡：每次可选择扣1-N次</p>
                                <p className="text-xs text-gray-400 mt-1">期限卡：每次固定扣1次，1小时限1次，每日最多2次</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">总次数</label>
                                <input
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    type="number"
                                    name="total_count"
                                    defaultValue={editingItem?.total_count || 0}
                                    min="0"
                                />
                                <p className="text-xs text-gray-400 mt-1">计次卡（次卡类）需填写总次数</p>
                                <p className="text-xs text-gray-400 mt-1">期限卡（月卡类）总次数填0</p>

                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">价格（元）*</label>
                                <input
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    type="number"
                                    name="price"
                                    defaultValue={editingItem?.price || 0}
                                    min="1"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">显示排序</label>
                                <input
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    type="number"
                                    name="sort_order"
                                    defaultValue={editingItem?.sort_order || 0}
                                    min="0"
                                />
                                <p className="text-xs text-gray-400 mt-1">数字越小排名越靠前</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                                <select
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    name="status"
                                    defaultValue={editingItem?.status || '启用'}
                                >
                                    <option value="启用">启用</option>
                                    <option value="停用">停用</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">说明</label>
                                <input
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    type="text"
                                    name="description"
                                    defaultValue={editingItem?.description || ''}
                                    placeholder="选填"
                                />
                            </div>
                            <button type="submit" className="w-full py-4 rounded-lg bg-green-500 hover:bg-green-600 transition text-white font-bold text-xl">
                                {editingItem ? '💾 保存修改' : '✅ 确认添加'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CardTypeManagement;
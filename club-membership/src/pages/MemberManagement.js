import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:3001";

const MembersManagement = () => {
    const [members, setMembers] = useState([]);
    const [showAddPopup, setShowAddPopup] = useState(false);
    const [showEditPopup, setShowEditPopup] = useState(false);
    const [showCardDetailPopup, setShowCardDetailPopup] = useState(false);
    const [viewingMember, setViewingMember] = useState(null);
    const [editingMember, setEditingMember] = useState(null);
    const [loading, setLoading] = useState(false);
    const [memberCards, setMemberCards] = useState({}); // 存储每个会员的次卡 { memberId: [cards] }
    const navigate = useNavigate();
    const [cardTypes, setCardTypes] = useState([]);  // 可用卡种列表
    const [selectedCardType, setSelectedCardType] = useState(null);

    const handleBack = () => {
        navigate(-1);
    };

    // ===== 获取会员列表 =====
    const fetchMembers = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE}/api/members`);
            if (response.data.code === 0) {
                const membersData = response.data.data;
                setMembers(membersData);
                // 获取每个会员的次卡
                await fetchAllMemberCards(membersData);
            } else {
                console.error("获取会员失败:", response.data.message);
            }
        } catch (error) {
            console.error("Error fetching members:", error);
        }
        setLoading(false);
    };

    // 加载卡种列表
    const fetchCardTypes = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/card-types?status=启用`);
            if (res.data.code === 0) {
                setCardTypes(res.data.data);
            }
        } catch (e) {
            console.error('加载卡种失败:', e);
        }
    };

    // ===== 获取所有会员的次卡 =====
    const fetchAllMemberCards = async (membersData) => {
        const cardsMap = {};
        for (const member of membersData) {
            try {
                const res = await axios.get(`${API_BASE}/api/member-cards/${member.id}`);
                if (res.data.code === 0) {
                    cardsMap[member.id] = res.data.data || [];
                } else {
                    cardsMap[member.id] = [];
                }
            } catch (e) {
                cardsMap[member.id] = [];
            }
        }
        setMemberCards(cardsMap);
    };

    // ===== 获取单个会员的次卡（更新用） =====
    const fetchMemberCards = async (memberId) => {
        try {
            const res = await axios.get(`${API_BASE}/api/member-cards/${memberId}`);
            if (res.data.code === 0) {
                setMemberCards(prev => ({ ...prev, [memberId]: res.data.data || [] }));
            }
        } catch (e) {
            console.error('获取次卡失败:', e);
        }
    };

    useEffect(() => {
        fetchMembers();
        fetchCardTypes();
    }, []);

    // ===== 排序功能 =====
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    const sortMembers = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });

        const sorted = [...members].sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];
            if (typeof aVal === "string") {
                return direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            if (typeof aVal === "number") {
                return direction === "asc" ? aVal - bVal : bVal - aVal;
            }
            return 0;
        });
        setMembers(sorted);
    };

    // ===== 删除会员 =====
    const deleteRecord = async (id, name) => {
        if (!window.confirm(`确定要删除会员 "${name}" 吗？`)) return;
        try {
            const response = await axios.delete(`${API_BASE}/api/members/${id}`);
            if (response.data.code === 0) {
                await fetchMembers();
            } else {
                alert("删除失败: " + response.data.message);
            }
        } catch (error) {
            console.error("Error deleting member:", error);
            alert("删除失败，请检查网络");
        }
    };

    // ===== 状态颜色 =====
    const statusColor = (status) => {
        switch (status) {
            case "活跃":
                return "bg-green-500 text-white";
            case "冻结":
                return "bg-yellow-500 text-white";
            case "过期":
                return "bg-red-500 text-white";
            default:
                return "bg-gray-500 text-white";
        }
    };

    // // ===== 格式化次卡显示（显示所有卡） =====
    // const formatCards = (memberId) => {
    //     const cards = memberCards[memberId] || [];
    //     if (cards.length === 0) return <span className="text-gray-400 text-sm">无次卡</span>;
    //     return cards.map((card, idx) => {
    //         const label = card.card_type;
    //         const status = card.status === '有效' ? '🟢' : '🔴';
    //         const remaining = card.card_type === '月卡' ? '不限' : `${card.remaining_count}次`;
    //         return (
    //             <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
    //                 {status} {label} ({remaining})
    //             </span>
    //         );
    //     });
    // };

    // ===== 格式化次卡显示（只显示有效卡） =====
    const formatCards = (memberId) => {
        const cards = memberCards[memberId] || [];
        // 只筛选状态为"有效"的卡
        const validCards = cards.filter(c => c.status === '有效');
        if (validCards.length === 0) {
            return <span className="text-gray-400 text-sm">无有效卡</span>;
        }
        return validCards.map((card, idx) => {
            const label = card.name;
            const remaining = card.card_category === 'fixed' ? `${card.remaining_count}次` : '不限';
            return (
                <span key={idx} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                    🟢 {label} ({remaining})
                </span>
            );
        });
    };

    // ===== 卡项详情弹窗 =====
    const openCardDetail = (member) => {
        setViewingMember(member);
        setShowCardDetailPopup(true);
        // 获取该会员的所有卡项
        fetchMemberCards(member.id);
    };

    // 关闭卡项详情弹窗
    const closeCardDetail = () => {
        setShowCardDetailPopup(false);
        setViewingMember(null);
    };

    // ===== 编辑会员卡 =====
    const editCard = async (card, memberId) => {
        // 弹出编辑表单
        const newCardType = prompt(`编辑卡项 - ${card.card_category}\n当前剩余次数：${card.remaining_count}\n当前有效期：${card.expiry_date || '未设置'}\n\n请输入新的剩余次数：`, card.remaining_count);
        if (newCardType === null) return;
        
        const newRemaining = parseInt(newCardType);
        if (isNaN(newRemaining) || newRemaining < 0) {
            alert('请输入有效的正整数');
            return;
        }

        const newExpiry = prompt('请输入新的有效期（格式：YYYY-MM-DD，留空则不变）：', card.expiry_date || '');
        if (newExpiry === null) return;

        try {
            // 调用更新接口（需要后端支持）
            // 由于目前没有 PUT 接口，先提醒
            alert('⚠️ 编辑功能后端接口待开发，当前仅展示修改内容');
            console.log('编辑内容:', { cardId: card.id, remaining: newRemaining, expiry: newExpiry });
        } catch (error) {
            console.error('编辑卡项失败:', error);
        }
    };

    // ===== 添加弹窗 =====
    const openAddPopup = () => setShowAddPopup(true);
    const closeAddPopup = () => setShowAddPopup(false);

    const addNewMember = async (event) => {
        event.preventDefault();
        const form = event.target;
        const newMember = {
            name: form.name.value,
            nickname: form.nickname.value || "",
            gender: form.gender.value,
            phone: form.phone.value,
            expiry_date: form.expiry_date.value || null,
            notes: form.notes.value || ""
        };

        try {
            const response = await axios.post(`${API_BASE}/api/members`, newMember);
            if (response.data.code === 0) {
                await fetchMembers();
                closeAddPopup();
                form.reset();
                alert(`✅ 会员添加成功！会员编号: ${response.data.data.member_no}`);
            } else {
                alert("添加失败: " + response.data.message);
            }
        } catch (error) {
            console.error("Error adding member:", error);
            alert("添加失败，请检查网络");
        }
    };

    // ===== 编辑弹窗 =====
    const openEditPopup = (member) => {
        setEditingMember(member);
        setShowEditPopup(true);
        fetchMemberCards(member.id);
    };
    const closeEditPopup = () => {
        setShowEditPopup(false);
        setEditingMember(null);
    };

    const updateMember = async (event) => {
        event.preventDefault();
        const form = event.target;
        const updatedData = {
            name: form.editName.value,
            nickname: form.editNickname.value || "",
            gender: form.editGender.value,
            phone: form.editPhone.value,
            status: form.editStatus.value,
            expiry_date: form.editExpiryDate.value || null,
            notes: form.editNotes.value || ""
        };

        try {
            const response = await axios.put(
                `${API_BASE}/api/members/${editingMember.id}`,
                updatedData
            );
            if (response.data.code === 0) {
                await fetchMembers();
                closeEditPopup();
                alert("✅ 会员信息更新成功！");
            } else {
                alert("更新失败: " + response.data.message);
            }
        } catch (error) {
            console.error("Error updating member:", error);
            alert("更新失败，请检查网络");
        }
    };

    // ===== 添加次卡 =====
    const addCardToMember = async (event) => {
        event.preventDefault();
        const form = event.target;
        const memberId = editingMember.id;
        const cardTypeId = parseInt(form.cardTypeId.value);
        const totalCount = parseInt(form.totalCount.value) || 0;
        const price = parseInt(form.price.value) || 0;
        const expiryDate = form.expiryDate.value || null;

    if (!cardTypeId) {
        alert('请选择卡种');
        return;
    }

    // 从 cardTypes 中获取选中的卡种名称
    const selectedType = cardTypes.find(ct => ct.id === cardTypeId);
    if (!selectedType) {
        alert('请选择有效的卡种');
        return;
    }

        try {
            // 直接插入次卡
            const today = new Date().toISOString().slice(0, 10);
            // const cardsDB = await import('sqlite3'); // sqlite3 是后端模块，前端浏览器无法加载。删除这行，直接通过 API 请求。
            // 由于前端不能直接操作数据库，需要通过后端接口
            const response = await axios.post(`${API_BASE}/api/member-cards`, {
                memberId: memberId,
                cardType: selectedType.name,        // 用卡种名称
                cardCategory: selectedType.card_category || 'fixed',  // 新增
                cardTypeId: selectedType.id,        // 记录卡种ID
                totalCount: totalCount,
                price: price,
                purchaseDate: today,
                expiryDate: expiryDate
            });
            if (response.data.code === 0) {
                await fetchMemberCards(memberId);
                alert('✅ 次卡添加成功！');
                form.reset();
            } else {
                alert('添加失败: ' + response.data.message);
            }
        } catch (error) {
            console.error('添加次卡失败:', error);
            alert('添加失败，请检查网络');
        }
    };

    // ===== 删除次卡 =====
    const deleteCard = async (cardId, memberId) => {
        if (!window.confirm('确定要删除这次卡吗？')) return;
        try {
            const response = await axios.delete(`${API_BASE}/api/member-cards/${cardId}`);
            if (response.data.code === 0) {
                await fetchMemberCards(memberId);
                alert('✅ 次卡删除成功');
            } else {
                alert('删除失败: ' + response.data.message);
            }
        } catch (error) {
            console.error('删除次卡失败:', error);
            alert('删除失败，请检查网络');
        }
    };

    // ===== 在卡项弹窗中添加会员卡 =====
    const addCardInDetail = async (event) => {
        event.preventDefault();
        const form = event.target;
        const memberId = viewingMember.id;
        const cardTypeId = parseInt(form.detailCardTypeId.value);
        const totalCount = parseInt(form.detailTotalCount.value) || 0;
        const price = parseInt(form.detailPrice.value) || 0;
        const expiryDate = form.detailExpiryDate.value || null;

        if (!cardTypeId) {
            alert('请选择卡种');
            return;
        }

        const selectedType = cardTypes.find(ct => ct.id === cardTypeId);
        if (!selectedType) {
            alert('请选择有效的卡种');
            return;
        }

        try {
            const today = new Date().toISOString().slice(0, 10);
            const response = await axios.post(`${API_BASE}/api/member-cards`, {
                memberId: memberId,
                cardType: selectedType.name,
                cardCategory: selectedType.card_category || 'fixed',
                cardTypeId: selectedType.id,
                totalCount: totalCount,
                price: price,
                purchaseDate: today,
                expiryDate: expiryDate
            });
            if (response.data.code === 0) {
                await fetchMemberCards(memberId);
                alert('✅ 次卡添加成功！');
                form.reset();
                // 重置下拉框
                const select = form.querySelector('select[name="detailCardTypeId"]');
                if (select) select.value = '';
            } else {
                alert('添加失败: ' + response.data.message);
            }
        } catch (error) {
            console.error('添加次卡失败:', error);
            alert('添加失败，请检查网络');
        }
    };

    return (
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
                    👥 会员管理
                </h2> */}
                {/* <h2 className="text-3xl reddit-mono font-bold bg-slate-200 px-10 py-3 rounded-lg text-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-200">
                    👥 会员管理
                    <span className="block text-sm text-gray-500 font-normal reddit-mono mt-1.5">
                        管理所有会员的详细信息
                    </span>
                </h2> */}
                <div className="inline-block">
                    <h2 className="text-3xl reddit-mono font-bold bg-slate-200 px-10 py-2 rounded-lg text-sky-500 shadow-lg hover:shadow-xl transition-shadow duration-200">
                        👥 会员管理
                    </h2>
                    <p className="text-sm text-gray-500 font-normal reddit-mono mt-1.5 text-center">
                        管理所有会员的详细信息
                    </p>
                </div>
                {/* 右侧占位，保持居中对称 */}
                <div className="w-28"></div>
            </div>

            {/* 主表格区 */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden"> 
                <div className="flex-1 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"> 
                    {/* 工具栏 */}
                    <div className="flex items-center justify-between px-8 py-1 bg-gray-100 border-b border-gray-200 flex-shrink-0">
                        <span className="text-gray-700 text-lg font-medium">
                            共{" "}
                            <span className="font-bold text-blue-600 text-xl">
                                {members.length}
                            </span>{" "}
                            位会员
                        </span>
                        <button
                            onClick={openAddPopup}
                            className="px-6 py-1 rounded-lg bg-green-500 hover:bg-green-600 transition text-white font-bold text-lg flex items-center gap-2"
                        >
                            <span className="text-xl">＋</span> 添加会员
                        </button>
                    </div>

                    {/* 表格 */}
                    <div className="flex-1 overflow-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-gray-400 text-xl">
                                ⏳ 加载中...
                            </div>
                        ) : (
                            <table className="w-full border-collapse text-base">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-gray-700 text-white text-lg">
                                        <th className="p-5 text-center font-bold whitespace-nowrap cursor-pointer hover:bg-gray-600 transition" onClick={() => sortMembers("member_no")}>
                                            会员编号 ⭥
                                        </th>
                                        <th className="p-5 text-center font-bold whitespace-nowrap cursor-pointer hover:bg-gray-600 transition" onClick={() => sortMembers("name")}>
                                            姓名 ⭥
                                        </th>
                                        <th className="p-5 text-center font-bold whitespace-nowrap cursor-pointer hover:bg-gray-600 transition" onClick={() => sortMembers("nickname")}>
                                            昵称
                                        </th>
                                        <th className="p-5 text-center font-bold whitespace-nowrap cursor-pointer hover:bg-gray-600 transition" onClick={() => sortMembers("gender")}>
                                            性别
                                        </th>
                                        <th className="p-5 text-center font-bold whitespace-nowrap cursor-pointer hover:bg-gray-600 transition" onClick={() => sortMembers("phone")}>
                                            手机号
                                        </th>
                                        <th className="p-5 text-center font-bold whitespace-nowrap cursor-pointer hover:bg-gray-600 transition" onClick={() => sortMembers("status")}>
                                            状态 ⭥
                                        </th>
                                        <th className="p-5 text-center font-bold whitespace-nowrap cursor-pointer hover:bg-gray-600 transition" onClick={() => sortMembers("monthly_attendance")}>
                                            本月出勤 ⭥
                                        </th>
                                        <th className="p-5 text-center font-bold whitespace-nowrap cursor-pointer hover:bg-gray-600 transition" onClick={() => sortMembers("total_attendance")}>
                                            总出勤 ⭥
                                        </th>
                                        <th className="p-5 text-center font-bold whitespace-nowrap cursor-pointer hover:bg-gray-600 transition" onClick={() => sortMembers("total_spent")}>
                                            累计消费 ⭥
                                        </th>
                                        {/* 新增：会员卡列 */}
                                        <th className="p-5 text-center font-bold whitespace-nowrap">
                                            会员卡
                                        </th>
                                        <th className="p-5 text-center font-bold whitespace-nowrap cursor-pointer hover:bg-gray-600 transition" onClick={() => sortMembers("expiry_date")}>
                                            有效期
                                        </th>
                                        <th className="p-5 text-center font-bold whitespace-nowrap">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.length === 0 ? (
                                        <tr>
                                            <td colSpan="12" className="text-center py-20 text-gray-400 text-xl">
                                                📭 暂无会员数据，点击 "添加会员" 创建
                                            </td>
                                        </tr>
                                    ) : (
                                        members.map((member) => (
                                            <tr key={member.id} className="hover:bg-blue-50 transition border-b border-gray-200">
                                                <td className="p-5 text-center font-mono text-sm font-bold text-blue-600">
                                                    {member.member_no}
                                                </td>
                                                <td className="p-5 text-center font-bold text-gray-800 text-lg">
                                                    {member.name}
                                                </td>
                                                <td className="p-5 text-center text-gray-600 text-lg">
                                                    {member.nickname || "-"}
                                                </td>
                                                <td className="p-5 text-center text-gray-700 text-lg">
                                                    {member.gender || "-"}
                                                </td>
                                                <td className="p-5 text-center text-gray-700 text-lg">
                                                    {member.phone}
                                                </td>
                                                <td className="p-5 text-center">
                                                    <span className={`px-4 py-2 rounded-full text-base font-bold ${statusColor(member.status)}`}>
                                                        {member.status || "冻结"}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-center font-bold text-blue-600 text-lg">
                                                    {member.monthly_attendance || 0} 次
                                                </td>
                                                <td className="p-5 text-center text-gray-700 text-lg">
                                                    {member.total_attendance || 0} 次
                                                </td>
                                                <td className="p-5 text-center font-bold text-orange-600 text-lg">
                                                    ¥{member.total_spent || 0}
                                                </td>
                                                {/* 会员卡列 */}
                                                <td className="p-5 text-center">
                                                    {formatCards(member.id)}
                                                </td>
                                                <td className="p-5 text-center text-gray-600 text-lg">
                                                    {member.expiry_date || "未设置"}
                                                </td>
                                                <td className="p-5 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => openCardDetail(member)}
                                                            className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-5 py-2.5 rounded-lg transition text-base"
                                                        >
                                                            📋 卡项
                                                        </button>
                                                        <button
                                                            onClick={() => openEditPopup(member)}
                                                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-5 py-2.5 rounded-lg transition text-base"
                                                        >
                                                            ✏️ 编辑
                                                        </button>
                                                        <button
                                                            onClick={() => deleteRecord(member.id, member.name)}
                                                            className="bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2.5 rounded-lg transition text-base"
                                                        >
                                                            🗑️ 删除
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* 底部统计 */}
                    <div className="flex items-center justify-between px-8 py-3 bg-gray-100 border-t border-gray-200 text-base text-gray-500 flex-shrink-0">
                        <span>💡 点击列头排序</span>
                        <span>🟢 活跃  🟡 冻结  🔴 过期</span>
                    </div>
                </div>
            </div>

            <Footer />

            {/* ===== 添加会员弹窗 ===== */}
            {showAddPopup && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                    onClick={closeAddPopup}
                >
                    <div
                        className="bg-white rounded-2xl p-8 w-[500px] max-w-[95%] max-h-[90vh] overflow-y-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-2xl font-bold text-gray-800">➕ 添加会员</h2>
                            <button onClick={closeAddPopup} className="text-red-500 hover:text-red-700 text-4xl leading-none">
                                &times;
                            </button>
                        </div>
                        <form onSubmit={addNewMember} className="space-y-4">
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">姓名 *</label>
                                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" type="text" name="name" placeholder="请输入姓名" required />
                            </div>
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">昵称</label>
                                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" type="text" name="nickname" placeholder="请输入昵称（选填）" />
                            </div>
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">性别</label>
                                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" name="gender">
                                    <option value="">未设置</option>
                                    <option value="男">男</option>
                                    <option value="女">女</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">手机号 *</label>
                                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" type="tel" name="phone" placeholder="请输入手机号" required />
                            </div>
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">有效期</label>
                                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" type="date" name="expiry_date" />
                            </div>
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">备注</label>
                                <textarea className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" name="notes" placeholder="备注信息（选填）" rows="2"></textarea>
                            </div>
                            <button type="submit" className="w-full py-4 rounded-lg bg-green-500 hover:bg-green-600 transition text-white font-bold text-xl">
                                ✅ 确认添加
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== 编辑会员弹窗（含次卡管理） ===== */}
            {showEditPopup && editingMember && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                    onClick={closeEditPopup}
                >
                    <div
                        className="bg-white rounded-2xl p-8 w-[650px] max-w-[95%] max-h-[90vh] overflow-y-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-2xl font-bold text-gray-800">✏️ 编辑会员</h2>
                            <button onClick={closeEditPopup} className="text-red-500 hover:text-red-700 text-4xl leading-none">
                                &times;
                            </button>
                        </div>

                        {/* 会员信息表单 */}
                        <form onSubmit={updateMember} className="space-y-4">
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">会员编号</label>
                                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg bg-gray-100 text-gray-600" type="text" value={editingMember.member_no} disabled />
                            </div>
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">姓名 *</label>
                                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" type="text" name="editName" defaultValue={editingMember.name} required />
                            </div>
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">昵称</label>
                                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" type="text" name="editNickname" defaultValue={editingMember.nickname || ""} />
                            </div>
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">性别</label>
                                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" name="editGender" defaultValue={editingMember.gender || ""}>
                                    <option value="">未设置</option>
                                    <option value="男">男</option>
                                    <option value="女">女</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">手机号 *</label>
                                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" type="tel" name="editPhone" defaultValue={editingMember.phone} required />
                            </div>
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">会员状态</label>
                                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" name="editStatus" defaultValue={editingMember.status || "冻结"}>
                                    <option value="活跃">活跃</option>
                                    <option value="冻结">冻结</option>
                                    <option value="过期">过期</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">有效期</label>
                                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" type="date" name="editExpiryDate" defaultValue={editingMember.expiry_date || ""} />
                            </div>
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-1">备注</label>
                                <textarea className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" name="editNotes" defaultValue={editingMember.notes || ""} rows="2"></textarea>
                            </div>
                            <button type="submit" className="w-full py-4 rounded-lg bg-blue-500 hover:bg-blue-600 transition text-white font-bold text-xl">
                                💾 保存修改
                            </button>
                        </form>

                        {/* 已购会员卡列表（编辑弹窗内） */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-bold text-gray-700 mb-3">🎴 已购会员卡</h3>

                            {/* 已有次卡列表 */}
                            <div className="mb-4">
                                {(memberCards[editingMember.id] || []).length === 0 ? (
                                    <p className="text-gray-400 text-sm">暂无次卡</p>
                                ) : (
                                    <div className="space-y-2">
                                        {(memberCards[editingMember.id] || []).map((card) => (
                                            <div key={card.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-2 border">
                                                <div>
                                                    <span className="font-medium">{card.name}</span>
                                                    <span className={`text-sm ml-2 ${card.status === '有效' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {card.status}
                                                    </span>
                                                    {card.card_category === 'fixed' && (
                                                        <span className="text-sm text-gray-500 ml-2">
                                                            剩余 {card.remaining_count} / 共 {card.total_count} 次
                                                        </span>
                                                    )}
                                                    {card.card_category === 'unlimited' && (
                                                        <span className="text-sm text-gray-500 ml-2">不限次</span>
                                                    )}
                                                    <span className="text-xs text-gray-400 ml-2">¥{card.price}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => editCard(card, editingMember.id)}
                                                        className="text-blue-500 hover:text-blue-700 text-sm"
                                                    >
                                                        编辑
                                                    </button>
                                                <button
                                                    onClick={() => deleteCard(card.id, editingMember.id)}
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

                            {/* 添加次卡表单 */}
                            {/* <form onSubmit={addCardToMember} className="grid grid-cols-3 gap-3 items-end">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">次卡类型</label>
                                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" name="cardType" required>
                                        <option value="10次卡">10次卡</option>
                                        <option value="月卡">月卡</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">总次数</label>
                                    <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" type="number" name="totalCount" defaultValue="10" min="1" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">价格(元)</label>
                                    <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" type="number" name="price" defaultValue="500" min="1" />
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">有效期</label>
                                    <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" type="date" name="expiryDate" />
                                </div>
                                <div className="col-span-3">
                                    <button type="submit" className="w-full py-2 rounded-lg bg-green-500 hover:bg-green-600 transition text-white font-bold text-sm">
                                        ➕ 添加次卡
                                    </button>
                                </div>
                            </form> */}
                            {/* <form onSubmit={addCardToMember} className="grid grid-cols-3 gap-3 items-end">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">选择卡种</label>
                                    {/* <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" name="cardTypeId" required>
                                        <option value="">请选择</option>
                                        {cardTypes.map((ct) => (
                                            <option key={ct.id} value={ct.id}>
                                                {ct.name} ({ct.card_type === 'fixed' ? `${ct.total_count}次` : '不限次'} ¥{ct.price})
                                            </option>
                                        ))}
                                    <select
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                        name="cardTypeId" 
                                        required
                                        onChange={(e) => {
                                            const id = parseInt(e.target.value);
                                            const found = cardTypes.find(ct => ct.id === id);
                                            // 找到对应的输入框并设置值
                                            const totalInput = document.querySelector('input[name="totalCount"]');
                                            const priceInput = document.querySelector('input[name="price"]');
                                            if (found) {
                                                if (totalInput) totalInput.value = found.card_type === 'fixed' ? found.total_count : 0;
                                                if (priceInput) priceInput.value = found.price;
                                            }
                                        }}
                                    >
                                        <option value="">请选择</option>
                                        {cardTypes.filter(ct => ct.status === '启用').map((ct) => (
                                            <option key={ct.id} value={ct.id}>
                                                {ct.name} ({ct.card_type === 'fixed' ? `${ct.total_count}次` : '不限次'} ¥{ct.price})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">菜单联动</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">总次数</label>
                                    <input 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                        type="number" 
                                        name="totalCount" 
                                        defaultValue="0" 
                                        min="0"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">可手动修改</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">价格(元)</label>
                                    <input 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                        type="number" 
                                        name="price" 
                                        defaultValue="0" 
                                        min="0"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">可手动修改</p>
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">有效期</label>
                                    <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" type="date" name="expiryDate" />
                                </div>
                                <div className="col-span-3">
                                    <button type="submit" className="w-full py-2 rounded-lg bg-green-500 hover:bg-green-600 transition text-white font-bold text-sm">
                                        ➕ 添加会员卡
                                    </button>
                                </div>
                            </form>                             */}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== 卡项详情弹窗（含添加会员卡） ===== */}
            {showCardDetailPopup && viewingMember && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                    onClick={closeCardDetail}
                >
                    <div
                        className="bg-white rounded-2xl p-8 w-[900px] max-w-[95%] max-h-[80vh] overflow-y-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-2xl font-bold text-gray-800">
                                📋 卡项详情 - {viewingMember.name}
                            </h2>
                            <button onClick={closeCardDetail} className="text-red-500 hover:text-red-700 text-4xl leading-none">
                                &times;
                            </button>
                        </div>
                        
                        <div className="mb-3 text-sm text-gray-500">
                            会员编号：{viewingMember.member_no} | 电话：{viewingMember.phone}
                        </div>

                        {(memberCards[viewingMember.id] || []).length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-lg">
                                🎴 该会员暂无任何卡项
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(memberCards[viewingMember.id] || []).map((card) => {
                                    // 状态颜色
                                    const statusColorMap = {
                                        '有效': 'bg-green-100 text-green-700 border-green-300',
                                        '已用完': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                                        '已过期': 'bg-red-100 text-red-700 border-red-300'
                                    };
                                    const statusClass = statusColorMap[card.status] || 'bg-gray-100 text-gray-700 border-gray-300';
                                    
                                    return (
                                        <div key={card.id} className={`border rounded-xl p-4 ${statusClass}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-lg">{card.name}</div>
                                                    <div className="text-sm mt-1">
                                                        {card.card_category === 'fixed' ? (
                                                            <>
                                                                总次数：{card.total_count} 次
                                                                <span className="mx-2">|</span>
                                                                已用：{card.used_count} 次
                                                                <span className="mx-2">|</span>
                                                                <span className="font-bold text-blue-600">剩余：{card.remaining_count} 次</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-purple-600">🔄 期限卡，不限次</span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        价格：¥{card.price}
                                                        <span className="mx-2">|</span>
                                                        购买日期：{card.purchase_date}
                                                        {card.expiry_date && (
                                                            <>
                                                                <span className="mx-2">|</span>
                                                                有效期至：{card.expiry_date}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColorMap[card.status] || 'bg-gray-100 text-gray-700'}`}>
                                                        {card.status === '有效' ? '🟢' : card.status === '已用完' ? '🟡' : '🔴'} {card.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-400 text-center">
                            💡 共 {(memberCards[viewingMember.id] || []).length} 张卡
                            <span className="mx-2">|</span>
                            🟢 有效 {(memberCards[viewingMember.id] || []).filter(c => c.status === '有效').length} 张
                            <span className="mx-2">|</span>
                            🟡 已用完 {(memberCards[viewingMember.id] || []).filter(c => c.status === '已用完').length} 张
                            <span className="mx-2">|</span>
                            🔴 已过期 {(memberCards[viewingMember.id] || []).filter(c => c.status === '已过期').length} 张
                        </div>

                        {/* ===== 添加会员卡表单（在卡项弹窗底部） ===== */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h4 className="text-md font-bold text-gray-700 mb-3">添加会员卡</h4>
                            <form onSubmit={addCardInDetail} className="grid grid-cols-4 gap-3 items-end">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">选择卡种</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                        name="detailCardTypeId" 
                                        required
                                        onChange={(e) => {
                                            const id = parseInt(e.target.value);
                                            const found = cardTypes.find(ct => ct.id === id);
                                            const totalInput = document.querySelector('input[name="detailTotalCount"]');
                                            const priceInput = document.querySelector('input[name="detailPrice"]');
                                            const expiryInput = document.querySelector('input[name="detailExpiryDate"]');
                                            
                                            if (found) {
                                                if (totalInput) totalInput.value = found.card_category === 'fixed' ? found.total_count : 0;
                                                if (priceInput) priceInput.value = found.price;

                                                // 自动计算有效期
                                                const today = new Date();
                                                let expiryDate = '';
                                                
                                                if (found.card_category === 'fixed') {
                                                    // 次卡：当年年底
                                                    expiryDate = `${today.getFullYear()}-12-31`;
                                                } else if (found.card_category === 'unlimited') {
                                                    // 期限卡：根据卡种名称判断天数
                                                    let days = 0;
                                                    if (found.name.includes('月卡')) days = 30;
                                                    else if (found.name.includes('季卡')) days = 90;
                                                    else if (found.name.includes('年卡')) days = 365;
                                                    else days = 30; // 默认月卡
                                                    
                                                    const expire = new Date(today);
                                                    expire.setDate(expire.getDate() + days);
                                                    expiryDate = expire.toISOString().slice(0, 10);
                                                }
                                                
                                                if (expiryInput) expiryInput.value = expiryDate;

                                            }
                                        }}
                                    >
                                        <option value="">请选择</option>
                                        {cardTypes.filter(ct => ct.status === '启用').map((ct) => (
                                            <option key={ct.id} value={ct.id}>
                                                {ct.name} ({ct.card_category === 'fixed' ? `${ct.total_count}次` : '不限次'} ¥{ct.price})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">总次数</label>
                                    <input 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                        type="number" 
                                        name="detailTotalCount" 
                                        defaultValue="0" 
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">价格(元)</label>
                                    <input 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                        type="number" 
                                        name="detailPrice" 
                                        defaultValue="0" 
                                        min="0"
                                    />
                                </div>
                                <div>
                                {/* <div className="col-span-1">   */}  
                                    <label className="block text-xs font-medium text-gray-600 mb-1">有效期</label>
                                    <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" type="date" name="detailExpiryDate" 
                                    />
                                </div>
                                <div className="col-span-4">
                                    <button type="submit" className="w-full py-2 rounded-lg bg-green-500 hover:bg-green-600 transition text-white font-bold text-sm">
                                        ➕ 添加会员卡
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MembersManagement;
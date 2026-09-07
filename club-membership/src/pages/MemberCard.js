import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';    // QRCode改成{ QRCodeSVG }
// import { QRCodeCanvas } from 'qrcode.react';   // 如果{ QRCodeSVG }还不行，可以用 Canvas 版本（在某些环境下更稳定）
const API_BASE = 'https://dancesyncrecclub-production.up.railway.app';

const MemberCard = () => {
    const navigate = useNavigate();
    const { memberNo } = useParams();
    const [loading, setLoading] = useState(true);
    const [member, setMember] = useState(null);
    const [cards, setCards] = useState([]);
    const [history, setHistory] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);
    const [consumeCount, setConsumeCount] = useState(1);
    const [consuming, setConsuming] = useState(false);
    const [activeTab, setActiveTab] = useState('cards');

    // 检查缓存
    useEffect(() => {
        const cached = localStorage.getItem('clubMember');
        if (!cached) {
            navigate('/scan');
            return;
        }
        try {
            const data = JSON.parse(cached);
            const now = new Date();
            const expire = new Date(data.expireDate);
            if (now > expire) {
                localStorage.removeItem('clubMember');
                navigate('/scan');
                return;
            }
            // 如果URL里的会员编号和缓存的不一致，跳转到缓存对应的
            if (memberNo && memberNo !== data.memberNo) {
                navigate(`/member-card/${data.memberNo}`);
                return;
            }
        } catch (e) {
            localStorage.removeItem('clubMember');
            navigate('/scan');
            return;
        }
        fetchData();
    }, [memberNo]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 获取会员信息和次卡
            const res = await axios.get(`${API_BASE}/api/member-cards/by-no/${memberNo}`);
            if (res.data.code === 0) {
                setMember(res.data.data.member);
                setCards(res.data.data.cards);
            } else {
                alert('获取会员信息失败: ' + res.data.message);
            }

            // 获取消费历史
            const historyRes = await axios.get(`${API_BASE}/api/scan/history/${memberNo}?limit=10`);
            if (historyRes.data.code === 0) {
                setHistory(historyRes.data.data);
            }
        } catch (error) {
            console.error('获取数据失败:', error);
        }
        setLoading(false);
    };

    // 计算缓存剩余时间
    const getCacheRemaining = () => {
        const cached = localStorage.getItem('clubMember');
        if (!cached) return '已过期';
        try {
            const data = JSON.parse(cached);
            const now = new Date();
            const expire = new Date(data.expireDate);
            const diff = Math.floor((expire - now) / (1000 * 60 * 60 * 24));
            if (diff < 0) return '已过期';
            if (diff === 0) return '今天过期';
            return `${diff}天后过期`;
        } catch (e) {
            return '未知';
        }
    };

    // 状态颜色
    const statusColor = (status) => {
        switch(status) {
            case '活跃': return 'bg-green-500 text-white';
            case '冻结': return 'bg-yellow-500 text-white';
            case '过期': return 'bg-red-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    // 点击次卡消费
    const handleConsume = (card) => {
        setSelectedCard(card);
        setConsumeCount(1);
        setShowConfirm(true);
    };

    // 确认消费
    const confirmConsume = async () => {
        if (!selectedCard) return;
        if (consumeCount < 1 || !Number.isInteger(consumeCount)) {
            alert('请输入有效的正整数');
            return;
        }

        // 如果是次卡，检查剩余次数
        if (selectedCard.card_category === 'fixed' && consumeCount > selectedCard.remaining_count) {
            alert(`剩余次数不足！剩余 ${selectedCard.remaining_count} 次`);
            return;
        }

        const msg = selectedCard.card_category === 'unlimited' 
            ? `确认月卡签到？` 
            : `本次将扣除 ${consumeCount} 次，剩余 ${selectedCard.remaining_count - consumeCount} 次，确认？`;

        if (!window.confirm(msg)) return;

        setConsuming(true);
        try {
            const res = await axios.post(`${API_BASE}/api/scan/consume`, {
                memberNo: memberNo,
                cardId: selectedCard.id,
                consumeCount: consumeCount,
                className: '签到',
                source: 'user'
            });
            if (res.data.code === 0) {
                alert(`✅ ${res.data.data.message}`);
                setShowConfirm(false);
                fetchData();
            } else {
                alert('消费失败: ' + res.data.message);
            }
        } catch (error) {
            alert('网络错误，请重试');
        }
        setConsuming(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-xl text-gray-500">⏳ 加载中...</div>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-xl text-gray-500">❌ 会员信息不存在</div>
            </div>
        );
    }

    // 构建二维码URL（前台扫码枪用）
    const qrUrl = `${window.location.origin}/member-card/${member.member_no}`;

    return (
        <div className="min-h-screen bg-gray-100 p-4 pb-20">
            <div className="max-w-lg mx-auto">
                {/* ===== 会员信息卡片 ===== */}
                {/* <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-6 text-white mb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-sm opacity-80">会员编号</div>
                            <div className="text-xl font-mono font-bold">{member.member_no}</div>
                            <div className="text-2xl font-bold mt-1">{member.name}</div>
                            <div className="text-sm opacity-80">{member.phone}</div>
                        </div>
                        <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColor(member.status)}`}>
                                {member.status || '冻结'}
                            </span>
                            <div className="text-sm opacity-80 mt-1">有效期: {member.expiry_date || '未设置'}</div>
                            <div className="text-xs opacity-60 mt-1">缓存: {getCacheRemaining()}</div>
                        </div>
                    </div>
                </div> */}

                {/* ===== 会员信息卡片 ===== */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-6 text-white mb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            {/* 会员编号 */}
                            <div className="text-sm opacity-80">会员编号</div>
                            <div className="text-xl font-mono font-bold">{member.member_no || '未设置'}</div>
                            {/* 姓名 */}
                            <div className="text-2xl font-bold mt-2">{member.name || '未设置'}</div>
                            {/* 昵称 */}
                            <div className="text-sm opacity-80">昵称：{member.nickname || '未设置'}</div>
                            <div className="text-sm opacity-80 mt-1">{member.phone || ''}</div>
                        </div>
                        <div className="text-right">
                            {/* 状态 - 直接使用数据库值 */}
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                member.status === '活跃' ? 'bg-green-500 text-white' :
                                member.status === '冻结' ? 'bg-yellow-500 text-white' :
                                member.status === '过期' ? 'bg-red-500 text-white' :
                                'bg-gray-500 text-white'
                            }`}>
                                {member.status || '冻结'}
                            </span>
                            {/* 有效期 */}
                            <div className="text-sm opacity-80 mt-1">有效期：{member.expiry_date || '未设置'}</div>
                            <div className="text-xs opacity-60 mt-1">缓存：{getCacheRemaining()}</div>
                        </div>
                    </div>
                </div>

                {/* ===== 切换标签 ===== */}
                <div className="flex bg-white rounded-xl shadow-md mb-4">
                    <button
                        className={`flex-1 py-3 text-center rounded-xl font-medium transition ${
                            activeTab === 'cards' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        onClick={() => setActiveTab('cards')}
                    >
                        📋 次卡
                    </button>
                    <button
                        className={`flex-1 py-3 text-center rounded-xl font-medium transition ${
                            activeTab === 'history' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        onClick={() => setActiveTab('history')}
                    >
                        📜 记录
                    </button>
                    <button
                        className={`flex-1 py-3 text-center rounded-xl font-medium transition ${
                            activeTab === 'qrcode' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        onClick={() => setActiveTab('qrcode')}
                    >
                        📱 二维码
                    </button>
                </div>

                {/* ===== 次卡列表 ===== */}
                {activeTab === 'cards' && (
                    <div className="space-y-3">
                        {cards.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-400">
                                🎴 暂无次卡，请联系前台购买
                            </div>
                        ) : (
                            cards.map((card) => (
                                <div key={card.id} className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-lg">{card.name}</div>
                                        {card.card_category === 'fixed' ? (
                                            <div className="text-sm text-gray-600">
                                                剩余: <span className="font-bold text-blue-600">{card.remaining_count}</span> 次
                                                / 已用: {card.used_count} 次
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-600">🔄 期限卡不限次</div>
                                        )}
                                        <div className="text-xs text-gray-400">有效期: {card.expiry_date || '永久'}</div>
                                        <div className="text-xs text-gray-400">购买: {card.purchase_date}</div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs px-2 py-1 rounded ${
                                            card.status === '有效' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {card.status}
                                        </span>
                                        {card.status === '有效' && (
                                            <button
                                                className="block mt-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition"
                                                onClick={() => handleConsume(card)}
                                            >
                                                ✅ 签到
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ===== 消费历史 ===== */}
                {activeTab === 'history' && (
                    <div className="bg-white rounded-xl shadow-md p-4">
                        <h3 className="font-bold text-gray-700 mb-3">📜 最近消费记录</h3>
                        {history.length === 0 ? (
                            <div className="text-center text-gray-400 py-4">暂无消费记录</div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-auto">
                                {history.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center border-b pb-2">
                                        <div>
                                            <div className="font-medium">{item.name || '未知卡'}</div>
                                            <div className="text-xs text-gray-400">{item.consume_date}</div>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">
                                                {item.consume_count > 0 ? `扣${item.consume_count}次` : '月卡签到'}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-2">{item.source === 'user' ? '手机' : '前台'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ===== 二维码（前台扫码枪用） ===== */}
                {activeTab === 'qrcode' && (
                    <div className="bg-white rounded-xl shadow-md p-6 text-center">
                        <h3 className="font-bold text-gray-700 mb-2">📱 我的会员码</h3>
                        <p className="text-sm text-gray-400 mb-4">出示此码给前台扫码签到</p>
                        <div className="flex justify-center">
                            {/* <QRCode
                                value={qrUrl}
                                size={200}
                                level="H"
                                includeMargin={true}
                                bgColor="#ffffff"
                                fgColor="#000000"
                            /> */}
                            <QRCodeSVG  // qrcode.react 的最新版本不再支持 export default，需要改用命名导入
                                value={qrUrl}
                                size={200}
                                level="H"
                                // includeMargin={true}    // 新写法imageSettings={{ excavate: false }}
                                bgColor="#ffffff"
                                fgColor="#000000"
                            // <QRCodeCanvas value={qrUrl} size={200} level="H" includeMargin={true} />
/>
                        </div>
                        <div className="mt-3 font-mono text-sm text-gray-500">{member.member_no}</div>
                        <button
                            className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                            onClick={() => {
                                // 创建包含二维码的截图提示（通过长按保存，浏览器原生支持）
                                alert('长按二维码图片可保存到相册');
                            }}
                        >
                            💾 保存到相册
                        </button>
                        <div className="mt-2 text-xs text-gray-400">
                            提示：可截图保存，也可打印纸质版携带
                        </div>
                    </div>
                )}

                {/* ===== 退出按钮 ===== */}
                <button
                    className="w-full mt-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition"
                    onClick={() => {
                        if (window.confirm('确定要退出吗？下次扫码需要重新验证。')) {
                            localStorage.removeItem('clubMember');
                            navigate('/scan');
                        }
                    }}
                >
                    🚪 退出登录
                </button>

                {/* ===== 消费确认弹窗 ===== */}
                {showConfirm && selectedCard && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">✅ 确认签到</h3>
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">会员</span>
                                    <span className="font-bold">{member.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">次卡</span>
                                    <span className="font-bold">{selectedCard.name}</span>
                                </div>
                                {selectedCard.card_category === 'unlimited' && (
                                    <div className="text-sm text-green-600">🔄 月卡不限次，签到成功</div>
                                )}
                                {selectedCard.card_category === 'fixed' && (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">当前剩余</span>
                                            <span className="font-bold text-blue-600">{selectedCard.remaining_count} 次</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-gray-600">扣除次数</span>
                                            <input
                                                type="number"
                                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={consumeCount}
                                                min="1"
                                                max={selectedCard.remaining_count}
                                                onChange={(e) => setConsumeCount(parseInt(e.target.value) || 1)}
                                            />
                                            <span className="text-sm text-gray-400">次</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-orange-600">
                                            <span>扣除后剩余</span>
                                            <span className="font-bold">{selectedCard.remaining_count - consumeCount} 次</span>
                                        </div>
                                    </>
                                )}
                                {selectedCard.card_category === 'unlimited' && (
                                    <div className="text-sm text-green-600">🔄 期限卡签到成功</div>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
                                    onClick={() => setShowConfirm(false)}
                                    disabled={consuming}
                                >
                                    取消
                                </button>
                                <button
                                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition"
                                    onClick={confirmConsume}
                                    disabled={consuming}
                                >
                                    {consuming ? '处理中...' : '确认消费'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemberCard;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo.png';

const API_BASE = 'https://dancesyncrecclub-production.up.railway.app';

const ScanEntry = () => {
    const navigate = useNavigate();
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [isCodeSent, setIsCodeSent] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checkingCache, setCheckingCache] = useState(true);

    // 检查缓存
    useEffect(() => {
        const cached = localStorage.getItem('clubMember');
        if (cached) {
            try {
                const data = JSON.parse(cached);
                const now = new Date();
                const expire = new Date(data.expireDate);
                if (now <= expire) {
                    // 缓存有效，直接跳转
                    navigate(`/member-card/${data.memberNo}`);
                    return;
                } else {
                    // 缓存过期，清除
                    localStorage.removeItem('clubMember');
                }
            } catch (e) {
                localStorage.removeItem('clubMember');
            }
        }
        setCheckingCache(false);
    }, [navigate]);

    // 发送验证码
    const sendCode = async () => {
        if (!phone || phone.length < 11) {
            setError('请输入正确的手机号');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API_BASE}/api/send-sms`, { phone });
            if (res.data.code === 0) {
                setIsCodeSent(true);
                setCountdown(60);
                const timer = setInterval(() => {
                    setCountdown((prev) => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
                alert('📱 验证码已发送（测试固定码: 1234）');
            } else {
                setError(res.data.message || '发送失败');
            }
        } catch (err) {
            setError('网络错误，请重试');
        }
        setLoading(false);
    };

    // 验证登录
    const verifyLogin = async () => {
        if (!code || code.length < 4) {
            setError('请输入验证码');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API_BASE}/api/verify-login`, { phone, code });
            if (res.data.code === 0) {
                const { member, expireDate } = res.data.data;
                // 保存到缓存
                const cacheData = {
                    id: member.id,
                    memberNo: member.member_no,
                    name: member.name,
                    phone: member.phone,
                    status: member.status,
                    expireDate: expireDate
                };
                localStorage.setItem('clubMember', JSON.stringify(cacheData));
                navigate(`/member-card/${member.member_no}`);
            } else {
                setError(res.data.message || '验证失败');
            }
        } catch (err) {
            setError('网络错误，请重试');
        }
        setLoading(false);
    };

    if (checkingCache) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-xl text-gray-500">⏳ 加载中...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <div className="text-center mb-6">
                    {/* <div className="text-5xl mb-2">🎭</div> */}
                    <img 
                        src={logo} 
                        alt="星发舞蹈俱乐部"
                        className="w-32 h-32 mb-3 mx-auto object-cover" 
                    />
                    <h1 className="text-2xl font-bold text-gray-800">星发舞蹈俱乐部</h1>
                    <p className="text-gray-500 text-sm">请验证您的身份</p>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                        <input
                            type="tel"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="请输入手机号"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            disabled={isCodeSent}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="请输入验证码"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                disabled={!isCodeSent}
                            />
                            <button
                                className={`px-4 py-3 rounded-lg text-white font-medium whitespace-nowrap transition ${
                                    isCodeSent || loading
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                                onClick={sendCode}
                                disabled={isCodeSent || loading}
                            >
                                {countdown > 0 ? `${countdown}s` : (isCodeSent ? '已发送' : '获取验证码')}
                            </button>
                        </div>
                        {isCodeSent && (
                            <p className="text-xs text-gray-400 mt-1">测试固定验证码: <span className="font-bold text-blue-600">1234</span></p>
                        )}
                    </div>

                    <button
                        className="w-full py-4 bg-green-500 hover:bg-green-600 transition text-white font-bold text-lg rounded-lg"
                        onClick={verifyLogin}
                        disabled={loading || !isCodeSent}
                    >
                        {loading ? '验证中...' : '✅ 验证并进入'}
                    </button>

                    <p className="text-xs text-gray-400 text-center mt-2">
                        验证后下次扫码自动进入，无需重复操作
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ScanEntry;
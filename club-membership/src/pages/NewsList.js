import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';

const API_BASE = 'http://localhost:3001';
// const API_BASE = 'https://dancesyncrecclub-production.up.railway.app';

const NewsList = () => {
    const navigate = useNavigate();
    const [newsList, setNewsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('');

    const categories = ['全部', '公告', '活动', '课程', '通知', '其他'];

    const fetchNews = async (cat) => {
        setLoading(true);
        try {
            const url = cat && cat !== '全部'
                ? `${API_BASE}/api/news?limit=100&category=${cat}`
                : `${API_BASE}/api/news?limit=100`;
            const res = await axios.get(url);
            if (res.data.code === 0) {
                setNewsList(res.data.data || []);
            }
        } catch (err) {
            console.error('获取新闻失败:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchNews(category);
    }, [category]);

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <Navbar />

            {/* 标题栏 */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-10">
                <div className="max-w-6xl mx-auto">
                    <button
                        onClick={() => navigate('/')}
                        className="text-sm opacity-80 hover:opacity-100 mb-4"
                    >
                        ← 返回首页
                    </button>
                    <h1 className="text-4xl font-bold">📰 新闻动态</h1>
                    <p className="text-sm opacity-80 mt-2">了解俱乐部最新活动和通知</p>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-8 py-8">
                {/* 分类筛选 */}
                <div className="flex gap-3 mb-8 flex-wrap">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat === '全部' ? '' : cat)}
                            className={`px-5 py-2 rounded-full font-medium transition ${
                                (cat === '全部' && !category) || category === cat
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* 新闻列表 */}
                {loading ? (
                    <div className="text-center py-20 text-gray-400">⏳ 加载中...</div>
                ) : newsList.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">📭 暂无新闻</div>
                ) : (
                    <div className="grid grid-cols-3 gap-6">
                        {newsList.map((item) => (
                            <Link
                                key={item.id}
                                to={`/news/${item.id}`}
                                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
                            >
                                <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 relative overflow-hidden">
                                    {item.cover_image ? (
                                        <img
                                            src={`${API_BASE}${item.cover_image}`}
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white text-5xl">
                                            📰
                                        </div>
                                    )}
                                    {item.is_top === 1 && (
                                        <span className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded">
                                            📌 置顶
                                        </span>
                                    )}
                                    <span className="absolute top-3 right-3 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                        {item.category}
                                    </span>
                                </div>

                                <div className="p-5">
                                    <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                                        {item.summary}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>📅 {item.publish_date}</span>
                                        <span>👁 {item.views} · ❤️ {item.likes}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
};

export default NewsList;
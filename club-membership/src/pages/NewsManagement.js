import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';

// const API_BASE = 'http://localhost:3001';
// const API_BASE = 'https://dancesyncrecclub-production.up.railway.app';
const API_BASE = process.env.REACT_APP_API_URL;

const NewsManagement = () => {
    const navigate = useNavigate();
    const [newsList, setNewsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const fetchNews = async () => {
        setLoading(true);
        try {
            // const res = await axios.get(`${API_BASE}/api/news?limit=100&status=已发布`);
            // const res = await axios.get(`${API_BASE}/api/news?limit=100`);
            let url = `${API_BASE}/api/news?limit=100`;
            if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
            if (categoryFilter) url += `&category=${encodeURIComponent(categoryFilter)}`;
            const res = await axios.get(url);

            if (res.data.code === 0) {
                setNewsList(res.data.data || []);
            }
        } catch (err) {
            console.error('获取新闻失败:', err);
        }
        setLoading(false);
    };

    // useEffect(() => {
    //     fetchNews();
    // }, []);
    useEffect(() => {
        fetchNews();
    }, [statusFilter, categoryFilter]);

    const handleDelete = async (id, title) => {
        if (!window.confirm(`确定删除新闻 "${title}" 吗？`)) return;
        try {
            const res = await axios.delete(`${API_BASE}/api/news/${id}`);
            if (res.data.code === 0) {
                await fetchNews();
                alert('✅ 删除成功');
            } else {
                alert('删除失败: ' + res.data.message);
            }
        } catch (err) {
            alert('网络错误');
        }
    };

    const filtered = newsList.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <Navbar />

            <div className="bg-gray-800 text-white px-8 py-4 flex-shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">📰 新闻管理</h1>
                    <p className="text-gray-400 text-sm">管理所有新闻内容</p>
                </div>
                <button
                    onClick={() => navigate('/admin')}
                    className="px-6 py-2 bg-slate-500 hover:bg-slate-600 rounded-lg transition"
                >
                    ⬅ 返回
                </button>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
                {/* 工具栏 */}
                {/* <div className="flex items-center justify-between mb-6">
                    <input
                        type="text"
                        placeholder="搜索标题..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Link
                        to="/admin/news/new"
                        className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition"
                    >
                        ➕ 发布新闻
                    </Link>
                </div> */}

                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            placeholder="搜索标题..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">全部状态</option>
                            <option value="已发布">已发布</option>
                            <option value="草稿">草稿</option>
                            <option value="已下架">已下架</option>
                        </select>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">全部分类</option>
                            <option value="公告">公告</option>
                            <option value="活动">活动</option>
                            <option value="课程">课程</option>
                            <option value="通知">通知</option>
                            <option value="其他">其他</option>
                        </select>
                        {(statusFilter || categoryFilter || search) && (
                            <button
                                onClick={() => {
                                    setStatusFilter('');
                                    setCategoryFilter('');
                                    setSearch('');
                                }}
                                className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
                            >
                                ✕ 清除筛选
                            </button>
                        )}
                    </div>
                    <Link
                        to="/admin/news/new"
                        className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition"
                    >
                        ➕ 发布新闻
                    </Link>
                </div>

                {/* 新闻列表 */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    {loading ? (
                        <div className="text-center py-12 text-gray-400">⏳ 加载中...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">📭 暂无新闻</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 text-left text-sm font-bold text-gray-600">标题</th>
                                    <th className="p-4 text-center text-sm font-bold text-gray-600 w-24">分类</th>
                                    <th className="p-4 text-center text-sm font-bold text-gray-600 w-24">状态</th>
                                    <th className="p-4 text-center text-sm font-bold text-gray-600 w-20">置顶</th>
                                    <th className="p-4 text-center text-sm font-bold text-gray-600 w-20">浏览</th>
                                    <th className="p-4 text-center text-sm font-bold text-gray-600 w-20">点赞</th>
                                    <th className="p-4 text-center text-sm font-bold text-gray-600 w-32">发布时间</th>
                                    <th className="p-4 text-center text-sm font-bold text-gray-600 w-40">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((item) => (
                                    <tr key={item.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-800">{item.title}</div>
                                            <div className="text-xs text-gray-400 truncate">{item.summary}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-sm">{item.status || '已发布'}</td>
                                        <td className="p-4 text-center">
                                            {item.is_top === 1 ? '📌' : '-'}
                                        </td>
                                        <td className="p-4 text-center text-sm">👁 {item.views}</td>
                                        <td className="p-4 text-center text-sm">❤️ {item.likes}</td>
                                        <td className="p-4 text-center text-sm text-gray-500">
                                            {item.publish_date}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center gap-2">
                                                <Link
                                                    to={`/news/${item.id}`}
                                                    target="_blank"
                                                    className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs"
                                                >
                                                    预览
                                                </Link>
                                                <Link
                                                    to={`/admin/news/${item.id}/edit`}
                                                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
                                                >
                                                    编辑
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(item.id, item.title)}
                                                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                                                >
                                                    删除
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default NewsManagement;
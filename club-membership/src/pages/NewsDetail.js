import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';

// const API_BASE = 'http://localhost:3001';
const API_BASE = 'https://dancesyncrecclub-production.up.railway.app';

const NewsDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [news, setNews] = useState(null);
    const [comments, setComments] = useState([]);
    const [likesList, setLikesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [commentContent, setCommentContent] = useState('');
    const [isLiked, setIsLiked] = useState(false);

    // 获取当前用户
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isLoggedIn = user.isAuthenticated;
    const username = user.username || '';

    const fetchNews = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/api/news/${id}`);
            if (res.data.code === 0) {
                setNews(res.data.data);
            }
        } catch (err) {
            console.error('获取新闻失败:', err);
        }
        setLoading(false);
    };

    const fetchComments = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/news/${id}/comments`);
            if (res.data.code === 0) {
                setComments(res.data.data || []);
            }
        } catch (err) {
            console.error('获取评论失败:', err);
        }
    };

    const fetchLikes = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/news/${id}/likes`);
            if (res.data.code === 0) {
                const list = res.data.data || [];
                setLikesList(list);
                setIsLiked(list.some(item => item.username === username));
            }
        } catch (err) {
            console.error('获取点赞失败:', err);
        }
    };

    useEffect(() => {
        fetchNews();
        fetchComments();
        fetchLikes();
    }, [id]);

    // 发表评论
    const submitComment = async (e) => {
        e.preventDefault();
        if (!isLoggedIn) {
            alert('请先登录后再评论');
            navigate('/login');
            return;
        }
        if (!commentContent.trim()) {
            alert('请输入评论内容');
            return;
        }
        try {
            const res = await axios.post(`${API_BASE}/api/news/${id}/comments`, {
                user_role: user.role,
                username: username,
                content: commentContent
            });
            if (res.data.code === 0) {
                setCommentContent('');
                fetchComments();
            } else {
                alert('评论失败: ' + res.data.message);
            }
        } catch (err) {
            alert('网络错误');
        }
    };

    // 点赞
    const toggleLike = async () => {
        if (!isLoggedIn) {
            alert('请先登录后再点赞');
            navigate('/login');
            return;
        }
        try {
            const res = await axios.post(`${API_BASE}/api/news/${id}/like`, {
                username: username
            });
            if (res.data.code === 0) {
                fetchNews();
                fetchLikes();
            }
        } catch (err) {
            alert('网络错误');
        }
    };

    // 删除评论（管理员）
    const deleteComment = async (commentId) => {
        if (!window.confirm('确定删除这条评论吗？')) return;
        try {
            const res = await axios.delete(`${API_BASE}/api/comments/${commentId}`);
            if (res.data.code === 0) {
                fetchComments();
            }
        } catch (err) {
            alert('删除失败');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-xl text-gray-400">⏳ 加载中...</div>
            </div>
        );
    }

    if (!news) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-xl text-gray-400">❌ 新闻不存在</div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <Navbar />

            {/* 顶部返回 */}
            <div className="max-w-4xl mx-auto w-full px-6 pt-6">
                <button
                    onClick={() => navigate('/news')}
                    className="text-gray-500 hover:text-blue-600 transition flex items-center gap-2"
                >
                    ← 返回列表
                </button>
            </div>

            {/* 文章主体 */}
            <article className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* 封面图 */}
                    {news.cover_image && (
                        <div className="w-full h-80 overflow-hidden">
                            <img
                                src={`${API_BASE}${news.cover_image}`}
                                alt={news.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    <div className="p-10">
                        {/* 标题 */}
                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                            {news.is_top === 1 && (
                                <span className="bg-red-500 text-white text-sm px-3 py-1 rounded-full">
                                    📌 置顶
                                </span>
                            )}
                            <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full">
                                {news.category}
                            </span>
                        </div>

                        <h1 className="text-4xl font-bold text-gray-800 mb-6 leading-tight">
                            {news.title}
                        </h1>

                        {/* 元信息 */}
                        <div className="flex items-center gap-6 text-sm text-gray-500 pb-6 border-b border-gray-200 mb-8">
                            <span>✍️ {news.author}</span>
                            <span>📅 {news.publish_date}</span>
                            <span>👁 {news.views} 次浏览</span>
                            <span>❤️ {news.likes} 个赞</span>
                        </div>

                        {/* 正文 */}
                        {/* <div
                            className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: news.content }}
                        /> */}
                        <div className="news-content" dangerouslySetInnerHTML={{ __html: news.content }} />

                        {/* 点赞按钮 */}
                        <div className="flex justify-center mt-10">
                            <button
                                onClick={toggleLike}
                                className={`px-8 py-3 rounded-full font-bold text-lg transition flex items-center gap-2 ${
                                    isLiked
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-red-100'
                                }`}
                            >
                                {isLiked ? '❤️ 已点赞' : '🤍 点赞'} ({news.likes})
                            </button>
                        </div>

                        {/* 点赞人列表 */}
                        {likesList.length > 0 && (
                            <div className="mt-4 text-center text-sm text-gray-500">
                                ❤️ {likesList.map(l => l.username).join('、')} 觉得很赞
                            </div>
                        )}
                    </div>
                </div>

                {/* 评论区 */}
                <div className="bg-white rounded-2xl shadow-lg mt-8 p-10">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">
                        💬 评论 ({comments.length})
                    </h2>

                    {/* 发表评论 */}
                    {isLoggedIn ? (
                        <form onSubmit={submitComment} className="mb-8">
                            <textarea
                                className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                rows="3"
                                placeholder="说点什么..."
                                value={commentContent}
                                onChange={(e) => setCommentContent(e.target.value)}
                            />
                            <div className="flex justify-between items-center mt-3">
                                <span className="text-sm text-gray-400">当前身份：{user.role} · {username}</span>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                                >
                                    发表评论
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="mb-8 p-4 bg-gray-50 rounded-xl text-center text-gray-500">
                            请先 <Link to="/login" className="text-blue-600 font-medium">登录</Link> 后发表评论
                        </div>
                    )}

                    {/* 评论列表 */}
                    {comments.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">暂无评论，来说两句吧</div>
                    ) : (
                        <div className="space-y-4">
                            {comments.map((comment) => (
                                <div key={comment.id} className="border-b border-gray-100 pb-4 last:border-0">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-gray-700">{comment.username}</span>
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                {comment.user_role}
                                            </span>
                                            <span className="text-xs text-gray-400">{comment.created_at}</span>
                                        </div>
                                        {user.role === 'admin' && (
                                            <button
                                                onClick={() => deleteComment(comment.id)}
                                                className="text-red-400 hover:text-red-600 text-sm"
                                            >
                                                删除
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-gray-700">{comment.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </article>

            <Footer />
        </div>
    );
};

export default NewsDetail;
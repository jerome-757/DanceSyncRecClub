import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';

import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Quill from 'quill';
import ImageUploader from 'quill-image-uploader';

// 注册图片上传模块
Quill.register('modules/imageUploader', ImageUploader);

// const API_BASE = 'http://localhost:3001';
// const API_BASE = 'https://dancesyncrecclub-production.up.railway.app';
const API_BASE = process.env.REACT_APP_API_URL;

const modules = {
    toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
    ],
    imageUploader: {
        upload: (file) => {
            return new Promise((resolve, reject) => {
                const formData = new FormData();
                formData.append('cover', file);
                axios.post(`${API_BASE}/api/news/upload`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                .then(res => {
                    if (res.data.code === 0) {
                        resolve(`${API_BASE}${res.data.data.url}`);
                    } else {
                        reject('上传失败');
                    }
                })
                .catch(err => reject('网络错误'));
            });
        }
    }
};


const NewsEditor = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [form, setForm] = useState({
        title: '',
        content: '',
        summary: '',
        cover_image: '',
        category: '公告',
        tags: '',
        is_top: 0,
        status: '已发布',
        publish_date: new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10),
        author: 'admin'
    });
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    const categories = ['公告', '活动', '课程', '通知', '其他'];

    useEffect(() => {
        if (isEdit) {
            axios.get(`${API_BASE}/api/news/${id}`)
                .then(res => {
                    if (res.data.code === 0) {
                        setForm(res.data.data);
                    }
                })
                .catch(err => console.error('获取新闻失败:', err));
        }
    }, [id]);

    useEffect(() => {
        const handlePaste = (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                e.stopPropagation();
                    alert('请使用工具栏的 🖼️ 图片按钮上传图片，不支持粘贴');
                    return;
                }
            }
        };

    document.addEventListener('paste', handlePaste, true);  // ← true 表示捕获阶段
    return () => document.removeEventListener('paste', handlePaste, true);
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({ ...form, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value });
    };

    // 上传封面图
    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('cover', file);

        try {
            const res = await axios.post(`${API_BASE}/api/news/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.code === 0) {
                setForm({ ...form, cover_image: res.data.data.url });
            } else {
                alert('上传失败: ' + res.data.message);
            }
        } catch (err) {
            console.error('上传失败:', err);
            alert('上传失败');
        }
        setUploading(false);
    };

    // 提交
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            alert('请输入标题');
            return;
        }
        setSaving(true);
        try {
            const url = isEdit
                ? `${API_BASE}/api/news/${id}`
                : `${API_BASE}/api/news`;
            const method = isEdit ? 'put' : 'post';
            const res = await axios[method](url, form);
            if (res.data.code === 0) {
                alert(isEdit ? '✅ 更新成功' : '✅ 发布成功');
                navigate('/admin/news');
            } else {
                alert('保存失败: ' + res.data.message);
            }
        } catch (err) {
            alert('网络错误');
        }
        setSaving(false);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <Navbar />

            <div className="bg-gray-800 text-white px-8 py-4 flex-shrink-0 flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                    {isEdit ? '✏️ 编辑新闻' : '📝 发布新闻'}
                </h1>
                <button
                    onClick={() => navigate('/admin/news')}
                    className="px-6 py-2 bg-slate-500 hover:bg-slate-600 rounded-lg transition"
                >
                    ⬅ 返回
                </button>
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
                    {/* 标题 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">标题 *</label>
                        <input
                            type="text"
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="请输入新闻标题"
                            required
                        />
                    </div>

                    {/* 摘要 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">摘要</label>
                        <textarea
                            name="summary"
                            value={form.summary}
                            onChange={handleChange}
                            rows="2"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="一句话概括新闻内容（列表页显示）"
                        />
                    </div>

                    {/* 封面图 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">封面图</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleUpload}
                                className="hidden"
                                id="cover-upload"
                            />
                            <label
                                htmlFor="cover-upload"
                                className="px-5 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition"
                            >
                                {uploading ? '上传中...' : '📷 选择图片'}
                            </label>
                            {form.cover_image && (
                                <div className="flex items-center gap-3">
                                    <img
                                        src={`${API_BASE}${form.cover_image}`}
                                        alt="封面"
                                        className="w-24 h-16 object-cover rounded-lg border"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, cover_image: '' })}
                                        className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                        移除
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 分类、标签 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
                            <select
                                name="category"
                                value={form.category}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">标签</label>
                            <input
                                type="text"
                                name="tags"
                                value={form.tags}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="多个标签用逗号分隔"
                            />
                        </div>
                    </div>

                    {/* 正文 */}
                    {/* <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">正文 *</label>
                        <textarea
                            name="content"
                            value={form.content}
                            onChange={handleChange}
                            rows="15"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="支持 HTML 标签，如 <p>段落</p>、<strong>加粗</strong>、<img src='...' />"
                        />
                        <p className="text-xs text-gray-400 mt-1">暂用 HTML 编辑，支持 &lt;p&gt;、&lt;strong&gt;、&lt;img&gt; 等标签</p>
                    </div> */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">正文 *</label>
                        <ReactQuill
                            theme="snow"
                            value={form.content}
                            onChange={(value) => setForm({ ...form, content: value })}
                            modules={modules}
                            placeholder="开始写新闻内容..."
                            className="bg-white rounded-lg"
                        />
                    </div>

                    {/* 发布设置 */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">发布日期</label>
                            <input
                                type="date"
                                name="publish_date"
                                value={form.publish_date}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="已发布">已发布</option>
                                <option value="草稿">草稿</option>
                                <option value="已下架">已下架</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">置顶</label>
                            <div className="flex items-center h-12">
                                <input
                                    type="checkbox"
                                    name="is_top"
                                    checked={form.is_top === 1}
                                    onChange={handleChange}
                                    className="w-5 h-5"
                                    id="is-top"
                                />
                                <label htmlFor="is-top" className="ml-2 text-gray-700 cursor-pointer">
                                    📌 置顶这条新闻
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* 按钮 */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/admin/news')}
                            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition disabled:opacity-50"
                        >
                            {saving ? '保存中...' : (isEdit ? '💾 保存修改' : '✅ 发布新闻')}
                        </button>
                    </div>
                </form>
            </div>

            <Footer />
        </div>
    );
};

export default NewsEditor;
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, getDay } from 'date-fns';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL;

const PracticeCalendar = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin';
    const isCoach = user.role === 'coach';
    const isMember = user.role === 'member';

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [courses, setCourses] = useState([]);
    const [locations, setLocations] = useState([]);
    const [coaches, setCoaches] = useState([]);
    const [myBookings, setMyBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showDayPopup, setShowDayPopup] = useState(false);
    const [showCoursePopup, setShowCoursePopup] = useState(false);
    const [showLocationPopup, setShowLocationPopup] = useState(false);
    const [showBookingsPopup, setShowBookingsPopup] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [editingCourse, setEditingCourse] = useState(null);
    const [viewingCourse, setViewingCourse] = useState(null);
    const [bookingList, setBookingList] = useState([]);

    const startMonth = startOfMonth(currentMonth);
    const endMonth = endOfMonth(currentMonth);
    const daysArray = eachDayOfInterval({ start: startMonth, end: endMonth });
    const firstDayWeekday = getDay(startMonth);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const start = format(startMonth, 'yyyy-MM-dd');
            const end = format(endMonth, 'yyyy-MM-dd');
            let url = `${API_BASE}/api/schedule?start=${start}&end=${end}`;
            if (isCoach) url += `&coach=${user.username}`;
            const res = await axios.get(url);
            if (res.data.code === 0) setCourses(res.data.data || []);
        } catch (err) {
            console.error('获取课程失败:', err);
        }
        setLoading(false);
    };

    const fetchLocations = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/locations`);
            if (res.data.code === 0) setLocations(res.data.data || []);
        } catch (err) {
            console.error('获取地点失败:', err);
        }
    };

    const fetchCoaches = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/coachs`);
            if (res.data.code === 0) setCoaches(res.data.data || []);
        } catch (err) {
            console.error('获取教练失败:', err);
        }
    };

    const fetchMyBookings = async () => {
        if (!isMember) return;
        const memberId = user.memberId || user.id || user.username;
        try {
            const res = await axios.get(`${API_BASE}/api/member/${memberId}/bookings`);
            if (res.data.code === 0) setMyBookings(res.data.data || []);
        } catch (err) {
            console.error('获取我的预约失败:', err);
        }
    };

    useEffect(() => {
        fetchCourses();
        fetchLocations();
        fetchCoaches();
        fetchMyBookings();
    }, [currentMonth]);

    const isWithinNext10Days = (day) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(day);
        d.setHours(0, 0, 0, 0);
        const diff = Math.floor((d - today) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff < 10;
    };

    const canSeeCourses = (day) => {
        if (isAdmin) return true;
        return isWithinNext10Days(day);
    };

    const isBooked = (scheduleId) => myBookings.some(b => b.schedule_id === scheduleId);

    const handleDayClick = (day) => {
        if (!isAdmin && !canSeeCourses(day)) {
            alert('只能查看最近 10 天的排课');
            return;
        }
        setSelectedDate(format(day, 'yyyy-MM-dd'));
        setShowDayPopup(true);
    };

    const handleBook = async (course) => {
        if (!user.isAuthenticated) {
            alert('请先登录');
            navigate('/login');
            return;
        }
        if (!window.confirm(`确认预约【${course.class_name}】？`)) return;
        try {
            const res = await axios.post(`${API_BASE}/api/schedule/${course.id}/book`, {
                member_id: user.memberId || user.id || user.username,
                member_name: user.username
            });
            if (res.data.code === 0) {
                alert('✅ ' + res.data.data.message);
                fetchCourses();
                fetchMyBookings();
            } else {
                alert('预约失败: ' + res.data.message);
            }
        } catch (err) {
            alert('网络错误');
        }
    };

    const handleCancelBook = async (course) => {
        if (!window.confirm(`确认取消预约【${course.class_name}】？`)) return;
        try {
            const res = await axios.delete(`${API_BASE}/api/schedule/${course.id}/book`, {
                data: { member_id: user.memberId || user.id || user.username }
            });
            if (res.data.code === 0) {
                alert('✅ 已取消预约');
                fetchCourses();
                fetchMyBookings();
            }
        } catch (err) {
            alert('网络错误');
        }
    };

    const handleDeleteCourse = async (id) => {
        if (!window.confirm('确定取消这节课吗？')) return;
        try {
            const res = await axios.delete(`${API_BASE}/api/schedule/${id}`);
            if (res.data.code === 0) {
                alert('✅ 课程已取消');
                fetchCourses();
                setShowDayPopup(false);
            }
        } catch (err) {
            alert('操作失败');
        }
    };

    const handleViewBookings = async (course) => {
        setViewingCourse(course);
        try {
            const res = await axios.get(`${API_BASE}/api/schedule/${course.id}/bookings`);
            if (res.data.code === 0) {
                setBookingList(res.data.data || []);
                setShowBookingsPopup(true);
            }
        } catch (err) {
            alert('查询失败');
        }
    };

    const getDayCourses = (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return courses.filter(c => c.date === dateStr);
    };

    const selectedCourses = selectedDate
        ? courses.filter(c => c.date === selectedDate)
        : [];

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <Navbar />

            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-6">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <button
                            onClick={() => navigate(-1)}
                            className="text-sm opacity-80 hover:opacity-100 mb-2"
                        >
                            ← 返回
                        </button>
                        <h1 className="text-3xl font-bold">📅 练习日程</h1>
                        <p className="text-sm opacity-80 mt-1">
                            {isAdmin ? '查看和管理所有课程' : '未来 10 天的课程安排'}
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setShowLocationPopup(true)}
                            className="px-5 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-medium transition"
                        >
                            📍 管理地点
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
                {loading ? (
                    <div className="text-center py-20 text-gray-400">⏳ 加载中...</div>
                ) : (
                    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between py-4 px-6">
                            <button
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                className="text-gray-600 hover:text-gray-800 transition text-lg font-medium"
                            >
                                Previous
                            </button>
                            <span className="text-xl font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
                            <button
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                className="text-gray-600 hover:text-gray-800 transition text-lg font-medium"
                            >
                                Next
                            </button>
                        </div>

                        <div className="grid grid-cols-7 border-b">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-3 text-md font-semibold text-center">{day}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-3 p-4 text-lg">
                            {Array(firstDayWeekday).fill(null).map((_, i) => (
                                <div key={`empty-${i}`} className="h-32"></div>
                            ))}

                            {daysArray.map((day, i) => {
                                const dayCourses = getDayCourses(day);
                                const isGreen = isWithinNext10Days(day);
                                const visibleCourses = canSeeCourses(day) ? dayCourses : [];
                                const showCourses = visibleCourses.slice(0, 3);
                                const hasMore = visibleCourses.length > 3;

                                return (
                                    <div
                                        key={i}
                                        className={`h-32 flex flex-col p-2 rounded-lg border border-gray-200 text-center relative ${
                                            isToday(day) ? 'bg-blue-200' : 'bg-gray-50'
                                        } ${(isAdmin || visibleCourses.length > 0) ? 'cursor-pointer hover:shadow-md' : ''}`}
                                        onClick={() => {
                                            if (isAdmin) {
                                                handleDayClick(day);
                                            } else if (visibleCourses.length > 0) {
                                                handleDayClick(day);
                                            }
                                        }}
                                    >
                                        <span className={`font-bold ${isGreen ? 'text-green-600' : 'text-gray-700'}`}>
                                            {format(day, 'd')}
                                        </span>

                                        <div className="flex-1 flex flex-col justify-center overflow-hidden">
                                            {showCourses.map((c, idx) => (
                                                <div key={idx} className="text-xs text-blue-700 truncate leading-tight">
                                                    {c.class_name}-{c.coach_name || '未指定'}
                                                </div>
                                            ))}
                                        </div>

                                        {hasMore && (
                                            <span className="absolute bottom-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <Footer />

            {showDayPopup && selectedDate && (
                <DayCoursesPopup
                    date={selectedDate}
                    courses={selectedCourses}
                    isAdmin={isAdmin}
                    isCoach={isCoach}
                    isMember={isMember}
                    isPast={(() => {
                        if (!selectedDate) return false;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const d = new Date(selectedDate + 'T00:00:00');
                        return d < today;
                    })()}
                    isBooked={isBooked}
                    onBook={handleBook}
                    onCancelBook={handleCancelBook}
                    onDelete={handleDeleteCourse}
                    onViewBookings={handleViewBookings}
                    onEdit={(course) => { setEditingCourse(course); setShowCoursePopup(true); }}
                    onAdd={() => { setEditingCourse(null); setShowCoursePopup(true); }}
                    onClose={() => setShowDayPopup(false)}
                />
            )}

            {showCoursePopup && (
                <CoursePopup
                    course={editingCourse}
                    defaultDate={selectedDate}
                    locations={locations}
                    coaches={coaches}
                    onClose={() => { setShowCoursePopup(false); setEditingCourse(null); }}
                    onSuccess={() => { setShowCoursePopup(false); setEditingCourse(null); fetchCourses(); }}
                />
            )}

            {showLocationPopup && (
                <LocationPopup
                    locations={locations}
                    onClose={() => setShowLocationPopup(false)}
                    onSuccess={fetchLocations}
                />
            )}

            {showBookingsPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowBookingsPopup(false)}>
                    <div className="bg-white rounded-2xl p-6 w-[500px] max-w-[95%] max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">📋 {viewingCourse?.class_name} 预约名单</h2>
                            <button onClick={() => setShowBookingsPopup(false)} className="text-red-500 text-3xl leading-none">&times;</button>
                        </div>
                        <div className="text-sm text-gray-500 mb-4">
                            {viewingCourse?.date} {viewingCourse?.start_time} - {viewingCourse?.end_time}
                        </div>
                        {bookingList.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">暂无预约</div>
                        ) : (
                            <div className="space-y-2">
                                {bookingList.map((b, i) => (
                                    <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                                        <span className="font-medium">{i + 1}. {b.member_name}</span>
                                        <span className="text-xs text-gray-400">{b.created_at}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================
// 当天课程弹窗
// ============================================================
const DayCoursesPopup = ({
    date, courses, isAdmin, isCoach, isMember, isPast,
    isBooked, onBook, onCancelBook, onDelete, onViewBookings, onEdit, onAdd, onClose
}) => {

    const todayStr = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
})();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div className="bg-white rounded-2xl p-6 w-[650px] max-w-[95%] max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">📅 {date} 的课程</h2>
                    <button onClick={onClose} className="text-red-500 text-3xl leading-none">&times;</button>
                </div>

                {courses.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">当天暂无课程</div>
                ) : (
                    <div className="space-y-3">
                        {courses.map(course => {
                            const isFull = course.booked_count >= course.max_capacity;
                            const booked = isBooked(course.id);
                            return (
                                <div key={course.id} className="border rounded-xl p-4 hover:bg-gray-50">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-bold text-lg">{course.class_name}</span>
                                        {isFull && !booked && (
                                            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">已满·可候补</span>
                                        )}
                                        {booked && (
                                            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">✅ 已预约</span>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center gap-4 flex-wrap mb-3">
                                        <span>🕐 {course.start_time} - {course.end_time}</span>
                                        {course.coach_name && <span>👤 {course.coach_name}</span>}
                                        {course.location && <span>📍 {course.location}</span>}
                                        <span>👥 {course.booked_count}/{course.max_capacity}</span>
                                    </div>
                                    {course.notes && <div className="text-xs text-gray-400 mb-3">📝 {course.notes}</div>}

                                    <div className="flex gap-2 flex-wrap">
                                        {isMember && (
                                            booked ? (
                                                <button onClick={() => onCancelBook(course)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium">
                                                    取消预约
                                                </button>
                                            ) : (
                                                <button onClick={() => onBook(course)} className={`px-4 py-2 rounded-lg text-sm font-bold text-white ${isFull ? 'bg-orange-400 hover:bg-orange-500' : 'bg-green-500 hover:bg-green-600'}`}>
                                                    {isFull ? '候补预约' : '预约'}
                                                </button>
                                            )
                                        )}
                                        {(isAdmin || isCoach) && (
                                            <button onClick={() => onViewBookings(course)} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm">
                                                名单
                                            </button>
                                        )}
                                        {/* {isAdmin && (
                                            <>
                                                <button onClick={() => onEdit(course)} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm">
                                                    编辑
                                                </button>
                                                <button onClick={() => onDelete(course.id)} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm">
                                                    删除
                                                </button>
                                            </>
                                        )} */}
                                        {isAdmin && (
                                            <>
                                                <button
                                                    onClick={() => onEdit(course)}
                                                    disabled={course.date < todayStr}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                                        course.date < todayStr
                                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                            : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                                    }`}
                                                >
                                                    编辑
                                                </button>
                                                <button
                                                    onClick={() => onDelete(course.id)}
                                                    disabled={course.date < todayStr}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                                        course.date < todayStr
                                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                            : 'bg-red-500 hover:bg-red-600 text-white'
                                                    }`}
                                                >
                                                    删除
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {isAdmin && (
                    <button
                        onClick={onAdd}
                        disabled={isPast}
                        className={`w-full mt-5 py-3 rounded-lg font-bold transition ${
                            isPast
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                    >
                        ➕ 添加课程
                    </button>
                )}
            </div>
        </div>
    );
};

// ============================================================
// 添加/编辑课程弹窗
// ============================================================
const CoursePopup = ({ course, defaultDate, locations, coaches, onClose, onSuccess }) => {
    const isEdit = !!course;
    const [form, setForm] = useState({
        repeat_type: 'none', // weekly   none
        dates: [],
        start_date: defaultDate || '',
        repeat_count: 10,
        start_time: course?.start_time || '19:00',
        end_time: course?.end_time || '20:00',
        class_name: course?.class_name || '',
        coach_name: course?.coach_name || '',
        location: course?.location || '',
        max_capacity: course?.max_capacity || 30,
        notes: course?.notes || ''
    });
    const [saving, setSaving] = useState(false);
    const [manualCoach, setManualCoach] = useState(false);
    const [pickerMonth, setPickerMonth] = useState(defaultDate ? new Date(defaultDate) : new Date());

    // 3 个月内限制
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + 3);

    const isDateDisabled = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        if (d < today) return true;
        if (d > maxDate) return true;
        return false;
    };

    const pickerStart = startOfMonth(pickerMonth);
    const pickerEnd = endOfMonth(pickerMonth);
    const pickerDays = eachDayOfInterval({ start: pickerStart, end: pickerEnd });
    const pickerFirstWeekday = getDay(pickerStart);

    const toggleDate = (dateStr) => {
        setForm(prev => ({
            ...prev,
            dates: prev.dates.includes(dateStr)
                ? prev.dates.filter(d => d !== dateStr)
                : [...prev.dates, dateStr]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.class_name.trim()) { alert('请输入课程名'); return; }
        if (!isEdit && form.repeat_type === 'none' && form.dates.length === 0) { alert('请选择至少一个日期'); return; }
        if (!isEdit && form.repeat_type === 'weekly' && !form.start_date) { alert('请选择起始日期'); return; }
        if (form.start_time >= form.end_time) { alert('开始时间必须早于结束时间'); return; }

        // 3 个月限制校验
        if (form.repeat_type === 'weekly') {
            const start = new Date(form.start_date + 'T00:00:00');
            const end = new Date(start);
            end.setDate(end.getDate() + (form.repeat_count - 1) * 7);
            if (end > maxDate) {
                alert('排课不能超过 3 个月（最后一个日期会超出）');
                return;
            }
        } else {
            for (const d of form.dates) {
                const dt = new Date(d + 'T00:00:00');
                if (dt > maxDate) {
                    alert('排课不能超过 3 个月');
                    return;
                }
            }
        }

        setSaving(true);
        try {
            let res;
            if (isEdit) {
                res = await axios.put(`${API_BASE}/api/schedule/${course.id}`, {
                    date: course.date,
                    start_time: form.start_time,
                    end_time: form.end_time,
                    class_name: form.class_name,
                    coach_name: form.coach_name,
                    location: form.location,
                    max_capacity: form.max_capacity,
                    notes: form.notes
                });
            } else {
                res = await axios.post(`${API_BASE}/api/schedule`, form);
            }
            if (res.data.code === 0) {
                alert('✅ ' + (res.data.data.message || '保存成功'));
                onSuccess();
            } else {
                alert('保存失败: ' + res.data.message);
            }
        } catch (err) {
            alert('网络错误');
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div className="bg-white rounded-2xl p-6 w-[650px] max-w-[95%] max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{isEdit ? '✏️ 编辑课程' : '➕ 添加课程'}</h2>
                    <button onClick={onClose} className="text-red-500 text-3xl leading-none">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isEdit && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">重复方式</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="repeat_type"
                                        value="weekly"
                                        checked={form.repeat_type === 'weekly'}
                                        onChange={(e) => setForm({ ...form, repeat_type: e.target.value })}
                                    />
                                    <span>每周重复</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="repeat_type"
                                        value="none"
                                        checked={form.repeat_type === 'none'}
                                        onChange={(e) => setForm({ ...form, repeat_type: e.target.value })}
                                    />
                                    <span>不重复（可多选日期）</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {!isEdit && form.repeat_type === 'weekly' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">起始日期 *</label>
                                <input
                                    type="date"
                                    value={form.start_date}
                                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    min={format(today, 'yyyy-MM-dd')}
                                    max={format(maxDate, 'yyyy-MM-dd')}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">重复周数 *</label>
                                <input
                                    type="number"
                                    value={form.repeat_count}
                                    onChange={(e) => setForm({ ...form, repeat_count: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    min="1"
                                    max="12"
                                />
                            </div>
                        </div>
                    )}

                    {!isEdit && form.repeat_type === 'none' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                选择日期（可多选）
                                <span className="text-xs text-gray-400 ml-2">已选 {form.dates.length} 天</span>
                            </label>
                            <div className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-3">
                                    <button type="button" onClick={() => setPickerMonth(subMonths(pickerMonth, 1))} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">◀</button>
                                    <span className="font-bold">{format(pickerMonth, 'yyyy-MM')}</span>
                                    <button type="button" onClick={() => setPickerMonth(addMonths(pickerMonth, 1))} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">▶</button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-xs">
                                    {['日', '一', '二', '三', '四', '五', '六'].map(w => (
                                        <div key={w} className="text-center text-gray-400 font-medium py-1">{w}</div>
                                    ))}
                                    {Array(pickerFirstWeekday).fill(null).map((_, i) => (
                                        <div key={`empty-${i}`}></div>
                                    ))}
                                    {pickerDays.map(d => {
                                        const dateStr = format(d, 'yyyy-MM-dd');
                                        const isSelected = form.dates.includes(dateStr);
                                        const isDisabled = isDateDisabled(dateStr);
                                        return (
                                            <button
                                                key={dateStr}
                                                type="button"
                                                disabled={isDisabled}
                                                onClick={() => toggleDate(dateStr)}
                                                className={`p-2 rounded text-center transition ${
                                                    isDisabled
                                                        ? 'text-gray-300 cursor-not-allowed'
                                                        : isSelected
                                                            ? 'bg-blue-500 text-white font-bold'
                                                            : 'hover:bg-gray-100'
                                                }`}
                                            >
                                                {format(d, 'd')}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">课程名 *</label>
                        <input
                            type="text"
                            value={form.class_name}
                            onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="如：Salsa、Bachata、交谊舞"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">开始时间 *</label>
                            <input
                                type="time"
                                value={form.start_time}
                                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">结束时间 *</label>
                            <input
                                type="time"
                                value={form.end_time}
                                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">教练</label>
                        {manualCoach ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={form.coach_name}
                                    onChange={(e) => setForm({ ...form, coach_name: e.target.value })}
                                    className="flex-1 px-3 py-2 border rounded-lg"
                                    placeholder="输入教练名"
                                />
                                <button type="button" onClick={() => setManualCoach(false)} className="px-3 py-2 bg-gray-200 rounded-lg text-sm">
                                    返回选择
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <select
                                    value={form.coach_name}
                                    onChange={(e) => setForm({ ...form, coach_name: e.target.value })}
                                    className="flex-1 px-3 py-2 border rounded-lg"
                                >
                                    <option value="">-- 请选择 --</option>
                                    {coaches.map(c => (
                                        <option key={c.id} value={c.name || c.username}>{c.name || c.username}</option>
                                    ))}
                                </select>
                                <button type="button" onClick={() => setManualCoach(true)} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm">
                                    手动输入
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">地点</label>
                        <select
                            value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="">-- 请选择 --</option>
                            {locations.map(l => (
                                <option key={l.id} value={l.name}>{l.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">人数上限</label>
                        <input
                            type="number"
                            value={form.max_capacity}
                            onChange={(e) => setForm({ ...form, max_capacity: parseInt(e.target.value) || 10 })}
                            className="w-full px-3 py-2 border rounded-lg"
                            min="1"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                        <input
                            type="text"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="选填"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition disabled:opacity-50"
                    >
                        {saving ? '保存中...' : (isEdit ? '💾 保存修改' : '✅ 添加课程')}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ============================================================
// 地点管理弹窗
// ============================================================
const LocationPopup = ({ locations, onClose, onSuccess }) => {
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');

    const handleAdd = async () => {
        if (!newName.trim()) return;
        try {
            const res = await axios.post(`${API_BASE}/api/locations`, { name: newName });
            if (res.data.code === 0) {
                setNewName('');
                onSuccess();
            } else {
                alert('添加失败: ' + res.data.message);
            }
        } catch (err) {
            alert('网络错误');
        }
    };

    const handleUpdate = async (id) => {
        if (!editingName.trim()) return;
        try {
            const res = await axios.put(`${API_BASE}/api/locations/${id}`, { name: editingName });
            if (res.data.code === 0) {
                setEditingId(null);
                setEditingName('');
                onSuccess();
            }
        } catch (err) {
            alert('网络错误');
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`确定删除地点【${name}】吗？`)) return;
        try {
            const res = await axios.delete(`${API_BASE}/api/locations/${id}`);
            if (res.data.code === 0) onSuccess();
        } catch (err) {
            alert('网络错误');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div className="bg-white rounded-2xl p-6 w-[500px] max-w-[95%] max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">📍 地点管理</h2>
                    <button onClick={onClose} className="text-red-500 text-3xl leading-none">&times;</button>
                </div>

                <div className="space-y-3 mb-6">
                    {locations.map(loc => (
                        <div key={loc.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
                            {editingId === loc.id ? (
                                <>
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        className="flex-1 px-3 py-1 border rounded"
                                    />
                                    <button onClick={() => handleUpdate(loc.id)} className="px-3 py-1 bg-green-500 text-white rounded text-sm">保存</button>
                                    <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-300 rounded text-sm">取消</button>
                                </>
                            ) : (
                                <>
                                    <span className="flex-1 font-medium">{loc.name}</span>
                                    <button onClick={() => { setEditingId(loc.id); setEditingName(loc.name); }} className="text-blue-500 hover:text-blue-700 text-sm">
                                        编辑
                                    </button>
                                    <button onClick={() => handleDelete(loc.id, loc.name)} className="text-red-500 hover:text-red-700 text-sm">
                                        删除
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg"
                        placeholder="添加新地点"
                    />
                    <button onClick={handleAdd} className="px-5 py-2 bg-green-500 text-white rounded-lg font-medium">
                        添加
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PracticeCalendar;
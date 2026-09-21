const express = require('express');
const app = express();
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const fs = require('fs');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data');  // Railway 线上	/app/data	数据库在 Volume 里
// const DB_PATH = process.env.DB_PATH || __dirname;  // 本地	__dirname	数据库在 server 目录下（和 .db 文件同级）
// const DB_PATH = __dirname;    //  本地线上两用，不用来回切换路径，前提是删除 Railway 的路径DB_PATH=/app/data的环境变量,找的是server目录下的date

// 上传目录：优先用环境变量 DB_PATH（线上是 /app/data），本地回退到 server/data
// const DATA_DIR = process.env.DB_PATH || path.join(__dirname, 'data');

// ============================================================
// 数据库连接
// ============================================================
const memberPassDB = new sqlite3.Database(path.join(DB_PATH, 'memberpass.db'));
const coachPassDB = new sqlite3.Database(path.join(DB_PATH, 'coachpass.db'));
const adminPassDB = new sqlite3.Database(path.join(DB_PATH, 'adminpass.db'));
const coachListDB = new sqlite3.Database(path.join(DB_PATH, 'coachs.db'));
const adminListDB = new sqlite3.Database(path.join(DB_PATH, 'admins.db'));
const membersDB = new sqlite3.Database(path.join(DB_PATH, 'members.db'));
const transactionsDB = new sqlite3.Database(path.join(DB_PATH, 'transactions.db'));
const attendanceDB = new sqlite3.Database(path.join(DB_PATH, 'attendance_records.db'));
const cardTypesDB = new sqlite3.Database(path.join(DB_PATH, 'card_types.db'));
const cardsDB = new sqlite3.Database(path.join(__dirname, 'data', 'membership_cards.db'));
const scanDB = new sqlite3.Database(path.join(DB_PATH, 'scan_consumptions.db'));
const newsDB = new sqlite3.Database(path.join(DB_PATH, 'news.db'));
const scheduleDB = new sqlite3.Database(path.join(DB_PATH, 'schedule.db'));

// 图片上传配置
// const uploadDir = path.join(__dirname, 'uploads', 'news');
// if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir, { recursive: true });
// }
const uploadDir = path.join(DB_PATH, 'uploads', 'news');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `news_${Date.now()}${ext}`);
    }
});
const upload = multer({ storage });

// 静态文件访问
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(DB_PATH, 'uploads')));

// ============================================================
// 工具函数：生成会员编号
// ============================================================
function generateMemberNo(callback) {
    const now = new Date();
    const year = String(now.getFullYear()).slice(2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const prefix = `XF${year}${month}${day}`;

    membersDB.get(
        `SELECT COUNT(*) as count FROM members WHERE member_no LIKE ?`,
        [`${prefix}%`],
        (err, row) => {
            if (err) {
                callback(err, null);
                return;
            }
            const seq = String((row.count || 0) + 1).padStart(2, '0');
            callback(null, `${prefix}${seq}`);
        }
    );
}

// ============================================================
// 工具函数：统一响应格式
// ============================================================
function success(res, data) {
    res.json({ code: 0, data, message: 'success' });
}

function error(res, message, code = 1) {
    res.status(400).json({ code, message });
}

// ============================================================
// 工具函数：获取北京时间的日期字符串（YYYY-MM-DD）
// ============================================================
function getBeijingDate(offsetDays = 0) {
    const now = new Date();
    // 加 8 小时转北京时间，再加偏移天数
    const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000);
    return beijing.toISOString().slice(0, 10);
}


// ============================================================
// 1. 获取所有会员列表
// ============================================================
app.get('/api/members', (req, res) => {
    membersDB.all(
        `SELECT * FROM members WHERE deleted = 0 ORDER BY id DESC`,
        (err, rows) => {
            if (err) {
                error(res, '获取会员列表失败: ' + err.message);
                return;
            }
            success(res, rows);
        }
    );
});

// ============================================================
// 2. 获取单个会员详情（含消费和出勤历史）
// ============================================================
app.get('/api/members/:id', (req, res) => {
    const { id } = req.params;

    membersDB.get(`SELECT * FROM members WHERE id = ? AND deleted = 0`, [id], (err, member) => {
        if (err) {
            error(res, '查询会员失败: ' + err.message);
            return;
        }
        if (!member) {
            error(res, '会员不存在');
            return;
        }

        // 获取消费历史
        transactionsDB.all(
            `SELECT * FROM transactions WHERE member_id = ? ORDER BY created_at DESC`,
            [id],
            (err2, transactions) => {
                if (err2) {
                    error(res, '查询消费记录失败: ' + err2.message);
                    return;
                }

                // 获取出勤历史
                attendanceDB.all(
                    `SELECT * FROM attendance_records WHERE member_id = ? ORDER BY date DESC`,
                    [id],
                    (err3, attendances) => {
                        if (err3) {
                            error(res, '查询出勤记录失败: ' + err3.message);
                            return;
                        }

                        success(res, {
                            ...member,
                            transactions,
                            attendance_records: attendances
                        });
                    }
                );
            }
        );
    });
});

// ============================================================
// 3. 新增会员（自动生成会员编号）
// ============================================================
app.post('/api/members', (req, res) => {
    const { name, nickname, gender, phone, expiry_date, notes } = req.body;

    if (!name || !phone) {
        error(res, '姓名和手机号为必填');
        return;
    }

    // 检查手机号是否已存在
    membersDB.get(`SELECT * FROM members WHERE phone = ? AND deleted = 0`, [phone], (err, existing) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        if (existing) {
            error(res, '该手机号已注册');
            return;
        }

        // 生成会员编号
        generateMemberNo((err2, memberNo) => {
            if (err2) {
                error(res, '生成会员编号失败: ' + err2.message);
                return;
            }

            membersDB.run(
                `INSERT INTO members (
                    member_no, name, nickname, gender, phone, status,
                    expiry_date, notes, register_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    memberNo,
                    name,
                    nickname || null,
                    gender || null,
                    phone,
                    '冻结',
                    expiry_date || null,
                    notes || null,
                    getBeijingDate()
                ],
                function(err3) {
                    if (err3) {
                        error(res, '新增会员失败: ' + err3.message);
                        return;
                    }
                    success(res, {
                        id: this.lastID,
                        member_no: memberNo,
                        message: '会员添加成功'
                    });
                }
            );
        });
    });
});

// ============================================================
// 4. 更新会员信息
// ============================================================
app.put('/api/members/:id', (req, res) => {
    const { id } = req.params;
    const { name, nickname, gender, phone, status, expiry_date, notes } = req.body;

    if (!name || !phone) {
        error(res, '姓名和手机号为必填');
        return;
    }

    // 检查手机号是否被其他会员占用
    membersDB.get(
        `SELECT * FROM members WHERE phone = ? AND id != ? AND deleted = 0`,
        [phone, id],
        (err, existing) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }
            if (existing) {
                error(res, '该手机号已被其他会员使用');
                return;
            }

            membersDB.run(
                `UPDATE members SET
                    name = ?,
                    nickname = ?,
                    gender = ?,
                    phone = ?,
                    status = ?,
                    expiry_date = ?,
                    notes = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND deleted = 0`,
                [
                    name,
                    nickname || null,
                    gender || null,
                    phone,
                    status || '冻结',
                    expiry_date || null,
                    notes || null,
                    id
                ],
                function(err2) {
                    if (err2) {
                        error(res, '更新会员失败: ' + err2.message);
                        return;
                    }
                    if (this.changes === 0) {
                        error(res, '会员不存在或已删除');
                        return;
                    }
                    success(res, { message: '会员信息更新成功' });
                }
            );
        }
    );
});

// ============================================================
// 5. 软删除会员
// ============================================================
app.delete('/api/members/:id', (req, res) => {
    const { id } = req.params;

    membersDB.run(
        `UPDATE members SET deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id],
        function(err) {
            if (err) {
                error(res, '删除会员失败: ' + err.message);
                return;
            }
            if (this.changes === 0) {
                error(res, '会员不存在');
                return;
            }
            success(res, { message: '会员已删除' });
        }
    );
});

// ============================================================
// 6. 记录出勤（自动更新 monthly_attendance 和 total_attendance）
// ============================================================
app.post('/api/members/:id/attendance', (req, res) => {
    const { id } = req.params;
    const { date, class_name } = req.body;

    if (!date) {
        error(res, '日期为必填');
        return;
    }

    // 检查会员是否存在
    membersDB.get(`SELECT * FROM members WHERE id = ? AND deleted = 0`, [id], (err, member) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        if (!member) {
            error(res, '会员不存在');
            return;
        }

        // 检查今天是否已签到
        attendanceDB.get(
            `SELECT * FROM attendance_records WHERE member_id = ? AND date = ?`,
            [id, date],
            (err2, existing) => {
                if (err2) {
                    error(res, '查询出勤记录失败: ' + err2.message);
                    return;
                }
                if (existing) {
                    error(res, '该日期已签到');
                    return;
                }

                // 插入出勤记录
                attendanceDB.run(
                    `INSERT INTO attendance_records (member_id, date, class_name) VALUES (?, ?, ?)`,
                    [id, date, class_name || null],
                    function(err3) {
                        if (err3) {
                            error(res, '记录出勤失败: ' + err3.message);
                            return;
                        }

                        // 更新会员的出勤统计
                        // 判断是否本月, 取的是本地时间，不是 UTC
                        const now = new Date();
                        const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
                        const currentYear = now.getFullYear();
                        const recordMonth = date.slice(5, 7);
                        const recordYear = parseInt(date.slice(0, 4));

                        let monthlyUpdate = '';
                        if (recordYear === currentYear && recordMonth === currentMonth) {
                            monthlyUpdate = 'monthly_attendance = monthly_attendance + 1,';
                        }

                        membersDB.run(
                            `UPDATE members SET
                                ${monthlyUpdate}
                                total_attendance = total_attendance + 1,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?`,
                            [id],
                            function(err4) {
                                if (err4) {
                                    error(res, '更新统计失败: ' + err4.message);
                                    return;
                                }
                                success(res, { message: '出勤记录成功' });
                            }
                        );
                    }
                );
            }
        );
    });
});

// ============================================================
// 7. 记录消费（自动更新 total_spent）
// ============================================================
app.post('/api/members/:id/transaction', (req, res) => {
    const { id } = req.params;
    const { amount, type, payment_method, note } = req.body;

    if (!amount || amount <= 0) {
        error(res, '请输入有效金额');
        return;
    }
    if (!type) {
        error(res, '消费类型为必填');
        return;
    }

    // 检查会员是否存在
    membersDB.get(`SELECT * FROM members WHERE id = ? AND deleted = 0`, [id], (err, member) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        if (!member) {
            error(res, '会员不存在');
            return;
        }

        // 插入消费记录
        transactionsDB.run(
            `INSERT INTO transactions (member_id, amount, type, payment_method, note) VALUES (?, ?, ?, ?, ?)`,
            [id, amount, type, payment_method || null, note || null],
            function(err2) {
                if (err2) {
                    error(res, '记录消费失败: ' + err2.message);
                    return;
                }

                // 更新累计消费
                membersDB.run(
                    `UPDATE members SET
                        total_spent = total_spent + ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?`,
                    [amount, id],
                    function(err3) {
                        if (err3) {
                            error(res, '更新消费统计失败: ' + err3.message);
                            return;
                        }
                        success(res, { message: '消费记录成功' });
                    }
                );
            }
        );
    });
});

// ============================================================
// 8. 获取会员消费历史
// ============================================================
app.get('/api/members/:id/transactions', (req, res) => {
    const { id } = req.params;

    transactionsDB.all(
        `SELECT * FROM transactions WHERE member_id = ? ORDER BY created_at DESC`,
        [id],
        (err, rows) => {
            if (err) {
                error(res, '查询消费记录失败: ' + err.message);
                return;
            }
            success(res, rows);
        }
    );
});

// ============================================================
// 9. 获取会员出勤历史
// ============================================================
app.get('/api/members/:id/attendance-records', (req, res) => {
    const { id } = req.params;

    attendanceDB.all(
        `SELECT * FROM attendance_records WHERE member_id = ? ORDER BY date DESC`,
        [id],
        (err, rows) => {
            if (err) {
                error(res, '查询出勤记录失败: ' + err.message);
                return;
            }
            success(res, rows);
        }
    );
});

// ============================================================
// 10. 会员登录验证（使用独立的 memberpass.db）
// ============================================================
app.post('/api/member-login', (req, res) => {
    const { username, password } = req.body;

    memberPassDB.get(
        `SELECT * FROM memberpass WHERE username = ? AND password = ?`,
        [username, password],
        (err, row) => {
            if (err) {
                error(res, '登录失败: ' + err.message);
                return;
            }
            if (!row) {
                error(res, '用户名或密码错误');
                return;
            }
            success(res, { message: '登录成功', role: 'member', username });
        }
    );
});

// ============================================================
// 11. 教练登录验证
// ============================================================
app.post('/api/coach-login', (req, res) => {
    const { username, password } = req.body;

    coachPassDB.get(
        `SELECT * FROM coachpass WHERE username = ? AND password = ?`,
        [username, password],
        (err, row) => {
            if (err) {
                error(res, '登录失败: ' + err.message);
                return;
            }
            if (!row) {
                error(res, '用户名或密码错误');
                return;
            }
            success(res, { message: '登录成功', role: 'coach', username });
        }
    );
});

// ============================================================
// 12. 管理员登录验证
// ============================================================
app.post('/api/admin-login', (req, res) => {
    const { username, password } = req.body;

    adminPassDB.get(
        `SELECT * FROM adminpass WHERE username = ? AND password = ?`,
        [username, password],
        (err, row) => {
            if (err) {
                error(res, '登录失败: ' + err.message);
                return;
            }
            if (!row) {
                error(res, '用户名或密码错误');
                return;
            }
            success(res, { message: '登录成功', role: 'admin', username });
        }
    );
});

// ============================================================
// 13. 获取教练列表
// ============================================================
app.get('/api/coachs', (req, res) => {
    coachListDB.all(`SELECT * FROM coachs`, (err, rows) => {
        if (err) {
            error(res, '获取教练列表失败: ' + err.message);
            return;
        }
        success(res, rows);
    });
});

// ============================================================
// 14. 获取管理员列表
// ============================================================
app.get('/api/admins', (req, res) => {
    adminListDB.all(`SELECT * FROM admins`, (err, rows) => {
        if (err) {
            error(res, '获取管理员列表失败: ' + err.message);
            return;
        }
        success(res, rows);
    });
});

// ============================================================
// 15. 注册新会员（前端注册页面调用）
// ============================================================
app.post('/api/register', (req, res) => {
    const { username, password, name, phone } = req.body;

    if (!username || !password || !name || !phone) {
        error(res, '所有字段均为必填');
        return;
    }

    // 检查用户名是否已存在
    memberPassDB.get(`SELECT * FROM memberpass WHERE username = ?`, [username], (err, existing) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        if (existing) {
            error(res, '用户名已被占用');
            return;
        }

        // 检查手机号是否已存在
        membersDB.get(`SELECT * FROM members WHERE phone = ? AND deleted = 0`, [phone], (err2, existing2) => {
            if (err2) {
                error(res, '查询失败: ' + err2.message);
                return;
            }
            if (existing2) {
                error(res, '该手机号已注册');
                return;
            }

            // 生成会员编号
            generateMemberNo((err3, memberNo) => {
                if (err3) {
                    error(res, '生成会员编号失败: ' + err3.message);
                    return;
                }

                // 插入登录信息
                memberPassDB.run(
                    `INSERT INTO memberpass (username, password) VALUES (?, ?)`,
                    [username, password],
                    function(err4) {
                        if (err4) {
                            error(res, '注册失败: ' + err4.message);
                            return;
                        }

                        // 插入会员信息
                        membersDB.run(
                            `INSERT INTO members (
                                member_no, name, phone, status, register_date
                            ) VALUES (?, ?, ?, ?, ?)`,
                            [
                                memberNo,
                                name,
                                phone,
                                '冻结',
                                getBeijingDate()
                            ],
                            function(err5) {
                                if (err5) {
                                    error(res, '注册失败: ' + err5.message);
                                    return;
                                }
                                success(res, {
                                    message: '注册成功，请等待管理员审核激活',
                                    member_no: memberNo
                                });
                            }
                        );
                    }
                );
            });
        });
    });
});

// ============================================================
// 仪表板统计接口
// ============================================================

// 1. 获取统计数据（总数/本月新增/活跃/本月收入）
app.get('/api/dashboard/stats', (req, res) => {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear();
    const monthStart = `${currentYear}-${currentMonth}-01`;

    // 总会员数（未删除）
    membersDB.get(`SELECT COUNT(*) as total FROM members WHERE deleted = 0`, (err, totalRow) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }

        // 本月新增
        membersDB.get(
            `SELECT COUNT(*) as monthly FROM members WHERE deleted = 0 AND register_date >= ?`,
            [monthStart],
            (err2, monthlyRow) => {
                if (err2) {
                    error(res, '查询失败: ' + err2.message);
                    return;
                }

                // 活跃会员
                membersDB.get(
                    `SELECT COUNT(*) as active FROM members WHERE deleted = 0 AND status = '活跃'`,
                    (err3, activeRow) => {
                        if (err3) {
                            error(res, '查询失败: ' + err3.message);
                            return;
                        }

                        // 本月收入（当月所有消费记录）
                        transactionsDB.get(
                            `SELECT SUM(amount) as income FROM transactions WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
                            (err4, incomeRow) => {
                                if (err4) {
                                    error(res, '查询失败: ' + err4.message);
                                    return;
                                }

                                success(res, {
                                    total: totalRow.total || 0,
                                    monthly_new: monthlyRow.monthly || 0,
                                    active: activeRow.active || 0,
                                    monthly_income: incomeRow.income || 0
                                });
                            }
                        );
                    }
                );
            }
        );
    });
});

// 2. 获取状态分布
app.get('/api/dashboard/status-distribution', (req, res) => {
    membersDB.all(
        `SELECT status, COUNT(*) as count FROM members WHERE deleted = 0 GROUP BY status`,
        (err, rows) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }

            // 补全所有状态（如果没有数据则返回0）
            const statusMap = { '活跃': 0, '冻结': 0, '过期': 0 };
            rows.forEach(row => {
                if (row.status in statusMap) {
                    statusMap[row.status] = row.count;
                }
            });

            const result = Object.keys(statusMap).map(key => ({
                status: key,
                count: statusMap[key]
            }));

            success(res, result);
        }
    );
});

// 3. 获取近6个月会员增长趋势
app.get('/api/dashboard/monthly-trend', (req, res) => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        months.push(`${year}-${month}`);
    }

    const results = [];
    let completed = 0;

    months.forEach((month, index) => {
        const startDate = `${month}-01`;
        // 获取下个月第一天
        const nextMonth = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 1);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const endDate = nextMonth.toISOString().slice(0, 10);

        membersDB.get(
            `SELECT COUNT(*) as count FROM members 
             WHERE deleted = 0 
             AND register_date >= ? 
             AND register_date < ?`,
            [startDate, endDate],
            (err, row) => {
                if (err) {
                    error(res, '查询失败: ' + err.message);
                    return;
                }
                results[index] = {
                    month: month.slice(5, 7) + '/' + month.slice(2, 4),
                    count: row.count || 0
                };
                completed++;

                if (completed === months.length) {
                    // 按月份排序
                    results.sort((a, b) => {
                        const [aM, aY] = a.month.split('/');
                        const [bM, bY] = b.month.split('/');
                        return (parseInt(aY) - parseInt(bY)) || (parseInt(aM) - parseInt(bM));
                    });
                    success(res, results);
                }
            }
        );
    });
});

// 4. 获取即将过期的会员（7天内）
app.get('/api/dashboard/expiring-members', (req, res) => {
    // const today = new Date();
    // const sevenDaysLater = new Date(today);
    // sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const todayStr = getBeijingDate();
    const sevenDaysStr = getBeijingDate(7);

    membersDB.all(
        `SELECT id, name, phone, expiry_date FROM members 
         WHERE deleted = 0 
         AND status != '过期'
         AND expiry_date IS NOT NULL 
         AND expiry_date >= ? 
         AND expiry_date <= ?`,
        [todayStr, sevenDaysStr],
        (err, rows) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }
            success(res, rows);
        }
    );
});

// ============================================================
// 财务管理接口
// ============================================================

// 连接财务数据库
const financesDB = new sqlite3.Database(path.join(DB_PATH, 'finances.db'));
const fixedExpensesDB = new sqlite3.Database(path.join(DB_PATH, 'fixed_expenses.db'));

// 1. 获取财务统计
app.get('/api/finances/stats', (req, res) => {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear();
    const monthStart = `${currentYear}-${currentMonth}-01`;
    const monthEnd = `${currentYear}-${currentMonth}-31`;

    // 本月收入
    financesDB.get(
        `SELECT SUM(amount) as income FROM finances 
         WHERE type = 'income' AND date >= ? AND date <= ?`,
        [monthStart, monthEnd],
        (err, incomeRow) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }

            // 本月支出（amount 为负数）
            financesDB.get(
                `SELECT SUM(ABS(amount)) as expense FROM finances 
                 WHERE type = 'expense' AND date >= ? AND date <= ?`,
                [monthStart, monthEnd],
                (err2, expenseRow) => {
                    if (err2) {
                        error(res, '查询失败: ' + err2.message);
                        return;
                    }

                    const income = incomeRow.income || 0;
                    const expense = expenseRow.expense || 0;
                    const profit = income - expense;

                    // 累计结余（所有收支总和）
                    financesDB.get(
                        `SELECT SUM(amount) as balance FROM finances`,
                        (err3, balanceRow) => {
                            if (err3) {
                                error(res, '查询失败: ' + err3.message);
                                return;
                            }

                            success(res, {
                                monthly_income: income,
                                monthly_expense: expense,
                                monthly_profit: profit,
                                total_balance: balanceRow.balance || 0
                            });
                        }
                    );
                }
            );
        }
    );
});

// 2. 获取近6个月收支趋势
app.get('/api/finances/trend', (req, res) => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        months.push(`${year}-${month}`);
    }

    const results = [];
    let completed = 0;

    months.forEach((month, index) => {
        const startDate = `${month}-01`;
        const endDate = `${month}-${new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0).getDate()}`;

        // 收入
        financesDB.get(
            `SELECT SUM(amount) as income FROM finances 
             WHERE type = 'income' AND date >= ? AND date <= ?`,
            [startDate, endDate],
            (err, incomeRow) => {
                if (err) {
                    error(res, '查询失败: ' + err.message);
                    return;
                }

                // 支出
                financesDB.get(
                    `SELECT SUM(ABS(amount)) as expense FROM finances 
                     WHERE type = 'expense' AND date >= ? AND date <= ?`,
                    [startDate, endDate],
                    (err2, expenseRow) => {
                        if (err2) {
                            error(res, '查询失败: ' + err2.message);
                            return;
                        }

                        results[index] = {
                            month: month.slice(5, 7) + '/' + month.slice(2, 4),
                            income: incomeRow.income || 0,
                            expense: expenseRow.expense || 0
                        };
                        completed++;

                        if (completed === months.length) {
                            results.sort((a, b) => {
                                const [aM, aY] = a.month.split('/');
                                const [bM, bY] = b.month.split('/');
                                return (parseInt(aY) - parseInt(bY)) || (parseInt(aM) - parseInt(bM));
                            });
                            success(res, results);
                        }
                    }
                );
            }
        );
    });
});

// 3. 获取收支列表
app.get('/api/finances', (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    financesDB.all(
        `SELECT * FROM finances ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`,
        [parseInt(limit), offset],
        (err, rows) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }

            financesDB.get(`SELECT COUNT(*) as total FROM finances`, (err2, countRow) => {
                if (err2) {
                    error(res, '查询失败: ' + err2.message);
                    return;
                }
                success(res, {
                    data: rows,
                    total: countRow.total || 0,
                    page: parseInt(page),
                    limit: parseInt(limit)
                });
            });
        }
    );
});

// 4. 新增收支记录
app.post('/api/finances', (req, res) => {
    const { type, category, amount, description, date, payment_method } = req.body;

    if (!type || !category || !amount || !date) {
        error(res, '类型、分类、金额、日期为必填');
        return;
    }

    // 支出金额存为负数
    const finalAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);

    financesDB.run(
        `INSERT INTO finances (type, category, amount, description, date, payment_method) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [type, category, finalAmount, description || '', date, payment_method || ''],
        function(err) {
            if (err) {
                error(res, '添加失败: ' + err.message);
                return;
            }
            success(res, { id: this.lastID, message: '添加成功' });
        }
    );
});

// 5. 删除收支记录
app.delete('/api/finances/:id', (req, res) => {
    const { id } = req.params;

    financesDB.run(`DELETE FROM finances WHERE id = ?`, [id], function(err) {
        if (err) {
            error(res, '删除失败: ' + err.message);
            return;
        }
        if (this.changes === 0) {
            error(res, '记录不存在');
            return;
        }
        success(res, { message: '删除成功' });
    });
});

// 6. 获取固定支出列表
app.get('/api/finances/fixed-expenses', (req, res) => {
    fixedExpensesDB.all(`SELECT * FROM fixed_expenses`, (err, rows) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        success(res, rows);
    });
});

// 7. 新增固定支出
app.post('/api/finances/fixed-expenses', (req, res) => {
    const { category, amount, due_day, description } = req.body;

    if (!category || !amount || !due_day) {
        error(res, '分类、金额、扣款日期为必填');
        return;
    }

    fixedExpensesDB.run(
        `INSERT INTO fixed_expenses (category, amount, due_day, description) VALUES (?, ?, ?, ?)`,
        [category, amount, due_day, description || ''],
        function(err) {
            if (err) {
                error(res, '添加失败: ' + err.message);
                return;
            }
            success(res, { id: this.lastID, message: '添加成功' });
        }
    );
});

// 8. 修改固定支出
app.put('/api/finances/fixed-expenses/:id', (req, res) => {
    const { id } = req.params;
    const { category, amount, due_day, description } = req.body;

    fixedExpensesDB.run(
        `UPDATE fixed_expenses SET category = ?, amount = ?, due_day = ?, description = ? WHERE id = ?`,
        [category, amount, due_day, description || '', id],
        function(err) {
            if (err) {
                error(res, '更新失败: ' + err.message);
                return;
            }
            if (this.changes === 0) {
                error(res, '记录不存在');
                return;
            }
            success(res, { message: '更新成功' });
        }
    );
});

// 9. 删除固定支出
app.delete('/api/finances/fixed-expenses/:id', (req, res) => {
    const { id } = req.params;

    fixedExpensesDB.run(`DELETE FROM fixed_expenses WHERE id = ?`, [id], function(err) {
        if (err) {
            error(res, '删除失败: ' + err.message);
            return;
        }
        if (this.changes === 0) {
            error(res, '记录不存在');
            return;
        }
        success(res, { message: '删除成功' });
    });
});

// 10. 手动记录当月固定支出
app.post('/api/finances/auto-record-fixed', (req, res) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const today = `${year}-${month}-${String(now.getDate()).padStart(2, '0')}`;
    const monthStart = `${year}-${month}-01`;
    const monthEnd = `${year}-${month}-31`;

    // 获取所有固定支出
    fixedExpensesDB.all(`SELECT * FROM fixed_expenses`, (err, fixedItems) => {
        if (err) {
            error(res, '查询固定支出失败: ' + err.message);
            return;
        }

        let added = 0;
        let skipped = 0;
        let completed = 0;

        if (fixedItems.length === 0) {
            success(res, { message: '没有固定支出需要记录', added: 0, skipped: 0 });
            return;
        }

        fixedItems.forEach((item) => {
            // 检查本月是否已记录该固定支出
            financesDB.get(
                `SELECT * FROM finances WHERE category = ? AND date >= ? AND date <= ? AND type = 'expense'`,
                [item.category, monthStart, monthEnd],
                (err2, existing) => {
                    if (err2) {
                        error(res, '查询失败: ' + err2.message);
                        return;
                    }

                    if (existing) {
                        skipped++;
                    } else {
                        // 记录固定支出
                        financesDB.run(
                            `INSERT INTO finances (type, category, amount, description, date, payment_method) 
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            ['expense', item.category, -Math.abs(item.amount), item.description || '', today, '自动记录'],
                            function(err3) {
                                if (err3) {
                                    console.error('记录固定支出失败:', err3.message);
                                } else {
                                    added++;
                                }
                            }
                        );
                    }

                    completed++;
                    if (completed === fixedItems.length) {
                        success(res, {
                            message: `固定支出记录完成：新增 ${added} 条，跳过 ${skipped} 条`,
                            added,
                            skipped
                        });
                    }
                }
            );
        });
    });
});

// ============================================================
// 会员卡/次卡/扫码消费接口
// ============================================================


// 1. 获取会员的次卡列表
app.get('/api/member-cards/:memberId', (req, res) => {
    const { memberId } = req.params;

    cardsDB.all(
        `SELECT * FROM membership_cards WHERE member_id = ? ORDER BY 
         CASE status WHEN '有效' THEN 1 WHEN '已用完' THEN 2 WHEN '已过期' THEN 3 END`,
        [memberId],
        (err, rows) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }
            success(res, rows);
        }
    );
});

// 2. 获取会员所有次卡（通过会员编号）
app.get('/api/member-cards/by-no/:memberNo', (req, res) => {
    const { memberNo } = req.params;

    // 先通过编号获取会员ID
    // membersDB.get(`SELECT id FROM members WHERE member_no = ? AND deleted = 0`, [memberNo], (err, member) => {
    // 查询完整会员信息
    membersDB.get(`SELECT id, member_no, name, nickname, phone, status, expiry_date FROM members WHERE member_no = ? AND deleted = 0`, [memberNo], (err, member) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        if (!member) {
            error(res, '会员不存在');
            return;
        }

        cardsDB.all(
            `SELECT * FROM membership_cards WHERE member_id = ? ORDER BY 
             CASE status WHEN '有效' THEN 1 WHEN '已用完' THEN 2 WHEN '已过期' THEN 3 END`,
            [member.id],
            (err2, rows) => {
                if (err2) {
                    error(res, '查询失败: ' + err2.message);
                    return;
                }
                success(res, { member: member, cards: rows });
            }
        );
    });
});

// 3. 扫码消费（用户自行操作）
app.post('/api/scan/consume', (req, res) => {
    const { memberNo, cardId, consumeCount, className, source } = req.body;

    if (!memberNo || !cardId) {
        error(res, '会员编号和次卡ID为必填');
        return;
    }

    const count = consumeCount || 1;
    if (count < 1 || !Number.isInteger(count)) {
        error(res, '消费次数必须是正整数');
        return;
    }

    // 获取会员信息
    membersDB.get(`SELECT id, name FROM members WHERE member_no = ? AND deleted = 0`, [memberNo], (err, member) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        if (!member) {
            error(res, '会员不存在');
            return;
        }

        // 获取次卡信息（包含 card_category）
        cardsDB.get(`SELECT * FROM membership_cards WHERE id = ? AND member_id = ?`, [cardId, member.id], (err2, card) => {
            if (err2) {
                error(res, '查询失败: ' + err2.message);
                return;
            }
            if (!card) {
                error(res, '次卡不存在');
                return;
            }
            if (card.status !== '有效') {
                error(res, '次卡已失效: ' + card.status);
                return;
            }

            // ========== 期限卡（月卡/季卡/年卡）逻辑 ==========
            if (card.card_category === 'unlimited') {
                if (card.expiry_date && new Date(card.expiry_date) < new Date()) {
                    cardsDB.run(`UPDATE membership_cards SET status = '已过期' WHERE id = ?`, [cardId], () => {});
                    error(res, '该卡已过期');
                    return;
                }

                const now = new Date();
                const today = getBeijingDate();

                // 查询今日签到次数（所有期限卡共用限制）
                scanDB.all(
                    `SELECT * FROM scan_consumptions 
                     WHERE member_id = ? AND consume_date = ? AND source = 'user'`,
                    [member.id, today],
                    (err3, todayRecords) => {
                        if (err3) {
                            error(res, '查询签到记录失败: ' + err3.message);
                            return;
                        }

                        // 自然日最多2次
                        if (todayRecords.length >= 2) {
                            error(res, '今日签到已达上限（每日最多2次）');
                            return;
                        }

                        // 3小时内只能签1次
                        const oneHourAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
                        // const oneHourAgoStr = oneHourAgo.toISOString();  字符串比较不匹配
                        const oneHourAgoStr = oneHourAgo.toISOString().slice(0, 19).replace('T', ' ');

                        scanDB.get(
                            `SELECT * FROM scan_consumptions 
                             WHERE member_id = ? AND source = 'user' 
                             AND created_at > ?`,
                            [member.id, oneHourAgoStr],
                            (err4, recentRecord) => {
                                if (err4) {
                                    error(res, '查询签到记录失败: ' + err4.message);
                                    return;
                                }
                                if (recentRecord) {
                                    error(res, '3小时内已签到，请稍后再试');
                                    return;
                                }

                                const nowStr = getBeijingDate();

                                scanDB.run(
                                    `INSERT INTO scan_consumptions (member_id, card_id, consume_count, consume_date, class_name, source, notes) 
                                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                    [member.id, cardId, 1, nowStr, className || '', source || 'user', '期限卡签到'],
                                    function(err5) {
                                        if (err5) {
                                            error(res, '记录签到失败: ' + err5.message);
                                            return;
                                        }

                                        // 出勤 +1（期限卡固定1次）
                                        membersDB.run(
                                            `UPDATE members SET 
                                                total_attendance = total_attendance + 1,
                                                monthly_attendance = monthly_attendance + 1
                                             WHERE id = ?`,
                                            [member.id],
                                            (err6) => {
                                                if (err6) console.error('更新出勤统计失败:', err6.message);
                                            }
                                        );

                                        const remainingToday = 2 - (todayRecords.length + 1);
                                        broadcast({ type: 'new_checkin' });
                                        success(res, {
                                            memberName: member.name,
                                            cardType: card.card_category,
                                            remaining: '期限卡不限次',
                                            consumeCount: 1,
                                            todayRemaining: remainingToday,
                                            message: `签到成功，今日剩余 ${remainingToday} 次`
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
                return;
            }
            // ========== 期限卡逻辑结束 ==========

            // ========== 次卡逻辑 ==========
            if (card.card_category === 'fixed') {
                if (card.remaining_count < count) {
                    error(res, `剩余次数不足（剩余 ${card.remaining_count} 次，需要 ${count} 次）`);
                    return;
                }

                const newRemaining = card.remaining_count - count;
                const newUsed = card.used_count + count;
                const today = getBeijingDate();

                // 次卡扣次后，记录剩余和已用
                cardsDB.run(
                    `UPDATE membership_cards SET 
                        used_count = ?, remaining_count = ?,
                        status = CASE WHEN ? = 0 THEN '已用完' ELSE '有效' END
                     WHERE id = ?`,
                    [newUsed, newRemaining, newRemaining, cardId],
                    function(err3) {
                        if (err3) {
                            error(res, '更新次卡失败: ' + err3.message);
                            return;
                        }

                        scanDB.run(
                            `INSERT INTO scan_consumptions (member_id, card_id, consume_count, consume_date, class_name, source, notes, remaining_after, used_after) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [member.id, cardId, count, today, className || '', source || 'user', `扣${count}次`, newRemaining, newUsed],
                            function(err4) {
                                if (err4) {
                                    error(res, '记录消费失败: ' + err4.message);
                                    return;
                                }

                                // 出勤 +N（次卡扣多少次就加多少次）
                                membersDB.run(
                                    `UPDATE members SET 
                                        total_attendance = total_attendance + ?,
                                        monthly_attendance = monthly_attendance + ?
                                     WHERE id = ?`,
                                    [count, count, member.id],
                                    (err5) => {
                                        if (err5) console.error('更新出勤统计失败:', err5.message);
                                    }
                                );

                                broadcast({ type: 'new_checkin' });
                                success(res, {
                                    memberName: member.name,
                                    cardType: card.card_category,
                                    remaining: newRemaining,
                                    consumeCount: count,
                                    message: `签到成功，出勤 +${count}，剩余 ${newRemaining} 次`
                                });
                            }
                        );
                    }
                );
                return;
            }
            // ========== 次卡逻辑结束 ==========

            error(res, '不支持的卡类型');
        });
    });
});

// // 4. 获取会员消费记录
// app.get('/api/scan/history/:memberNo', (req, res) => {
//     const { memberNo } = req.params;
//     const { limit = 20 } = req.query;

//     membersDB.get(`SELECT id FROM members WHERE member_no = ? AND deleted = 0`, [memberNo], (err, member) => {
//         if (err) {
//             error(res, '查询失败: ' + err.message);
//             return;
//         }
//         if (!member) {
//             error(res, '会员不存在');
//             return;
//         }

//         // 关联 membership_cards 表查询 card_type
//         scanDB.all(
//             // `SELECT s.*, c.card_type, c.card_name 
//             //  FROM scan_consumptions s 
//             //  LEFT JOIN membership_cards c ON s.card_id = c.id   修改 SQL 查询
//             //  WHERE s.member_id = ? 
//             //  ORDER BY s.created_at DESC LIMIT ?`,

//             // `SELECT * FROM scan_consumptions 
//             //  WHERE member_id = ? 
//             //  ORDER BY created_at DESC LIMIT ?`,

//             `SELECT s.*, c.card_type 
//              FROM scan_consumptions s 
//              LEFT JOIN membership_cards c ON s.card_id = c.id 
//              WHERE s.member_id = ? 
//              ORDER BY s.created_at DESC LIMIT ?`,

//             [member.id, parseInt(limit)],
//             (err2, rows) => {
//                 if (err2) {
//                     error(res, '查询失败: ' + err2.message);
//                     return;
//                 }
//                 success(res, rows);
//             }
//         );
//     });
// });

// 4. 获取会员消费记录  
app.get('/api/scan/history/:memberNo', (req, res) => {
    const { memberNo } = req.params;
    const { limit = 20 } = req.query;

    membersDB.get(`SELECT id FROM members WHERE member_no = ? AND deleted = 0`, [memberNo], (err, member) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        if (!member) {
            error(res, '会员不存在');
            return;
        }

        // 先查签到记录     两个独立的数据库文件，不能跨库 JOIN
        scanDB.all(
            `SELECT * FROM scan_consumptions WHERE member_id = ? ORDER BY created_at DESC LIMIT ?`,
            [member.id, parseInt(limit)],
            (err2, rows) => {
                if (err2) {
                    error(res, '查询失败: ' + err2.message);
                    return;
                }

                // 有数据才执行第二步
                if (rows.length === 0) {
                    success(res, rows);
                    return;
                }


                // 第二步：逐条查询卡信息，membership_cards 表只需要查 name，不需要查 remaining_after 和 used_after。这两个字段在 scan_consumptions 表里。
                let completed = 0;
                rows.forEach((row, index) => {
                    cardsDB.get(
                        `SELECT name FROM membership_cards WHERE id = ?`,
                        [row.card_id],
                        (err3, card) => {
                            // console.log('err3:', err3);
                            // console.log('card:', card);
                            if (!err3 && card) {
                                // rows[index].card_category = card.card_category;
                                rows[index].name = card.name;
                                // console.log('赋值后的 rows[index].name:', rows[index].name);
                                rows[index].remaining_count = row.remaining_after || 0; // 从 row 取
                                rows[index].used_count = row.used_after || 0;
                            } else {
                                // rows[index].card_category = '未知卡';
                                rows[index].name = '未知卡';
                                rows[index].remaining_count = 0;
                                rows[index].used_count = 0;
                            }
                            completed++;
                            if (completed === rows.length) {
                                // console.log('card 对象:', card);
                                // console.log('当前 row 完整:', row);
                                // console.log('card_id 值:', row.card_id);
                                // console.log('最终返回的 rows:', JSON.stringify(rows, null, 2));                                
                                success(res, rows);
                            }
                        }
                    );
                });
                
                // 如果放在第二步后面，空数据时就不会返回响应，前端会一直等待超时。
                // if (rows.length === 0) {
                //     success(res, rows);
                // }
            }
        );
    });
});

// 5. 生成会员二维码数据（返回会员编号）
app.get('/api/member-qrcode/:memberNo', (req, res) => {
    const { memberNo } = req.params;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    // 返回完整的URL，前端生成二维码
    success(res, {
        memberNo: memberNo,
        qrUrl: `${baseUrl}/member-card/${memberNo}`,
        fullUrl: `${baseUrl}/member-card/${memberNo}`
    });
});

// 6. 验证会员是否存在（扫码枪用）
app.get('/api/verify-member/:memberNo', (req, res) => {
    const { memberNo } = req.params;

    membersDB.get(
        `SELECT id, member_no, name, phone, status, expiry_date FROM members WHERE member_no = ? AND deleted = 0`,
        [memberNo],
        (err, member) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }
            if (!member) {
                error(res, '会员不存在');
                return;
            }

            // 获取有效的次卡
            cardsDB.all(
                `SELECT * FROM membership_cards WHERE member_id = ? AND status = '有效'`,
                [member.id],
                (err2, cards) => {
                    if (err2) {
                        error(res, '查询次卡失败: ' + err2.message);
                        return;
                    }
                    success(res, { member, cards });
                }
            );
        }
    );
});

// 7. 短信验证码（测试用，固定1234）
app.post('/api/send-sms', (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        error(res, '手机号为必填');
        return;
    }
    // 测试模式：直接返回1234
    console.log(`📱 发送验证码到 ${phone}: 1234 (测试)`);
    success(res, { 
        message: '验证码已发送（测试固定码: 1234）',
        testCode: '1234'
    });
});

// 8. 验证登录（用手机号+验证码）
app.post('/api/verify-login', (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) {
        error(res, '手机号和验证码为必填');
        return;
    }

    // 测试模式：验证码固定为1234
    if (code !== '1234') {
        error(res, '验证码错误');
        return;
    }

    // 查找会员
    membersDB.get(
        `SELECT id, member_no, name, phone, status, expiry_date FROM members WHERE phone = ? AND deleted = 0`,
        [phone],
        (err, member) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }
            if (!member) {
                error(res, '该手机号未注册会员');
                return;
            }

            // 计算缓存有效期：当月月底
            const now = new Date();
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const expireDate = lastDay.toISOString();

            success(res, {
                member: member,
                expireDate: expireDate,
                message: '登录成功'
            });
        }
    );
});

// ===== 次卡管理接口（后台用） =====

// 1. 添加次卡
app.post('/api/member-cards', (req, res) => {
    const { memberId, cardType, cardCategory, totalCount, price, purchaseDate, expiryDate } = req.body;

    // ===== 添加调试日志 =====
    // console.log('📥 收到添加次卡请求:', { memberId, cardType, cardCategory, totalCount, price, purchaseDate, expiryDate });

    if (!memberId || !cardType || !price) {
        error(res, '会员ID、次卡类型、价格为必填');
        return;
    }

    const category = cardCategory || 'fixed';
    const count = category === 'fixed' ? (totalCount || 10) : 0;
    const remaining = category === 'fixed' ? count : 0;

    cardsDB.run(
        `INSERT INTO membership_cards (member_id, name, card_category, total_count, used_count, remaining_count, price, purchase_date, expiry_date, status) 
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, '有效')`,
        [memberId, cardType, category, count, remaining, price, purchaseDate || getBeijingDate(), expiryDate || null],
        function(err) {
            if (err) {
                error(res, '添加次卡失败: ' + err.message);
                return;
            }

            // 记录消费（购买次卡）
            const today = getBeijingDate();
            transactionsDB.run(
                `INSERT INTO transactions (member_id, amount, type, payment_method, note, date) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [memberId, price, '购卡', '后台添加', `购买${cardType}`, today],
                function(err2) {
                    if (err2) {
                        console.error('记录消费失败:', err2.message);
                    } else {
                        membersDB.run(
                            `UPDATE members SET total_spent = total_spent + ? WHERE id = ?`,
                            [price, memberId],
                            (err3) => {
                                if (err3) console.error('更新累计消费失败:', err3.message);
                            }
                        );
                    }
                }
            );

            success(res, { id: this.lastID, message: '次卡添加成功' });
        }
    );
});

// 2. 删除次卡
app.delete('/api/member-cards/:cardId', (req, res) => {
    const { cardId } = req.params;

    cardsDB.run(`DELETE FROM membership_cards WHERE id = ?`, [cardId], function(err) {
        if (err) {
            error(res, '删除失败: ' + err.message);
            return;
        }
        if (this.changes === 0) {
            error(res, '次卡不存在');
            return;
        }
        success(res, { message: '删除成功' });
    });
});

// 3. 获取会员次卡（已有 /api/member-cards/:memberId）
// 这个已经有了，不需要重复添加

// ============================================================
// 卡种管理接口
// ============================================================


// 1. 获取所有卡种
app.get('/api/card-types', (req, res) => {
    const { status } = req.query;
    let sql = `SELECT * FROM card_types`;
    const params = [];
    if (status) {
        sql += ` WHERE status = ?`;
        params.push(status);
    }
    sql += ` ORDER BY sort_order ASC, id ASC`;

    cardTypesDB.all(sql, params, (err, rows) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        success(res, rows);
    });
});

// 2. 获取卡种统计
app.get('/api/card-types/stats', (req, res) => {
    // 直接用所有卡种数据计算统计（和 /api/card-types 共用数据）
    cardTypesDB.all(`SELECT status FROM card_types`, (err, rows) => {
        if (err) {
            // 如果查询失败，返回空数据而不是报错
            success(res, {
                total: 0,
                active: 0,
                inactive: 0
            });
            return;
        }
        
        const total = rows.length;
        const active = rows.filter(r => r.status === '启用').length;
        const inactive = rows.filter(r => r.status === '停用').length;
        
        success(res, {
            total: total,
            active: active,
            inactive: inactive
        });
    });
});


// 3. 获取单个卡种
app.get('/api/card-types/:id', (req, res) => {
    const { id } = req.params;

    cardTypesDB.get(`SELECT * FROM card_types WHERE id = ?`, [id], (err, row) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        if (!row) {
            error(res, '卡种不存在');
            return;
        }
        success(res, row);
    });
});

// 4. 新增卡种
app.post('/api/card-types', (req, res) => {
    const { name, card_category, total_count, price, sort_order, status, description } = req.body;

    // ===== 调试日志 =====
    console.log('📥 收到添加卡种请求:', { name, card_category, total_count, price, sort_order, status, description });

    if (!name || !card_category || !price) {
        error(res, '卡种名称、类型、价格为必填');
        return;
    }

    // 检查名称是否已存在
    cardTypesDB.get(`SELECT * FROM card_types WHERE name = ?`, [name], (err, existing) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        if (existing) {
            error(res, '卡种名称已存在');
            return;
        }

        cardTypesDB.run(
            `INSERT INTO card_types (name, card_category, total_count, price, sort_order, status, description) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,                
                card_category,
                total_count || 0,
                price,
                sort_order || 0,
                status || '启用',
                description || ''
            ],
            function(err2) {
                if (err2) {
                    error(res, '添加失败: ' + err2.message);
                    return;
                }
                success(res, { id: this.lastID, message: '卡种添加成功' });
            }
        );
    });
});

// 5. 修改卡种
app.put('/api/card-types/:id', (req, res) => {
    const { id } = req.params;
    const { name, card_category, total_count, price, sort_order, status, description } = req.body;

    console.log('📥 收到修改卡种请求:', { id, name, card_category, total_count, price, sort_order, status, description });

    if (!name || !card_category || !price) {
        error(res, '卡种名称、类型、价格为必填');
        return;
    }

    // 检查名称是否被其他卡种占用
    cardTypesDB.get(`SELECT * FROM card_types WHERE name = ? AND id != ?`, [name, id], (err, existing) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        if (existing) {
            error(res, '卡种名称已存在');
            return;
        }

        cardTypesDB.run(
            `UPDATE card_types SET 
                name = ?,
                card_category = ?,
                total_count = ?,
                price = ?,
                sort_order = ?,
                status = ?,
                description = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
                name,
                card_category,
                total_count || 0,
                price,
                sort_order || 0,
                status || '启用',
                description || '',
                id
            ],
            function(err2) {
                if (err2) {
                    error(res, '更新失败: ' + err2.message);
                    return;
                }
                if (this.changes === 0) {
                    error(res, '卡种不存在');
                    return;
                }
                success(res, { message: '卡种更新成功' });
            }
        );
    });
});

// 6. 删除卡种（物理删除）
app.delete('/api/card-types/:id', (req, res) => {
    const { id } = req.params;

    cardTypesDB.run(`DELETE FROM card_types WHERE id = ?`, [id], function(err) {
        if (err) {
            error(res, '删除失败: ' + err.message);
            return;
        }
        if (this.changes === 0) {
            error(res, '卡种不存在');
            return;
        }
        success(res, { message: '删除成功' });
    });
});

// 6. 获取卡种统计    --2
// app.get('/api/card-types/stats', (req, res) => {
//     cardTypesDB.get(`SELECT COUNT(*) as total FROM card_types`, (err, totalRow) => {
//         if (err) {
//             error(res, '查询失败: ' + err.message);
//             return;
//         }
//         cardTypesDB.get(`SELECT COUNT(*) as active FROM card_types WHERE status = '启用'`, (err2, activeRow) => {
//             if (err2) {
//                 error(res, '查询失败: ' + err2.message);
//                 return;
//             }
//             cardTypesDB.get(`SELECT COUNT(*) as inactive FROM card_types WHERE status = '停用'`, (err3, inactiveRow) => {
//                 if (err3) {
//                     error(res, '查询失败: ' + err3.message);
//                     return;
//                 }
//                 success(res, {
//                     total: totalRow ? totalRow.total : 0,
//                     active: activeRow ? activeRow.active : 0,
//                     inactive: inactiveRow ? inactiveRow.inactive : 0
//                 });
//             });
//         });
//     });
// });

// // 6. 获取卡种统计(原来的代码用了三个独立的 GET 查询,Promise.all 有一个失败，整个都失败，typesRes 也用不了。)   --2
// app.get('/api/card-types/stats', (req, res) => {
//     // 直接查询所有卡种，然后在前端计算统计
//     cardTypesDB.all(`SELECT status FROM card_types`, (err, rows) => {
//         if (err) {
//             error(res, '查询失败: ' + err.message);
//             return;
//         }
        
//         const total = rows.length;
//         const active = rows.filter(r => r.status === '启用').length;
//         const inactive = rows.filter(r => r.status === '停用').length;
        
//         success(res, {
//             total: total,
//             active: active,
//             inactive: inactive
//         });
//     });
// });

// 7. 获取所有会员签到记录（按日期筛选）
app.get('/api/scan/all-history', (req, res) => {
    const { start, end } = req.query;
    const startDate = start || getBeijingDate();
    const endDate = end || startDate;

    scanDB.all(
        `SELECT * FROM scan_consumptions 
         WHERE consume_date >= ? AND consume_date <= ? 
         ORDER BY created_at ASC`,
        [startDate, endDate],
        (err, rows) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }
            if (rows.length === 0) {
                success(res, []);
                return;
            }

            // 补充会员昵称和卡名称
            let completed = 0;
            rows.forEach((row, index) => {
                membersDB.get(
                    `SELECT nickname, name FROM members WHERE id = ?`,
                    [row.member_id],
                    (err2, member) => {
                        rows[index].nickname = member?.nickname || member?.name || '未设置';

                        cardsDB.get(
                            `SELECT name FROM membership_cards WHERE id = ?`,
                            [row.card_id],
                            (err3, card) => {
                                rows[index].card_name = card?.name || '未知卡';
                                completed++;
                                if (completed === rows.length) {
                                    success(res, rows);
                                }
                            }
                        );
                    }
                );
            });
        }
    );
});

// ============================================================
// 新闻接口
// ============================================================

// 1. 获取新闻列表（首页用）
// app.get('/api/news', (req, res) => {
//     const { limit = 5, category, status = '已发布' } = req.query;

//     let sql = `SELECT id, title, summary, cover_image, category, tags, is_top, views, likes, author, publish_date, created_at 
//                FROM news WHERE status = ?`;
//     const params = [status];
app.get('/api/news', (req, res) => {
    const { limit = 5, category, status } = req.query;

    let sql = `SELECT id, title, summary, cover_image, category, tags, is_top, views, likes, author, publish_date, created_at, status 
               FROM news WHERE 1=1`;
    const params = [];

    if (status) {
        sql += ` AND status = ?`;
        params.push(status);
    }

    if (category) {
        sql += ` AND category = ?`;
        params.push(category);
    }

    sql += ` ORDER BY is_top DESC, publish_date DESC, created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    newsDB.all(sql, params, (err, rows) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        success(res, rows);
    });
});

// 2. 获取新闻详情（浏览量+1）
app.get('/api/news/:id', (req, res) => {
    const { id } = req.params;

    newsDB.run(`UPDATE news SET views = views + 1 WHERE id = ?`, [id], (err) => {
        if (err) console.error('更新浏览量失败:', err.message);

        newsDB.get(`SELECT * FROM news WHERE id = ?`, [id], (err2, row) => {
            if (err2) {
                error(res, '查询失败: ' + err2.message);
                return;
            }
            if (!row) {
                error(res, '新闻不存在');
                return;
            }
            success(res, row);
        });
    });
});

// 3. 新增新闻（管理员）
app.post('/api/news', (req, res) => {
    const { title, content, summary, cover_image, category, tags, is_top, status, publish_date, author } = req.body;

    if (!title) {
        error(res, '标题为必填');
        return;
    }

    newsDB.run(
        `INSERT INTO news (title, content, summary, cover_image, category, tags, is_top, status, publish_date, author) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, content || '', summary || '', cover_image || '', category || '公告', tags || '', is_top ? 1 : 0, status || '已发布', publish_date || getBeijingDate(), author || 'admin'],
        function(err) {
            if (err) {
                error(res, '添加失败: ' + err.message);
                return;
            }
            success(res, { id: this.lastID, message: '新闻添加成功' });
        }
    );
});

// 4. 修改新闻（管理员）
app.put('/api/news/:id', (req, res) => {
    const { id } = req.params;
    const { title, content, summary, cover_image, category, tags, is_top, status, publish_date } = req.body;

    if (!title) {
        error(res, '标题为必填');
        return;
    }

    newsDB.run(
        `UPDATE news SET 
            title = ?, content = ?, summary = ?, cover_image = ?, 
            category = ?, tags = ?, is_top = ?, status = ?, publish_date = ?,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [title, content || '', summary || '', cover_image || '', category || '公告', tags || '', is_top ? 1 : 0, status || '已发布', publish_date || getBeijingDate(), id],
        function(err) {
            if (err) {
                error(res, '更新失败: ' + err.message);
                return;
            }
            if (this.changes === 0) {
                error(res, '新闻不存在');
                return;
            }
            success(res, { message: '新闻更新成功' });
        }
    );
});

// 5. 删除新闻（管理员）
app.delete('/api/news/:id', (req, res) => {
    const { id } = req.params;

    newsDB.run(`DELETE FROM news WHERE id = ?`, [id], function(err) {
        if (err) {
            error(res, '删除失败: ' + err.message);
            return;
        }
        if (this.changes === 0) {
            error(res, '新闻不存在');
            return;
        }

        // 同时删除评论和点赞
        newsDB.run(`DELETE FROM comments WHERE news_id = ?`, [id]);
        newsDB.run(`DELETE FROM likes WHERE news_id = ?`, [id]);

        success(res, { message: '删除成功' });
    });
});

// 6. 上传封面图
app.post('/api/news/upload', upload.single('cover'), (req, res) => {
    if (!req.file) {
        error(res, '请选择图片');
        return;
    }
    success(res, {
        url: `/uploads/news/${req.file.filename}`,
        message: '上传成功'
    });
});

// 7. 获取评论列表
app.get('/api/news/:id/comments', (req, res) => {
    const { id } = req.params;

    newsDB.all(
        `SELECT * FROM comments WHERE news_id = ? ORDER BY created_at DESC`,
        [id],
        (err, rows) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }
            success(res, rows);
        }
    );
});

// 8. 发表评论（需登录）
app.post('/api/news/:id/comments', (req, res) => {
    const { id } = req.params;
    const { user_role, username, content } = req.body;

    if (!username || !content) {
        error(res, '请先登录并填写评论内容');
        return;
    }

    newsDB.run(
        `INSERT INTO comments (news_id, user_role, username, content) VALUES (?, ?, ?, ?)`,
        [id, user_role || 'member', username, content],
        function(err) {
            if (err) {
                error(res, '评论失败: ' + err.message);
                return;
            }
            success(res, { id: this.lastID, message: '评论成功' });
        }
    );
});

// 9. 删除评论（管理员）
app.delete('/api/comments/:id', (req, res) => {
    const { id } = req.params;

    newsDB.run(`DELETE FROM comments WHERE id = ?`, [id], function(err) {
        if (err) {
            error(res, '删除失败: ' + err.message);
            return;
        }
        if (this.changes === 0) {
            error(res, '评论不存在');
            return;
        }
        success(res, { message: '删除成功' });
    });
});

// 10. 点赞/取消点赞（需登录）
app.post('/api/news/:id/like', (req, res) => {
    const { id } = req.params;
    const { username } = req.body;

    if (!username) {
        error(res, '请先登录');
        return;
    }

    // 检查是否已点赞
    newsDB.get(`SELECT * FROM likes WHERE news_id = ? AND username = ?`, [id, username], (err, row) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }

        if (row) {
            // 取消点赞
            newsDB.run(`DELETE FROM likes WHERE news_id = ? AND username = ?`, [id, username], (err2) => {
                if (err2) {
                    error(res, '取消点赞失败: ' + err2.message);
                    return;
                }
                newsDB.run(`UPDATE news SET likes = likes - 1 WHERE id = ?`, [id]);
                success(res, { liked: false, message: '已取消点赞' });
            });
        } else {
            // 点赞
            newsDB.run(`INSERT INTO likes (news_id, username) VALUES (?, ?)`, [id, username], (err2) => {
                if (err2) {
                    error(res, '点赞失败: ' + err2.message);
                    return;
                }
                newsDB.run(`UPDATE news SET likes = likes + 1 WHERE id = ?`, [id]);
                success(res, { liked: true, message: '点赞成功' });
            });
        }
    });
});

// 11. 获取点赞人列表
app.get('/api/news/:id/likes', (req, res) => {
    const { id } = req.params;

    newsDB.all(
        `SELECT username, user_role, created_at FROM likes WHERE news_id = ? ORDER BY created_at DESC`,
        [id],
        (err, rows) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }
            success(res, rows);
        }
    );
});

// ============================================================
// 排课 & 预约接口
// ============================================================

// 1. 获取地点列表
app.get('/api/locations', (req, res) => {
    scheduleDB.all(`SELECT * FROM locations WHERE status = '启用' ORDER BY id ASC`, (err, rows) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        success(res, rows);
    });
});

// 2. 添加地点
app.post('/api/locations', (req, res) => {
    const { name } = req.body;
    if (!name) {
        error(res, '地点名为必填');
        return;
    }
    scheduleDB.run(`INSERT INTO locations (name) VALUES (?)`, [name], function(err) {
        if (err) {
            error(res, '添加失败: ' + err.message);
            return;
        }
        success(res, { id: this.lastID, message: '地点添加成功' });
    });
});

// 3. 修改地点
app.put('/api/locations/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
        error(res, '地点名为必填');
        return;
    }
    scheduleDB.run(`UPDATE locations SET name = ? WHERE id = ?`, [name, id], function(err) {
        if (err) {
            error(res, '更新失败: ' + err.message);
            return;
        }
        success(res, { message: '地点更新成功' });
    });
});

// 4. 删除地点
app.delete('/api/locations/:id', (req, res) => {
    const { id } = req.params;
    scheduleDB.run(`UPDATE locations SET status = '停用' WHERE id = ?`, [id], function(err) {
        if (err) {
            error(res, '删除失败: ' + err.message);
            return;
        }
        success(res, { message: '地点已删除' });
    });
});

// 5. 获取课程列表
// 管理员：全部；教练/会员：默认未来 10 天
app.get('/api/schedule', (req, res) => {
    const { start, end, coach, role } = req.query;
    let sql = `SELECT * FROM practice_schedule WHERE status = '正常'`;
    const params = [];

    if (start) {
        sql += ` AND date >= ?`;
        params.push(start);
    }
    if (end) {
        sql += ` AND date <= ?`;
        params.push(end);
    }
    if (coach) {
        sql += ` AND coach_name = ?`;
        params.push(coach);
    }

    sql += ` ORDER BY date ASC, start_time ASC`;

    scheduleDB.all(sql, params, (err, rows) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        success(res, rows);
    });
});

// 6. 添加课程（支持单日、多日、每周重复）
app.post('/api/schedule', (req, res) => {
    const {
        repeat_type,      // 'none' | 'weekly'
        dates,            // repeat_type='none' 时用，日期数组
        start_date,       // repeat_type='weekly' 时用
        repeat_count,     // weekly 重复次数
        start_time,
        end_time,
        class_name,
        coach_name,
        location,
        max_capacity,
        notes
    } = req.body;

    if (!start_time || !end_time || !class_name) {
        error(res, '时间、课程名为必填');
        return;
    }

    // 生成日期列表
    let finalDates = [];
    if (repeat_type === 'weekly') {
        if (!start_date || !repeat_count || repeat_count < 1) {
            error(res, '每周重复需要起始日期和次数');
            return;
        }
        const base = new Date(start_date + 'T00:00:00');
        for (let i = 0; i < repeat_count; i++) {
            const d = new Date(base);
            d.setDate(d.getDate() + i * 7);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            finalDates.push(`${y}-${m}-${day}`);
        }
    } else {
        if (!dates || !dates.length) {
            error(res, '请选择至少一个日期');
            return;
        }
        finalDates = dates;
    }

    let completed = 0;
    let addedIds = [];

    finalDates.forEach(date => {
        scheduleDB.run(
            `INSERT INTO practice_schedule (date, start_time, end_time, class_name, coach_name, location, max_capacity, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [date, start_time, end_time, class_name, coach_name || '', location || '', max_capacity || 10, notes || ''],
            function(err) {
                if (!err) addedIds.push(this.lastID);
                completed++;
                if (completed === finalDates.length) {
                    success(res, { ids: addedIds, message: `成功添加 ${addedIds.length} 节课` });
                }
            }
        );
    });
});

// 7. 修改课程
app.put('/api/schedule/:id', (req, res) => {
    const { id } = req.params;
    const { date, start_time, end_time, class_name, coach_name, location, max_capacity, notes } = req.body;

    const todayStr = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // 先查课程原日期
    scheduleDB.get(`SELECT date FROM practice_schedule WHERE id = ?`, [id], (err0, row) => {
        if (err0 || !row) {
            error(res, '课程不存在');
            return;
        }
        if (row.date < todayStr) {
            error(res, '不能编辑过去的课程');
            return;
        }

        scheduleDB.run(
            `UPDATE practice_schedule SET 
                date = ?, start_time = ?, end_time = ?, class_name = ?, 
                coach_name = ?, location = ?, max_capacity = ?, notes = ?
            WHERE id = ?`,
            [date, start_time, end_time, class_name, coach_name || '', location || '', max_capacity || 10, notes || '', id],
            function(err) {
                if (err) {
                    error(res, '更新失败: ' + err.message);
                    return;
                }
                success(res, { message: '课程更新成功' });
            }
        );
    });
});

// 8. 删除课程
// app.delete('/api/schedule/:id', (req, res) => {
//     const { id } = req.params;
//     scheduleDB.run(`UPDATE practice_schedule SET status = '已取消' WHERE id = ?`, [id], function(err) {
//         if (err) {
//             error(res, '删除失败: ' + err.message);
//             return;
//         }
//         success(res, { message: '课程已取消' });
//     });
// });

app.delete('/api/schedule/:id', (req, res) => {
    const { id } = req.params;

    const todayStr = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

    scheduleDB.get(`SELECT date FROM practice_schedule WHERE id = ?`, [id], (err0, row) => {
        if (err0 || !row) {
            error(res, '课程不存在');
            return;
        }
        if (row.date < todayStr) {
            error(res, '不能删除过去的课程');
            return;
        }

        scheduleDB.run(`UPDATE practice_schedule SET status = '已取消' WHERE id = ?`, [id], function(err) {
            if (err) {
                error(res, '删除失败: ' + err.message);
                return;
            }
            success(res, { message: '课程已取消' });
        });
    });
});

// 9. 会员预约
app.post('/api/schedule/:id/book', (req, res) => {
    const { id } = req.params;
    const { member_id, member_name } = req.body;

    if (!member_id || !member_name) {
        error(res, '请先登录');
        return;
    }

    scheduleDB.get(
        `SELECT * FROM bookings WHERE schedule_id = ? AND member_id = ? AND status = '已预约'`,
        [id, member_id],
        (err, existing) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }
            if (existing) {
                error(res, '你已预约这节课');
                return;
            }

            scheduleDB.get(`SELECT * FROM practice_schedule WHERE id = ? AND status = '正常'`, [id], (err2, course) => {
                if (err2 || !course) {
                    error(res, '课程不存在');
                    return;
                }

                scheduleDB.run(
                    `INSERT INTO bookings (schedule_id, member_id, member_name) VALUES (?, ?, ?)`,
                    [id, member_id, member_name],
                    function(err3) {
                        if (err3) {
                            error(res, '预约失败: ' + err3.message);
                            return;
                        }

                        scheduleDB.run(
                            `UPDATE practice_schedule SET booked_count = booked_count + 1 WHERE id = ?`,
                            [id]
                        );

                        const isFull = course.booked_count + 1 >= course.max_capacity;
                        success(res, {
                            message: isFull ? '预约成功（已满，你是候补）' : '预约成功',
                            isWaiting: isFull
                        });
                    }
                );
            });
        }
    );
});

// 10. 会员取消预约
app.delete('/api/schedule/:id/book', (req, res) => {
    const { id } = req.params;
    const { member_id } = req.body;

    scheduleDB.run(
        `UPDATE bookings SET status = '已取消' WHERE schedule_id = ? AND member_id = ? AND status = '已预约'`,
        [id, member_id],
        function(err) {
            if (err) {
                error(res, '取消失败: ' + err.message);
                return;
            }
            if (this.changes === 0) {
                error(res, '未找到预约记录');
                return;
            }

            scheduleDB.run(
                `UPDATE practice_schedule SET booked_count = booked_count - 1 WHERE id = ? AND booked_count > 0`,
                [id]
            );

            success(res, { message: '已取消预约' });
        }
    );
});

// 11. 查看某课的预约名单
app.get('/api/schedule/:id/bookings', (req, res) => {
    const { id } = req.params;
    scheduleDB.all(
        `SELECT * FROM bookings WHERE schedule_id = ? AND status = '已预约' ORDER BY created_at ASC`,
        [id],
        (err, rows) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }
            success(res, rows);
        }
    );
});

// 12. 获取某会员的预约记录
app.get('/api/member/:memberId/bookings', (req, res) => {
    const { memberId } = req.params;
    scheduleDB.all(
        `SELECT b.*, s.date, s.start_time, s.end_time, s.class_name, s.coach_name, s.location 
         FROM bookings b 
         LEFT JOIN practice_schedule s ON b.schedule_id = s.id 
         WHERE b.member_id = ? AND b.status = '已预约' 
         ORDER BY s.date ASC, s.start_time ASC`,
        [memberId],
        (err, rows) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }
            success(res, rows);
        }
    );
});


// ============================================================
// 启动服务器
// ============================================================
// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//     console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
//     console.log(`📋 API 接口: http://localhost:${PORT}/api/members`);
// });

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket 连接管理
wss.on('connection', (ws) => {
    console.log('🔗 WebSocket 客户端已连接');
    ws.on('close', () => {
        console.log('🔌 WebSocket 客户端已断开');
    });
});

// 广播函数
function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

server.listen(PORT, () => {
    console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
    console.log(`📋 API 接口: http://localhost:${PORT}/api/members`);
});
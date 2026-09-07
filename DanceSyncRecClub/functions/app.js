const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// ============================================================
// 中间件
// ============================================================
app.use(cors());
app.use(logger("dev"));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
// 数据库连接
// ============================================================
const DB_PATH = path.join(__dirname, '../club-membership/server');

// 如果没有数据库文件，使用当前目录
const fs = require('fs');
const dbPath = fs.existsSync(DB_PATH) ? DB_PATH : __dirname;

const memberPassDB = new sqlite3.Database(path.join(dbPath, 'memberpass.db'));
const coachPassDB = new sqlite3.Database(path.join(dbPath, 'coachpass.db'));
const adminPassDB = new sqlite3.Database(path.join(dbPath, 'adminpass.db'));
const coachListDB = new sqlite3.Database(path.join(dbPath, 'coachs.db'));
const adminListDB = new sqlite3.Database(path.join(dbPath, 'admins.db'));
const membersDB = new sqlite3.Database(path.join(dbPath, 'members.db'));
const transactionsDB = new sqlite3.Database(path.join(dbPath, 'transactions.db'));
const attendanceDB = new sqlite3.Database(path.join(dbPath, 'attendance_records.db'));
const cardTypesDB = new sqlite3.Database(path.join(dbPath, 'card_types.db'));
const cardsDB = new sqlite3.Database(path.join(dbPath, 'membership_cards.db'));
const scanDB = new sqlite3.Database(path.join(dbPath, 'scan_consumptions.db'));
const financesDB = new sqlite3.Database(path.join(dbPath, 'finances.db'));
const fixedExpensesDB = new sqlite3.Database(path.join(dbPath, 'fixed_expenses.db'));

// ============================================================
// 工具函数
// ============================================================
function success(res, data) {
    res.json({ code: 0, data, message: 'success' });
}

function error(res, message, code = 1) {
    res.status(400).json({ code, message });
}

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
// 所有 API 路由（从 server.js 移植）
// ============================================================

// 1. 获取所有会员列表
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

// 2. 获取单个会员详情
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

        transactionsDB.all(
            `SELECT * FROM transactions WHERE member_id = ? ORDER BY created_at DESC`,
            [id],
            (err2, transactions) => {
                if (err2) {
                    error(res, '查询消费记录失败: ' + err2.message);
                    return;
                }

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

// 3. 新增会员
app.post('/api/members', (req, res) => {
    const { name, nickname, gender, phone, expiry_date, notes } = req.body;

    if (!name || !phone) {
        error(res, '姓名和手机号为必填');
        return;
    }

    membersDB.get(`SELECT * FROM members WHERE phone = ? AND deleted = 0`, [phone], (err, existing) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        if (existing) {
            error(res, '该手机号已注册');
            return;
        }

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
                    new Date().toISOString().slice(0, 10)
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
// 登录验证接口
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
// 注册接口
// ============================================================
app.post('/api/register', (req, res) => {
    const { username, password, name, phone } = req.body;

    if (!username || !password || !name || !phone) {
        error(res, '所有字段均为必填');
        return;
    }

    memberPassDB.get(`SELECT * FROM memberpass WHERE username = ?`, [username], (err, existing) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        if (existing) {
            error(res, '用户名已被占用');
            return;
        }

        membersDB.get(`SELECT * FROM members WHERE phone = ? AND deleted = 0`, [phone], (err2, existing2) => {
            if (err2) {
                error(res, '查询失败: ' + err2.message);
                return;
            }
            if (existing2) {
                error(res, '该手机号已注册');
                return;
            }

            generateMemberNo((err3, memberNo) => {
                if (err3) {
                    error(res, '生成会员编号失败: ' + err3.message);
                    return;
                }

                memberPassDB.run(
                    `INSERT INTO memberpass (username, password) VALUES (?, ?)`,
                    [username, password],
                    function(err4) {
                        if (err4) {
                            error(res, '注册失败: ' + err4.message);
                            return;
                        }

                        membersDB.run(
                            `INSERT INTO members (
                                member_no, name, phone, status, register_date
                            ) VALUES (?, ?, ?, ?, ?)`,
                            [
                                memberNo,
                                name,
                                phone,
                                '冻结',
                                new Date().toISOString().slice(0, 10)
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
app.get('/api/dashboard/stats', (req, res) => {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear();
    const monthStart = `${currentYear}-${currentMonth}-01`;

    membersDB.get(`SELECT COUNT(*) as total FROM members WHERE deleted = 0`, (err, totalRow) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }

        membersDB.get(
            `SELECT COUNT(*) as monthly FROM members WHERE deleted = 0 AND register_date >= ?`,
            [monthStart],
            (err2, monthlyRow) => {
                if (err2) {
                    error(res, '查询失败: ' + err2.message);
                    return;
                }

                membersDB.get(
                    `SELECT COUNT(*) as active FROM members WHERE deleted = 0 AND status = '活跃'`,
                    (err3, activeRow) => {
                        if (err3) {
                            error(res, '查询失败: ' + err3.message);
                            return;
                        }

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

app.get('/api/dashboard/status-distribution', (req, res) => {
    membersDB.all(
        `SELECT status, COUNT(*) as count FROM members WHERE deleted = 0 GROUP BY status`,
        (err, rows) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }

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

app.get('/api/dashboard/expiring-members', (req, res) => {
    const today = new Date();
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const todayStr = today.toISOString().slice(0, 10);
    const sevenDaysStr = sevenDaysLater.toISOString().slice(0, 10);

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
app.get('/api/finances/stats', (req, res) => {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear();
    const monthStart = `${currentYear}-${currentMonth}-01`;
    const monthEnd = `${currentYear}-${currentMonth}-31`;

    financesDB.get(
        `SELECT SUM(amount) as income FROM finances 
         WHERE type = 'income' AND date >= ? AND date <= ?`,
        [monthStart, monthEnd],
        (err, incomeRow) => {
            if (err) {
                error(res, '查询失败: ' + err.message);
                return;
            }

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

app.post('/api/finances', (req, res) => {
    const { type, category, amount, description, date, payment_method } = req.body;

    if (!type || !category || !amount || !date) {
        error(res, '类型、分类、金额、日期为必填');
        return;
    }

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

// ============================================================
// 会员卡/扫码消费接口
// ============================================================
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

app.get('/api/member-cards/by-no/:memberNo', (req, res) => {
    const { memberNo } = req.params;

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

    membersDB.get(`SELECT id, name FROM members WHERE member_no = ? AND deleted = 0`, [memberNo], (err, member) => {
        if (err) {
            error(res, '查询失败: ' + err.message);
            return;
        }
        if (!member) {
            error(res, '会员不存在');
            return;
        }

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

            // 期限卡逻辑
            if (card.card_category === 'unlimited') {
                if (card.expiry_date && new Date(card.expiry_date) < new Date()) {
                    cardsDB.run(`UPDATE membership_cards SET status = '已过期' WHERE id = ?`, [cardId], () => {});
                    error(res, '该卡已过期');
                    return;
                }

                const now = new Date();
                const today = now.toISOString().slice(0, 10);

                scanDB.all(
                    `SELECT * FROM scan_consumptions 
                     WHERE member_id = ? AND consume_date = ? AND source = 'user'`,
                    [member.id, today],
                    (err3, todayRecords) => {
                        if (err3) {
                            error(res, '查询签到记录失败: ' + err3.message);
                            return;
                        }

                        if (todayRecords.length >= 2) {
                            error(res, '今日签到已达上限（每日最多2次）');
                            return;
                        }

                        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
                        const oneHourAgoStr = oneHourAgo.toISOString();

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
                                    error(res, '1小时内已签到，请稍后再试');
                                    return;
                                }

                                const nowStr = now.toISOString().slice(0, 10);

                                scanDB.run(
                                    `INSERT INTO scan_consumptions (member_id, card_id, consume_count, consume_date, class_name, source, notes) 
                                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                    [member.id, cardId, 1, nowStr, className || '', source || 'user', '期限卡签到'],
                                    function(err5) {
                                        if (err5) {
                                            error(res, '记录签到失败: ' + err5.message);
                                            return;
                                        }

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

            // 次卡逻辑
            if (card.card_category === 'fixed') {
                if (card.remaining_count < count) {
                    error(res, `剩余次数不足（剩余 ${card.remaining_count} 次，需要 ${count} 次）`);
                    return;
                }

                const newRemaining = card.remaining_count - count;
                const newUsed = card.used_count + count;
                const today = new Date().toISOString().slice(0, 10);

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
                            `INSERT INTO scan_consumptions (member_id, card_id, consume_count, consume_date, class_name, source, notes) 
                             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [member.id, cardId, count, today, className || '', source || 'user', `扣${count}次`],
                            function(err4) {
                                if (err4) {
                                    error(res, '记录消费失败: ' + err4.message);
                                    return;
                                }

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

            error(res, '不支持的卡类型');
        });
    });
});

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

        scanDB.all(
            `SELECT * FROM scan_consumptions WHERE member_id = ? ORDER BY created_at DESC LIMIT ?`,
            [member.id, parseInt(limit)],
            (err2, rows) => {
                if (err2) {
                    error(res, '查询失败: ' + err2.message);
                    return;
                }

                let completed = 0;
                rows.forEach((row, index) => {
                    cardsDB.get(
                        `SELECT card_category FROM membership_cards WHERE id = ?`,
                        [row.card_id],
                        (err3, card) => {
                            if (!err3 && card) {
                                rows[index].card_category = card.card_category;
                            } else {
                                rows[index].card_category = '未知卡';
                            }
                            completed++;
                            if (completed === rows.length) {
                                success(res, rows);
                            }
                        }
                    );
                });

                if (rows.length === 0) {
                    success(res, rows);
                }
            }
        );
    });
});

app.post('/api/member-cards', (req, res) => {
    const { memberId, cardType, cardCategory, totalCount, price, purchaseDate, expiryDate } = req.body;

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
        [memberId, cardType, category, count, remaining, price, purchaseDate || new Date().toISOString().slice(0, 10), expiryDate || null],
        function(err) {
            if (err) {
                error(res, '添加次卡失败: ' + err.message);
                return;
            }

            const today = new Date().toISOString().slice(0, 10);
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

// ============================================================
// 卡种管理接口
// ============================================================
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

app.get('/api/card-types/stats', (req, res) => {
    cardTypesDB.all(`SELECT status FROM card_types`, (err, rows) => {
        if (err) {
            success(res, { total: 0, active: 0, inactive: 0 });
            return;
        }
        const total = rows.length;
        const active = rows.filter(r => r.status === '启用').length;
        const inactive = rows.filter(r => r.status === '停用').length;
        success(res, { total, active, inactive });
    });
});

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

app.post('/api/card-types', (req, res) => {
    const { name, card_category, total_count, price, sort_order, status, description } = req.body;

    console.log('📥 收到添加卡种请求:', { name, card_category, total_count, price, sort_order, status, description });

    if (!name || !card_category || !price) {
        error(res, '卡种名称、类型、价格为必填');
        return;
    }

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

app.put('/api/card-types/:id', (req, res) => {
    const { id } = req.params;
    const { name, card_category, total_count, price, sort_order, status, description } = req.body;

    console.log('📥 收到修改卡种请求:', { id, name, card_category, total_count, price, sort_order, status, description });

    if (!name || !card_category || !price) {
        error(res, '卡种名称、类型、价格为必填');
        return;
    }

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

// ============================================================
// 验证会员（扫码枪用）
// ============================================================
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

app.get('/', (req, res) => {
  res.send('CloudBase 后端服务运行正常！');
});

// ============================================================
// 404 和错误处理
// ============================================================
// 此处的404 错误处理使用了 res.render('error')，但项目里没有配置视图引擎。
// app.use(function (req, res, next) {
//     next(createError(404));
// });

// app.use(function (err, req, res, next) {
//     res.locals.message = err.message;
//     res.locals.error = req.app.get('env') === 'development' ? err : {};
//     res.status(err.status || 500);
//     res.render('error');
// });


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;


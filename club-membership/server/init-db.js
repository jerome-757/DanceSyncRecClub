const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径（都在 server 目录下）
const DB_PATH = __dirname;

// 连接所有数据库
const memberDB = new sqlite3.Database(path.join(DB_PATH, 'memberpass.db'));
const coachDB = new sqlite3.Database(path.join(DB_PATH, 'coachpass.db'));
const adminDB = new sqlite3.Database(path.join(DB_PATH, 'adminpass.db'));
const coachListDB = new sqlite3.Database(path.join(DB_PATH, 'coachs.db'));
const adminListDB = new sqlite3.Database(path.join(DB_PATH, 'admins.db'));
const membersDB = new sqlite3.Database(path.join(DB_PATH, 'members.db'));

// === 新建数据库 ===
const transactionsDB = new sqlite3.Database(path.join(DB_PATH, 'transactions.db'));
const attendanceDB = new sqlite3.Database(path.join(DB_PATH, 'attendance_records.db'));

// ============================================================
// 1. 创建 members 表（会员信息）
// ============================================================
membersDB.serialize(() => {
    membersDB.run(`CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_no TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        nickname TEXT,
        gender TEXT,
        phone TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT '冻结',
        monthly_attendance INTEGER DEFAULT 0,
        total_attendance INTEGER DEFAULT 0,
        total_spent INTEGER DEFAULT 0,
        paid_amount INTEGER DEFAULT 0,
        expiry_date TEXT,
        register_date TEXT DEFAULT CURRENT_DATE,
        deleted INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('❌ members 表创建失败:', err.message);
        } else {
            console.log('✅ members 表创建成功');
        }
    });

    // 插入示例会员
    membersDB.get(`SELECT * FROM members WHERE member_no = 'XF26090501'`, (err, row) => {
        if (!row) {
            membersDB.run(`INSERT INTO members (
                member_no, name, nickname, gender, phone, status, 
                monthly_attendance, total_attendance, total_spent, paid_amount, 
                expiry_date, register_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                'XF26090501', '朱总', '魅影', '男', '13710001000', '冻结',
                4, 12, 2800, 200,
                '2026-12-31', '2026-01-15'
            ], (err) => {
                if (!err) console.log('✅ 示例会员插入成功: 朱总');
            });
        }
    });
});

// ============================================================
// 2. 创建 transactions 表（消费记录）
// ============================================================
transactionsDB.serialize(() => {
    transactionsDB.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        payment_method TEXT,
        note TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES members(id)
    )`, (err) => {
        if (err) {
            console.error('❌ transactions 表创建失败:', err.message);
        } else {
            console.log('✅ transactions 表创建成功');
        }
    });

    // 插入示例消费记录（关联 member_id=1）
    transactionsDB.get(`SELECT * FROM transactions WHERE member_id = 1`, (err, row) => {
        if (!row) {
            transactionsDB.run(`INSERT INTO transactions (member_id, amount, type, payment_method, note) VALUES 
                (1, 200, '包月', '微信', '1月会费'),
                (1, 200, '包月', '现金', '2月会费'),
                (1, 200, '包月', '支付宝', '3月会费')
            `, (err) => {
                if (!err) console.log('✅ 示例消费记录插入成功');
            });
        }
    });
});

// ============================================================
// 3. 创建 attendance_records 表（出勤记录）
// ============================================================
attendanceDB.serialize(() => {
    attendanceDB.run(`CREATE TABLE IF NOT EXISTS attendance_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        class_name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES members(id)
    )`, (err) => {
        if (err) {
            console.error('❌ attendance_records 表创建失败:', err.message);
        } else {
            console.log('✅ attendance_records 表创建成功');
        }
    });

    // 插入示例出勤记录
    attendanceDB.get(`SELECT * FROM attendance_records WHERE member_id = 1`, (err, row) => {
        if (!row) {
            attendanceDB.run(`INSERT INTO attendance_records (member_id, date, class_name) VALUES 
                (1, '2026-09-01', 'Salsa'),
                (1, '2026-09-03', 'Bachata'),
                (1, '2026-09-05', '交谊舞')
            `, (err) => {
                if (!err) console.log('✅ 示例出勤记录插入成功');
            });
        }
    });
});

// ============================================================
// 4. 登录表（已有，确保表存在并插入默认账号）
// ============================================================
function initLoginDB(db, tableName, username, password, role) {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS ${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )`);

        db.get(`SELECT * FROM ${tableName} WHERE username = ?`, [username], (err, row) => {
            if (!row && !err) {
                db.run(`INSERT INTO ${tableName} (username, password) VALUES (?, ?)`, [username, password], (err) => {
                    if (!err) console.log(`✅ 默认${role}账号: ${username} / ${password}`);
                });
            }
        });
    });
}

initLoginDB(memberDB, 'memberpass', 'member', 'memberr', '会员');
initLoginDB(coachDB, 'coachpass', 'coach', 'coachh', '教练');
initLoginDB(adminDB, 'adminpass', 'admin', 'adminn', '管理员');

// ============================================================
// 5. 教练信息表（已有，确保存在）
// ============================================================
coachListDB.serialize(() => {
    coachListDB.run(`CREATE TABLE IF NOT EXISTS coachs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        email TEXT,
        specialty TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (!err) console.log('✅ coachs 表已就绪');
    });
});

// ============================================================
// 6. 管理员信息表（已有，确保存在）
// ============================================================
adminListDB.serialize(() => {
    adminListDB.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        email TEXT,
        role TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (!err) console.log('✅ admins 表已就绪');
    });
});

// ============================================================
// 7. 创建 finances 表（收支记录）
// ============================================================
const financesDB = new sqlite3.Database(path.join(DB_PATH, 'finances.db'));

financesDB.serialize(() => {
    financesDB.run(`CREATE TABLE IF NOT EXISTS finances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        payment_method TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('❌ finances 表创建失败:', err.message);
        } else {
            console.log('✅ finances 表创建成功');
        }
    });

    // 插入示例收支记录
    financesDB.get(`SELECT * FROM finances LIMIT 1`, (err, row) => {
        if (!row && !err) {
            const today = new Date().toISOString().slice(0, 10);
            financesDB.run(`INSERT INTO finances (type, category, amount, description, date, payment_method) VALUES 
                ('income', '会费', 2000, '9月会员会费', '${today}', '微信'),
                ('expense', '场地租金', -1500, '9月场地租金', '${today}', '银行转账'),
                ('income', '按次收费', 600, '散客收入', '${today}', '现金'),
                ('expense', '教练工资', -2000, '9月教练工资', '${today}', '微信'),
                ('income', '课程费', 800, '私教课收入', '${today}', '支付宝')
            `, (err) => {
                if (!err) console.log('✅ 示例财务记录插入成功');
            });
        }
    });
});

// ============================================================
// 8. 创建 fixed_expenses 表（固定支出配置）
// ============================================================
const fixedExpensesDB = new sqlite3.Database(path.join(DB_PATH, 'fixed_expenses.db'));

fixedExpensesDB.serialize(() => {
    fixedExpensesDB.run(`CREATE TABLE IF NOT EXISTS fixed_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        amount INTEGER NOT NULL,
        due_day INTEGER NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('❌ fixed_expenses 表创建失败:', err.message);
        } else {
            console.log('✅ fixed_expenses 表创建成功');
        }
    });

    // 插入默认固定支出
    fixedExpensesDB.get(`SELECT * FROM fixed_expenses LIMIT 1`, (err, row) => {
        if (!row && !err) {
            fixedExpensesDB.run(`INSERT INTO fixed_expenses (category, amount, due_day, description) VALUES 
                ('场地租金', 1500, 5, '每月5号交场地租金'),
                ('教练工资', 2000, 1, '每月1号发教练工资')
            `, (err) => {
                if (!err) console.log('✅ 默认固定支出插入成功');
            });
        }
    });
});

// ============================================================
// 9. 创建次卡表 (membership_cards)
// ============================================================
const cardsDB = new sqlite3.Database(path.join(DB_PATH, 'membership_cards.db'));

cardsDB.serialize(() => {
    cardsDB.run(`CREATE TABLE IF NOT EXISTS membership_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        card_type TEXT NOT NULL,
        card_category TEXT DEFAULT 'fixed',   -- 新增：'fixed' / 'unlimited'
        total_count INTEGER DEFAULT 10,
        used_count INTEGER DEFAULT 0,
        remaining_count INTEGER DEFAULT 0,
        price INTEGER NOT NULL,
        purchase_date TEXT NOT NULL,
        expiry_date TEXT,
        status TEXT DEFAULT '有效',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES members(id)
    )`, (err) => {
        if (err) {
            console.error('❌ membership_cards 表创建失败:', err.message);
        } else {
            console.log('✅ membership_cards 表创建成功');
        }
    });

    // 插入示例次卡（关联会员朱总）
    cardsDB.get(`SELECT * FROM membership_cards WHERE member_id = 1`, (err, row) => {
        if (!row && !err) {
            const today = new Date().toISOString().slice(0, 10);
            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            const expiry = nextYear.toISOString().slice(0, 10);
            
            cardsDB.run(`INSERT INTO membership_cards 
                (member_id, card_type, total_count, used_count, remaining_count, price, purchase_date, expiry_date, status) 
                VALUES 
                (1, '10次卡', 10, 0, 10, 500, '${today}', '${expiry}', '有效'),
                (1, '月卡', 0, 0, 0, 300, '${today}', '${expiry}', '有效')
            `, (err) => {
                if (!err) console.log('✅ 示例次卡插入成功');
            });
        }
    });
});

// ============================================================
// 10. 创建扫码消费记录表 (scan_consumptions)
// ============================================================
const scanDB = new sqlite3.Database(path.join(DB_PATH, 'scan_consumptions.db'));

scanDB.serialize(() => {
    scanDB.run(`CREATE TABLE IF NOT EXISTS scan_consumptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        card_id INTEGER NOT NULL,
        consume_count INTEGER DEFAULT 1,
        consume_date TEXT NOT NULL,
        class_name TEXT,
        source TEXT,
        ip_address TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES members(id),
        FOREIGN KEY (card_id) REFERENCES membership_cards(id)
    )`, (err) => {
        if (err) {
            console.error('❌ scan_consumptions 表创建失败:', err.message);
        } else {
            console.log('✅ scan_consumptions 表创建成功');
        }
    });
});

// ============================================================
// 11. 创建卡种表 (card_types)
// ============================================================
const cardTypesDB = new sqlite3.Database(path.join(DB_PATH, 'card_types.db'));

cardTypesDB.serialize(() => {
    cardTypesDB.run(`CREATE TABLE IF NOT EXISTS card_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        card_type TEXT NOT NULL,          -- 'fixed' / 'unlimited'（保留兼容）
        card_category TEXT NOT NULL,      -- 'fixed' 次卡 / 'unlimited' 期限卡
        total_count INTEGER DEFAULT 0,
        price INTEGER NOT NULL,
        sort_order INTEGER DEFAULT 0,
        status TEXT DEFAULT '启用',
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('❌ card_types 表创建失败:', err.message);
        } else {
            console.log('✅ card_types 表创建成功');
        }
    });

    // 插入默认卡种
    cardTypesDB.get(`SELECT * FROM card_types LIMIT 1`, (err, row) => {
        if (!row && !err) {
            const defaultCards = [
                ['单次卡', 'fixed', 'fixed', 1, 8, 1, '停用', '单次体验卡']
                ['10次卡', 'fixed', 'fixed', 10, 50, 2, '启用', '10次计次卡'],
                ['30次卡', 'fixed', 'fixed', 30, 150, 3, '启用', '30次计次卡'],
                ['月卡', 'unlimited', 'unlimited', 0, 100, 4, '启用', '30天期限卡'],
                ['季卡', 'unlimited', 'unlimited', 0, 300, 5, '启用', '90天期限卡'],
                ['年卡', 'unlimited', 'unlimited', 0, 1000, 6, '启用', '365天期限卡'],
            ];

            defaultCards.forEach(([name, card_type, card_category, total_count, price, sort_order, status, description]) => {
                cardTypesDB.run(
                    `INSERT INTO card_types (name, card_type, card_category, total_count, price, sort_order, status, description) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [name, card_type, card_category, total_count, price, sort_order, status, description],
                    (err) => {
                        if (!err) console.log(`✅ 默认卡种添加: ${name}`);
                    }
                );
            });
        }
    });
});


// ============================================================
// 关闭所有数据库连接
// ============================================================
setTimeout(() => {
    memberDB.close();
    coachDB.close();
    adminDB.close();
    coachListDB.close();
    adminListDB.close();
    membersDB.close();
    transactionsDB.close();
    attendanceDB.close();
    console.log('\n✅ 数据库初始化完成！');
    console.log('\n📋 默认登录账号：');
    console.log('   👤 管理员: admin / adminn');
    console.log('   👤 会员:   member / memberr');
    console.log('   👤 教练:   coach / coachh');
    console.log('\n📋 示例会员: 朱总 (XF26090501)');
    financesDB.close();
    fixedExpensesDB.close();
    console.log('\n✅ 数据库初始化完成！');  
    cardTypesDB.close();
    console.log('\n✅ 数据库初始化完成！');  
}, 500);
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data');
const scheduleDB = new sqlite3.Database(path.join(DB_PATH, 'schedule.db'));

scheduleDB.serialize(() => {
    // 地点表
    scheduleDB.run(`CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT DEFAULT '启用',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('❌ locations 表创建失败:', err.message);
        else console.log('✅ locations 表创建成功');
    });

    // 课程表
    scheduleDB.run(`CREATE TABLE IF NOT EXISTS practice_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        class_name TEXT NOT NULL,
        coach_name TEXT,
        location TEXT,
        max_capacity INTEGER DEFAULT 10,
        booked_count INTEGER DEFAULT 0,
        status TEXT DEFAULT '正常',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('❌ practice_schedule 表创建失败:', err.message);
        else console.log('✅ practice_schedule 表创建成功');
    });

    // 预约表
    scheduleDB.run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER NOT NULL,
        member_id INTEGER NOT NULL,
        member_name TEXT,
        status TEXT DEFAULT '已预约',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('❌ bookings 表创建失败:', err.message);
        else console.log('✅ bookings 表创建成功');
    });

    // 预置地点
    scheduleDB.get(`SELECT COUNT(*) as count FROM locations`, (err, row) => {
        if (!err && row.count === 0) {
            const defaultLocations = ['舞厅', '练舞室', '瑜伽房', '球场'];
            defaultLocations.forEach(name => {
                scheduleDB.run(`INSERT INTO locations (name) VALUES (?)`, [name], (err2) => {
                    if (!err2) console.log(`✅ 预置地点: ${name}`);
                });
            });
        }
    });
});

setTimeout(() => {
    scheduleDB.close();
    console.log('\n✅ 排课数据库初始化完成！');
}, 1000);
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data');

// 新闻表
const newsDB = new sqlite3.Database(path.join(DB_PATH, 'news.db'));

newsDB.serialize(() => {
    newsDB.run(`CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        summary TEXT,
        cover_image TEXT,
        category TEXT DEFAULT '公告',
        tags TEXT,
        is_top INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        author TEXT,
        status TEXT DEFAULT '已发布',
        publish_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('❌ news 表创建失败:', err.message);
        else console.log('✅ news 表创建成功');
    });

    // 评论表
    newsDB.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        news_id INTEGER NOT NULL,
        user_role TEXT,
        username TEXT,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (news_id) REFERENCES news(id)
    )`, (err) => {
        if (err) console.error('❌ comments 表创建失败:', err.message);
        else console.log('✅ comments 表创建成功');
    });

    // 点赞表
    newsDB.run(`CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        news_id INTEGER NOT NULL,
        user_role TEXT,
        username TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(news_id, username),
        FOREIGN KEY (news_id) REFERENCES news(id)
    )`, (err) => {
        if (err) console.error('❌ likes 表创建失败:', err.message);
        else console.log('✅ likes 表创建成功');
    });

    // 插入示例新闻
    newsDB.get(`SELECT COUNT(*) as count FROM news`, (err, row) => {
        if (!err && row.count === 0) {
            const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
            newsDB.run(`INSERT INTO news (title, content, summary, cover_image, category, tags, is_top, views, likes, author, status, publish_date) VALUES 
                ('星发舞蹈俱乐部春季招生开始啦！', '<p>欢迎新老会员报名参加...</p>', '春季招生正式启动，欢迎报名', '', '公告', '招生,春季', 1, 128, 12, 'admin', '已发布', '${today}'),
                ('国庆节活动安排通知', '<p>国庆期间活动安排如下...</p>', '国庆活动通知', '', '活动', '国庆', 0, 89, 5, 'admin', '已发布', '${today}'),
                ('新增交谊舞初级班，欢迎报名', '<p>每周三晚上7点...</p>', '新增交谊舞初级班', '', '课程', '交谊舞,初级', 0, 156, 8, 'admin', '已发布', '${today}'),
                ('俱乐部会员优惠政策更新', '<p>会员优惠政策调整...</p>', '会员优惠政策更新', '', '公告', '优惠', 0, 203, 15, 'admin', '已发布', '${today}'),
                ('9月教练排班表', '<p>9月教练排班如下...</p>', '9月教练排班', '', '通知', '排班', 0, 67, 3, 'admin', '已发布', '${today}')
            `, (err) => {
                if (!err) console.log('✅ 示例新闻插入成功');
            });
        }
    });
});

setTimeout(() => {
    newsDB.close();
    console.log('\n✅ 新闻数据库初始化完成！');
}, 1000);
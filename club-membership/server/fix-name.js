const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 连接 scan_consumptions.db
const scanDB = new sqlite3.Database(path.join(__dirname, 'scan_consumptions.db'));
// 连接 membership_cards.db
const cardsDB = new sqlite3.Database(path.join(__dirname, 'membership_cards.db'));

// 查询所有消费记录
scanDB.all(`SELECT id, card_id FROM scan_consumptions WHERE name IS NULL OR name = ''`, (err, rows) => {
    if (err) {
        console.error('查询失败:', err.message);
        scanDB.close();
        cardsDB.close();
        return;
    }

    console.log(`找到 ${rows.length} 条记录需要更新`);

    rows.forEach((row, index) => {
        // 从 membership_cards 查询名称
        cardsDB.get(`SELECT name FROM membership_cards WHERE id = ?`, [row.card_id], (err2, card) => {
            if (err2) {
                console.error('查询卡失败:', err2.message);
                return;
            }
            if (card) {
                scanDB.run(`UPDATE scan_consumptions SET name = ? WHERE id = ?`, [card.name, row.id], (err3) => {
                    if (err3) {
                        console.error('更新失败:', err3.message);
                    } else {
                        console.log(`✅ 更新记录 ${row.id}: ${card.name}`);
                    }
                });
            }
        });
    });

    // 等待所有更新完成
    setTimeout(() => {
        scanDB.close();
        cardsDB.close();
        console.log('✅ 完成');
    }, 3000);
});
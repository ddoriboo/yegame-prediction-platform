const express = require('express');
const router = express.Router();
const { getDB } = require('../database/init');

// 베팅하기
router.post('/', (req, res) => {
    const { userId, issueId, choice, amount } = req.body;
    
    if (!userId || !issueId || !choice || !amount) {
        return res.status(400).json({ error: '필수 데이터가 누락되었습니다.' });
    }
    
    const db = getDB();
    
    // 베팅 삽입 또는 업데이트
    const query = `INSERT OR REPLACE INTO bets (user_id, issue_id, choice, amount) 
                   VALUES (?, ?, ?, ?)`;
    
    db.run(query, [userId, issueId, choice, amount], function(err) {
        if (err) {
            console.error('베팅 저장 실패:', err);
            return res.status(500).json({ error: '베팅 저장에 실패했습니다.' });
        }
        
        res.json({ 
            success: true, 
            message: '베팅이 완료되었습니다.',
            betId: this.lastID 
        });
    });
});

// 사용자의 베팅 내역 조회
router.get('/user/:userId', (req, res) => {
    const { userId } = req.params;
    const db = getDB();
    
    const query = `
        SELECT b.*, i.title, i.category, i.end_date, i.status
        FROM bets b
        JOIN issues i ON b.issue_id = i.id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
    `;
    
    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error('베팅 내역 조회 실패:', err);
            return res.status(500).json({ error: '베팅 내역 조회에 실패했습니다.' });
        }
        
        res.json(rows);
    });
});

// 특정 이슈의 베팅 통계
router.get('/stats/:issueId', (req, res) => {
    const { issueId } = req.params;
    const db = getDB();
    
    const query = `
        SELECT 
            choice,
            COUNT(*) as bet_count,
            SUM(amount) as total_amount
        FROM bets 
        WHERE issue_id = ?
        GROUP BY choice
    `;
    
    db.all(query, [issueId], (err, rows) => {
        if (err) {
            console.error('베팅 통계 조회 실패:', err);
            return res.status(500).json({ error: '베팅 통계 조회에 실패했습니다.' });
        }
        
        res.json(rows);
    });
});

module.exports = router;
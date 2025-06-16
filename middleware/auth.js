const jwt = require('jsonwebtoken');
const { getDB } = require('../database/init');

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: '인증 토큰이 필요합니다.' 
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: '유효하지 않은 토큰입니다.' 
        });
    }
};

const adminMiddleware = (req, res, next) => {
    authMiddleware(req, res, () => {
        const db = getDB();
        
        db.get('SELECT * FROM admins WHERE user_id = ?', [req.user.id], (err, admin) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: '관리자 권한 확인 중 오류가 발생했습니다.' 
                });
            }
            
            if (!admin) {
                return res.status(403).json({ 
                    success: false, 
                    message: '관리자 권한이 필요합니다.' 
                });
            }
            
            next();
        });
    });
};

module.exports = {
    authMiddleware,
    adminMiddleware
};
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('../config/passport');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { getDB } = require('../database/init');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Email transporter setup
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 회원가입
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: '모든 필드를 입력해주세요.' 
            });
        }
        
        const db = getDB();
        
        // 중복 사용자 확인
        db.get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username], async (err, row) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: '서버 오류가 발생했습니다.' 
                });
            }
            
            if (row) {
                return res.status(400).json({ 
                    success: false, 
                    message: '이미 존재하는 이메일 또는 사용자명입니다.' 
                });
            }
            
            // 비밀번호 암호화
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // 사용자 생성
            db.run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', 
                [username, email, hashedPassword], 
                function(err) {
                    if (err) {
                        return res.status(500).json({ 
                            success: false, 
                            message: '회원가입 중 오류가 발생했습니다.' 
                        });
                    }
                    
                    // JWT 토큰 생성
                    const token = jwt.sign(
                        { id: this.lastID, username, email }, 
                        JWT_SECRET, 
                        { expiresIn: '7d' }
                    );
                    
                    res.json({
                        success: true,
                        token,
                        user: {
                            id: this.lastID,
                            username,
                            email,
                            coins: 10000
                        }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 로그인
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: '이메일과 비밀번호를 입력해주세요.' 
            });
        }
        
        const db = getDB();
        
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: '서버 오류가 발생했습니다.' 
                });
            }
            
            if (!user) {
                return res.status(400).json({ 
                    success: false, 
                    message: '존재하지 않는 사용자입니다.' 
                });
            }
            
            // 비밀번호 확인
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                return res.status(400).json({ 
                    success: false, 
                    message: '비밀번호가 올바르지 않습니다.' 
                });
            }
            
            // JWT 토큰 생성
            const token = jwt.sign(
                { id: user.id, username: user.username, email: user.email }, 
                JWT_SECRET, 
                { expiresIn: '7d' }
            );
            
            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    coins: user.coins
                }
            });
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 토큰 검증
router.get('/verify', (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: '토큰이 없습니다.' 
            });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const db = getDB();
        
        db.get('SELECT id, username, email, coins FROM users WHERE id = ?', [decoded.id], (err, user) => {
            if (err || !user) {
                return res.status(401).json({ 
                    success: false, 
                    message: '유효하지 않은 토큰입니다.' 
                });
            }
            
            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    coins: user.coins
                }
            });
        });
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: '유효하지 않은 토큰입니다.' 
        });
    }
});

// OAuth Routes
// Google OAuth
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Generate JWT token for OAuth user
        const token = jwt.sign(
            { id: req.user.id, username: req.user.username, email: req.user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Redirect to frontend with token
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?token=${token}&user=${encodeURIComponent(JSON.stringify({
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            coins: req.user.coins
        }))}`);
    }
);

// GitHub OAuth
router.get('/github', passport.authenticate('github', {
    scope: ['user:email']
}));

router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res) => {
        // Generate JWT token for OAuth user
        const token = jwt.sign(
            { id: req.user.id, username: req.user.username, email: req.user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Redirect to frontend with token
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?token=${token}&user=${encodeURIComponent(JSON.stringify({
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            coins: req.user.coins
        }))}`);
    }
);

// Email verification
router.post('/send-verification', async (req, res) => {
    try {
        const { email } = req.body;
        const db = getDB();
        
        // Check if user exists
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
            if (err || !user) {
                return res.status(400).json({
                    success: false,
                    message: '사용자를 찾을 수 없습니다.'
                });
            }
            
            if (user.verified) {
                return res.status(400).json({
                    success: false,
                    message: '이미 인증된 사용자입니다.'
                });
            }
            
            // Generate verification token
            const verificationToken = crypto.randomBytes(32).toString('hex');
            
            // Update user with verification token
            db.run('UPDATE users SET verification_token = ? WHERE id = ?', 
                [verificationToken, user.id], async (err) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: '인증 토큰 생성에 실패했습니다.'
                    });
                }
                
                // Send verification email
                const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
                
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: '예겜 - 이메일 인증',
                    html: `
                        <h2>예겜 이메일 인증</h2>
                        <p>안녕하세요 ${user.username}님!</p>
                        <p>아래 링크를 클릭하여 이메일 인증을 완료해주세요:</p>
                        <a href="${verificationUrl}" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">이메일 인증하기</a>
                        <p>링크가 작동하지 않으면 다음 주소를 복사하여 브라우저에 붙여넣어주세요:</p>
                        <p>${verificationUrl}</p>
                    `
                };
                
                try {
                    await transporter.sendMail(mailOptions);
                    res.json({
                        success: true,
                        message: '인증 이메일이 발송되었습니다.'
                    });
                } catch (emailError) {
                    console.error('Email sending failed:', emailError);
                    res.status(500).json({
                        success: false,
                        message: '이메일 발송에 실패했습니다.'
                    });
                }
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// Verify email
router.get('/verify-email/:token', (req, res) => {
    const { token } = req.params;
    const db = getDB();
    
    db.get('SELECT * FROM users WHERE verification_token = ?', [token], (err, user) => {
        if (err || !user) {
            return res.status(400).json({
                success: false,
                message: '유효하지 않은 인증 토큰입니다.'
            });
        }
        
        // Update user as verified
        db.run('UPDATE users SET verified = TRUE, verification_token = NULL WHERE id = ?', 
            [user.id], (err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: '인증 처리 중 오류가 발생했습니다.'
                });
            }
            
            res.json({
                success: true,
                message: '이메일 인증이 완료되었습니다.'
            });
        });
    });
});

module.exports = router;
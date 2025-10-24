# 🚂 Railway 배포 가이드

예겜 백엔드 API를 Railway에 배포하는 완벽 가이드입니다.

## 📋 사전 준비

- [x] GitHub 계정
- [x] GitHub 저장소 (`yegame-prediction-platform`)
- [ ] Railway 계정 (https://railway.app)

## 🚀 배포 단계

### 1단계: Railway 프로젝트 생성

1. **Railway 접속**: https://railway.app
2. **로그인**: GitHub 계정으로 로그인
3. **New Project** 클릭
4. **Deploy from GitHub repo** 선택
5. **yegame-prediction-platform** 저장소 선택

### 2단계: 환경 변수 설정

Railway 대시보드에서 **Variables** 탭으로 이동 후 다음 환경 변수들을 추가하세요:

#### 필수 환경 변수

```bash
# 서버 설정
NODE_ENV=production
PORT=3000

# JWT 보안 (32자 이상의 랜덤 문자열)
JWT_SECRET=your-super-strong-random-jwt-secret-minimum-32-characters

# 세션 보안
SESSION_SECRET=your-session-secret-random-string

# 데이터베이스
DB_PATH=./database/yegame.db

# 프론트엔드 URL (나중에 Railway URL로 업데이트)
FRONTEND_URL=${{RAILWAY_PUBLIC_DOMAIN}}
```

**중요**: `JWT_SECRET`과 `SESSION_SECRET`는 반드시 강력한 랜덤 문자열로 변경하세요!

랜덤 시크릿 생성 방법:
```bash
# 터미널에서 실행
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 선택적 환경 변수 (OAuth 사용 시)

```bash
# Google OAuth (선택사항)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth (선택사항)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# 이메일 인증 (선택사항)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password
```

### 3단계: 배포 확인

1. **Deployments** 탭에서 배포 진행 상황 확인
2. 배포 완료 후 **Settings** → **Domains**에서 Public URL 확인
3. 예: `https://yegame-production-xxxxx.up.railway.app`

### 4단계: 데이터베이스 영구 저장

Railway는 기본적으로 임시 파일 시스템을 사용합니다. SQLite 데이터베이스를 영구적으로 저장하려면:

1. **Settings** → **Volumes** 클릭
2. **Add Volume** 클릭
3. **Mount Path**: `/app/database`
4. **Save** 클릭

이제 데이터베이스가 재배포 후에도 유지됩니다.

### 5단계: 배포 테스트

배포된 API 테스트:

```bash
# 헬스 체크 (URL을 본인의 Railway URL로 변경)
curl https://your-app.up.railway.app/

# 이슈 목록 조회
curl https://your-app.up.railway.app/api/issues
```

## 🔄 재배포 방법

### 자동 배포
- GitHub에 코드를 푸시하면 Railway가 자동으로 재배포합니다
- `git push origin main`

### 수동 배포
- Railway 대시보드 → **Deployments** → **Deploy** 버튼 클릭

## 🔐 보안 체크리스트

- [ ] `JWT_SECRET`을 강력한 랜덤 문자열로 설정
- [ ] `SESSION_SECRET`을 강력한 랜덤 문자열로 설정
- [ ] OAuth 시크릿은 절대 GitHub에 커밋하지 않기
- [ ] 프로덕션에서 `NODE_ENV=production` 설정
- [ ] CORS 설정 확인 (필요시 특정 도메인만 허용)

## 🐛 문제 해결

### 배포가 실패하는 경우

**로그 확인**:
1. Railway 대시보드 → **Deployments**
2. 실패한 배포 클릭
3. **View Logs** 확인

**일반적인 문제**:

1. **포트 오류**
   - `PORT` 환경 변수가 설정되지 않음
   - `server.js`에서 `process.env.PORT` 사용 확인

2. **데이터베이스 오류**
   - Volume이 설정되지 않음
   - `DB_PATH`가 올바른지 확인

3. **의존성 오류**
   - `package.json`의 dependencies 확인
   - `node_modules` 삭제 후 재배포

### 데이터베이스가 초기화되는 경우

- Volume을 설정하지 않았거나
- Volume의 Mount Path가 잘못됨
- 위 "4단계: 데이터베이스 영구 저장" 참고

### OAuth 콜백 오류

OAuth 콜백 URL을 Railway 도메인으로 업데이트:

**Google OAuth**:
- Authorized redirect URIs: `https://your-app.up.railway.app/api/auth/google/callback`

**GitHub OAuth**:
- Authorization callback URL: `https://your-app.up.railway.app/api/auth/github/callback`

## 📊 배포 후 설정

### 1. FRONTEND_URL 업데이트

Railway URL을 받은 후:

```bash
FRONTEND_URL=https://your-app.up.railway.app
```

### 2. OAuth 콜백 URL 업데이트

Google/GitHub OAuth 설정에서 콜백 URL을 Railway 도메인으로 변경

### 3. 모바일 앱 API URL 업데이트

`yegame-mobile/src/services/api.js` 파일 수정:

```javascript
const API_BASE_URL = __DEV__
  ? 'http://YOUR_LOCAL_IP:3000/api'
  : 'https://your-app.up.railway.app/api';  // ← Railway URL
```

## 🎯 다음 단계

1. ✅ Railway 배포 완료
2. ⏳ 모바일 앱에 Railway URL 설정
3. ⏳ Expo Go로 앱 테스트
4. ⏳ 앱 빌드 및 배포

---

**배포 성공!** 🎉

Railway URL: `https://your-app.up.railway.app`

이제 모바일 앱에서 이 URL을 사용하여 백엔드 API에 연결할 수 있습니다.

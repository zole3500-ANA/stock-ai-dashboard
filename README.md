# Stock AI Dashboard

ระบบวิเคราะห์หุ้นแบบเว็บแอป สำหรับค้นข่าวสำคัญในสัปดาห์ล่าสุด วิเคราะห์กราฟ/อินดิเคเตอร์ และทำนายราคาวันถัดไปแบบมีเหตุผลเชิงตรรก

> สถานะ: Production-ready prototype — ใช้งานจริงเป็นตัวช่วยวิเคราะห์ได้ แต่ไม่ใช่คำแนะนำการลงทุน และไม่รับประกันราคาหุ้น

## ฟีเจอร์หลัก

- กรอก Ticker เช่น `BURU`, `IREN`, `NVDA`, `AAPL`
- เลือกตลาด `AMEX`, `NASDAQ`, `NYSE`
- ฝังกราฟ TradingView
- Backend API ด้วย Node.js ไม่ต้องใช้ API key
- ดึงราคาย้อนหลังจาก Stooq และ fallback ไป Yahoo Chart API
- ดึงข่าวจาก GDELT และ fallback ไป Google News RSS
- จัดอันดับข่าวตาม impact เช่น `earnings`, `offering`, `dilution`, `contract`, `SEC`, `delisting`, `lawsuit`, `analyst`
- วิเคราะห์ 11 มิติ
- ทำนายราคาวันถัดไปด้วย heuristic model
- อธิบายเหตุผลละเอียด เช่น Trend, Momentum, RSI, Volume, MACD, News Sentiment, AI Score, Risk Penalty
- มี Bull / Base / Bear Case
- มีกรอบราคาคาดการณ์และความมั่นใจ

## วิธีรันในเครื่อง

```bash
npm install
npm start
```

แล้วเปิดเว็บ:

```text
http://localhost:3000
```

## API สำคัญ

### วิเคราะห์ครบชุด

```text
GET /api/analyze?symbol=BURU&market=AMEX&days=90&newsDays=7
```

### ดึงข่าว

```text
GET /api/news?symbol=BURU&days=7
```

### ดึงราคาย้อนหลัง

```text
GET /api/history?symbol=BURU&days=90
```

### ตรวจสถานะ

```text
GET /api/health
```

## โครงสร้างโปรเจกต์

```text
stock-ai-dashboard/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── lib/
│   ├── analyzer.js
│   ├── indicators.js
│   ├── news.js
│   ├── prediction.js
│   ├── stockData.js
│   └── utils.js
├── test/
│   └── indicators.test.js
├── server.js
├── package.json
├── render.yaml
├── Procfile
└── README.md
```

## วิธี Deploy บน Render

1. อัปโปรเจกต์นี้ขึ้น GitHub
2. เข้า Render.com
3. New Web Service
4. เลือก repo นี้
5. Build command:

```bash
npm install
```

6. Start command:

```bash
npm start
```

Render จะอ่าน `render.yaml` ได้ด้วย

## วิธีอัปขึ้น GitHub ด้วยคำสั่ง

แทน `YOUR_REPO_URL` ด้วย repo ของคุณ เช่น `https://github.com/zole3500-ANA/stock-ai-dashboard.git`

### macOS / Linux / Git Bash

```bash
./scripts/push-to-github.sh YOUR_REPO_URL
```

### Windows PowerShell

```powershell
./scripts/push-to-github.ps1 -RepoUrl YOUR_REPO_URL
```

### คำสั่ง Git แบบ manual

```bash
git init
git add .
git commit -m "Initial Stock AI Dashboard"
git branch -M main
git remote add origin YOUR_REPO_URL
git push -u origin main
```

## แนวคิดโมเดลทำนายวันถัดไป

ระบบไม่ได้เดาราคาแบบสุ่ม แต่ใช้คะแนนรวมจากหลายปัจจัย:

- Trend / MA / VWAP
- Momentum 1 วันและ 5 วัน
- RSI14
- Volume ratio เทียบค่าเฉลี่ย 20 วัน
- MACD histogram
- News sentiment
- AI Score พื้นฐานของหุ้น
- Risk penalty จาก ATR

หลังจากรวมคะแนน ระบบจะจำกัดสัญญาณไม่ให้สุดโต่ง แล้วคูณกับกรอบ ATR เพื่อให้ราคาเป้าหมายยังอยู่ในกรอบความผันผวนที่สมเหตุสมผล

## ข้อควรระวัง

- ข่าวและราคามาจาก public source อาจล่าช้า หรือบางครั้ง source อาจปิดกั้น request
- หุ้น micro-cap มีความเสี่ยงสูงมาก โดยเฉพาะ dilution, reverse split, delisting, low liquidity
- ควรตรวจข่าวก่อนตลาดเปิดเสมอ
- ระบบนี้เป็น decision-support tool ไม่ใช่ financial advisor

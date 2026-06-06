# Stock AI Dashboard

ระบบวิเคราะห์หุ้นแบบเว็บแอปภาษาไทย สำหรับค้นข่าวสำคัญในสัปดาห์ล่าสุด แปลข่าวเป็นไทย วิเคราะห์กราฟ/อินดิเคเตอร์ และทำนายราคาวันถัดไปแบบมีเหตุผลเชิงตรรก

> สถานะ: Production-ready prototype — ใช้งานจริงเป็นตัวช่วยวิเคราะห์ได้ แต่ไม่ใช่คำแนะนำการลงทุน และไม่รับประกันราคาหุ้น

## มีอะไรใหม่ใน v1.1

- เพิ่ม **วิเคราะห์ละเอียดแบบ 3 Agent**
  - **โบ้ (Gemini)**: วิเคราะห์พื้นฐาน ข่าวใหญ่ catalyst ความเสี่ยง dilution/SEC/contract
  - **Grok (สายซิ่ง)**: วิเคราะห์ momentum, volume spike, volatility, โอกาสวิ่งแรง/ร่วงแรง
  - **ป๊อก (สายเทคนิค)**: วิเคราะห์ MA5, MA20, VWAP, RSI, MACD, ATR, volume, จุดเข้า/จุดออก/stop-loss
- เพิ่มการแสดง **ข่าวแปลไทย** ทุกข่าว
- เพิ่มเหตุผลผลกระทบของข่าวเป็นไทย เช่น ข่าวเพิ่มทุน, ข่าวสัญญา, ข่าว SEC, ข่าว delisting, ข่าว analyst
- ปรับตารางวิเคราะห์ 11 มิติให้เป็นภาษาไทยมากขึ้น
- ปรับข้อความหน้าเว็บและคำอธิบายให้เป็นภาษาไทยเป็นหลัก

หมายเหตุ: ชื่อ Agent เป็น persona ภายในระบบ ไม่ได้เรียก API ของ Gemini หรือ Grok จริง ถ้าต้องการให้ใช้ LLM จริงสามารถต่อ Gemini/OpenAI API เพิ่มภายหลังได้

## ฟีเจอร์หลัก

- กรอก Ticker เช่น `BURU`, `IREN`, `NVDA`, `AAPL`
- เลือกตลาด `AMEX`, `NASDAQ`, `NYSE`
- ฝังกราฟ TradingView
- Backend API ด้วย Node.js ไม่ต้องใช้ API key
- ดึงราคาย้อนหลังจาก Stooq และ fallback ไป Yahoo Chart API
- ดึงข่าวจาก GDELT และ fallback ไป Google News RSS
- แปลหัวข่าวและสรุปข่าวเป็นไทยด้วยตัวแปลศัพท์การเงินในระบบ
- จัดอันดับข่าวตามผลกระทบ เช่น `earnings`, `offering`, `dilution`, `contract`, `SEC`, `delisting`, `lawsuit`, `analyst`
- วิเคราะห์ 11 มิติ
- ทำนายราคาวันถัดไปด้วย heuristic model
- อธิบายเหตุผลละเอียด เช่น แนวโน้ม, โมเมนตัม, RSI, Volume, MACD, คะแนนข่าว, AI Score, Risk Penalty
- มีกรณีดี / กรณีหลัก / กรณีแย่
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

## วิธีทดสอบ

```bash
npm test
```

## API สำคัญ

### วิเคราะห์ครบชุด

```text
GET /api/analyze?symbol=BURU&market=AMEX&days=90&newsDays=7
```

ข้อมูลที่ได้จะมี:

- `summary` สรุปภาพรวมภาษาไทย
- `news` ข่าวพร้อม `titleTh`, `snippetTh`, `impactReasonTh`
- `agents` ผลวิเคราะห์จาก โบ้ / Grok / ป๊อก
- `prediction` คาดการณ์วันถัดไปพร้อมเหตุผลละเอียด
- `factors` ตารางวิเคราะห์ 11 มิติภาษาไทย

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
│   ├── agents.js
│   ├── analyzer.js
│   ├── indicators.js
│   ├── news.js
│   ├── prediction.js
│   ├── stockData.js
│   ├── translator.js
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

หรือ:

```bash
node server.js
```

## แนวคิดโมเดลทำนายวันถัดไป

ระบบไม่ได้เดาราคาแบบสุ่ม แต่ใช้คะแนนรวมจากหลายปัจจัย:

- แนวโน้ม / MA / VWAP
- โมเมนตัม 1 วันและ 5 วัน
- RSI14
- Volume ratio เทียบค่าเฉลี่ย 20 วัน
- MACD histogram
- News sentiment จากข่าวที่แปลไทยแล้ว
- AI Score พื้นฐานของหุ้น
- Risk penalty จาก ATR

หลังจากรวมคะแนน ระบบจะจำกัดสัญญาณไม่ให้สุดโต่ง แล้วคูณกับกรอบ ATR เพื่อให้ราคาเป้าหมายยังอยู่ในกรอบความผันผวนที่สมเหตุสมผล

## ข้อควรระวัง

- ข่าวและราคามาจาก public source อาจล่าช้า หรือบางครั้ง source อาจปิดกั้น request
- การแปลข่าวเป็นไทยใช้ตัวแปลศัพท์การเงินในระบบ ไม่ใช่ neural translation เต็มรูปแบบ จึงควรเปิดข่าวต้นฉบับตรวจซ้ำหากเป็นข่าวสำคัญมาก
- หุ้น micro-cap มีความเสี่ยงสูงมาก โดยเฉพาะ dilution, reverse split, delisting, low liquidity
- ควรตรวจข่าวก่อนตลาดเปิดเสมอ
- ระบบนี้เป็น decision-support tool ไม่ใช่ financial advisor

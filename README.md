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


## อัปเดต v1.5 — แก้แผนเทคนิคของป๊อก

- ปรับเมนู **ป๊อก (สายเทคนิค) > 3) แผนจุดเข้า จุด Follow จุดลดความเสี่ยง และ Stop-loss** ให้ใช้ข้อมูล `tradePlan` ที่คำนวณจากราคาจริง
- เพิ่มการทวนสอบว่า `Stop-loss` ต้องต่ำกว่าราคาล่าสุดและแนวรับหลัก ไม่ใช้ค่าผิดด้านของราคา
- เพิ่มจุด `reclaim`, `confirmation`, `follow`, `reduce risk`, `TP1`, `TP2`, และ `invalidation`
- เพิ่ม Risk/Reward ถึง TP1 โดยอิง ATR และแนวรับ/แนวต้าน dynamic

## ฟีเจอร์หลัก

- กรอก Ticker เช่น `BURU`, `IREN`, `NVDA`, `AAPL`
- เลือกตลาด `AMEX`, `NASDAQ`, `NYSE`
- ฝังกราฟ TradingView
- Backend API ด้วย Node.js ไม่ต้องใช้ API key
- ดึงราคาย้อนหลังจาก Stooq และ fallback ไป Yahoo Chart API
- ดึงข่าวจาก GDELT และ fallback ไป Google News RSS
- แปลงหัวข้อข่าวและสรุปข่าวเป็นภาษาไทยทั้งหมด พร้อมเหตุผลผลกระทบต่อราคา
- จัดประเภทข่าว เช่น เพิ่มทุน/เสนอขายหุ้น, สัญญา, ผลประกอบการ, ความเสี่ยงเกณฑ์ตลาด, คดีความ, นักวิเคราะห์
- แปลหัวข่าวและสรุปข่าวเป็นไทยด้วยตัวแปลศัพท์การเงินในระบบ
- จัดอันดับข่าวตามผลกระทบ เช่น `earnings`, `offering`, `dilution`, `contract`, `SEC`, `delisting`, `lawsuit`, `analyst`
- วิเคราะห์ Social Media จาก Facebook, X, Reddit, Stocktwits และแหล่งอื่นที่สำคัญ
- ประเมิน sentiment, heat score, hype/pump risk และความมั่นใจของข้อมูล social
- วิเคราะห์หลายมิติ
- ทำนายราคาวันถัดไปด้วย heuristic model
- แปลผลคะแนน เช่น 26/100 = อ่อน/ควรระวัง พร้อมคำอธิบายและแนวทางปฏิบัติ
- เพิ่มเมนู Smart Money วิเคราะห์เงินใหญ่จาก OBV, CMF, MFI, CVD Proxy, VWAP, Up/Down Volume, Volume Profile Proxy, Accumulation/Distribution, Unusual Volume, Absorption และ Breakout Quality
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

### วิเคราะห์ Social Media

```text
GET /api/social?symbol=BURU&days=7
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

## Social Media Intelligence

ระบบเพิ่มการวิเคราะห์การพูดคุยใน social media โดยแบ่งเป็น:

- **Facebook**: ใช้ลิงก์ค้นหาและข้อมูลที่ index ได้บนเว็บ เพราะโพสต์ Facebook ต้องใช้ Graph API/สิทธิ์เพจหรือกลุ่ม
- **X / Twitter**: ให้ลิงก์ค้นหา cashtag เช่น `$BURU` และใช้ข้อมูลที่ค้นพบจากเว็บเท่าที่เปิดได้ เพราะ X API ต้องใช้สิทธิ์เพิ่มเติม
- **Reddit**: ดึง public Reddit search เพื่อตรวจการพูดคุยในชุมชนรายย่อย/หุ้นซิ่ง
- **Stocktwits**: ดึง public symbol stream เพราะเป็นแหล่งพูดคุยหุ้นโดยตรง
- **อื่น ๆ สำคัญ**: YouTube, Google Trends และเว็บบอร์ด/ฟอรัม เพื่อดูความร้อนแรงของกระแสรายย่อย

คะแนนที่แสดง:

- **Sentiment Score**: บวก/ลบของการพูดคุย
- **Heat Score**: ความร้อนแรงของกระแส
- **Hype Risk**: ความเสี่ยงปั่นกระแส เช่น moon, squeeze, all-in, pump, rocket
- **Confidence**: ความมั่นใจของข้อมูล โดย Facebook/X จะต่ำกว่า Reddit/Stocktwits หากยังไม่ได้เชื่อม API โดยตรง

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


## อัปเดต v1.2

- เปลี่ยนแนวรับ แนวต้าน และจุดตัดขาดทุนจากค่าคงที่ เป็นการคำนวณอัตโนมัติจากข้อมูลราคาล่าสุด
- ใช้ recent swing low/high, low/high 20 วัน, low/high 60 วัน, MA20, MA50, VWAP20 และ ATR ประกอบ
- เพิ่มเหตุผลว่าระดับราคามาจากแหล่งคำนวณใด เพื่อป้องกันการแสดงราคาผิดจาก profile เก่า


## อัปเดต v1.4

- ปรับส่วน “ข่าวสำคัญในสัปดาห์นี้ / ข่าวสำคัญอื่น ๆ” ให้แสดงเป็นภาษาไทยมากขึ้น
- สร้างหัวข้อข่าวภาษาไทยแบบสรุปเหตุการณ์ ไม่ใช้แค่แปลคำต่อคำ
- เพิ่มประเภทข่าวภาษาไทย เช่น เพิ่มทุน/เสนอขายหุ้น, สัญญา/คำสั่งซื้อ, ผลประกอบการ, ความเสี่ยงเกณฑ์ตลาด, คดีความ, แรงขายชอร์ต
- เพิ่มสรุปข่าวภาษาไทยพร้อมเหตุผลว่าข่าวนั้นมีผลต่อราคาหุ้นอย่างไร
- ซ่อนหัวข่าวต้นฉบับไว้ในปุ่ม “ดูหัวข่าวต้นฉบับภาษาอังกฤษ” เพื่อให้หน้าเว็บอ่านง่ายขึ้น


## v1.6 Score Interpretation + Smart Money

เพิ่มการแปลผลคะแนนทุกจุด เช่น `26/100` ไม่แสดงแค่ตัวเลข แต่แปลเป็นระดับ เช่น “อ่อน / ควรระวัง” พร้อมความหมายและแนวทางปฏิบัติ

เพิ่มเมนู **Smart Money / เงินใหญ่** ครอบคลุม:

- OBV
- CMF20
- MFI14
- CVD Proxy
- VWAP20
- Up/Down Volume
- Accumulation/Distribution Line
- Unusual Volume
- Volume Profile Proxy
- Breakout Quality
- Liquidity / Float Risk Proxy
- Gap / Trap Risk
- Absorption / Shakeout

หมายเหตุ: ระบบไม่มีข้อมูล dark pool, order book หรือ block trade แบบ real-time จึงใช้ OHLCV รายวันเป็น proxy และแสดงข้อจำกัดข้อมูลไว้ในหน้าเว็บ

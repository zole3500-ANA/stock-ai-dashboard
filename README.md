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


## อัปเดต v1.7: ตารางวิเคราะห์หลายมิติแบบ Decision Matrix

ตารางวิเคราะห์หลายมิติถูกปรับจากตารางสรุปธรรมดาให้เป็นระบบช่วยตัดสินใจ โดยเพิ่มคอลัมน์สำคัญ:

- คะแนนรายมิติ เช่น `26/100`
- สถานะแปลผล เช่น อ่อน/ควรระวัง, กลางบวก, แข็งแรง
- น้ำหนักความสำคัญของแต่ละมิติ
- ความมั่นใจของข้อมูล
- ผลต่อราคา
- ระยะเวลาที่สัญญาณมีผล
- สรุปภาษาชาวบ้าน
- สิ่งที่ต้องจับตา
- Action ที่ควรทำ

เพิ่มมิติสำคัญสำหรับหุ้นเสี่ยงและหุ้นขนาดเล็ก เช่น:

- Dilution / Offering Risk
- SEC Filing / Corporate Action
- Liquidity / Float Risk
- Short Interest / Squeeze Risk
- Pre-market / After-hours Risk
- Catalyst Calendar
- Market Regime
- Sector Strength
- Risk/Reward
- Data Quality



## อัปเดต v1.8: Pixel Agent Command Room

เวอร์ชันนี้เพิ่ม UI ใหม่ที่ได้แรงบันดาลใจจากแนวคิด **Pixel Agents** โดยไม่คัดลอก asset ตรง ๆ แต่ดัดแปลงเป็น **ห้องปฏิบัติการวิเคราะห์หุ้นแบบ multi-agent** สำหรับโปรเจกต์นี้โดยเฉพาะ

สิ่งที่เพิ่ม:

- เมนู **Pixel Agent Command Room**
- Agent roster แสดงบทบาทของ โบ้, Grok, ป๊อก, Smart Money, Social Radar และ Data Ops
- สถานีปฏิบัติการ (stations) สำหรับข่าว/พื้นฐาน, โมเมนตัม, เทคนิค, Smart Money, Social และ Decision Matrix
- workflow timeline แสดงลำดับการทำงานตั้งแต่ ราคา/Volume → ข่าว → Social → Smart Money → คำตัดสิน
- UI โทน dark cyber + pixel office เพื่อให้ “เห็นการทำงานของ agent” ไม่ใช่แค่อ่านผลลัพธ์ปลายทาง

แนวคิดคือทำให้ผู้ใช้รู้ว่า “แต่ละ agent กำลังทำอะไร อยู่ในสถานะไหน และกำลังจับตาประเด็นใด” ช่วยให้ dashboard อ่านง่ายขึ้นและน่าใช้งานมากขึ้นโดยยังคงข้อมูลเชิงวิเคราะห์เดิมทั้งหมด



## อัปเดต v1.9: Full Sidebar Mockup + Real Pixel Avatars

เวอร์ชันนี้ยกระดับ UI จาก v1.8 โดยเพิ่ม:

- **Sidebar แบบเต็มรูปแบบ**  
  มีเมนูนำทางไปยัง Overview, Command Room, กราฟ/คำตัดสิน, 3 Agent, Smart Money, Social, ข่าว, Prediction และ Decision Matrix

- **Quick Watch Panel**  
  แสดง Ticker, Company, AI Score, Bias, Risk, Smart Money และ Social tone แบบสรุปเร็ว

- **Agent Lineup ใน Sidebar**  
  แสดงสถานะย่อของแต่ละ agent แบบพร้อมใช้งาน

- **Pixel Avatar จริงสำหรับแต่ละ agent**  
  เปลี่ยนจาก placeholder เป็น pixel-art avatar แบบ SVG สำหรับ:
  - โบ้
  - Grok
  - ป๊อก
  - Smart Money
  - Social Radar
  - Data Ops

- **ปรับ Agent Cards และ Command Room ให้สวยขึ้น**  
  ใช้ avatar ใหม่ในห้องปฏิบัติการและการ์ดวิเคราะห์ 3 Agent ทำให้ UI มีเอกลักษณ์มากขึ้น

แรงบันดาลใจมาจากแนวคิด Pixel Agents แต่ปรับให้เข้ากับ workflow การวิเคราะห์หุ้นในโปรเจกต์นี้โดยเฉพาะ



## อัปเดต v1.9.1: แก้การแสดงผลตกขอบ + เพิ่มโลโก้ฝั่ง Sidebar

เวอร์ชันนี้แก้จุดสำคัญด้าน UI/UX ดังนี้:

- แก้ปัญหา **ข้อความ/ป้ายใน Pixel Agent Command Room ตกขอบ แสดงไม่ครบ หรือเกินขอบ**
- ปรับให้ badge, bubble, คำอธิบาย และการ์ด agent **ห่อข้อความอัตโนมัติ**
- ปรับ layout ของ Pixel Room และ Agent Cards ให้รองรับจอแคบและข้อความยาวดีขึ้น
- เพิ่ม **cute agent brand icon** ที่เมนูซ้าย “Stock AI” ให้ดูน่ารักและเข้าธีม multi-agent มากขึ้น

เหมาะสำหรับใช้งานจริงต่อจาก v1.9 โดยไม่ต้องเปลี่ยน logic การวิเคราะห์



## อัปเดต v2.0: Animated Agents + Collapsible Sidebar + Smooth Mobile

เวอร์ชันนี้ปรับ UI/UX ใหญ่จาก v1.9.1 โดยเพิ่ม:

- **Agent Animation**
  - Pixel avatar ขยับแบบ idle/bob animation
  - Agent cards และ station cards มี hover interaction
  - ตอนกดวิเคราะห์ใหม่ agent จะ pulse/jump เพื่อบอกว่าระบบกำลังทำงาน

- **Sidebar ยุบ/ขยายได้**
  - ปุ่มยุบ/ขยายบน desktop
  - จำสถานะ sidebar ด้วย `localStorage`
  - mobile ใช้ปุ่ม hamburger เปิด/ปิดเมนู

- **Mobile UI ลื่นขึ้น**
  - ปรับ grid ให้เป็น single-column บนมือถือ
  - timeline เลื่อนแนวนอนได้แบบ smooth
  - เพิ่มปุ่มกลับขึ้นด้านบน
  - ปรับ card, badge, chart, table และ touch behavior ให้ใช้งานง่ายขึ้นบนจอเล็ก

- **Navigation ดีขึ้น**
  - เมนู sidebar highlight ตาม section ที่กำลังดู
  - anchor scroll ลื่นขึ้น
  - ลดปัญหา overflow บนจอแคบ



## อัปเดต v2.0.1: สถานะใน Decision Matrix เป็นสัญลักษณ์

เวอร์ชันนี้ปรับตารางวิเคราะห์หลายมิติให้คอลัมน์ **สถานะ** แสดงเป็นสัญลักษณ์แทนข้อความ:

- 🚀 = แข็งแรงมาก
- ✅ = แข็งแรง
- 🟢 = กลางบวก
- 🟡 = กลาง / รอดู
- ⚠️ = อ่อน / ควรระวัง
- 🛑 = อ่อนมาก / เสี่ยงสูง

เพิ่ม legend อธิบายความหมายไว้เหนือ table และใส่ tooltip ให้แต่ละสัญลักษณ์ เพื่อให้หน้าจอดูสะอาดขึ้นและอ่านเร็วขึ้นบนมือถือ



## อัปเดต v2.0.2: ย้ายตำแหน่ง Decision Matrix

เวอร์ชันนี้ย้าย **ตารางวิเคราะห์หลายมิติ / Decision Matrix** ให้มาอยู่ถัดจากเมนู **วิเคราะห์ละเอียดแบบ 3 Agent** ทันที เพื่อให้ผู้ใช้เห็นบทวิเคราะห์จาก Agent ก่อน แล้วตามด้วยตารางสรุปหลายมิติที่ใช้ประกอบการตัดสินใจ

ลำดับใหม่ของหน้า:

1. Overview
2. กราฟ + คำตัดสิน
3. Pixel Agent Command Room
4. วิเคราะห์ละเอียดแบบ 3 Agent
5. ตารางวิเคราะห์หลายมิติ / Decision Matrix
6. Smart Money
7. Social Media
8. ข่าว
9. Prediction



## อัปเดต v2.0.3: ปรับลำดับหน้าและ Sidebar

เวอร์ชันนี้ปรับลำดับ section และเมนู sidebar ใหม่ตามลำดับที่ต้องการ:

1. Overview
2. กราฟ + คำตัดสิน
3. Pixel Agent Command Room
4. Prediction
5. วิเคราะห์ละเอียดแบบ 3 Agent
6. ตารางวิเคราะห์หลายมิติ / Decision Matrix
7. Smart Money
8. ข่าว
9. Social Media



## อัปเดต v2.0.4: บังคับลำดับหน้า + Cache Busting

เวอร์ชันนี้แก้กรณี deploy แล้วผู้ใช้ยังเห็นลำดับเดิม โดยเพิ่ม:

- บังคับลำดับ section ใหม่ใน `index.html`
- ปรับ sidebar ให้เรียงตามลำดับใหม่
- เพิ่ม `?v=2.0.4` ให้ `styles.css` และ `app.js` เพื่อบังคับ browser โหลดไฟล์ใหม่
- เพิ่มป้ายแสดง `v2.0.4` ด้านบนหน้าเว็บ เพื่อใช้ตรวจสอบว่าเว็บโหลดเวอร์ชันล่าสุดจริง

ลำดับใหม่:

1. Overview
2. กราฟ + คำตัดสิน
3. Pixel Agent Command Room
4. Prediction
5. วิเคราะห์ละเอียดแบบ 3 Agent
6. ตารางวิเคราะห์หลายมิติ / Decision Matrix
7. Smart Money
8. ข่าว
9. Social Media



## อัปเดต v2.0.5: ปรับสัญลักษณ์สถานะใน Decision Matrix

เวอร์ชันนี้เปลี่ยนสัญลักษณ์ในคอลัมน์ **สถานะ** ของตารางวิเคราะห์หลายมิติให้ดูสวยขึ้น:

- `กลางบวก` เปลี่ยนจาก 🟢 เป็น 📈
- `กลาง / รอดู` เปลี่ยนจาก 🟡 เป็น ⏳

ความหมายใหม่:

- 🚀 = แข็งแรงมาก
- ✅ = แข็งแรง
- 📈 = กลางบวก
- ⏳ = กลาง / รอดู
- ⚠️ = อ่อน / ควรระวัง
- 🛑 = อ่อนมาก / เสี่ยงสูง

เพิ่ม cache busting เป็น `?v=2.0.5` เพื่อให้ browser โหลดไฟล์ใหม่แน่นอน



## อัปเดต v2.0.6: ปรับสัญลักษณ์กลางบวกให้เรียบขึ้น

เวอร์ชันนี้เปลี่ยนสัญลักษณ์ในคอลัมน์ **สถานะ** ของตารางวิเคราะห์หลายมิติ:

- `กลางบวก` เปลี่ยนจาก 📈 เป็น ↗️

ความหมายปัจจุบัน:

- 🚀 = แข็งแรงมาก
- ✅ = แข็งแรง
- ↗️ = กลางบวก
- ⏳ = กลาง / รอดู
- ⚠️ = อ่อน / ควรระวัง
- 🛑 = อ่อนมาก / เสี่ยงสูง

เพิ่ม cache busting เป็น `?v=2.0.6`



## อัปเดต v2.0.7: ปรับสีสถานะกลางบวกเป็นสีเหลือง

เวอร์ชันนี้ปรับสัญลักษณ์ `↗️ = กลางบวก` ในตารางวิเคราะห์หลายมิติให้เป็นโทน **สีเหลือง** เพื่อให้ดูเข้ากับระดับกึ่งบวก/รอดูมากขึ้น และไม่ดูเป็นเขียวเต็มตัวเกินไป



## อัปเดต v2.0.8: Social Connector Fix

เวอร์ชันนี้แก้เมนู **วิเคราะห์การพูดคุยใน Social Media** ที่ Facebook, X/Twitter และ Reddit ขึ้น `พบ 0 รายการ` ให้ชัดเจนและใช้งานได้จริงขึ้น:

### สิ่งที่แก้

- Reddit ใช้ public search หลายทางมากขึ้น:
  - Reddit JSON search
  - Reddit RSS search
  - r/pennystocks
  - r/stocks
  - r/Shortsqueeze

- X/Twitter เพิ่ม optional API support:
  - ถ้าตั้งค่า `X_BEARER_TOKEN` หรือ `TWITTER_BEARER_TOKEN` ระบบจะดึงโพสต์จริงจาก X API v2
  - ถ้าไม่ตั้งค่า ระบบจะแสดงสถานะว่า `ต้องใช้ API` แทนการบอกว่า `พบ 0 รายการ`

- Facebook เพิ่ม optional Graph API support:
  - ถ้าตั้งค่า `FACEBOOK_ACCESS_TOKEN` และ `FACEBOOK_PAGE_IDS` ระบบจะดึงโพสต์จากเพจที่มีสิทธิ์
  - ถ้าไม่ตั้งค่า ระบบจะแสดงสถานะว่า `ต้องใช้สิทธิ์` เพราะ Facebook ไม่เปิด public post search แบบอิสระ

- UI เปลี่ยนจาก `พบ 0 รายการ` เป็น `สถานะข้อมูล` เพื่อไม่ให้เข้าใจผิดว่าไม่มีคนพูดถึงจริง ๆ

### ตัวแปรที่ตั้งเพิ่มได้ใน Render

```text
X_BEARER_TOKEN=ใส่ token จาก X API
FACEBOOK_ACCESS_TOKEN=ใส่ Facebook Graph API token
FACEBOOK_PAGE_IDS=page_id_1,page_id_2,page_id_3
```

ถ้าไม่ตั้งค่าเหล่านี้ Facebook และ X จะยังไม่สามารถดึงโพสต์จริงแบบอัตโนมัติได้ เพราะเป็นข้อจำกัดของแพลตฟอร์ม ไม่ใช่ bug ของระบบ



## อัปเดต v2.1.0: เพิ่มเมนูเลือกหุ้น / Bitcoin

เวอร์ชันนี้เพิ่ม **Asset Type Selector** ด้านบนหน้าเว็บ:

- เลือก `หุ้นอเมริกา` → ใช้ระบบวิเคราะห์หุ้นเดิมทั้งหมด
- เลือก `Bitcoin / Crypto` → ใช้โหมดวิเคราะห์คริปโต

### โหมดหุ้น

ยังใช้ logic เดิม เช่น:

- ข่าวหุ้น
- SEC / Dilution / Offering risk
- Technical analysis
- Smart Money proxy
- Social Media
- Prediction วันถัดไป
- Decision Matrix แบบหุ้น

### โหมด Bitcoin / Crypto

เพิ่ม logic เฉพาะคริปโต เช่น:

- Macro / ETF / Liquidity
- Whale / Smart Money proxy
- Exchange inflow / outflow proxy
- Funding rate / Futures bias proxy
- Open interest / liquidation risk proxy
- BTC dominance / market regime
- Stablecoin liquidity proxy
- Social hype / crypto narrative
- Crypto Risk/Reward
- Crypto Data Quality

### เหรียญที่รองรับ

ตอนนี้รองรับค่าเช่น:

```text
BTC
BTC-USD
ETH
ETH-USD
SOL
SOL-USD
DOGE
DOGE-USD
```

ถ้าเลือก `Bitcoin / Crypto` แล้วเว้นช่อง ticker ว่าง ระบบจะใช้ `BTC-USD` อัตโนมัติ



## อัปเดต v2.1.1: ย้ายทีมปฏิบัติการใน Pixel Agent Command Room

เวอร์ชันนี้ปรับ layout ของเมนู **Pixel Agent Command Room**:

- ย้ายส่วน **ทีมปฏิบัติการ** จากด้านซ้าย
- ไปอยู่ **ด้านล่างของลำดับการทำงาน**
- ปรับ grid ของทีมปฏิบัติการให้เรียงเป็นการ์ดหลายคอลัมน์เมื่อจอกว้าง
- บนมือถือยังเรียงเป็นคอลัมน์เดียวเพื่ออ่านง่าย

ลำดับภายใน Command Room ใหม่:

1. สถานีวิเคราะห์ Agent
2. ลำดับการทำงาน
3. ทีมปฏิบัติการ



## อัปเดต v2.1.2: ปรับการแสดงผลบนมือถือ Android / LINE

เวอร์ชันนี้ปรับ UI สำหรับการอ่านผ่านมือถือ Android โดยเฉพาะกรณีเปิดผ่าน LINE browser / LINE WebView:

- เพิ่มขนาดตัวอักษรและ line-height ให้อ่านง่ายขึ้น
- ปรับ input/select/button เป็น 16px ขึ้นไป เพื่อลดปัญหา Android zoom เอง
- ปรับ spacing ของ card/panel ให้โปร่งขึ้น
- ลดความแน่นของ Pixel Agent Command Room
- ปรับ timeline ให้เป็นรายการแนวตั้งบนมือถือ ไม่ต้องลากซ้ายขวา
- ปรับข่าว Social Agent Smart Money และ Prediction ให้เป็น single-column อ่านง่าย
- แปลงตาราง Decision Matrix บนมือถือจากตารางแนวนอนเป็น **การ์ดรายมิติ** เพื่ออ่านผ่าน LINE ได้สะดวกขึ้น
- เพิ่มป้ายแจ้งโหมดอ่านบนมือถือในหน้า Overview
- เพิ่ม cache busting เป็น `?v=2.1.2`



## อัปเดต v2.2.0: Pixel Agents Pro Compact Layout

เวอร์ชันนี้ปรับหน้าตาให้ใกล้เคียง mockup ที่ส่งมา โดยทำเป็น dashboard แบบ compact/pro:

- Sidebar ซ้ายแนว Pixel Agents
- Topbar ค้นหา ticker + ราคา + market/sector status + ปุ่มสรุปภาพรวม AI
- การ์ดสรุป AI Score, แปลผลคะแนน, แนวโน้ม AI, ความมั่นใจ และราคาปิดล่าสุด
- แถว Agent Cards แบบ compact จำนวน 6 ใบ
- ตาราง Multi-Factor Decision Matrix แบบ compact
- แถวล่างเป็นการ์ด แผนจุดเข้าออก, Smart Money, ข่าว, Social, Catalyst
- เพิ่ม modal รายละเอียด: กดปุ่ม `ดูรายละเอียด` หรือกดแถวในตาราง เพื่อเปิดรายละเอียดเชิงลึก
- เก็บ logic หุ้น/Bitcoin จาก v2.1.x ไว้ครบ



## อัปเดต v2.2.1: ปรับการอ่านบนมือถือ Android / LINE

เวอร์ชันนี้ปรับหน้าจอ **Pixel Agents Pro Layout** ให้เหมาะกับมือถือ Android โดยเฉพาะการเปิดผ่าน LINE browser / LINE WebView:

- เพิ่มขนาดตัวอักษรและ line-height ให้อ่านสบายขึ้น
- ปรับ Topbar จาก layout แนวนอนให้เป็นการ์ดแนวตั้งบนมือถือ
- ปรับปุ่มและช่องกรอกเป็นขนาดที่แตะง่ายขึ้น
- ปรับ Agent cards ให้ตัวอักษรไม่ถูกบีบและ avatar ใหญ่ขึ้น
- ปรับ Decision Matrix บนมือถือให้เป็นการ์ดรายมิติ อ่านได้โดยไม่ต้องลากซ้ายขวา
- ปรับ Modal รายละเอียดให้พอดีกับจอมือถือ
- เพิ่มป้าย “โหมดอ่านสบายบน Android/LINE”
- เพิ่ม cache busting เป็น `?v=2.2.1`



## อัปเดต v2.2.2: ใส่สีเมนูแผนจุดเข้า-ออก

เวอร์ชันนี้ปรับเมนู **แผนจุดเข้า-ออก (ป๊อก)** ให้แยกสีตัวหนังสือตามประเภทสัญญาณ:

- จุดเข้า = สีเขียว
- จุด Follow = สีฟ้า
- ลดความเสี่ยง = สีเหลือง
- Stop-loss = สีแดง

ปรับทั้งการ์ดด้านล่างและ Modal รายละเอียด เพื่อให้อ่านเร็วขึ้นบน desktop และมือถือ Android / LINE



## อัปเดต v2.2.3: ใส่สี Smart Money / ข่าว / Social

เวอร์ชันนี้ปรับเมนูต่อไปนี้ให้มีสีตัวหนังสือและแถบสถานะตามความหมายของข้อมูล:

1. **วิเคราะห์ Smart Money**
   - เงินใหญ่หนุน / สะสม = สีเขียว
   - กลาง / ยังไม่ชัด = สีเหลือง
   - เงินใหญ่ไหลออก / กดดัน = สีแดง

2. **สรุปข่าวสำคัญ (แปลไทย)**
   - ข่าวดี / ข่าวบวก = สีเขียว
   - ข่าวกลาง = สีเหลือง
   - ข่าวไม่ดี / ข่าวลบ / dilution / offering = สีแดง

3. **Social Sentiment**
   - กระแสบวก = สีเขียว
   - กระแสกลาง = สีเหลือง
   - กระแสลบ / hype risk สูง = สีแดง

ปรับทั้งการ์ดด้านล่างและ Modal รายละเอียด เพื่อให้อ่านเร็วขึ้นทั้งบน desktop และมือถือ Android / LINE



## อัปเดต v2.2.4: แก้เมนู Catalyst / ปฏิทินเหตุการณ์

เวอร์ชันก่อนหน้าเมนู **Catalyst / ปฏิทินเหตุการณ์** เป็นเพียง placeholder จึงอาจดูเหมือนไม่มีข้อมูลจริงมาแสดง

เวอร์ชันนี้ปรับให้ระบบสร้างรายการ Catalyst จากข้อมูลที่มีอยู่จริงในระบบ:

- ข่าวล่าสุด
- Event type จากข่าว เช่น Earnings, SEC, Offering, Contract, Macro, ETF
- Decision Matrix
- Volume / VWAP / Technical watch
- Social heat / hype risk
- Crypto-specific watch เช่น Funding, OI, Liquidation, ETF Flow

สีของ Catalyst:

- เขียว = Catalyst เชิงบวก
- เหลือง = กลาง / ต้องตรวจเพิ่ม
- แดง = Catalyst เสี่ยง / ข่าวลบ

เพิ่ม Modal รายละเอียดของ Catalyst เมื่อกดปุ่ม **ดูปฏิทินทั้งหมด**

หมายเหตุ: ยังไม่ใช่ปฏิทินทางการแบบ real-time เช่น Earnings API หรือ SEC calendar โดยตรง แต่เป็นการสรุปเหตุการณ์ที่ต้องจับตาจากข้อมูลที่ระบบดึงได้



## อัปเดต v2.2.5: ทำให้ปุ่ม WATCHLIST ใช้งานได้จริง

เวอร์ชันนี้แก้ปุ่ม **⭐ WATCHLIST** ให้ใช้งานได้จริง:

- กดครั้งแรก = เพิ่มสินทรัพย์ปัจจุบันเข้า Watchlist
- กดซ้ำ = นำออกจาก Watchlist
- ปุ่มเปลี่ยนสถานะเป็น `★ อยู่ใน WATCHLIST` เมื่อบันทึกแล้ว
- บันทึกด้วย `localStorage` ในเครื่อง/เบราว์เซอร์ของผู้ใช้
- มี toast แจ้งเตือนเมื่อเพิ่ม/ลบสำเร็จ
- ดับเบิลคลิกปุ่ม WATCHLIST เพื่อเปิดหน้ารายการ Watchlist ทั้งหมด
- ปุ่ม Share ข้าง ๆ ใช้งานได้ด้วย: แชร์ผ่าน Web Share API หรือคัดลอกลิงก์

หมายเหตุ: Watchlist นี้เก็บในเครื่องที่ใช้งาน หากเปลี่ยนเครื่อง/เปลี่ยนเบราว์เซอร์/ล้าง cache รายการอาจหายได้



## อัปเดต v2.2.6: ใส่สีเมนูแปลผลคะแนน / ราคาปิดล่าสุด / ความมั่นใจของข้อมูล

เวอร์ชันนี้ปรับ 3 เมนูให้มีสีตามสถานะของข้อมูล:

1. **แปลผลคะแนน**
   - คะแนนดี = สีเขียว
   - คะแนนกลาง = สีเหลือง
   - คะแนนเสี่ยง/อ่อน = สีแดง

2. **ราคาปิดล่าสุด**
   - ราคาเปลี่ยนแปลงบวก = สีเขียว
   - ราคาเปลี่ยนแปลงใกล้เคียงเดิม = สีเหลือง
   - ราคาเปลี่ยนแปลงลบ = สีแดง

3. **ความมั่นใจของข้อมูล**
   - ความมั่นใจสูง = สีเขียว
   - ความมั่นใจปานกลาง = สีเหลือง
   - ความมั่นใจต่ำ = สีแดง

เพิ่มแถบสีด้านซ้ายของการ์ดและปรับสีตัวหนังสือให้เห็นชัดขึ้นทั้ง desktop และมือถือ


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

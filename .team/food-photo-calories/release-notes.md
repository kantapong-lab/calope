# Release notes: food-photo-calories (MVP)

Date: 2026-10-08. Status: draft for release. **Not released.** Consent wording is PENDING LEGAL REVIEW. Verification of live provider and database behaviour is not yet complete (see Verification status).

Copy of `E:\projects\calope-docs\docs\release-notes\food-photo-calories.md` (branch `docs/food-photo-calories`).

---

## ภาษาไทย

### การเปลี่ยนแปลง (สิ่งที่ผู้ใช้จะเห็น)

- ถ่ายรูปหรือเลือกรูปอาหารจากเครื่อง ระบบจะประมาณชื่ออาหาร ปริมาณเป็นกรัม และช่วงแคลอรี่ (ต่ำ-สูง) พร้อมระดับความมั่นใจและสมมติฐานที่ใช้
- แสดงแคลอรี่เป็นช่วงเท่านั้น ไม่มีหน้าจอใดแสดงตัวเลขเดียวเป็นค่าประมาณ
- ทุกหน้าจอที่แสดงค่าประมาณมีข้อความไม่ใช่คำแนะนำทางการแพทย์ (`disclaimer.short`: ค่าแคลอรี่เป็นการประมาณ ไม่ใช่คำแนะนำทางการแพทย์)
- แก้ไขชื่ออาหารและปริมาณ (กรัม หรือจำนวนจาน) ได้ แคลอรี่จะคำนวณใหม่ตามสัดส่วนทันทีโดยไม่เรียกระบบวิเคราะห์ใหม่
- ประเมินใหม่จากชื่ออาหารที่แก้ไข หรือกรอกแคลอรี่เองได้
- บันทึกมื้ออาหารได้ โดยแต่ละอาหารในรูปจะถูกบันทึกเป็นหนึ่งรายการ และดูประวัติย้อนหลังได้ (ใหม่สุดก่อน)
- กรอกข้อมูลมื้ออาหารเองได้ (ชื่อ ปริมาณ แคลอรี่) เมื่อไม่ต้องการหรือวิเคราะห์รูปไม่สำเร็จ โดยไม่ต้องให้ความยินยอมส่งรูป
- ความยินยอมส่งรูปไปวิเคราะห์: ต้องยินยอมก่อนจึงจะส่งรูปได้ ช่องยินยอมไม่ถูกติ๊กไว้ล่วงหน้า และสามารถถอนความยินยอมได้ในหน้าตั้งค่า **PENDING LEGAL REVIEW**
- ลบมื้ออาหารทีละรายการ หรือลบข้อมูลอาหารทั้งหมดได้ (ลบถาวร)
- รูปจะถูกลบข้อมูลตำแหน่งและข้อมูลกล้องก่อนส่ง และย่อขนาดก่อนส่ง รูปไม่ถูกเก็บในระบบของเรา
- ใช้งานได้ทั้งหมดเป็นภาษาไทย ชื่ออาหารแสดงทั้งภาษาไทยและภาษาอังกฤษเมื่อระบบมีชื่อภาษาอังกฤษ

ข้อความที่ผู้ใช้จะเห็น (ตรงกับ `src/copy/th.ts`):

| สถานการณ์ | ข้อความ |
|---|---|
| หน้าถ่ายรูป | รองรับไฟล์ JPEG, PNG, WebP ขนาดไม่เกิน 10 MB |
| หน้าถ่ายรูป (ความเป็นส่วนตัว) | ข้อมูลตำแหน่งและข้อมูลกล้องในรูปจะถูกลบก่อนส่งวิเคราะห์ ภาพจะถูกย่อก่อนส่ง |
| ไฟล์ใหญ่เกินไป | ไฟล์ใหญ่เกินไป |
| ไม่พบอาหาร | ไม่พบอาหารในรูปนี้ |
| วิเคราะห์ไม่สำเร็จ | วิเคราะห์รูปไม่สำเร็จ |
| ครบจำนวนต่อชั่วโมง | วิเคราะห์ครบจำนวนต่อชั่วโมงแล้ว |
| หน้าเข้าสู่ระบบ | เข้าสู่ระบบเพื่อบันทึกมื้ออาหาร |
| ปุ่มเข้าสู่ระบบ | เข้าสู่ระบบด้วย Google |
| ปุ่มยินยอม | ยินยอมและดำเนินการต่อ |
| คำใบ้ปุ่มยินยอม | ปุ่มจะใช้งานได้เมื่อคุณติ๊กช่องยินยอม |
| ถอนความยินยอมแล้ว | จะไม่มีการส่งรูปไปวิเคราะห์อีกจนกว่าคุณจะยินยอมใหม่ มื้ออาหารที่บันทึกไว้ยังอยู่ ลบได้ที่ด้านล่าง |
| บันทึกแล้ว | บันทึกมื้อนี้แล้ว |

ข้อความเต็มของข้อผิดพลาดจาก API อยู่ใน `docs/api/food-photo-calories.md`

### ไม่รองรับ / ข้อจำกัดที่ทราบ (Known limitations)

1. **สองอาหารจากหนึ่งรูป จะถูกบันทึกเป็นสองรายการแยกกัน** ระบบไม่ได้เชื่อมรายการที่มาจากรูปเดียวกัน ดังนั้นภายหลังจะจัดกลุ่มกลับไม่ได้ (จะเพิ่มในอนาคตได้)
2. **ไม่มีรายการอาหารให้เลือก (dish pick list)** ใน MVP การแก้ชื่ออาหารพิมพ์เองเท่านั้น (รอแหล่งข้อมูลอาหารไทยที่มีสิทธิ์ใช้งาน)
3. **ข้อความความยินยอมรอการตรวจสอบทางกฎหมาย (PENDING LEGAL REVIEW)** รวมถึงการส่งข้อมูลไปประมวลผลนอกประเทศไทย (สหรัฐอเมริกา) และการเก็บรักษาข้อมูลของผู้ให้บริการสูงสุด 30 วัน จนกว่าจะผ่านการตรวจสอบ ควรถือว่ายังไม่ใช่ข้อความสุดท้าย
4. **เข้าสู่ระบบด้วย Google เท่านั้น** ใน MVP ยังไม่มีวิธีเข้าสู่ระบบอื่น และยังไม่มีช่องชื่อบัญชีในการตั้งค่า
5. ค่าแคลอรี่เป็นการประมาณจากรูปเพียงภาพเดียว อาจคลาดเคลื่อนได้ ผู้ใช้ควรปรับชื่อและปริมาณให้ตรงกับที่กินจริง

### การย้ายข้อมูล (Migrations)

- `db/migrations/0000_init.sql`: สร้างตาราง users และ accounts (Auth.js), consent_records, meal_logs, analysis_events
- `db/migrations/0001_consent_superseded.sql`: เพิ่มคอลัมน์ `superseded_at` ใน consent_records (เพิ่มได้โดยไม่กระทบข้อมูลเดิม) และเปลี่ยนดัชนีเป็นแบบครอบคลุมทั้ง `withdrawn_at` และ `superseded_at`

สถานะ: **ยังไม่ได้ตรวจสอบบนฐานข้อมูลจริง**

### การย้อนกลับ (Rollback)

1. ย้อนกลับแอปด้วย Vercel Instant Rollback (`vercel rollback <deployment-url>` หรือจาก dashboard) ซึ่งชี้โดเมนหลักกลับไปยัง deployment ก่อนหน้าโดยไม่ build ใหม่
2. การเปลี่ยนค่าตัวแปรสภาพแวดล้อมไม่ถูกย้อนกลับ ต้องแก้และ deploy ใหม่เอง (รวมถึง `FOOD_VISION_MODEL` และคีย์)
3. ถ้าต้องถอนการย้ายข้อมูล ใช้ `db/migrations/0001_consent_superseded.down.sql` และ `0000_init.down.sql` ตามลำดับย้อนกลับ ตรวจสอบก่อนใช้ใน production
4. การเปลี่ยนโมเดล (เช่น Sonnet เป็น Haiku) เป็นการเปลี่ยนค่าคอนฟิก: เปลี่ยน `FOOD_VISION_MODEL` แล้ว deploy และตรวจสอบ
5. ใช้ Vercel Instant Rollback บนแผน Hobby ได้เฉพาะ deployment ก่อนหน้าหนึ่งรายการ

### ไม่มี breaking change

รุ่นแรก ยังไม่มีผู้ใช้หรือ API รุ่นเก่าที่ต้องรองรับ

### สถานะการตรวจสอบ (Verification status)

- ผ่านแล้ว: unit tests 187 รายการ, lint, build (Orchestrator รายงาน); QA 237 ผ่าน, 0 ไม่ผ่าน, ข้าม 26 รายการ (21 รายการต้องใช้ DATABASE_URL, 5 รายการเป็น stub ที่ยังไม่ได้รัน)
- **ยังไม่ได้ตรวจสอบ:** การเรียกผู้ให้บริการวิเคราะห์จริง, พฤติกรรมฐานข้อมูลจริง (lock ของ rate limit, การ supersede ความยินยอม, การเก็บข้อมูล), ความแม่นยำ/เวลาตอบสนอง/ต้นทุน (AC-24) ไม่มีตัวเลขที่ยืนยันในเอกสารนี้
- **PENDING LEGAL REVIEW:** ข้อความความยินยอม, การส่งไปสหรัฐอเมริกา, การเก็บรักษาข้อมูลโดยผู้ให้บริการ 30 วัน

---

## English

### Changes (user-visible)

- Take or pick a food photo. The app estimates each dish's name (Thai and English), grams, a calorie range (low to high), a confidence level and the assumptions used (for example oil, sauce, coconut milk, sugar).
- Calories are always shown as a range. No screen shows a single number as the estimate.
- Every screen that shows an estimate carries the Thai not-medical-advice notice: ค่าแคลอรี่เป็นการประมาณ ไม่ใช่คำแนะนำทางการแพทย์.
- Edit the dish name and the portion (grams or number of plates). Calories update on screen in proportion, without a new analysis.
- Re-estimate from an edited dish name, or enter calories manually.
- Save the meal. Each dish is saved as its own entry. View meal history, newest first.
- Enter a meal manually (name, portion, calories) when you do not want to send a photo or when analysis fails. No photo consent is needed for manual entries.
- Photo consent: a photo is sent for analysis only after you give explicit consent. The consent box starts unticked and is not bundled with other terms. You can withdraw consent in Settings; analysis then stops until you consent again. **PENDING LEGAL REVIEW.**
- Delete one meal, or all food data. Deletion is permanent.
- Location and camera metadata are removed from the photo before it is sent, and the photo is resized first. Photos are not stored by this service.
- The interface is in Thai. Dish names show Thai and English when an English name is available.

Key user-facing strings (from `src/copy/th.ts`): see the Thai section above.

### Breaking changes

None. First release.

### Migrations

- `db/migrations/0000_init.sql`: creates users and accounts (Auth.js), consent_records, meal_logs, analysis_events.
- `db/migrations/0001_consent_superseded.sql`: adds nullable `consent_records.superseded_at` and replaces the one-open-row unique index to cover `withdrawn_at` and `superseded_at`. Additive.

Status: **not yet verified against a live database.**

### Rollback

1. Roll back the app with Vercel Instant Rollback (`vercel rollback <deployment-url>` or the dashboard). It re-points the production domain to the previous production deployment without a rebuild.
2. Environment variable changes are not rolled back. Revert and redeploy any change to `FOOD_VISION_MODEL` or the API key.
3. To reverse the schema, run `db/migrations/0001_consent_superseded.down.sql`, then `0000_init.down.sql` if needed. Check before running on production.
4. Switching the model (for example Sonnet to Haiku) is a configuration change: set `FOOD_VISION_MODEL`, redeploy, verify.
5. On the Vercel Hobby plan, Instant Rollback reaches only the previous deployment.

### Known limitations

1. **Two dishes from one photo become two separate, unlinked rows.** Later views cannot regroup them. A group id may be added later as a backward-compatible migration.
2. **No dish pick list in MVP.** Dish names are edited as free text only. A list would need a licensed Thai food data source.
3. **Consent wording is PENDING LEGAL REVIEW**, including the transfer of photos to a processor in the United States and the processor's retention of up to 30 days. Treat the current wording as provisional until review is complete.
4. **Sign-in is with Google only** in MVP. There is no account name field.
5. Estimates come from a single photo and can be wrong. Users should correct the dish and portion.

### Verification status

- Passed: 187 unit tests, lint and build (reported by the Orchestrator). QA run: 237 passed, 0 failed, 26 skipped (21 need `DATABASE_URL`, 5 not-run stubs).
- **Not yet verified:** live calls to the model provider; live database behaviour (rate-limit lock, consent supersede, persistence); accuracy, latency and cost (AC-24). No accuracy figures are claimed in these notes.
- **PENDING LEGAL REVIEW:** consent wording, US transfer, 30-day provider retention.

---

Related: `docs/api/food-photo-calories.md` (API reference, error codes, rate limit, Origin rule, environment variable names).

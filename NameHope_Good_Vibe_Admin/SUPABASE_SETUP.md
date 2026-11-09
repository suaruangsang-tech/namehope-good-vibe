# NameHope Good Vibe — Admin Upload Setup

เว็บไซต์นี้ยังคงเป็น Static Site บน Netlify แต่ใช้ Supabase สำหรับบัญชี Admin, ฐานข้อมูล Playlist และไฟล์เพลง/ภาพปก

## สิ่งที่เตรียมไว้ในชุดนี้

- `index.html` — เว็บไซต์ NameHope
- `app.js` — เครื่องเล่นเพลงและระบบ Admin
- `playlist.js` — Playlist แบบเดิม ใช้เป็น fallback ได้
- `supabase-config.js` — ช่องสำหรับใส่ Supabase Project URL, public anon/publishable key และอีเมล Admin
- `supabase_setup.sql` — ตาราง, Storage bucket และ Row Level Security policies
- `music-import/` — ไฟล์เพลงที่คุณแนบมาในแชต เพื่อให้เลือกอัปโหลดจากหน้า Admin ได้

## ขั้นตอนติดตั้งครั้งแรก

### 1) สร้าง Supabase Project

1. เข้า https://supabase.com/ แล้วสร้าง Project ใหม่
2. เก็บ Database Password ไว้ในที่ปลอดภัย (ไม่ต้องใส่ในเว็บไซต์)
3. ไปที่ Project Settings → API
4. คัดลอก Project URL และ public anon key (หรือ publishable key หากหน้า API แสดง key รุ่นใหม่)

### 2) สร้างบัญชี Admin

1. ใน Supabase เปิด Authentication → Users
2. กด Add user แล้วสร้างผู้ใช้ด้วยอีเมลและรหัสผ่านที่คุณต้องการ
3. ยืนยันอีเมลผู้ใช้จาก Dashboard หากระบบร้องขอ
4. ใช้อีเมลนี้เป็น `YOUR_ADMIN_EMAIL` ในขั้นตอนถัดไป

อย่าเปิดให้บุคคลทั่วไปสมัครบัญชีเอง และอย่าใช้รหัสผ่านเดียวกับบัญชีสำคัญอื่น

### 3) สร้างตารางและนโยบายความปลอดภัย

1. เปิด SQL Editor ใน Supabase
2. เปิดไฟล์ `supabase_setup.sql`
3. แทนที่ `YOUR_ADMIN_EMAIL` ทุกตำแหน่งด้วยอีเมล Admin ที่สร้างไว้
4. วาง SQL ทั้งหมดลงใน SQL Editor แล้วกด Run

นโยบายนี้ให้ผู้เข้าชมทั่วไปอ่านเฉพาะเพลงที่เผยแพร่แล้ว ส่วนการเพิ่ม/แก้ไข/ลบเพลงและอัปโหลดไฟล์จะอนุญาตเฉพาะอีเมล Admin ที่กำหนด

### 4) ตั้งค่าเว็บไซต์

เปิด `supabase-config.js` แล้วแทนค่า:

```js
window.NAMEHOPE_SUPABASE = {
  url: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY',
  adminEmail: 'your-admin@email.com'
};
```

ใช้เฉพาะ Project URL และ public anon/publishable key เท่านั้น ห้ามใส่ `service_role` หรือ secret key ในไฟล์ JavaScript ที่ส่งขึ้น Netlify

### 5) Deploy ขึ้น Netlify

อัปโหลดไฟล์และโฟลเดอร์ทั้งหมดในชุดนี้ไปยัง Netlify โดยให้ `index.html`, `app.js`, `playlist.js` และ `supabase-config.js` อยู่ระดับเดียวกัน

หากเว็บไซต์เดิมผูกกับ GitHub ให้แทนที่ไฟล์ใน repository แล้ว push เพื่อ Deploy ใหม่ หรืออัปโหลดโฟลเดอร์โปรเจกต์ผ่าน Netlify

### 6) ใช้งาน Admin

1. เปิดเว็บไซต์แล้วต่อท้าย URL ด้วย `/#admin`
2. เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน Admin
3. กรอกชื่อเพลง เลือกไฟล์เสียง และ (ถ้ามี) เลือกภาพปก
4. กด “อัปโหลดและเผยแพร่เพลง”
5. เพลงจะถูกบันทึกใน Supabase และแสดงบนหน้าเว็บสาธารณะ

## ข้อจำกัดและหมายเหตุ

- รองรับไฟล์ MP3, M4A, WAV และ OGG ขนาดไม่เกิน 100 MB ต่อไฟล์ ตามการตั้งค่า bucket
- ภาพปกรองรับ JPG, PNG และ WebP
- ระบบอัปโหลดนี้ต้องตั้งค่า Supabase ก่อน จึงจะใช้งาน Admin ได้
- ไฟล์เพลงใน `music-import/` ยังไม่ได้ถูกเผยแพร่อัตโนมัติ คุณสามารถเลือกอัปโหลดทีละเพลงผ่านหน้า Admin ได้
- การตั้งค่า bucket เป็น Public หมายความว่าผู้ที่มี URL ของไฟล์เพลงสามารถเข้าถึงไฟล์ได้ ซึ่งเหมาะกับเพลงที่ต้องการเผยแพร่สู่ผู้ฟัง
- Supabase มีโควตาและค่าใช้จ่ายตามแพ็กเกจ โปรดตรวจสอบ Storage และ bandwidth ก่อนเผยแพร่ไฟล์จำนวนมาก
- ควรเปิด MFA ให้บัญชี Admin และใช้รหัสผ่านที่คาดเดายาก
- อย่าแชร์ไฟล์ `supabase-config.js` ที่มีข้อมูลลับ (แม้ public key จะออกแบบมาให้ใช้ฝั่งเว็บได้ แต่ไม่ควรเปิดเผยข้อมูลบัญชีอื่น)

## การจัดการเพลงใน Admin ที่มีให้

- Upload และ Publish เพลง
- เปลี่ยนชื่อเพลง
- ลบเพลงและไฟล์ที่เกี่ยวข้อง
- เลื่อนเพลงขึ้น/ลงเพื่อจัดลำดับ Playlist

การแก้ไขและจัดการเพลงจะบันทึกใน Cloud โดยตรง ไม่ต้องแก้ `playlist.js` หรือ Deploy เว็บไซต์ใหม่ทุกครั้ง

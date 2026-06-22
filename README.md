# سیستم حاضری بدون Node.js / بدون Vercel

این نسخه فقط از دو سرویس استفاده می‌کند:

1. **GitHub Pages** برای هاست Frontend
2. **Supabase** برای Database، Login و Security

هیچ Node.js، npm، Git، Vercel یا Netlify لازم نیست.

## 1) تنظیم Supabase
1. در Supabase یک پروژه بسازید.
2. `supabase/schema.sql` را در `SQL Editor` اجرا کنید.
3. از `Authentication > Users` یک User بسازید.
4. UUID آن User را کپی کنید و اجرا کنید:

```sql
insert into public.profiles(id, role, full_name)
values('PASTE_AUTH_USER_UUID', 'super_admin', 'Dr Amin');
```

5. از `Project Settings > API` این دو مقدار را کپی کنید:
   - Project URL
   - Publishable key (یا anon key)

6. فایل `assets/config.js` را با Notepad باز کنید و مقادیر را جایگزین نمایید:
```js
window.SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
window.SUPABASE_PUBLISHABLE_KEY = "YOUR_PUBLISHABLE_KEY";
```

**هرگز `service_role` key را در فایل config.js قرار ندهید.**

## 2) Upload به GitHub Pages بدون Git
1. یک Repository جدید در GitHub بسازید، برای نمونه `attendance`.
2. گزینه **Add file > Upload files** را بزنید.
3. تمام فایل‌های داخل فولدر پروژه را آپلود کنید.
4. به `Settings > Pages` بروید.
5. زیر `Build and deployment`:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/(root)**
6. Save را بزنید.
7. بعد از چند دقیقه یک لینک مشابه زیر خواهید داشت:
   `https://YOUR_USERNAME.github.io/attendance/`

## 3) Supabase Authentication URL
در Supabase:
- بروید به `Authentication > URL Configuration`
- Site URL را لینک GitHub Pages خود قرار دهید:
  `https://YOUR_USERNAME.github.io/attendance/`
- Redirect URLs را نیز همین آدرس وارد کنید.

## 4) ساخت Roleهای دیگر
ابتدا User را از `Authentication > Users` بسازید، سپس:
```sql
insert into public.profiles(id, role, full_name)
values('AUTH_USER_UUID', 'admin', 'Admin User');
```
Roleها:
- super_admin
- admin
- attendance_user
- student

برای Student، یک شاگرد بسازید و سپس auth_user_id او را وصل کنید:
```sql
update public.students set auth_user_id='AUTH_USER_UUID' where student_id='KMU-001';

insert into public.profiles(id,role,full_name,student_id)
select 'AUTH_USER_UUID','student',full_name,id
from public.students where student_id='KMU-001';
```

## Important
GitHub Pages یک هاست Static است؛ بنابراین ایجاد User از داخل برنامه با Service Role Key امن نیست.
Userهای Admin و Super Admin را از Supabase Dashboard بسازید و نقش‌شان را با SQL تعیین کنید.
Security واقعی در RLS policies داخل `supabase/schema.sql` انجام می‌شود.

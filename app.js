/* Static GitHub Pages client. Security is enforced in Supabase RLS, not by hiding buttons. */
const sb = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let currentUser = null, profile = null, locale = localStorage.getItem("attendance_locale") || "prs";
const isManager=()=>["super_admin","admin"].includes(profile?.role);
const canAttendance=()=>["super_admin","admin","attendance_user"].includes(profile?.role);
const isSuper=()=>profile?.role==="super_admin";

const t = {
 prs:{appName:"سیستم حاضری",dashboard:"داشبورد",students:"شاگردان",attendance:"ثبت حاضری",history:"تاریخچه",reports:"راپورها",users:"کاربران",logout:"خروج",login:"ورود",email:"ایمیل",password:"رمز عبور",save:"ذخیره",delete:"حذف",edit:"ویرایش",studentId:"شماره شاگرد",fullName:"نام مکمل",enrollmentDate:"تاریخ ثبت‌نام",status:"وضعیت",notes:"یادداشت",addStudent:"افزودن شاگرد",search:"جستجو",today:"امروز",present:"حاضر",absent:"غیر حاضر",leave:"رخصت",sick:"مریض",holiday:"تعطیل",total:"تعداد کل شاگردان",attendanceRate:"فیصدی حاضری",markAllPresent:"حاضر ساختن همه",saveAttendance:"ذخیره حاضری",date:"تاریخ",noData:"داده‌ای موجود نیست",confirmDelete:"آیا مطمئن هستید؟",forgot:"رمز عبور را فراموش کرده‌اید؟"},
 en:{appName:"Attendance System",dashboard:"Dashboard",students:"Students",attendance:"Mark Attendance",history:"History",reports:"Reports",users:"Users",logout:"Logout",login:"Login",email:"Email",password:"Password",save:"Save",delete:"Delete",edit:"Edit",studentId:"Student ID",fullName:"Full name",enrollmentDate:"Enrollment date",status:"Status",notes:"Notes",addStudent:"Add student",search:"Search",today:"Today",present:"Present",absent:"Absent",leave:"Leave",sick:"Sick",holiday:"Holiday",total:"Total students",attendanceRate:"Attendance rate",markAllPresent:"Mark all present",saveAttendance:"Save attendance",date:"Date",noData:"No data available",confirmDelete:"Are you sure?",forgot:"Forgot password?"}
};
function tr(k){ return t[locale][k] || k }
function toast(msg){const e=$("#toast");e.textContent=msg;e.style.display="block";setTimeout(()=>e.style.display="none",3200)}
function setLocale(next){locale=next;localStorage.setItem("attendance_locale",locale);document.documentElement.lang=locale;document.documentElement.dir=locale==="prs"?"rtl":"ltr";$("#languageBtn").textContent=locale==="prs"?"English":"دری";$("#languageAuth").textContent=locale==="prs"?"English":"دری";renderStaticText(); if(currentUser) renderPage(activePage())}
function renderStaticText(){ $$("[data-i18n]").forEach(e=>e.textContent=tr(e.dataset.i18n)); $("#authTitle").textContent=tr("appName");$("#authText").textContent=locale==="prs"?"برای ورود، ایمیل و رمز عبور را وارد کنید.":"Enter your email and password.";$("#emailLabel").textContent=tr("email");$("#passwordLabel").textContent=tr("password");$("#loginBtn").textContent=tr("login");$("#forgotBtn").textContent=tr("forgot") }
function activePage(){return $(".nav.active")?.dataset.page||"dashboard"}
function afDate(iso){ if(!iso)return ""; try { return new Intl.DateTimeFormat(locale==="prs"?"fa-AF-u-ca-persian":"en-US-u-ca-persian",{year:"numeric",month:"long",day:"numeric",timeZone:"Asia/Kabul"}).format(new Date(iso+"T12:00:00Z")); }catch{return iso} }
function kabulISO(){return new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Kabul"}).format(new Date())}
function ensureConfig(){return sb && !window.SUPABASE_URL.includes("PASTE_") && !window.SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")}

async function loadProfile(){
 const {data:{user}}=await sb.auth.getUser(); currentUser=user;
 if(!user){showLogin();return}
 const {data,error}=await sb.from("profiles").select("*").eq("id",user.id).single();
 if(error){toast("Profile not found. Ask Super Admin to assign your role."); await sb.auth.signOut(); showLogin();return}
 profile=data; $("#profileBadge").textContent=(profile.full_name||user.email).slice(0,18); 
 $$(".role-manager").forEach(e=>e.classList.toggle("hidden",!isManager()));
 $$(".role-attendance").forEach(e=>e.classList.toggle("hidden",!canAttendance()));
 $$(".role-superadmin").forEach(e=>e.classList.toggle("hidden",!isSuper()));
 showApp(); renderPage("dashboard");
}
function showLogin(){$("#loginView").classList.remove("hidden");$("#appView").classList.add("hidden")}
function showApp(){$("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden")}

async function renderDashboard(){
 const today=kabulISO();
 const [{count:total},{data:todayRows}] = await Promise.all([
   sb.from("students").select("*",{count:"exact",head:true}).eq("status","active").is("deleted_at",null),
   sb.from("attendance_records").select("status").eq("attendance_date",today)
 ]);
 const rows=todayRows||[], present=rows.filter(x=>x.status==="present").length, absent=rows.filter(x=>x.status==="absent").length, leave=rows.filter(x=>x.status==="leave").length;
 const rate=total?Math.round(present*100/total):0;
 $("#dashboardPage").innerHTML=`<h2>${tr("dashboard")}</h2><p class="muted">${tr("today")}: ${afDate(today)}</p>
 <div class="cards"><div class="card"><span class="muted">${tr("total")}</span><div class="number">${total||0}</div></div><div class="card"><span class="muted">${tr("present")}</span><div class="number">${present}</div></div><div class="card"><span class="muted">${tr("absent")}</span><div class="number">${absent}</div></div><div class="card"><span class="muted">${tr("leave")}</span><div class="number">${leave}</div></div><div class="card"><span class="muted">${tr("attendanceRate")}</span><div class="number">${rate}%</div></div></div>
 <div class="card" style="margin-top:18px"><h3>${locale==="prs"?"وضعیت سیستم":"System status"}</h3><p class="muted">${locale==="prs"?"تمام داده‌ها در Supabase ذخیره می‌شود و قوانین RLS سطح دسترسی را کنترل می‌کنند.":"All data is saved in Supabase and access is controlled by RLS."}</p></div>`;
}

async function renderStudents(){
 if(!isManager()) return unauthorized();
 $("#studentsPage").innerHTML=`<div class="toolbar"><h2 style="margin:0">${tr("students")}</h2><span style="flex:1"></span><input id="studentSearch" placeholder="${tr("search")}..." /><button id="addStudentBtn" class="primary">${tr("addStudent")}</button></div><div class="table-wrap"><table><thead><tr><th>${tr("studentId")}</th><th>${tr("fullName")}</th><th>${tr("status")}</th><th>${tr("enrollmentDate")}</th><th></th></tr></thead><tbody id="studentsBody"></tbody></table></div>`;
 $("#addStudentBtn").onclick=()=>openStudentDialog(); $("#studentSearch").oninput=loadStudents; await loadStudents();
}
async function loadStudents(){
 const q=$("#studentSearch")?.value?.trim()||"";
 let query=sb.from("students").select("*").is("deleted_at",null).order("created_at",{ascending:false}).limit(100);
 if(q)query=query.or(`full_name.ilike.%${q}%,student_id.ilike.%${q}%`);
 const {data,error}=await query;if(error){toast(error.message);return}
 $("#studentsBody").innerHTML=(data||[]).map(s=>`<tr><td>${escapeHTML(s.student_id)}</td><td>${escapeHTML(s.full_name)}</td><td><span class="badge">${escapeHTML(s.status)}</span></td><td>${afDate(s.enrollment_date)}</td><td class="row-actions"><button onclick="editStudent('${s.id}')">${tr("edit")}</button><button class="danger" onclick="deleteStudent('${s.id}')">${tr("delete")}</button></td></tr>`).join("")||`<tr><td colspan="5">${tr("noData")}</td></tr>`;
}
function escapeHTML(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
window.editStudent=async id=>{const {data,error}=await sb.from("students").select("*").eq("id",id).single();if(error)return toast(error.message);openStudentDialog(data)}
window.deleteStudent=async id=>{if(!confirm(tr("confirmDelete")))return;const {error}=await sb.from("students").update({deleted_at:new Date().toISOString()}).eq("id",id);if(error)toast(error.message);else{toast("Deleted");loadStudents()}}
function openStudentDialog(s={}){
 $("#studentDialogTitle").textContent=s.id?tr("edit"):tr("addStudent");$("#studentUuid").value=s.id||"";$("#studentId").value=s.student_id||"";$("#studentName").value=s.full_name||"";$("#enrollmentDate").value=s.enrollment_date||kabulISO();$("#studentStatus").value=s.status||"active";$("#studentNotes").value=s.notes||"";$("#studentDialog").showModal();
}

async function renderAttendance(){
 if(!canAttendance())return unauthorized();
 $("#attendancePage").innerHTML=`<div class="toolbar"><h2 style="margin:0">${tr("attendance")}</h2><span style="flex:1"></span><label>${tr("date")} <input id="attendanceDate" type="date" value="${kabulISO()}"></label><button id="allPresent" class="primary">${tr("markAllPresent")}</button><button id="saveAttendance" class="primary">${tr("saveAttendance")}</button></div><p class="muted" id="shownDate"></p><div class="table-wrap"><table><thead><tr><th>${tr("studentId")}</th><th>${tr("fullName")}</th><th>${tr("status")}</th><th>${tr("notes")}</th></tr></thead><tbody id="attendanceBody"></tbody></table></div>`;
 $("#attendanceDate").onchange=loadAttendance;$("#allPresent").onclick=()=>$$(".attendanceStatus").forEach(x=>x.value="present");$("#saveAttendance").onclick=saveAttendance; await loadAttendance();
}
async function loadAttendance(){
 const date=$("#attendanceDate").value;$("#shownDate").textContent=afDate(date);
 const {data:students,error}=await sb.from("students").select("id,student_id,full_name").eq("status","active").is("deleted_at",null).order("full_name");if(error)return toast(error.message);
 const {data:records}=await sb.from("attendance_records").select("*").eq("attendance_date",date);
 const map=Object.fromEntries((records||[]).map(r=>[r.student_id,r]));
 $("#attendanceBody").innerHTML=(students||[]).map(s=>{let r=map[s.id]||{status:"present",note:""};return `<tr class="attendance-row" data-student="${s.id}"><td>${escapeHTML(s.student_id)}</td><td>${escapeHTML(s.full_name)}</td><td><select class="attendanceStatus"><option value="present" ${r.status==="present"?"selected":""}>${tr("present")}</option><option value="absent" ${r.status==="absent"?"selected":""}>${tr("absent")}</option><option value="leave" ${r.status==="leave"?"selected":""}>${tr("leave")}</option><option value="sick" ${r.status==="sick"?"selected":""}>${tr("sick")}</option><option value="holiday" ${r.status==="holiday"?"selected":""}>${tr("holiday")}</option></select></td><td><input class="attendanceNote" value="${escapeHTML(r.note||"")}"></td></tr>`}).join("")||`<tr><td colspan="4">${tr("noData")}</td></tr>`;
}
async function saveAttendance(){
 const date=$("#attendanceDate").value; const rows=$$(".attendance-row").map(r=>({student_id:r.dataset.student,attendance_date:date,status:r.querySelector(".attendanceStatus").value,note:r.querySelector(".attendanceNote").value||null,recorded_by:currentUser.id}));
 const {error}=await sb.from("attendance_records").upsert(rows,{onConflict:"student_id,attendance_date"}); if(error)toast(error.message);else toast(locale==="prs"?"حاضری ذخیره شد":"Attendance saved");
}
async function renderHistory(){
 const q=isManager()?sb.from("attendance_records").select("attendance_date,status,note,students(student_id,full_name)").order("attendance_date",{ascending:false}).limit(200):sb.from("attendance_records").select("attendance_date,status,note,students(student_id,full_name)").order("attendance_date",{ascending:false}).limit(200);
 const {data,error}=await q;if(error)return toast(error.message);
 $("#historyPage").innerHTML=`<h2>${tr("history")}</h2><div class="table-wrap"><table><thead><tr><th>${tr("date")}</th><th>${tr("fullName")}</th><th>${tr("status")}</th><th>${tr("notes")}</th></tr></thead><tbody>${(data||[]).map(r=>`<tr><td>${afDate(r.attendance_date)}</td><td>${escapeHTML(r.students?.full_name||"")}</td><td><span class="badge status-${r.status}">${tr(r.status)}</span></td><td>${escapeHTML(r.note||"")}</td></tr>`).join("")||`<tr><td colspan="4">${tr("noData")}</td></tr>`}</tbody></table></div>`;
}
async function renderReports(){if(!isManager())return unauthorized();$("#reportsPage").innerHTML=`<h2>${tr("reports")}</h2><div class="card"><p>${locale==="prs"?"برای گزارش، از تاریخچه استفاده کنید و با Print مرورگر PDF بسازید. فایل‌های CSV از جدول تاریخچه با دکمهٔ Export بعداً قابل افزودن است.":"Use History and browser Print to create a PDF. CSV export can be added from the history table."}</p><button class="primary" style="width:auto" onclick="window.print()">Print / PDF</button></div>`}
function renderUsers(){if(!isSuper())return unauthorized();$("#usersPage").innerHTML=`<h2>${tr("users")}</h2><div class="card"><p class="muted">${locale==="prs"?"ایجاد کاربر جدید از Supabase Authentication انجام می‌شود؛ سپس نقش آن کاربر در جدول profiles تعیین می‌گردد. این روش از افشای Service Role Key در GitHub Pages جلوگیری می‌کند.":"Create a user in Supabase Authentication then assign a role in profiles. This prevents exposing the Service Role Key on GitHub Pages."}</p></div>`}
function unauthorized(){const p=$(".page:not(.hidden)"); if(p)p.innerHTML="<div class='card'><h2>Unauthorized</h2></div>"}
async function renderPage(name){$$(".page").forEach(x=>x.classList.add("hidden"));$(`#${name}Page`).classList.remove("hidden");if(name==="dashboard")await renderDashboard();if(name==="students")await renderStudents();if(name==="attendance")await renderAttendance();if(name==="history")await renderHistory();if(name==="reports")await renderReports();if(name==="users")renderUsers()}

$("#loginForm").onsubmit=async e=>{e.preventDefault();if(!ensureConfig())return toast("Put Supabase URL and Publishable key in assets/config.js");const {error}=await sb.auth.signInWithPassword({email:$("#email").value,password:$("#password").value});if(error)toast(error.message);else loadProfile()}
$("#forgotBtn").onclick=async()=>{const email=prompt("Email");if(!email)return;const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});toast(error?error.message:"Reset email sent")}
$("#languageBtn").onclick=()=>setLocale(locale==="prs"?"en":"prs");$("#languageAuth").onclick=()=>setLocale(locale==="prs"?"en":"prs");
$("#themeBtn").onclick=()=>document.body.classList.toggle("dark");$("#menuBtn").onclick=()=>$(".sidebar").classList.toggle("open");
$$(".nav").forEach(b=>b.onclick=()=>{$$(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(".sidebar").classList.remove("open");renderPage(b.dataset.page)});
$("#logoutBtn").onclick=async()=>{await sb.auth.signOut();currentUser=null;profile=null;showLogin()};$$(".closeDialog").forEach(x=>x.onclick=()=>$("#studentDialog").close());
$("#studentForm").onsubmit=async e=>{e.preventDefault();const id=$("#studentUuid").value;const row={student_id:$("#studentId").value.trim(),full_name:$("#studentName").value.trim(),enrollment_date:$("#enrollmentDate").value,status:$("#studentStatus").value,notes:$("#studentNotes").value.trim()||null};const result=id?await sb.from("students").update(row).eq("id",id):await sb.from("students").insert(row);if(result.error)return toast(result.error.message);$("#studentDialog").close();toast("Saved");loadStudents()};
renderStaticText(); if(ensureConfig())loadProfile();

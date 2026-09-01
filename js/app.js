"use strict";

// =====================================================
// داده‌های تقویم‌ها
// =====================================================

// نام روزهای هفته برای هر تقویم
const weekDaysNames = {
    jalali: ["شنبه","یکشنبه","دوشنبه","سه شنبه","چهارشنبه","پنجشنبه","جمعه"],
    gregorian: ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"],
    hijri: ["السبت","الاحد","الاثنين","الثلاثاء","الاربعاء","الخميس","الجمعة"]
};

// نام ماه‌های هر تقویم
const monthNames = {
    jalali: ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"],
    gregorian: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    hijri: ["محرم","صفر","ربیع‌الاول","ربیع‌الثانی","جمادی‌الاول","جمادی‌الثانی","رجب","شعبان","رمضان","شوال","ذی‌القعده","ذی‌الحجه"]
};

// محدوده سال معتبر برای هر تقویم
const yearRanges = {
    jalali: [1300, 1500],
    gregorian: [1900, 2100],
    hijri: [1300, 1500]
};

// سال پیش‌فرض برای هر تقویم
const defaultYears = {
    jalali: "1404",
    gregorian: "2025",
    hijri: "1446"
};

let currentCalendar = "jalali";
let isCancelled = false;

// =====================================================
// تقویم جلالی (شمسی)
// =====================================================
const jalaliBreaks = [-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
const div = (a,b) => Math.floor(a/b);
const mod = (a,b) => a - Math.floor(a/b)*b;

function jalCal(jy, withoutLeap = false) {
    const breaks = jalaliBreaks, bl = breaks.length;
    const gy = jy + 621;
    let leapJ = -14, jp = breaks[0], jm, jump, leap, n;
    for (let i=1; i<bl; i++) {
        jm = breaks[i]; jump = jm - jp;
        if (jy < jm) break;
        leapJ += div(jump,33)*8 + div(mod(jump,33),4);
        jp = jm;
    }
    n = jy - jp;
    leapJ += div(n,33)*8 + div(mod(n,33)+3,4);
    if (mod(jump,33)===4 && jump-n===4) leapJ++;
    const leapG = div(gy,4) - div((div(gy,100)+1)*3,4) - 150;
    const march = 20 + leapJ - leapG;
    if (withoutLeap) return {gy, march};
    n = jy - jp;
    if (jump-n < 6) n = n - jump + div(jump+4,33)*33;
    leap = mod(mod(n+1,33)-1,4);
    if (leap === -1) leap = 4;
    return {leap, gy, march};
}

const isLeapJalali = y => jalCal(y).leap === 0;

function getJalaliMonthDays(year) {
    return [31,31,31,31,31,31,30,30,30,30,30, isLeapJalali(year)?30:29];
}

function jalaliToGregorian(jy, jm, jd) {
    const {gy, march} = jalCal(jy, true);
    let doy;
    if (jm <= 6) doy = (jm-1)*31 + (jd-1);
    else doy = 6*31 + (jm-7)*30 + (jd-1);
    const date = new Date(Date.UTC(gy, 2, march + doy));
    return {year: date.getUTCFullYear(), month: date.getUTCMonth()+1, day: date.getUTCDate()};
}

// =====================================================
// تقویم میلادی
// =====================================================
const isLeapGregorian = y => (y%4===0 && y%100!==0) || y%400===0;

function getGregorianMonthDays(year, month) {
    const d = [31,28,31,30,31,30,31,31,30,31,30,31];
    if (month===2 && isLeapGregorian(year)) return 29;
    return d[month-1];
}

// =====================================================
// تقویم قمری (هجری تابلاری)
// =====================================================
const isLeapHijri = year => ((year*11)+14)%30 < 11;

function getHijriMonthDays(year, month) {
    if (month===12) return isLeapHijri(year) ? 30 : 29;
    return (month%2===1) ? 30 : 29;
}

function islamicToJdn(year, month, day) {
    return day + Math.ceil(29.5*(month-1)) + (year-1)*354 +
           Math.floor((3+(11*year))/30) + 1948439.5;
}

function jdnToGregorian(jdn) {
    const a = jdn + 0.5;
    const b = Math.floor(a);
    const c = b + 32044;
    const d = Math.floor((4*c+3)/146097);
    const e = c - Math.floor((146097*d)/4);
    const f = Math.floor((4*e+3)/1461);
    const g = e - Math.floor((1461*f)/4);
    const h = Math.floor((5*g+2)/153);
    const day = g - Math.floor((153*h+2)/5) + 1;
    const month = h + 3 - 12*Math.floor(h/10);
    const year = 100*d + f - 4800 + Math.floor(h/10);
    return {year, month, day};
}

// =====================================================
// دریافت اندیس روز هفته برای هر تقویم
// =====================================================
function getDayNameIndex(cal, year, month, day) {
    let g;
    if (cal === "jalali") {
        g = jalaliToGregorian(year, month, day);
    } else if (cal === "gregorian") {
        g = {year, month, day};
    } else {
        g = jdnToGregorian(Math.floor(islamicToJdn(year, month, day)));
    }
    const date = new Date(Date.UTC(g.year, g.month - 1, g.day));
    return (date.getUTCDay() + 1) % 7;
}

// =====================================================
// منطق ساخت فولدر
// =====================================================
function getMonthDaysForYear(cal, year, month) {
    if (cal === "jalali") return getJalaliMonthDays(year)[month-1];
    if (cal === "gregorian") return getGregorianMonthDays(year, month);
    return getHijriMonthDays(year, month);
}

function getTotalDays(cal, year) {
    const md = cal === "jalali" ? getJalaliMonthDays(year) :
               cal === "gregorian" ? Array.from({length:12}, (_,i)=>getGregorianMonthDays(year,i+1)) :
               Array.from({length:12}, (_,i)=>getHijriMonthDays(year,i+1));
    return md.reduce((s,d)=>s+d,0);
}

async function createFolder(parentHandle, name) {
    return await parentHandle.getDirectoryHandle(name, {create:true});
}

const $ = id => document.getElementById(id);

function setStatus(message, className="") {
    const el = $("status");
    el.className = className;
    el.textContent = message;
}

function updateProgress(processed, total) {
    const fill = $("progressFill");
    const pct = Math.round((processed/total)*100);
    fill.style.width = `${pct}%`;
    $("progressPercent").textContent = pct.toLocaleString("fa-IR") + "٪";
    setStatus(`در حال ساخت... ${processed.toLocaleString("fa-IR")} از ${total.toLocaleString("fa-IR")} روز`, "info");
}

// =====================================================
// ذخیره و بازیابی تنظیمات
// =====================================================
function saveSettings() {
    const settings = { calendar: currentCalendar, year: $("year").value };
    localStorage.setItem("folderBuilderSettings", JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem("folderBuilderSettings");
    if (!saved) return;
    try {
        const settings = JSON.parse(saved);
        if (settings.calendar) setCalendar(settings.calendar);
        if (settings.year) $("year").value = settings.year;
    } catch (error) {
        console.log("خطا در خواندن تنظیمات:", error);
    }
}

// =====================================================
// خلاصه قبل از ساخت
// =====================================================
function showSummaryAndConfirm(cal, year) {
    const totalDays = getTotalDays(cal, year);
    const totalFolders = totalDays * 3; // هر روز: فولدر روز + دو زیرپوشه

    const calNames = { jalali: "شمسی", gregorian: "میلادی", hijri: "قمری" };
    const message =
        `📊 خلاصه ساخت فولدر:\n\n` +
        `تقویم: ${calNames[cal]}\n` +
        `سال: ${year.toLocaleString("fa-IR")}\n` +
        `تعداد ماه‌ها: ۱۲\n` +
        `تعداد روزها: ${totalDays.toLocaleString("fa-IR")}\n` +
        `تعداد کل فولدرها: ${totalFolders.toLocaleString("fa-IR")}\n\n` +
        `آیا ادامه می‌دهید؟`;

    return confirm(message);
}

// =====================================================
// ساخت مستقیم فولدرها روی سیستم
// =====================================================
async function pickAndCreate() {
    const year = parseInt($("year").value, 10);
    const cal = currentCalendar;
    const [min, max] = yearRanges[cal];

    if (Number.isNaN(year) || year < min || year > max) {
        setStatus(`سال معتبر بین ${min.toLocaleString("fa-IR")} تا ${max.toLocaleString("fa-IR")} وارد کنید.`, "error");
        return;
    }

    // خلاصه قبل از شروع
    if (!showSummaryAndConfirm(cal, year)) {
        setStatus("عملیات لغو شد.", "error");
        return;
    }

    if (!window.showDirectoryPicker) {
        setStatus("مرورگر شما پشتیبانی نمی‌کند. از Chrome یا Edge استفاده کنید.", "error");
        return;
    }

    const pickBtn = $("pickBtn");
    const cancelBtn = $("cancelBtn");
    const progressWrap = $("progressWrap");

    isCancelled = false;

    try {
        const parentHandle = await window.showDirectoryPicker({
            mode: "readwrite",
            startIn: "documents"
        });

        pickBtn.disabled = true;
        cancelBtn.style.display = "inline-flex";
        progressWrap.style.display = "block";
        $("progressFill").style.width = "0%";
        $("progressPercent").textContent = "۰٪";
        setStatus("در حال ایجاد فولدرها...", "info");

        const yearFolder = await createFolder(parentHandle, String(year));
        const totalDays = getTotalDays(cal, year);
        let processed = 0;

        for (let month = 1; month <= 12; month++) {
            const monthName = monthNames[cal][month - 1];
            const monthFolder = await createFolder(yearFolder, `${String(month).padStart(2,"0")}_${monthName}`);
            const daysInMonth = getMonthDaysForYear(cal, year, month);

            for (let day = 1; day <= daysInMonth; day++) {
                // اگر کاربر لغو کرد، متوقف شو
                if (isCancelled) {
                    setStatus("❌ عملیات توسط کاربر لغو شد.", "error");
                    return;
                }

                // نام روز هفته متناسب با تقویم انتخابی
                const dayName = weekDaysNames[cal][getDayNameIndex(cal, year, month, day)];
                const dateText = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const dayFolder = await createFolder(monthFolder, `${dateText}_${dayName}`);

                await createFolder(dayFolder, "کارهای انجام شده");
                await createFolder(dayFolder, "کارهای در دست اقدام");

                processed++;
                updateProgress(processed, totalDays);
                await new Promise(r => setTimeout(r,0));
            }
        }

        if (!isCancelled) {
            $("progressFill").style.width = "100%";
            $("progressPercent").textContent = "۱۰۰٪";
            setStatus("✅ همه فولدرها با موفقیت ساخته شدند.", "done");
            pickBtn.disabled = false;
            cancelBtn.style.display = "none";
        }

    } catch (error) {
        if (error.name === "AbortError") {
            setStatus("انتخاب پوشه لغو شد.", "error");
        } else {
            console.error(error);
            setStatus(`خطا: ${error.message || error}`, "error");
        }
        pickBtn.disabled = false;
        cancelBtn.style.display = "none";
        progressWrap.style.display = "none";
    }
}

// =====================================================
// لغو عملیات
// =====================================================
function cancelOperation() {
    isCancelled = true;
    setStatus("در حال توقف عملیات...", "info");
}

// =====================================================
// انتخاب نوع تقویم
// =====================================================
function setCalendar(cal) {
    currentCalendar = cal;
    document.querySelectorAll("#calendarSwitch button").forEach(b => {
        b.classList.toggle("active", b.dataset.cal === cal);
    });

    const [min, max] = yearRanges[cal];
    const yearInput = $("year");
    yearInput.min = min;
    yearInput.max = max;

    // مقدار سال همیشه بر اساس تقویم انتخابی تنظیم می‌شود
    yearInput.value = defaultYears[cal];

    $("rangeHint").textContent = `(بین ${min.toLocaleString("fa-IR")} تا ${max.toLocaleString("fa-IR")})`;
    saveSettings();
}

document.querySelectorAll("#calendarSwitch button").forEach(btn => {
    btn.addEventListener("click", () => setCalendar(btn.dataset.cal));
});

// =====================================================
// ارسال پیشنهاد
// =====================================================
function sendSuggestion() {
    const el = $("suggestion");
    const status = $("suggestionStatus");
    const message = el.value.trim();

    if (!message) {
        status.style.color = "#ef4444";
        status.textContent = "لطفاً متن پیشنهاد را بنویسید.";
        return;
    }

    const subject = encodeURIComponent("پیشنهاد درباره برنامه ساخت فولدر");
    const body = encodeURIComponent("سلام\n\nپیشنهاد کاربر:\n\n" + message);
    window.location.href = `mailto:mosayeb872@gmail.com?subject=${subject}&body=${body}`;
    status.style.color = "#10b981";
    status.textContent = "در حال باز کردن برنامه ایمیل...";
}

// =====================================================
// تغییر تم
// =====================================================
function toggleTheme() {
    const body = document.body;
    const next = body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    body.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);

    if (next === "dark") {
        $("themeIconLight").style.display = "none";
        $("themeIconDark").style.display = "";
    } else {
        $("themeIconLight").style.display = "";
        $("themeIconDark").style.display = "none";
    }
}

(function initTheme() {
    if (localStorage.getItem("theme") === "dark") {
        document.body.setAttribute("data-theme", "dark");
        $("themeIconLight").style.display = "none";
        $("themeIconDark").style.display = "";
    }
})();

// =====================================================
// رویدادها و مقداردهی اولیه
// =====================================================
$("pickBtn").addEventListener("click", pickAndCreate);
$("cancelBtn").addEventListener("click", cancelOperation);
$("year").addEventListener("change", saveSettings);

loadSettings();
setCalendar(currentCalendar);
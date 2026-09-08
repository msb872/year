"use strict";

/* =====================================================
   تنظیمات اولیه
===================================================== */

const $ = id => document.getElementById(id);

let currentCalendar = "jalali";
let isCancelled = false;

/*
    برای بازگشت دقیق مقدار اولیه استفاده می‌شود.

    مثال:
    1355 شمسی → 1976 میلادی
    سپس:
    1976 میلادی → 1355 شمسی
*/
let lastConversion = null;

const calendarTitles = {
    jalali: "شمسی",
    gregorian: "میلادی",
    hijri: "قمری",
    pahlavi: "پهلوی",
    achaemenid: "هخامنشی تقریبی"
};

const monthNames = {
    jalali: [
        "فروردین",
        "اردیبهشت",
        "خرداد",
        "تیر",
        "مرداد",
        "شهریور",
        "مهر",
        "آبان",
        "آذر",
        "دی",
        "بهمن",
        "اسفند"
    ],

    gregorian: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ],

    hijri: [
        "محرم",
        "صفر",
        "ربیع‌الاول",
        "ربیع‌الثانی",
        "جمادی‌الاول",
        "جمادی‌الثانی",
        "رجب",
        "شعبان",
        "رمضان",
        "شوال",
        "ذی‌القعده",
        "ذی‌الحجه"
    ],

    pahlavi: [
        "فروردین",
        "اردیبهشت",
        "خرداد",
        "تیر",
        "مرداد",
        "شهریور",
        "مهر",
        "آبان",
        "آذر",
        "دی",
        "بهمن",
        "اسفند"
    ],

    achaemenid: [
        "فروردین",
        "اردیبهشت",
        "خرداد",
        "تیر",
        "مرداد",
        "شهریور",
        "مهر",
        "آبان",
        "آذر",
        "دی",
        "بهمن",
        "اسفند"
    ]
};

const weekDaysNames = [
    "شنبه",
    "یکشنبه",
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنجشنبه",
    "جمعه"
];

const yearRanges = {
    jalali: [1, 3000],
    gregorian: [622, 3000],
    hijri: [1, 3000],
    pahlavi: [1181, 4179],
    achaemenid: [1172, 4171]
};

const defaultYears = {
    jalali: 1405,
    gregorian: 2026,
    hijri: 1447,
    pahlavi: 2585,
    achaemenid: 2576
};

/* =====================================================
   توابع عمومی
===================================================== */

function faNumber(value) {
    return Number(value).toLocaleString("fa-IR");
}

function setStatus(message, type = "") {
    const status = $("status");

    if (!status) {
        return;
    }

    status.textContent = message;
    status.className = type;
}

function saveSettings() {
    localStorage.setItem(
        "folderBuilderSettings",
        JSON.stringify({
            calendar: currentCalendar,
            year: $("year").value
        })
    );
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function mod(value, divisor) {
    return value - Math.floor(value / divisor) * divisor;
}

/* =====================================================
   تبدیل تقویم جلالی و میلادی
===================================================== */

const jalaliBreaks = [
    -61,
    9,
    38,
    199,
    426,
    686,
    756,
    818,
    1111,
    1181,
    1210,
    1635,
    2060,
    2097,
    2192,
    2262,
    2324,
    2394,
    2456,
    3178
];

function div(a, b) {
    return Math.floor(a / b);
}

function jalaliCalendar(year) {
    let leapJ = -14;
    let jp = jalaliBreaks[0];
    let jm = 0;
    let jump = 0;

    for (let index = 1; index < jalaliBreaks.length; index++) {
        jm = jalaliBreaks[index];
        jump = jm - jp;

        if (year < jm) {
            break;
        }

        leapJ +=
            div(jump, 33) * 8 +
            div(mod(jump, 33) + 3, 4);

        jp = jm;
    }

    let n = year - jp;

    leapJ +=
        div(n, 33) * 8 +
        div(mod(n, 33) + 3, 4);

    if (
        mod(jump, 33) === 4 &&
        jump - n === 4
    ) {
        leapJ++;
    }

    const gy = year + 621;

    const leapG =
        div(gy, 4) -
        div((div(gy, 100) + 1) * 3, 4) -
        150;

    const march = 20 + leapJ - leapG;

    n = year - jp;

    if (jump - n < 6) {
        n =
            n -
            jump +
            div(jump + 4, 33) * 33;
    }

    let leap =
        mod(
            mod(n + 1, 33) - 1,
            4
        );

    if (leap === -1) {
        leap = 4;
    }

    return {
        leap,
        gy,
        march
    };
}

function isLeapJalali(year) {
    return jalaliCalendar(year).leap === 0;
}

function getJalaliMonthDays(year) {
    return [
        31,
        31,
        31,
        31,
        31,
        31,
        30,
        30,
        30,
        30,
        30,
        isLeapJalali(year) ? 30 : 29
    ];
}

function gregorianToJdn(year, month, day) {
    let y = year;
    let m = month;

    if (m <= 2) {
        y -= 1;
        m += 12;
    }

    return (
        Math.floor(365.25 * (y + 4716)) +
        Math.floor(30.6001 * (m + 1)) +
        day -
        1524.5
    );
}

function jdnToGregorian(jdn) {
    const value = Math.floor(jdn + 0.5);

    let a = value;

    if (value >= 2299161) {
        const alpha = Math.floor(
            (value - 1867216.25) / 36524.25
        );

        a =
            value +
            1 +
            alpha -
            Math.floor(alpha / 4);
    }

    const b = a + 1524;
    const c = Math.floor(
        (b - 122.1) / 365.25
    );

    const d = Math.floor(365.25 * c);
    const e = Math.floor((b - d) / 30.6001);

    const day =
        b -
        d -
        Math.floor(30.6001 * e);

    const month =
        e < 14 ? e - 1 : e - 13;

    const year =
        month > 2 ? c - 4716 : c - 4715;

    return {
        year,
        month,
        day
    };
}

function jalaliToJdn(year, month, day) {
    const calendar = jalaliCalendar(year);

    const firstDayOfYear = gregorianToJdn(
        calendar.gy,
        3,
        calendar.march
    );

    let daysBeforeMonth;

    if (month <= 7) {
        daysBeforeMonth = (month - 1) * 31;
    } else {
        daysBeforeMonth =
            6 * 31 +
            (month - 7) * 30;
    }

    return (
        firstDayOfYear +
        daysBeforeMonth +
        day -
        1
    );
}

function jalaliToGregorian(
    year,
    month,
    day
) {
    return jdnToGregorian(
        jalaliToJdn(year, month, day)
    );
}

function gregorianToJalali(
    year,
    month,
    day
) {
    const gregorianJdn = gregorianToJdn(
        year,
        month,
        day
    );

    let jalaliYear = year - 621;

    let firstDayOfJalaliYear =
        jalaliToJdn(jalaliYear, 1, 1);

    if (gregorianJdn < firstDayOfJalaliYear) {
        jalaliYear--;

        firstDayOfJalaliYear =
            jalaliToJdn(jalaliYear, 1, 1);
    }

    const dayOfYear =
        Math.floor(
            gregorianJdn -
            firstDayOfJalaliYear
        );

    let jalaliMonth;
    let jalaliDay;

    if (dayOfYear <= 185) {
        jalaliMonth =
            Math.floor(dayOfYear / 31) + 1;

        jalaliDay =
            mod(dayOfYear, 31) + 1;
    } else {
        jalaliMonth =
            Math.floor(
                (dayOfYear - 186) / 30
            ) + 7;

        jalaliDay =
            mod(dayOfYear - 186, 30) + 1;
    }

    return {
        year: jalaliYear,
        month: jalaliMonth,
        day: jalaliDay
    };
}

/* =====================================================
   تبدیل تقویم قمری
===================================================== */

function isLeapHijri(year) {
    return mod(
        11 * year + 14,
        30
    ) < 11;
}

function getHijriMonthDays(year, month) {
    if (month === 12) {
        return isLeapHijri(year) ? 30 : 29;
    }

    return month % 2 === 1 ? 30 : 29;
}

function hijriToJdn(year, month, day) {
    return (
        day +
        Math.ceil(29.5 * (month - 1)) +
        (year - 1) * 354 +
        Math.floor((3 + 11 * year) / 30) +
        1948439.5
    );
}

function hijriToGregorian(
    year,
    month = 1,
    day = 1
) {
    return jdnToGregorian(
        hijriToJdn(year, month, day)
    );
}

function gregorianToHijri(
    year,
    month,
    day
) {
    const jdn = gregorianToJdn(
        year,
        month,
        day
    );

    let hijriYear = Math.floor(
        (30 * (jdn - 1948439.5) + 10646) /
        10631
    );

    let hijriMonth = Math.min(
        12,
        Math.ceil(
            (jdn -
                (29 +
                    hijriToJdn(
                        hijriYear,
                        1,
                        1
                    ))) /
                29.5
        ) + 1
    );

    if (hijriMonth < 1) {
        hijriMonth = 1;
    }

    const firstDay = hijriToJdn(
        hijriYear,
        hijriMonth,
        1
    );

    const hijriDay =
        Math.floor(jdn - firstDay) + 1;

    return {
        year: hijriYear,
        month: hijriMonth,
        day: hijriDay
    };
}

/* =====================================================
   تقویم پهلوی و هخامنشی تقریبی
===================================================== */

const historicalOffsets = {
    pahlavi: 1180,
    achaemenid: 1171
};

function historicalToJalali(
    calendar,
    year
) {
    return (
        Number(year) -
        historicalOffsets[calendar]
    );
}

function jalaliToHistorical(
    calendar,
    year
) {
    return (
        Number(year) +
        historicalOffsets[calendar]
    );
}

/* =====================================================
   تبدیل سال‌ها بر اساس ابتدای همان سال
===================================================== */

/*
    برای جلوگیری از تبدیل اشتباه سال‌ها، تبدیل شمسی
    و میلادی با تاریخ ابتدای سال انجام می‌شود.

    نمونه:
    1355/01/01 شمسی = 1976/03/21 میلادی
    بنابراین سال متناظر میلادی = 1976

    هنگام تبدیل معکوس، تاریخ 1976/03/21
    دوباره به 1355/01/01 شمسی تبدیل می‌شود.
*/

function calendarYearToGregorian(
    calendar,
    year
) {
    year = Number(year);

    if (calendar === "jalali") {
        return jalaliToGregorian(
            year,
            1,
            1
        );
    }

    if (calendar === "gregorian") {
        return {
            year,
            month: 1,
            day: 1
        };
    }

    if (calendar === "hijri") {
        return hijriToGregorian(
            year,
            1,
            1
        );
    }

    if (
        calendar === "pahlavi" ||
        calendar === "achaemenid"
    ) {
        const jalaliYear =
            historicalToJalali(
                calendar,
                year
            );

        return jalaliToGregorian(
            jalaliYear,
            1,
            1
        );
    }

    return {
        year,
        month: 1,
        day: 1
    };
}

function gregorianToCalendarYear(
    calendar,
    gregorianDate
) {
    if (calendar === "gregorian") {
        return gregorianDate.year;
    }

    if (calendar === "jalali") {
        return gregorianToJalali(
            gregorianDate.year,
            gregorianDate.month,
            gregorianDate.day
        ).year;
    }

    if (calendar === "hijri") {
        return gregorianToHijri(
            gregorianDate.year,
            gregorianDate.month,
            gregorianDate.day
        ).year;
    }

    if (
        calendar === "pahlavi" ||
        calendar === "achaemenid"
    ) {
        const jalaliDate =
            gregorianToJalali(
                gregorianDate.year,
                gregorianDate.month,
                gregorianDate.day
            );

        return jalaliToHistorical(
            calendar,
            jalaliDate.year
        );
    }

    return gregorianDate.year;
}

function convertCalendarYear(
    sourceCalendar,
    sourceYear,
    targetCalendar
) {
    const sourceDate =
        calendarYearToGregorian(
            sourceCalendar,
            sourceYear
        );

    return Math.round(
        gregorianToCalendarYear(
            targetCalendar,
            sourceDate
        )
    );
}

/* =====================================================
   تعداد روزهای ماه و سال
===================================================== */

function isLeapGregorian(year) {
    return (
        year % 4 === 0 &&
        (
            year % 100 !== 0 ||
            year % 400 === 0
        )
    );
}

function getGregorianMonthDays(
    year,
    month
) {
    const days = [
        31,
        28,
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31
    ];

    if (
        month === 2 &&
        isLeapGregorian(year)
    ) {
        return 29;
    }

    return days[month - 1];
}

function getMonthDays(
    calendar,
    year,
    month
) {
    if (calendar === "jalali") {
        return getJalaliMonthDays(year)[
            month - 1
        ];
    }

    if (calendar === "gregorian") {
        return getGregorianMonthDays(
            year,
            month
        );
    }

    if (calendar === "hijri") {
        return getHijriMonthDays(
            year,
            month
        );
    }

    if (
        calendar === "pahlavi" ||
        calendar === "achaemenid"
    ) {
        return getJalaliMonthDays(
            historicalToJalali(
                calendar,
                year
            )
        )[month - 1];
    }

    return 30;
}

function getTotalDays(calendar, year) {
    let total = 0;

    for (let month = 1; month <= 12; month++) {
        total += getMonthDays(
            calendar,
            year,
            month
        );
    }

    return total;
}

/* =====================================================
   نام روز هفته
===================================================== */

function getDayName(
    calendar,
    year,
    month,
    day
) {
    let gregorianDate;

    if (calendar === "jalali") {
        gregorianDate = jalaliToGregorian(
            year,
            month,
            day
        );
    } else if (calendar === "gregorian") {
        gregorianDate = {
            year,
            month,
            day
        };
    } else if (calendar === "hijri") {
        gregorianDate = hijriToGregorian(
            year,
            month,
            day
        );
    } else if (
        calendar === "pahlavi" ||
        calendar === "achaemenid"
    ) {
        gregorianDate = jalaliToGregorian(
            historicalToJalali(
                calendar,
                year
            ),
            month,
            day
        );
    }

    const date = new Date(
        Date.UTC(
            gregorianDate.year,
            gregorianDate.month - 1,
            gregorianDate.day
        )
    );

    /*
        JavaScript:
        Sunday = 0
        Saturday = 6

        آرایه ما از شنبه شروع می‌شود.
    */

    const index =
        (date.getUTCDay() + 1) % 7;

    return weekDaysNames[index];
}

/* =====================================================
   رابط کاربری تقویم
===================================================== */

function updateCalendarUI(
    calendar,
    yearValue = null
) {
    currentCalendar = calendar;

    document
        .querySelectorAll("#calendarSwitch button")
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.cal === calendar
            );
        });

    const range = yearRanges[calendar];
    const yearInput = $("year");

    if (yearInput) {
        yearInput.min = range[0];
        yearInput.max = range[1];

        if (yearValue !== null) {
            yearInput.value =
                Math.round(yearValue);
        } else {
            yearInput.value =
                defaultYears[calendar];
        }
    }

    const rangeHint = $("rangeHint");

    if (rangeHint) {
        rangeHint.textContent =
            `بین ${faNumber(range[0])} تا ` +
            `${faNumber(range[1])}`;
    }
}

function selectCalendar(targetCalendar) {
    const sourceCalendar = currentCalendar;

    const sourceYear =
        Number.parseInt(
            $("year").value,
            10
        );

    if (!Number.isInteger(sourceYear)) {
        updateCalendarUI(
            targetCalendar,
            defaultYears[targetCalendar]
        );

        lastConversion = null;
        saveSettings();

        return;
    }

    /*
        اگر کاربر مستقیماً به تقویم قبلی برگردد،
        مقدار دقیق اولیه بازگردانده می‌شود.
    */

    if (
        lastConversion &&
        lastConversion.from === targetCalendar &&
        lastConversion.to === sourceCalendar &&
        lastConversion.targetYear === sourceYear
    ) {
        updateCalendarUI(
            targetCalendar,
            lastConversion.sourceYear
        );

        const oldConversion =
            lastConversion;

        lastConversion = null;
        saveSettings();

        setStatus(
            `${faNumber(sourceYear)} ` +
            `${calendarTitles[sourceCalendar]} ` +
            `→ ${faNumber(oldConversion.sourceYear)} ` +
            `${calendarTitles[targetCalendar]}`,
            "info"
        );

        return;
    }

    const targetYear =
        convertCalendarYear(
            sourceCalendar,
            sourceYear,
            targetCalendar
        );

    const range =
        yearRanges[targetCalendar];

    const safeTargetYear =
        clamp(
            targetYear,
            range[0],
            range[1]
        );

    updateCalendarUI(
        targetCalendar,
        safeTargetYear
    );

    lastConversion = {
        from: sourceCalendar,
        sourceYear,
        to: targetCalendar,
        targetYear: safeTargetYear
    };

    saveSettings();

    setStatus(
        `${faNumber(sourceYear)} ` +
        `${calendarTitles[sourceCalendar]} ` +
        `معادل ` +
        `${faNumber(safeTargetYear)} ` +
        `${calendarTitles[targetCalendar]} است.`,
        "info"
    );
}

/* =====================================================
   رویداد تغییر تقویم
===================================================== */

document
    .querySelectorAll("#calendarSwitch button")
    .forEach(button => {
        button.addEventListener(
            "click",
            () => {
                selectCalendar(
                    button.dataset.cal
                );
            }
        );
    });

/*
    وقتی کاربر سال را دستی تغییر می‌دهد،
    تبدیل قبلی دیگر معتبر نیست.
*/

$("year").addEventListener(
    "input",
    () => {
        lastConversion = null;
        saveSettings();
    }
);

/* =====================================================
   ساخت فولدرها
===================================================== */

async function createFolder(
    parentHandle,
    folderName
) {
    return parentHandle.getDirectoryHandle(
        folderName,
        {
            create: true
        }
    );
}

function showSummary(
    calendar,
    year
) {
    const totalDays =
        getTotalDays(calendar, year);

    const totalFolders =
        1 +
        12 +
        totalDays * 3;

    return window.confirm(
        `خلاصه عملیات:\n\n` +
        `تقویم: ${calendarTitles[calendar]}\n` +
        `سال: ${faNumber(year)}\n` +
        `تعداد ماه‌ها: ۱۲\n` +
        `تعداد روزها: ${faNumber(totalDays)}\n` +
        `تعداد تقریبی فولدرها: ` +
        `${faNumber(totalFolders)}\n\n` +
        `آیا ادامه می‌دهید؟`
    );
}

async function startCreating() {
    const calendar = currentCalendar;

    const year =
        Number.parseInt(
            $("year").value,
            10
        );

    const range =
        yearRanges[calendar];

    if (
        !Number.isInteger(year) ||
        year < range[0] ||
        year > range[1]
    ) {
        setStatus(
            `سال باید بین ` +
            `${faNumber(range[0])} تا ` +
            `${faNumber(range[1])} باشد.`,
            "error"
        );

        return;
    }

    if (!showSummary(calendar, year)) {
        setStatus(
            "عملیات لغو شد.",
            "error"
        );

        return;
    }

    if (!("showDirectoryPicker" in window)) {
        setStatus(
            "مرورگر شما از انتخاب پوشه پشتیبانی نمی‌کند. " +
            "از Chrome یا Edge استفاده کنید.",
            "error"
        );

        return;
    }

    let parentHandle;

    try {
        parentHandle =
            await window.showDirectoryPicker({
                mode: "readwrite"
            });
    } catch (error) {
        if (error.name === "AbortError") {
            setStatus(
                "انتخاب پوشه لغو شد.",
                "error"
            );
        } else {
            setStatus(
                `خطا: ${error.message}`,
                "error"
            );
        }

        return;
    }

    const pickButton = $("pickBtn");
    const cancelButton = $("cancelBtn");
    const progressWrap = $("progressWrap");

    isCancelled = false;

    pickButton.disabled = true;
    cancelButton.hidden = false;
    progressWrap.style.display = "block";

    $("progressFill").style.width = "0%";
    $("progressPercent").textContent = "۰٪";

    try {
        const yearFolder =
            await createFolder(
                parentHandle,
                String(year)
            );

        const totalDays =
            getTotalDays(calendar, year);

        let completedDays = 0;

        for (
            let month = 1;
            month <= 12;
            month++
        ) {
            if (isCancelled) {
                break;
            }

            const monthNumber =
                String(month).padStart(2, "0");

            const monthFolderName =
                `${monthNumber}_` +
                `${monthNames[calendar][month - 1]}`;

            const monthFolder =
                await createFolder(
                    yearFolder,
                    monthFolderName
                );

            const daysInMonth =
                getMonthDays(
                    calendar,
                    year,
                    month
                );

            for (
                let day = 1;
                day <= daysInMonth;
                day++
            ) {
                if (isCancelled) {
                    break;
                }

                const dayNumber =
                    String(day).padStart(2, "0");

                const dayName =
                    getDayName(
                        calendar,
                        year,
                        month,
                        day
                    );

                const dayFolderName =
                    `${year}-` +
                    `${monthNumber}-` +
                    `${dayNumber}_` +
                    `${dayName}`;

                const dayFolder =
                    await createFolder(
                        monthFolder,
                        dayFolderName
                    );

                await createFolder(
                    dayFolder,
                    "کارهای انجام شده"
                );

                await createFolder(
                    dayFolder,
                    "کارهای در دست اقدام"
                );

                completedDays++;

                const percent = Math.round(
                    completedDays /
                    totalDays *
                    100
                );

                $("progressFill").style.width =
                    `${percent}%`;

                $("progressPercent").textContent =
                    `${faNumber(percent)}٪`;

                $("progressText").textContent =
                    `ساخت روز ` +
                    `${faNumber(completedDays)} از ` +
                    `${faNumber(totalDays)}`;

                await new Promise(resolve => {
                    setTimeout(resolve, 0);
                });
            }
        }

        if (isCancelled) {
            setStatus(
                "عملیات توسط کاربر لغو شد. " +
                "فولدرهای ساخته‌شده باقی می‌مانند.",
                "error"
            );
        } else {
            $("progressFill").style.width = "100%";
            $("progressPercent").textContent = "۱۰۰٪";

            setStatus(
                "همه فولدرها با موفقیت ساخته شدند.",
                "success"
            );
        }
    } catch (error) {
        console.error(error);

        setStatus(
            `خطا هنگام ساخت فولدرها: ${error.message}`,
            "error"
        );
    } finally {
        pickButton.disabled = false;
        cancelButton.hidden = true;

        if (isCancelled) {
            setTimeout(() => {
                progressWrap.style.display = "none";
            }, 1200);
        }
    }
}

$("pickBtn").addEventListener(
    "click",
    startCreating
);

$("cancelBtn").addEventListener(
    "click",
    () => {
        isCancelled = true;

        setStatus(
            "در حال متوقف‌کردن عملیات...",
            "info"
        );
    }
);

/* =====================================================
   ارسال پیشنهاد
===================================================== */

$("suggestionBtn").addEventListener(
    "click",
    () => {
        const suggestion =
            $("suggestion").value.trim();

        if (!suggestion) {
            $("suggestionStatus").style.color =
                "#ef4444";

            $("suggestionStatus").textContent =
                "لطفاً متن پیشنهاد را وارد کنید.";

            return;
        }

        const subject =
            encodeURIComponent(
                "پیشنهاد درباره سازنده فولدر سال"
            );

        const body =
            encodeURIComponent(
                `سلام\n\nپیشنهاد من:\n\n${suggestion}`
            );

        window.location.href =
            "mailto:mosayeb872@gmail.com" +
            `?subject=${subject}&body=${body}`;

        $("suggestionStatus").style.color =
            "#059669";

        $("suggestionStatus").textContent =
            "برنامه ایمیل در حال بازشدن است.";
    }
);

/* =====================================================
   تغییر پوسته
===================================================== */

function applyTheme(theme) {
    document.body.dataset.theme = theme;

    const themeIcon = $("themeIcon");

    if (themeIcon) {
        themeIcon.textContent =
            theme === "dark" ? "☀️" : "🌙";
    }

    localStorage.setItem(
        "theme",
        theme
    );
}

$("themeToggle").addEventListener(
    "click",
    () => {
        const nextTheme =
            document.body.dataset.theme === "dark"
                ? "light"
                : "dark";

        applyTheme(nextTheme);
    }
);

/* =====================================================
   مقداردهی اولیه
===================================================== */

(function initialize() {
    const savedTheme =
        localStorage.getItem("theme") ||
        "light";

    applyTheme(savedTheme);

    let calendar = "jalali";
    let year = defaultYears.jalali;

    try {
        const saved =
            JSON.parse(
                localStorage.getItem(
                    "folderBuilderSettings"
                )
            );

        if (
            saved &&
            yearRanges[saved.calendar]
        ) {
            calendar = saved.calendar;

            const savedYear =
                Number.parseInt(
                    saved.year,
                    10
                );

            if (Number.isInteger(savedYear)) {
                year = savedYear;
            }
        }
    } catch (error) {
        console.warn(
            "تنظیمات ذخیره‌شده قابل خواندن نیست."
        );
    }

    updateCalendarUI(
        calendar,
        year
    );
})();

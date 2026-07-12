export const DAY_CONFIGS = [
    { key: 'sunday', label: 'Sunday', shortLabel: 'Sunday', index: 0 },
    { key: 'monday', label: 'Monday', shortLabel: 'Monday', index: 1 },
    { key: 'tuesday', label: 'Tuesday', shortLabel: 'Tuesday', index: 2 },
    { key: 'wednesday', label: 'Wednesday', shortLabel: 'Wednesday', index: 3 },
    { key: 'thursday', label: 'Thursday', shortLabel: 'Thursday', index: 4 },
    { key: 'friday', label: 'Friday', shortLabel: 'Friday', index: 5 },
    { key: 'saturday', label: 'Saturday', shortLabel: 'Saturday', index: 6 },
];

export const STATUS_FILTER_OPTIONS = [
    { value: 'all', label: 'All employees' },
    { value: 'configured', label: 'Configured' },
    { value: 'incomplete', label: 'Needs setup' },
    { value: 'deduction', label: 'Salary Deductions' },
    { value: 'late', label: 'Repeated lateness' },
];

export const DAY_FILTER_OPTIONS = [
    { value: 'all', label: 'All days' },
    { value: 'late', label: 'Late days' },
    { value: 'absent', label: 'Absence days' },
    { value: 'leave', label: 'Leave days' },
    { value: 'holiday', label: 'Holiday days' },
    { value: 'overtime', label: 'Overtime days' },
];

export const DETAIL_TABS = [
    { value: 'overview', label: 'Overview' },
    { value: 'daily', label: 'Daily Attendance' },
    { value: 'monthly', label: 'Monthly Statistics' },
    { value: 'payroll', label: 'Payroll & Deductions' },
    { value: 'schedule', label: 'Work Schedule' },
    { value: 'holidays', label: 'Holidays & Leave' },
    { value: 'settings', label: 'Settings' },
];

export const WIZARD_STEPS = [
    { value: 'personal', label: 'Personal Information' },
    { value: 'salary', label: 'Salary & Calculation' },
    { value: 'schedule', label: 'Work Schedule' },
    { value: 'holidays', label: 'Holidays & Leave' },
    { value: 'rules', label: 'Deduction Rules' },
    { value: 'review', label: 'Review & Save' },
];

export const EMPLOYEE_PAGE_SIZE = 6;
export const SETTINGS_STORAGE_KEY = 'zkteco-salary-page-settings-v3';
export const ENGLISH_LOCALE = 'en-US';
export const DEFAULT_WORKING_DAY_START_TIME = '10:00';
export const DEFAULT_WORKING_DAY_END_TIME = '18:00';
export const DEFAULT_WORKING_DAY_REQUIRED_HOURS = 8;
export const FLEXIBLE_EIGHT_HOUR_MINUTES = 8 * 60;

export const deepClone = (value) => JSON.parse(JSON.stringify(value));

export const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export const formatCurrency = (value, currency = 'USD') => new Intl.NumberFormat(ENGLISH_LOCALE, {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
}).format(Number(value ?? 0));

export const formatHours = (minutes) => `${new Intl.NumberFormat(ENGLISH_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
}).format(Math.max(Number(minutes) || 0, 0) / 60)} h`;

export const formatPercentage = (value) => `${new Intl.NumberFormat(ENGLISH_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
}).format(Number(value ?? 0))}%`;

export const formatInteger = (value) => new Intl.NumberFormat(ENGLISH_LOCALE).format(Number(value ?? 0));

export const getCurrentMonthString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
};

export const parseMonthKey = (monthKey) => {
    const [yearString, monthString] = String(monthKey || '').split('-');

    return {
        year: Number(yearString),
        monthIndex: Math.max(Number(monthString || 1) - 1, 0),
    };
};

export const getMonthLabel = (monthKey) => {
    const { year, monthIndex } = parseMonthKey(monthKey);
    return new Intl.DateTimeFormat(ENGLISH_LOCALE, {
        month: 'long',
        year: 'numeric',
    }).format(new Date(year, monthIndex, 1));
};

export const getDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const formatDateLabel = (dateKey) => {
    const [yearString, monthString, dayString] = String(dateKey).split('-');
    return new Intl.DateTimeFormat(ENGLISH_LOCALE, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(Number(yearString), Number(monthString) - 1, Number(dayString)));
};

export const buildMonthDays = (monthKey) => {
    const { year, monthIndex } = parseMonthKey(monthKey);
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();

    return Array.from({ length: totalDays }, (_, index) => new Date(year, monthIndex, index + 1));
};

export const buildElapsedMonthDays = (monthKey) => {
    const monthDays = buildMonthDays(monthKey);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { year, monthIndex } = parseMonthKey(monthKey);
    const targetMonthStart = new Date(year, monthIndex, 1);

    if (targetMonthStart.getFullYear() > today.getFullYear()
        || (targetMonthStart.getFullYear() === today.getFullYear() && targetMonthStart.getMonth() > today.getMonth())) {
        return [];
    }

    if (targetMonthStart.getFullYear() === today.getFullYear() && targetMonthStart.getMonth() === today.getMonth()) {
        return monthDays.filter((date) => date <= today);
    }

    return monthDays;
};

export const parseTimeToMinutes = (timeValue) => {
    if (!timeValue || !/^\d{2}:\d{2}$/.test(timeValue)) {
        return 0;
    }

    const [hours, minutes] = timeValue.split(':').map(Number);
    return (hours * 60) + minutes;
};

export const minutesToTime = (minutesValue) => {
    const safeMinutes = ((Math.round(Number(minutesValue) || 0) % 1440) + 1440) % 1440;
    const hours = String(Math.floor(safeMinutes / 60)).padStart(2, '0');
    const minutes = String(safeMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
};

export const addMinutesToTime = (timeValue, deltaMinutes) => minutesToTime(parseTimeToMinutes(timeValue) + Number(deltaMinutes || 0));

export const formatTime = (timeValue) => {
    if (!timeValue) {
        return '-';
    }

    const [hours, minutes] = String(timeValue).split(':');
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);

    return new Intl.DateTimeFormat(ENGLISH_LOCALE, {
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
};

export const clampNumber = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
        return minimum;
    }

    return Math.min(Math.max(numericValue, minimum), maximum);
};

export const getInitials = (name) => String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export const getDayLabelByIndex = (index) => DAY_CONFIGS.find((day) => day.index === index)?.label ?? '';
export const getDayConfigByIndex = (index) => DAY_CONFIGS.find((day) => day.index === index) ?? DAY_CONFIGS[0];
export const getDayConfigByKey = (dayKey) => DAY_CONFIGS.find((day) => day.key === dayKey) ?? DAY_CONFIGS[0];
export const getDayOptions = () => DAY_CONFIGS.map((day) => ({ label: day.shortLabel, value: day.index }));

export const createDefaultDaySchedule = (overrides = {}) => ({
    isWorkingDay: false,
    startTime: DEFAULT_WORKING_DAY_START_TIME,
    endTime: DEFAULT_WORKING_DAY_END_TIME,
    requiredHours: DEFAULT_WORKING_DAY_REQUIRED_HOURS,
    overtimeAllowed: false,
    ...overrides,
});

export const createEmptyWeeklySchedule = () => DAY_CONFIGS.reduce((schedule, day) => {
    schedule[day.key] = createDefaultDaySchedule({
        isWorkingDay: day.key !== 'friday',
    });

    return schedule;
}, {});

export const createEmptyHoliday = () => ({
    id: `holiday-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    name: '',
    startDate: '',
    endDate: '',
    isPaid: false,
    appliesToAll: false,
    employeeIds: [],
    departmentIds: [],
    targetScope: 'current_employee',
});

export const createEmptyLeave = (employeeId = '') => ({
    id: `leave-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    employeeId,
    type: 'Annual leave',
    startDate: '',
    endDate: '',
    isPaid: true,
    reason: '',
    notes: '',
});

export const createEmptyAdjustment = () => ({
    id: `adjustment-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    label: '',
    amount: 0,
    kind: 'addition',
});

export const createEmptyEmployeeProfile = () => ({
    id: `custom-${Date.now()}`,
    employeeCode: '',
    name: '',
    department: '',
    position: '',
    avatar: '',
    status: 'Active',
    source: 'custom',
    salarySettings: {
        monthlySalary: '',
        currency: 'EUR',
        deductionMethod: 'automatic_hourly_rate',
        fixedHourlyDeduction: '',
        percentageHourlyDeduction: '',
        automaticHourlyRate: 0,
        flexibleEightHourDay: true,
    },
    weeklySchedule: createEmptyWeeklySchedule(),
    deductionRules: {
        gracePeriodMinutes: 10,
        calculateByMinute: true,
        roundingMethod: 'nearest_15',
        doublePenaltyEnabled: true,
        doublePenaltyThresholdMinutes: 60,
        doublePenaltyMultiplier: 2,
        maximumDailyDeduction: '',
        maximumMonthlyDeduction: '',
    },
    holidays: [],
    leaves: [],
    overtimeSettings: {
        enabled: false,
        hourlyRate: '',
    },
    manualAdjustments: [],
    attendanceRecords: {
        staticByMonth: {},
    },
});

export const mergeEmployeeProfile = (baseProfile, overrideProfile) => {
    if (!overrideProfile) {
        return deepClone(baseProfile);
    }

    return {
        ...deepClone(baseProfile),
        ...deepClone(overrideProfile),
        salarySettings: {
            ...(baseProfile.salarySettings ?? {}),
            ...(overrideProfile.salarySettings ?? {}),
        },
        weeklySchedule: {
            ...(baseProfile.weeklySchedule ?? {}),
            ...(overrideProfile.weeklySchedule ?? {}),
        },
        deductionRules: {
            ...(baseProfile.deductionRules ?? {}),
            ...(overrideProfile.deductionRules ?? {}),
        },
        overtimeSettings: {
            ...(baseProfile.overtimeSettings ?? {}),
            ...(overrideProfile.overtimeSettings ?? {}),
        },
        attendanceRecords: {
            ...(baseProfile.attendanceRecords ?? {}),
            ...(overrideProfile.attendanceRecords ?? {}),
            staticByMonth: {
                ...(baseProfile.attendanceRecords?.staticByMonth ?? {}),
                ...(overrideProfile.attendanceRecords?.staticByMonth ?? {}),
            },
        },
        holidays: deepClone(overrideProfile.holidays ?? baseProfile.holidays ?? []).map((holiday) => ({
            ...holiday,
            isPaid: false,
        })),
        leaves: deepClone(overrideProfile.leaves ?? baseProfile.leaves ?? []),
        manualAdjustments: deepClone(overrideProfile.manualAdjustments ?? baseProfile.manualAdjustments ?? []),
    };
};

export const loadSettings = () => {
    try {
        const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};

        return {
            profiles: parsed?.profiles ?? {},
            customEmployees: parsed?.customEmployees ?? [],
        };
    } catch (error) {
        return {
            profiles: {},
            customEmployees: [],
        };
    }
};

export const saveSettings = (settings) => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

export const getPathValue = (source, path) => String(path)
    .split('.')
    .reduce((value, key) => (value == null ? undefined : value[key]), source);

export const setPathValue = (source, path, value) => {
    const keys = String(path).split('.');
    let current = source;

    keys.forEach((key, index) => {
        if (index === keys.length - 1) {
            current[key] = value;
            return;
        }

        if (current[key] == null || typeof current[key] !== 'object') {
            current[key] = {};
        }

        current = current[key];
    });
};

export const removeArrayItem = (array, index) => array.filter((_, itemIndex) => itemIndex !== index);

export const normalizeHolidayTargets = (employee, holiday) => {
    const targetScope = holiday.targetScope ?? (
        holiday.appliesToAll
            ? 'all'
            : holiday.employeeIds?.includes(employee.id)
                ? 'current_employee'
                : holiday.departmentIds?.includes(employee.department)
                    ? 'current_department'
                    : 'current_employee'
    );

    return {
        ...holiday,
        isPaid: false,
        targetScope,
        employeeIds: targetScope === 'current_employee' ? [employee.id] : [],
        departmentIds: targetScope === 'current_department' ? [employee.department] : [],
        appliesToAll: targetScope === 'all',
    };
};

export const getWorkingDaysCount = (employee) => DAY_CONFIGS.filter((day) => employee.weeklySchedule?.[day.key]?.isWorkingDay).length;

export const getWeeklyRequiredMinutes = (employee) => DAY_CONFIGS.reduce((total, day) => {
    const schedule = employee.weeklySchedule?.[day.key];
    return total + getPlannedRequiredMinutes(employee, schedule);
}, 0);

export const getWeeklyOffLabel = (employee) => DAY_CONFIGS
    .filter((day) => !employee.weeklySchedule?.[day.key]?.isWorkingDay)
    .map((day) => day.label)
    .join(', ') || 'None';

export const getWorkingScheduleLabel = (employee) => {
    const count = getWorkingDaysCount(employee);
    const weeklyHours = getWeeklyRequiredMinutes(employee) / 60;
    const modeSuffix = hasFlexibleEightHourDay(employee) ? ' / Flexible 8-hour day' : '';

    return `${formatInteger(count)} working days / ${new Intl.NumberFormat(ENGLISH_LOCALE, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(weeklyHours)} h weekly${modeSuffix}`;
};

export const hasFlexibleEightHourDay = () => true;

export const getPlannedRequiredMinutes = (employee, schedule) => {
    if (!schedule?.isWorkingDay) {
        return 0;
    }

    if (hasFlexibleEightHourDay(employee)) {
        return FLEXIBLE_EIGHT_HOUR_MINUTES;
    }

    return Number(schedule.requiredHours ?? 0) * 60;
};

const calculateFlexibleAttendanceMetrics = (workedMinutes, requiredMinutes) => {
    const safeWorkedMinutes = Math.max(Number(workedMinutes) || 0, 0);
    const safeRequiredMinutes = Math.max(Number(requiredMinutes) || 0, 0);
    const shortWorkMinutes = Math.max(safeRequiredMinutes - safeWorkedMinutes, 0);
    const overtimeMinutes = Math.max(safeWorkedMinutes - safeRequiredMinutes, 0);

    let status = 'Full attendance';

    if (shortWorkMinutes > 0) {
        status = 'Missing work hours';
    } else if (overtimeMinutes > 0) {
        status = 'Overtime';
    }

    return {
        actualMinutes: Math.min(safeWorkedMinutes, safeRequiredMinutes),
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        missingMinutes: shortWorkMinutes,
        overtimeMinutes,
        shortWorkMinutes,
        status,
    };
};

export const isDateInRange = (dateKey, startDate, endDate) => {
    if (!startDate || !endDate) {
        return false;
    }

    return dateKey >= startDate && dateKey <= endDate;
};

export const getApplicableHoliday = (employee, dateKey) => (employee.holidays ?? []).find((holiday) => {
    if (!isDateInRange(dateKey, holiday.startDate, holiday.endDate)) {
        return false;
    }

    return holiday.appliesToAll
        || (holiday.employeeIds ?? []).includes(employee.id)
        || (holiday.departmentIds ?? []).includes(employee.department);
}) ?? null;

export const getApplicableLeave = (employee, dateKey) => (employee.leaves ?? []).find((leave) => {
    if (leave.employeeId && leave.employeeId !== employee.id) {
        return false;
    }

    return isDateInRange(dateKey, leave.startDate, leave.endDate);
}) ?? null;

export const getDayScheduleForDate = (employee, date) => {
    const dayConfig = getDayConfigByIndex(date.getDay());
    return {
        dayConfig,
        schedule: employee.weeklySchedule?.[dayConfig.key] ?? {
            isWorkingDay: false,
            startTime: '',
            endTime: '',
            requiredHours: 0,
            overtimeAllowed: false,
        },
    };
};

export const roundMinutes = (minutes, method) => {
    const safeMinutes = Math.max(Number(minutes) || 0, 0);

    switch (method) {
        case 'nearest_15':
            return Math.round(safeMinutes / 15) * 15;
        case 'nearest_30':
            return Math.round(safeMinutes / 30) * 30;
        case 'nearest_hour':
            return Math.round(safeMinutes / 60) * 60;
        default:
            return safeMinutes;
    }
};

export const calculateBaseHourlyValue = (employee, requiredMonthlyMinutes) => {
    const salary = Number(employee.salarySettings?.monthlySalary ?? 0);
    const method = employee.salarySettings?.deductionMethod;

    if (method === 'percentage_of_salary') {
        return salary * (Number(employee.salarySettings?.percentageHourlyDeduction ?? 0) / 100);
    }

    if (method === 'fixed_per_hour') {
        return Number(employee.salarySettings?.fixedHourlyDeduction ?? 0);
    }

    if (requiredMonthlyMinutes <= 0) {
        return 0;
    }

    return salary / (requiredMonthlyMinutes / 60);
};

export const calculateOvertimeHourlyValue = (employee, fallbackHourlyValue) => {
    if (!employee.overtimeSettings?.enabled) {
        return 0;
    }

    return Number(employee.overtimeSettings?.hourlyRate ?? 0) || fallbackHourlyValue;
};

export const calculateDeductionAmountForMinutes = (minutes, employee, requiredMonthlyMinutes) => {
    const hourlyValue = calculateBaseHourlyValue(employee, requiredMonthlyMinutes);

    if (employee.deductionRules?.calculateByMinute) {
        return (Math.max(Number(minutes) || 0, 0) / 60) * hourlyValue;
    }

    return (Math.max(Number(minutes) || 0, 0) / 60) * hourlyValue;
};

const createDailyRecord = (payload) => ({
    holidayDeductionMinutes: 0,
    ...payload,
    deductionDetails: {
        hourlyValue: 0,
        holidayDeduction: 0,
        lateDeduction: 0,
        earlyLeaveDeduction: 0,
        shortWorkDeduction: 0,
        absenceDeduction: 0,
        unpaidLeaveDeduction: 0,
        doublePenaltyDeduction: 0,
        overtimeAddition: 0,
        totalDeduction: 0,
        roundedLateMinutes: 0,
        roundedEarlyLeaveMinutes: 0,
        roundedShortWorkMinutes: 0,
        doublePenaltyMinutes: 0,
    },
});

const buildStaticDayRecord = (employee, date, monthKey) => {
    const dateKey = getDateKey(date);
    const { dayConfig, schedule } = getDayScheduleForDate(employee, date);
    const plannedRequiredMinutes = getPlannedRequiredMinutes(employee, schedule);
    const holiday = getApplicableHoliday(employee, dateKey);
    const leave = getApplicableLeave(employee, dateKey);
    const monthOverrides = employee.attendanceRecords?.staticByMonth?.[monthKey] ?? {};
    const override = monthOverrides[dateKey] ?? {};

    if ((holiday && !override.forceWorkDay) || leave) {
        const isPaidLeave = leave?.isPaid ?? false;
        const isUnpaidLeave = Boolean(leave) && !isPaidLeave;
        const holidayDeductionMinutes = holiday ? plannedRequiredMinutes : 0;

        return createDailyRecord({
            id: `${employee.id}-${dateKey}`,
            dateKey,
            dayName: dayConfig.label,
            scheduleLabel: schedule.isWorkingDay ? `${schedule.startTime || '-'} - ${schedule.endTime || '-'}` : 'Weekly off',
            isWorkingDay: false,
            dayType: holiday ? 'holiday' : 'leave',
            scheduleStart: schedule.startTime,
            scheduleEnd: schedule.endTime,
            breakMinutes: schedule.breakMinutes ?? 0,
            requiredMinutes: 0,
            plannedRequiredMinutes,
            actualCheckIn: '',
            actualCheckOut: '',
            actualMinutes: 0,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            missingMinutes: 0,
            overtimeMinutes: 0,
            shortWorkMinutes: 0,
            absenceMinutes: 0,
            holidayDeductionMinutes,
            unpaidLeaveMinutes: isUnpaidLeave ? plannedRequiredMinutes : 0,
            holidayName: holiday?.name ?? '',
            leaveType: leave?.type ?? '',
            leavePaid: leave?.isPaid ?? true,
            status: holiday ? 'Official holiday' : (isPaidLeave ? 'Paid leave' : 'Unpaid leave'),
        });
    }

    if (!schedule.isWorkingDay && !override.forceWorkDay) {
        return createDailyRecord({
            id: `${employee.id}-${dateKey}`,
            dateKey,
            dayName: dayConfig.label,
            scheduleLabel: 'Weekly off',
            isWorkingDay: false,
            dayType: 'weekly_off',
            scheduleStart: '',
            scheduleEnd: '',
            breakMinutes: 0,
            requiredMinutes: 0,
            plannedRequiredMinutes: 0,
            actualCheckIn: '',
            actualCheckOut: '',
            actualMinutes: 0,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            missingMinutes: 0,
            overtimeMinutes: 0,
            shortWorkMinutes: 0,
            absenceMinutes: 0,
            unpaidLeaveMinutes: 0,
            holidayName: '',
            leaveType: '',
            leavePaid: true,
            status: 'Weekly off',
        });
    }

    if (override.noData || override.missingPunch) {
        return createDailyRecord({
            id: `${employee.id}-${dateKey}`,
            dateKey,
            dayName: dayConfig.label,
            scheduleLabel: `${schedule.startTime} - ${schedule.endTime}`,
            isWorkingDay: true,
            dayType: 'missing_punch',
            scheduleStart: schedule.startTime,
            scheduleEnd: schedule.endTime,
            breakMinutes: schedule.breakMinutes ?? 0,
            requiredMinutes: plannedRequiredMinutes,
            plannedRequiredMinutes,
            actualCheckIn: '',
            actualCheckOut: '',
            actualMinutes: 0,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            missingMinutes: 0,
            overtimeMinutes: 0,
            shortWorkMinutes: 0,
            absenceMinutes: 0,
            unpaidLeaveMinutes: 0,
            holidayName: '',
            leaveType: '',
            leavePaid: true,
            status: 'No fingerprint data',
        });
    }

    if (override.absent) {
        return createDailyRecord({
            id: `${employee.id}-${dateKey}`,
            dateKey,
            dayName: dayConfig.label,
            scheduleLabel: `${schedule.startTime} - ${schedule.endTime}`,
            isWorkingDay: true,
            dayType: 'absence',
            scheduleStart: schedule.startTime,
            scheduleEnd: schedule.endTime,
            breakMinutes: schedule.breakMinutes ?? 0,
            requiredMinutes: plannedRequiredMinutes,
            plannedRequiredMinutes,
            actualCheckIn: '',
            actualCheckOut: '',
            actualMinutes: 0,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            missingMinutes: 0,
            overtimeMinutes: 0,
            shortWorkMinutes: 0,
            absenceMinutes: plannedRequiredMinutes,
            unpaidLeaveMinutes: 0,
            holidayName: '',
            leaveType: '',
            leavePaid: true,
            status: 'Absent',
        });
    }

    const lateMinutes = clampNumber(override.lateMinutes, 0);
    const earlyLeaveMinutes = clampNumber(override.earlyLeaveMinutes, 0);
    const overtimeMinutes = clampNumber(override.overtimeMinutes, 0);
    const actualCheckIn = override.actualCheckIn ?? addMinutesToTime(schedule.startTime, lateMinutes);
    const actualCheckOut = override.actualCheckOut ?? addMinutesToTime(schedule.endTime, overtimeMinutes - earlyLeaveMinutes);
    const actualMinutes = Math.max(plannedRequiredMinutes - lateMinutes - earlyLeaveMinutes, 0);
    const missingMinutes = Math.max(lateMinutes + earlyLeaveMinutes, 0);

    let status = 'Full attendance';

    if (lateMinutes > 60) {
        status = 'More than one hour late';
    } else if (lateMinutes > 0) {
        status = 'Late check-in';
    } else if (earlyLeaveMinutes > 0) {
        status = 'Early departure';
    } else if (overtimeMinutes > 0) {
        status = 'Overtime';
    }

    return createDailyRecord({
        id: `${employee.id}-${dateKey}`,
        dateKey,
        dayName: dayConfig.label,
        scheduleLabel: `${schedule.startTime} - ${schedule.endTime}`,
        isWorkingDay: true,
        dayType: 'workday',
        scheduleStart: schedule.startTime,
        scheduleEnd: schedule.endTime,
        breakMinutes: schedule.breakMinutes ?? 0,
        requiredMinutes: plannedRequiredMinutes,
        plannedRequiredMinutes,
        actualCheckIn,
        actualCheckOut,
        actualMinutes,
        lateMinutes,
        earlyLeaveMinutes,
        missingMinutes,
        overtimeMinutes,
        shortWorkMinutes: 0,
        absenceMinutes: 0,
        unpaidLeaveMinutes: 0,
        holidayName: '',
        leaveType: '',
        leavePaid: true,
        status,
    });
};

const isWorkdayStillOpen = (dateKey, schedule) => {
    if (!schedule?.isWorkingDay) {
        return false;
    }

    const now = new Date();

    if (dateKey !== getDateKey(now)) {
        return false;
    }

    const currentMinutes = (now.getHours() * 60) + now.getMinutes();
    const endMinutes = parseTimeToMinutes(schedule.endTime || '23:59');

    return currentMinutes < endMinutes;
};

const buildBackendDayRecord = (employee, date, backendRecordsByDate) => {
    const dateKey = getDateKey(date);
    const { dayConfig, schedule } = getDayScheduleForDate(employee, date);
    const plannedRequiredMinutes = getPlannedRequiredMinutes(employee, schedule);
    const holiday = getApplicableHoliday(employee, dateKey);
    const leave = getApplicableLeave(employee, dateKey);

    if (holiday || leave) {
        return buildStaticDayRecord(employee, date, getCurrentMonthString());
    }

    const dayRecords = backendRecordsByDate.get(dateKey) ?? [];
    const workdayStillOpen = isWorkdayStillOpen(dateKey, schedule);

    if (!schedule.isWorkingDay && !dayRecords.length) {
        return createDailyRecord({
            id: `${employee.id}-${dateKey}`,
            dateKey,
            dayName: dayConfig.label,
            scheduleLabel: 'Weekly off',
            isWorkingDay: false,
            dayType: 'weekly_off',
            scheduleStart: '',
            scheduleEnd: '',
            breakMinutes: 0,
            requiredMinutes: 0,
            plannedRequiredMinutes: 0,
            actualCheckIn: '',
            actualCheckOut: '',
            actualMinutes: 0,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            missingMinutes: 0,
            overtimeMinutes: 0,
            shortWorkMinutes: 0,
            absenceMinutes: 0,
            unpaidLeaveMinutes: 0,
            holidayName: '',
            leaveType: '',
            leavePaid: true,
            status: 'Weekly off',
        });
    }

    if (!dayRecords.length && workdayStillOpen) {
        return createDailyRecord({
            id: `${employee.id}-${dateKey}`,
            dateKey,
            dayName: dayConfig.label,
            scheduleLabel: `${schedule.startTime || '-'} - ${schedule.endTime || '-'}`,
            isWorkingDay: true,
            dayType: 'in_progress',
            scheduleStart: schedule.startTime,
            scheduleEnd: schedule.endTime,
            breakMinutes: 0,
            requiredMinutes: plannedRequiredMinutes,
            plannedRequiredMinutes,
            actualCheckIn: '',
            actualCheckOut: '',
            actualMinutes: 0,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            missingMinutes: 0,
            overtimeMinutes: 0,
            shortWorkMinutes: 0,
            absenceMinutes: 0,
            unpaidLeaveMinutes: 0,
            holidayName: '',
            leaveType: '',
            leavePaid: true,
            status: 'Day not finished yet',
        });
    }

    if (!dayRecords.length) {
        return createDailyRecord({
            id: `${employee.id}-${dateKey}`,
            dateKey,
            dayName: dayConfig.label,
            scheduleLabel: `${schedule.startTime || '-'} - ${schedule.endTime || '-'}`,
            isWorkingDay: schedule.isWorkingDay,
            dayType: 'absence',
            scheduleStart: schedule.startTime,
            scheduleEnd: schedule.endTime,
            breakMinutes: schedule.breakMinutes ?? 0,
            requiredMinutes: plannedRequiredMinutes,
            plannedRequiredMinutes,
            actualCheckIn: '',
            actualCheckOut: '',
            actualMinutes: 0,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            missingMinutes: 0,
            overtimeMinutes: 0,
            shortWorkMinutes: 0,
            absenceMinutes: schedule.isWorkingDay ? plannedRequiredMinutes : 0,
            unpaidLeaveMinutes: 0,
            holidayName: '',
            leaveType: '',
            leavePaid: true,
            status: schedule.isWorkingDay ? 'Absent' : 'Weekly off',
        });
    }

    const sortedRecords = [...dayRecords].sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));
    const firstCheckIn = sortedRecords.find((record) => record.state === 'check_in');
    const lastCheckOut = [...sortedRecords].reverse().find((record) => ['check_out', 'overtime_out'].includes(record.state));

    const intervals = calculateIntervalsFromLogs(sortedRecords);
    const liveIntervals = workdayStillOpen ? calculateIntervalsFromLogs(sortedRecords, new Date()) : intervals;
    const graceMinutes = Number(employee.deductionRules?.gracePeriodMinutes ?? 0);
    const actualCheckIn = firstCheckIn?.timestamp ? String(firstCheckIn.timestamp).slice(11, 16) : '';
    const actualCheckOut = lastCheckOut?.timestamp ? String(lastCheckOut.timestamp).slice(11, 16) : '';
    const totalWorkedMinutes = intervals.normalMinutes + intervals.overtimeMinutes;
    const liveWorkedMinutes = liveIntervals.normalMinutes + liveIntervals.overtimeMinutes;

    if (workdayStillOpen) {
        const safeActualCheckOut = actualCheckOut && actualCheckOut >= actualCheckIn ? actualCheckOut : '';

        return createDailyRecord({
            id: `${employee.id}-${dateKey}`,
            dateKey,
            dayName: dayConfig.label,
            scheduleLabel: `${schedule.startTime || '-'} - ${schedule.endTime || '-'}`,
            isWorkingDay: true,
            dayType: 'in_progress',
            scheduleStart: schedule.startTime,
            scheduleEnd: schedule.endTime,
            breakMinutes: 0,
            requiredMinutes: plannedRequiredMinutes,
            plannedRequiredMinutes,
            actualCheckIn,
            actualCheckOut: safeActualCheckOut,
            actualMinutes: hasFlexibleEightHourDay(employee)
                ? Math.min(liveWorkedMinutes, plannedRequiredMinutes)
                : liveIntervals.normalMinutes,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            missingMinutes: 0,
            overtimeMinutes: liveIntervals.overtimeMinutes,
            shortWorkMinutes: 0,
            absenceMinutes: 0,
            unpaidLeaveMinutes: 0,
            holidayName: '',
            leaveType: '',
            leavePaid: true,
            status: actualCheckIn ? 'Workday in progress' : 'Day not finished yet',
        });
    }

    if (hasFlexibleEightHourDay(employee)) {
        const flexibleMetrics = calculateFlexibleAttendanceMetrics(totalWorkedMinutes, plannedRequiredMinutes);

        return createDailyRecord({
            id: `${employee.id}-${dateKey}`,
            dateKey,
            dayName: dayConfig.label,
            scheduleLabel: `${schedule.startTime || '-'} - ${schedule.endTime || '-'}`,
            isWorkingDay: schedule.isWorkingDay,
            dayType: 'workday',
            scheduleStart: schedule.startTime,
            scheduleEnd: schedule.endTime,
            breakMinutes: schedule.breakMinutes ?? 0,
            requiredMinutes: schedule.isWorkingDay ? plannedRequiredMinutes : 0,
            plannedRequiredMinutes,
            actualCheckIn,
            actualCheckOut,
            actualMinutes: flexibleMetrics.actualMinutes,
            lateMinutes: flexibleMetrics.lateMinutes,
            earlyLeaveMinutes: flexibleMetrics.earlyLeaveMinutes,
            missingMinutes: flexibleMetrics.missingMinutes,
            overtimeMinutes: flexibleMetrics.overtimeMinutes,
            shortWorkMinutes: flexibleMetrics.shortWorkMinutes,
            absenceMinutes: 0,
            unpaidLeaveMinutes: 0,
            holidayName: '',
            leaveType: '',
            leavePaid: true,
            status: (!actualCheckIn || !actualCheckOut) ? 'No fingerprint data' : flexibleMetrics.status,
        });
    }

    const rawLateMinutes = actualCheckIn ? Math.max(parseTimeToMinutes(actualCheckIn) - parseTimeToMinutes(schedule.startTime), 0) : 0;
    const lateMinutes = Math.max(rawLateMinutes - graceMinutes, 0);
    const earlyLeaveMinutes = actualCheckOut ? Math.max(parseTimeToMinutes(schedule.endTime) - parseTimeToMinutes(actualCheckOut), 0) : 0;
    const overtimeMinutes = intervals.overtimeMinutes;
    const missingMinutes = Math.max(lateMinutes + earlyLeaveMinutes, 0);

    let status = 'Full attendance';

    if (!actualCheckIn || !actualCheckOut) {
        status = 'No fingerprint data';
    } else if (lateMinutes > 60) {
        status = 'More than one hour late';
    } else if (lateMinutes > 0) {
        status = 'Late check-in';
    } else if (earlyLeaveMinutes > 0) {
        status = 'Early departure';
    } else if (overtimeMinutes > 0) {
        status = 'Overtime';
    }

    return createDailyRecord({
        id: `${employee.id}-${dateKey}`,
        dateKey,
        dayName: dayConfig.label,
        scheduleLabel: `${schedule.startTime || '-'} - ${schedule.endTime || '-'}`,
        isWorkingDay: schedule.isWorkingDay,
        dayType: 'workday',
        scheduleStart: schedule.startTime,
        scheduleEnd: schedule.endTime,
        breakMinutes: schedule.breakMinutes ?? 0,
        requiredMinutes: schedule.isWorkingDay ? plannedRequiredMinutes : 0,
        plannedRequiredMinutes,
        actualCheckIn,
        actualCheckOut,
        actualMinutes: intervals.normalMinutes,
        lateMinutes,
        earlyLeaveMinutes,
        missingMinutes,
        overtimeMinutes,
        shortWorkMinutes: 0,
        absenceMinutes: 0,
        unpaidLeaveMinutes: 0,
        holidayName: '',
        leaveType: '',
        leavePaid: true,
        status,
    });
};

const calculateIntervalsFromLogs = (records, openIntervalEnd = null) => {
    const normalDurations = [];
    const overtimeDurations = [];
    let normalStart = null;
    let overtimeStart = null;

    const closeInterval = (startValue, endValue, bucket) => {
        if (!startValue || !endValue || endValue <= startValue) {
            return;
        }

        bucket.push(endValue.getTime() - startValue.getTime());
    };

    records.forEach((record) => {
        const timestamp = record.timestamp ? new Date(record.timestamp) : null;

        if (!timestamp) {
            return;
        }

        switch (record.state) {
            case 'check_in':
            case 'break_in':
                if (overtimeStart) {
                    closeInterval(overtimeStart, timestamp, overtimeDurations);
                    overtimeStart = null;
                }

                if (!normalStart) {
                    normalStart = timestamp;
                }
                break;

            case 'break_out':
                if (normalStart) {
                    closeInterval(normalStart, timestamp, normalDurations);
                    normalStart = null;
                }
                break;

            case 'overtime_in':
                if (normalStart) {
                    closeInterval(normalStart, timestamp, normalDurations);
                    normalStart = null;
                }

                overtimeStart = timestamp;
                break;

            case 'overtime_out':
                if (overtimeStart) {
                    closeInterval(overtimeStart, timestamp, overtimeDurations);
                    overtimeStart = null;
                }
                break;

            case 'check_out':
                if (overtimeStart) {
                    closeInterval(overtimeStart, timestamp, overtimeDurations);
                    overtimeStart = null;
                }

                if (normalStart) {
                    closeInterval(normalStart, timestamp, normalDurations);
                    normalStart = null;
                }
                break;
        }
    });

    if (openIntervalEnd instanceof Date) {
        if (overtimeStart) {
            closeInterval(overtimeStart, openIntervalEnd, overtimeDurations);
        }

        if (normalStart) {
            closeInterval(normalStart, openIntervalEnd, normalDurations);
        }
    }

    return {
        normalMinutes: normalDurations.reduce((total, duration) => total + Math.floor(duration / 60000), 0),
        overtimeMinutes: overtimeDurations.reduce((total, duration) => total + Math.floor(duration / 60000), 0),
    };
};

const applyMonthlyDeductions = (employee, baseRecords) => {
    const requiredMonthlyMinutes = baseRecords.reduce((total, record) => total + record.requiredMinutes, 0);
    const pricingMonthlyMinutes = baseRecords.reduce((total, record) => total + Math.max(Number(record.plannedRequiredMinutes) || 0, 0), 0)
        || requiredMonthlyMinutes;
    const hourlyValue = calculateBaseHourlyValue(employee, pricingMonthlyMinutes);
    const overtimeHourlyValue = calculateOvertimeHourlyValue(employee, hourlyValue);

    return baseRecords.map((record) => {
        const roundedLateMinutes = roundMinutes(Math.max(record.lateMinutes - Number(employee.deductionRules?.gracePeriodMinutes ?? 0), 0), employee.deductionRules?.roundingMethod);
        const roundedEarlyLeaveMinutes = roundMinutes(record.earlyLeaveMinutes, employee.deductionRules?.roundingMethod);
        const roundedShortWorkMinutes = roundMinutes(record.shortWorkMinutes, employee.deductionRules?.roundingMethod);
        const totalRoundedMissingMinutes = roundedLateMinutes + roundedEarlyLeaveMinutes + roundedShortWorkMinutes;
        const doublePenaltyMinutes = employee.deductionRules?.doublePenaltyEnabled
            ? Math.max(totalRoundedMissingMinutes - Number(employee.deductionRules?.doublePenaltyThresholdMinutes ?? 0), 0)
            : 0;

        const holidayDeduction = calculateDeductionAmountForMinutes(record.holidayDeductionMinutes, employee, pricingMonthlyMinutes);
        const lateDeduction = calculateDeductionAmountForMinutes(roundedLateMinutes, employee, pricingMonthlyMinutes);
        const earlyLeaveDeduction = calculateDeductionAmountForMinutes(roundedEarlyLeaveMinutes, employee, pricingMonthlyMinutes);
        const shortWorkDeduction = calculateDeductionAmountForMinutes(roundedShortWorkMinutes, employee, pricingMonthlyMinutes);
        const absenceDeduction = calculateDeductionAmountForMinutes(record.absenceMinutes, employee, pricingMonthlyMinutes);
        const unpaidLeaveDeduction = calculateDeductionAmountForMinutes(record.unpaidLeaveMinutes, employee, pricingMonthlyMinutes);
        const doublePenaltyDeduction = calculateDeductionAmountForMinutes(doublePenaltyMinutes, employee, pricingMonthlyMinutes)
            * Math.max(Number(employee.deductionRules?.doublePenaltyMultiplier ?? 1) - 1, 0);
        const overtimeAddition = employee.overtimeSettings?.enabled
            ? (Math.max(record.overtimeMinutes, 0) / 60) * overtimeHourlyValue
            : 0;

        const uncappedTotalDeduction = holidayDeduction + lateDeduction + earlyLeaveDeduction + shortWorkDeduction + absenceDeduction + unpaidLeaveDeduction + doublePenaltyDeduction;
        const cappedTotalDeduction = employee.deductionRules?.maximumDailyDeduction
            ? Math.min(uncappedTotalDeduction, Number(employee.deductionRules.maximumDailyDeduction))
            : uncappedTotalDeduction;

        return {
            ...record,
            deductionDetails: {
                hourlyValue,
                holidayDeduction,
                lateDeduction,
                earlyLeaveDeduction,
                shortWorkDeduction,
                absenceDeduction,
                unpaidLeaveDeduction,
                doublePenaltyDeduction,
                overtimeAddition,
                totalDeduction: cappedTotalDeduction,
                roundedLateMinutes,
                roundedEarlyLeaveMinutes,
                roundedShortWorkMinutes,
                doublePenaltyMinutes,
            },
        };
    });
};

export const buildMonthlyRecords = (employee, monthKey) => {
    const backendRecords = employee.backendRecordsByMonth?.[monthKey] ?? [];

    if (!backendRecords.length) {
        return [];
    }

    const recordsByDate = groupRecordsByDate(backendRecords);
    return applyMonthlyDeductions(
        employee,
        buildElapsedMonthDays(monthKey).map((date) => buildBackendDayRecord(employee, date, recordsByDate)),
    );
};

export const calculateEmployeeSummary = (employee, monthKey) => {
    const dailyRecords = buildMonthlyRecords(employee, monthKey);
    const elapsedWorkdayRecords = dailyRecords.filter((record) => record.isWorkingDay && record.requiredMinutes > 0);
    const baseSalary = Number(employee.salarySettings?.monthlySalary ?? 0);
    const requiredMinutes = dailyRecords.reduce((total, record) => total + record.requiredMinutes, 0);
    const pricingMonthlyMinutes = dailyRecords.reduce((total, record) => total + Math.max(Number(record.plannedRequiredMinutes) || 0, 0), 0)
        || requiredMinutes;
    const actualMinutes = dailyRecords.reduce((total, record) => total + record.actualMinutes, 0);
    const overtimeMinutes = dailyRecords.reduce((total, record) => total + record.overtimeMinutes, 0);
    const lateMinutes = dailyRecords.reduce((total, record) => total + record.lateMinutes, 0);
    const earlyLeaveMinutes = dailyRecords.reduce((total, record) => total + record.earlyLeaveMinutes, 0);
    const missingMinutes = dailyRecords.reduce((total, record) => total + record.missingMinutes, 0);
    const shortWorkMinutes = dailyRecords.reduce((total, record) => total + record.shortWorkMinutes, 0);
    const holidayDeductions = dailyRecords.reduce((total, record) => total + record.deductionDetails.holidayDeduction, 0);
    const lateDeductions = dailyRecords.reduce((total, record) => total + record.deductionDetails.lateDeduction, 0);
    const earlyLeaveDeductions = dailyRecords.reduce((total, record) => total + record.deductionDetails.earlyLeaveDeduction, 0);
    const shortWorkDeductions = dailyRecords.reduce((total, record) => total + record.deductionDetails.shortWorkDeduction, 0);
    const absenceDeductions = dailyRecords.reduce((total, record) => total + record.deductionDetails.absenceDeduction, 0);
    const unpaidLeaveDeductions = dailyRecords.reduce((total, record) => total + record.deductionDetails.unpaidLeaveDeduction, 0);
    const doublePenaltyAmount = dailyRecords.reduce((total, record) => total + record.deductionDetails.doublePenaltyDeduction, 0);
    const overtimeAdditions = dailyRecords.reduce((total, record) => total + record.deductionDetails.overtimeAddition, 0);
    const paidLeaveDays = dailyRecords.filter((record) => record.status === 'Paid leave').length;
    const unpaidLeaveDays = dailyRecords.filter((record) => record.status === 'Unpaid leave').length;
    const holidayDays = dailyRecords.filter((record) => record.status === 'Official holiday').length;
    const weeklyOffDays = dailyRecords.filter((record) => record.status === 'Weekly off').length;
    const absentDays = elapsedWorkdayRecords.filter((record) => record.dayType === 'absence').length;
    const fullAttendanceDays = dailyRecords.filter((record) => record.status === 'Full attendance').length;
    const noDataDays = elapsedWorkdayRecords.filter((record) => record.status === 'No fingerprint data').length;
    const requiredWorkDays = elapsedWorkdayRecords.length;
    const lateDays = dailyRecords.filter((record) => ['Late check-in', 'More than one hour late'].includes(record.status)).length;
    const manualAdditions = (employee.manualAdjustments ?? [])
        .filter((adjustment) => adjustment.kind === 'addition')
        .reduce((total, adjustment) => total + Number(adjustment.amount ?? 0), 0);
    const manualDeductions = (employee.manualAdjustments ?? [])
        .filter((adjustment) => adjustment.kind === 'deduction')
        .reduce((total, adjustment) => total + Number(adjustment.amount ?? 0), 0);
    const rawTotalDeductions = holidayDeductions + lateDeductions + earlyLeaveDeductions + shortWorkDeductions + absenceDeductions + unpaidLeaveDeductions + doublePenaltyAmount;
    const cappedTotalDeductions = employee.deductionRules?.maximumMonthlyDeduction
        ? Math.min(rawTotalDeductions, Number(employee.deductionRules.maximumMonthlyDeduction))
        : rawTotalDeductions;
    const finalSalary = Math.max(baseSalary - cappedTotalDeductions - manualDeductions + overtimeAdditions + manualAdditions, 0);
    const hourlyValue = calculateBaseHourlyValue(employee, pricingMonthlyMinutes);
    const configuredSchedule = getWorkingDaysCount(employee) > 0 && baseSalary > 0;
    const attendanceStatus = !configuredSchedule
        ? 'Needs setup'
        : (absentDays > 0 || cappedTotalDeductions > 0)
            ? 'Salary deduction applied'
            : lateDays >= 3
                ? 'Repeated lateness'
                : 'Configured';

    return {
        dailyRecords,
        requiredWorkDays,
        weeklyOffDays,
        holidayDays,
        paidLeaveDays,
        unpaidLeaveDays,
        requiredMinutes,
        actualMinutes,
        missingMinutes,
        shortWorkMinutes,
        lateMinutes,
        earlyLeaveMinutes,
        overtimeMinutes,
        absentDays,
        fullAttendanceDays,
        noDataDays,
        lateDays,
        totalDeductions: cappedTotalDeductions,
        baseSalary,
        additions: overtimeAdditions + manualAdditions,
        finalSalary,
        attendanceStatus,
        configuredSchedule,
        completionPercentage: requiredMinutes > 0 ? Math.min((actualMinutes / requiredMinutes) * 100, 100) : 0,
        salaryBreakdown: {
            baseSalary,
            hourlyValue,
            holidayDeductions,
            lateDeductions,
            earlyLeaveDeductions,
            shortWorkDeductions,
            absenceDeductions,
            unpaidLeaveDeductions,
            doublePenaltyAmount,
            overtimeAdditions,
            manualAdditions,
            manualDeductions,
            totalDeductions: cappedTotalDeductions + manualDeductions,
            netSalary: finalSalary,
        },
    };
};

export const matchesEmployeeSearch = (employee, query) => {
    const normalizedQuery = String(query || '').trim().toLowerCase();

    if (!normalizedQuery) {
        return true;
    }

    return [
        employee.name,
        employee.employeeCode,
        employee.department,
        employee.position,
        employee.status,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
};

export const matchesAttendanceFilter = (summary, filterValue) => {
    switch (filterValue) {
        case 'configured':
            return summary.configuredSchedule && summary.totalDeductions === 0;
        case 'incomplete':
            return !summary.configuredSchedule;
        case 'deduction':
            return summary.totalDeductions > 0;
        case 'late':
            return summary.lateDays >= 2;
        default:
            return true;
    }
};

export const matchesDayFilter = (record, filterValue) => {
    switch (filterValue) {
        case 'late':
            return ['Late check-in', 'More than one hour late'].includes(record.status);
        case 'absent':
            return record.status === 'Absent';
        case 'leave':
            return ['Paid leave', 'Unpaid leave'].includes(record.status);
        case 'holiday':
            return ['Official holiday', 'Weekly off'].includes(record.status);
        case 'overtime':
            return record.overtimeMinutes > 0;
        default:
            return true;
    }
};

export const getStatusTone = (status) => {
    switch (status) {
        case 'Configured':
        case 'Full attendance':
        case 'Paid leave':
            return 'emerald';
        case 'Repeated lateness':
        case 'Late check-in':
        case 'Early departure':
        case 'Missing work hours':
            return 'amber';
        case 'More than one hour late':
        case 'Absent':
        case 'Unpaid leave':
        case 'Salary deduction applied':
        case 'Needs setup':
            return 'red';
        case 'Overtime':
            return 'emerald';
        case 'Official holiday':
        case 'Weekly off':
        case 'No fingerprint data':
        case 'Day not finished yet':
        case 'Workday in progress':
            return 'zinc';
        default:
            return 'amber';
    }
};

export const highlightMatch = (value, query) => {
    const text = String(value ?? '');
    const normalizedQuery = String(query || '').trim();

    if (!normalizedQuery) {
        return escapeHtml(text);
    }

    const escapedText = escapeHtml(text);
    const safeQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escapedText.replace(new RegExp(safeQuery, 'ig'), (match) => `<mark class="rounded bg-amber-100 px-1 text-amber-950">${match}</mark>`);
};

export const serializeEmployeeForStorage = (employee) => ({
    ...deepClone(employee),
    backendRecordsByMonth: {},
});

export const buildWizardReview = (employeeDraft) => ({
    weeklyWorkDays: getWorkingDaysCount(employeeDraft),
    weeklyHours: getWeeklyRequiredMinutes(employeeDraft) / 60,
    weeklyOffLabel: getWeeklyOffLabel(employeeDraft),
});

export const validateEmployeeDraft = (employeeDraft, allEmployees, currentEmployeeId = '') => {
    const errors = [];
    const salary = Number(employeeDraft.salarySettings?.monthlySalary ?? 0);
    const deductionMethod = employeeDraft.salarySettings?.deductionMethod;
    const workingDays = getWorkingDaysCount(employeeDraft);
    const employeeCode = String(employeeDraft.employeeCode || '').trim();

    if (!employeeDraft.name?.trim()) {
        errors.push('Employee name is required.');
    }

    if (!employeeCode) {
        errors.push('Employee ID is required.');
    }

    if (allEmployees.some((employee) => employee.id !== currentEmployeeId && employee.employeeCode === employeeCode)) {
        errors.push('The employee ID must be unique.');
    }

    if (salary <= 0) {
        errors.push('Monthly salary is required.');
    }

    if (workingDays <= 0) {
        errors.push('At least one working day must be enabled.');
    }

    DAY_CONFIGS.forEach((day) => {
        const schedule = employeeDraft.weeklySchedule?.[day.key];

        if (!schedule?.isWorkingDay) {
            return;
        }

        if (!schedule.startTime || !schedule.endTime) {
            errors.push(`A start and end time must be set for ${day.label}.`);
        }

        if (parseTimeToMinutes(schedule.endTime) <= parseTimeToMinutes(schedule.startTime)) {
            errors.push(`The end time for ${day.label} must be after the start time.`);
        }

        if (Number(schedule.requiredHours ?? 0) <= 0) {
            errors.push(`Required work hours for ${day.label} must be greater than zero.`);
        }
    });

    if (!deductionMethod) {
        errors.push('Deduction method is required.');
    }

    if (deductionMethod === 'percentage_of_salary' && Number(employeeDraft.salarySettings?.percentageHourlyDeduction ?? 0) < 0) {
        errors.push('The deduction percentage cannot be negative.');
    }

    if (deductionMethod === 'percentage_of_salary' && Number(employeeDraft.salarySettings?.percentageHourlyDeduction ?? 0) === 0) {
        errors.push('Enter the deduction percentage value.');
    }

    if (deductionMethod === 'fixed_per_hour' && Number(employeeDraft.salarySettings?.fixedHourlyDeduction ?? 0) <= 0) {
        errors.push('Enter the fixed deduction value per hour.');
    }

    if (Number(employeeDraft.deductionRules?.doublePenaltyMultiplier ?? 1) < 1) {
        errors.push('The double penalty multiplier must be greater than or equal to 1.');
    }

    return errors;
};

export const validateWizardStep = (employeeDraft, stepIndex, allEmployees, currentEmployeeId = '') => {
    const allErrors = validateEmployeeDraft(employeeDraft, allEmployees, currentEmployeeId);

    switch (stepIndex) {
        case 0:
            return allErrors.filter((error) => error.includes('Name') || error.includes('ID'));
        case 1:
            return allErrors.filter((error) => error.includes('Salary') || error.includes('Deduction') || error.includes('Method'));
        case 2:
            return allErrors.filter((error) => error.includes('Working day') || error.includes('Time') || error.includes('Hours'));
        case 4:
            return allErrors.filter((error) => error.includes('Multiplier'));
        default:
            return [];
    }
};

export const groupRecordsByDate = (records) => {
    const groups = new Map();

    records.forEach((record) => {
        const dateKey = String(record.timestamp ?? '').slice(0, 10);

        if (!dateKey) {
            return;
        }

        if (!groups.has(dateKey)) {
            groups.set(dateKey, []);
        }

        groups.get(dateKey).push(record);
    });

    groups.forEach((dayRecords) => {
        dayRecords.sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));
    });

    return groups;
};

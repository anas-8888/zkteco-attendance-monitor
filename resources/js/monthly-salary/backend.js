import {
    createEmptyWeeklySchedule,
    deepClone,
    getCurrentMonthString,
    mergeEmployeeProfile,
} from './utils';

const createFallbackEmployee = (employee) => ({
    id: String(employee.device_user_id),
    employeeCode: String(employee.device_user_id),
    name: employee.name || String(employee.device_user_id),
    department: '',
    position: '',
    avatar: '',
    status: 'Active',
    source: 'backend',
    salarySettings: {
        monthlySalary: 0,
        currency: 'EUR',
        deductionMethod: 'automatic_hourly_rate',
        fixedHourlyDeduction: 0,
        percentageHourlyDeduction: 0,
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
        maximumDailyDeduction: 0,
        maximumMonthlyDeduction: 0,
    },
    holidays: [],
    leaves: [],
    overtimeSettings: {
        enabled: false,
        hourlyRate: 0,
    },
    manualAdjustments: [],
    attendanceRecords: {
        staticByMonth: {},
    },
    backendRecordsByMonth: {},
    needsSetup: true,
});

export const fetchMonthlyStatistics = async (monthKey = getCurrentMonthString()) => {
    const url = new URL('/api/attendance/monthly-statistics', window.location.origin);
    url.searchParams.set('month', monthKey);

    const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('Failed to load monthly attendance records.');
    }

    return response.json();
};

export const buildEmployeesDataset = ({ savedSettings, backendPayload, monthKey }) => {
    const recordsByEmployee = new Map();
    const profileOverrides = savedSettings?.profiles ?? {};
    const customEmployees = savedSettings?.customEmployees ?? [];

    (backendPayload?.records ?? []).forEach((record) => {
        const employeeId = String(record.device_user_id);

        if (!recordsByEmployee.has(employeeId)) {
            recordsByEmployee.set(employeeId, []);
        }

        recordsByEmployee.get(employeeId).push(record);
    });

    const employeesById = new Map();

    customEmployees.forEach((baseEmployee) => {
        const employeeId = String(baseEmployee.id);
        const mergedProfile = mergeEmployeeProfile(baseEmployee, profileOverrides[employeeId]);
        const backendRecords = recordsByEmployee.get(employeeId) ?? [];

        employeesById.set(employeeId, {
            ...deepClone(mergedProfile),
            backendRecordsByMonth: {
                ...(mergedProfile.backendRecordsByMonth ?? {}),
                [monthKey]: backendRecords,
            },
        });
    });

    (backendPayload?.employees ?? []).forEach((backendEmployee) => {
        const employeeId = String(backendEmployee.device_user_id);

        if (employeesById.has(employeeId)) {
            const currentEmployee = employeesById.get(employeeId);
            currentEmployee.backendRecordsByMonth = {
                ...(currentEmployee.backendRecordsByMonth ?? {}),
                [monthKey]: recordsByEmployee.get(employeeId) ?? [],
            };
            employeesById.set(employeeId, currentEmployee);
            return;
        }

        const fallbackEmployee = createFallbackEmployee(backendEmployee);
        const mergedProfile = mergeEmployeeProfile(fallbackEmployee, profileOverrides[employeeId]);

        employeesById.set(employeeId, {
            ...deepClone(mergedProfile),
            backendRecordsByMonth: {
                ...(mergedProfile.backendRecordsByMonth ?? {}),
                [monthKey]: recordsByEmployee.get(employeeId) ?? [],
            },
        });
    });

    return [...employeesById.values()].sort((left, right) => left.name.localeCompare(right.name));
};

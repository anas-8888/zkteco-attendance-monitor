import {
    DAY_CONFIGS,
    DAY_FILTER_OPTIONS,
    DETAIL_TABS,
    escapeHtml,
    formatCurrency,
    formatDateLabel,
    formatHours,
    formatInteger,
    formatPercentage,
    formatTime,
    getInitials,
    getMonthLabel,
    getStatusTone,
    getWeeklyOffLabel,
    hasFlexibleEightHourDay,
    getWorkingScheduleLabel,
    highlightMatch,
    STATUS_FILTER_OPTIONS,
    WIZARD_STEPS,
} from './utils';

const icon = (path, className = 'h-5 w-5') => `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="${className}" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="${path}" />
    </svg>
`;

const badgeClasses = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-rose-200 bg-rose-50 text-rose-700',
    blue: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    zinc: 'border-slate-200 bg-slate-50 text-slate-700',
    orange: 'border-amber-200 bg-amber-50 text-amber-700',
};

const deductionMethodLabels = {
    percentage_of_salary: 'Percentage of salary',
    fixed_per_hour: 'Fixed amount per hour',
    automatic_hourly_rate: 'Automatic from hourly work rate',
};

const roundingMethodLabels = {
    none: 'No rounding',
    nearest_15: 'Nearest 15 minutes',
    nearest_30: 'Nearest 30 minutes',
    nearest_hour: 'Nearest full hour',
};

const employeeStatusLabels = {
    Active: 'Active',
    Inactive: 'Inactive',
    Suspended: 'Suspended',
    'Suspended temporarily': 'Suspended temporarily',
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    'Active': 'Active',
    'Inactive': 'Inactive',
    'Suspended': 'Suspended',
    'Suspended temporarily': 'Suspended temporarily',
};

const holidayScopeLabels = {
    all: 'All employees',
    current_employee: 'Current employee only',
    current_department: 'Current department',
};

const yesNoLabel = (value) => value ? 'Yes' : 'No';
const enabledDisabledLabel = (value) => value ? 'Enabled' : 'Disabled';
const deductionMethodLabel = (value) => deductionMethodLabels[value] ?? String(value || '').replaceAll('_', ' ');
const roundingMethodLabel = (value) => roundingMethodLabels[value] ?? String(value || '').replaceAll('_', ' ');
const employeeStatusLabel = (value) => employeeStatusLabels[value] ?? value;

const renderDeductionMethodSetting = (salarySettings) => {
    switch (salarySettings?.deductionMethod) {
        case 'percentage_of_salary':
            return renderInfoPair(
                'Deduction percentage per hour',
                salarySettings?.percentageHourlyDeduction ? `${salarySettings.percentageHourlyDeduction}%` : 'Not set',
            );
        case 'fixed_per_hour':
            return renderInfoPair(
                'Fixed hourly deduction',
                salarySettings?.fixedHourlyDeduction
                    ? formatCurrency(salarySettings.fixedHourlyDeduction, salarySettings.currency)
                    : 'Not set',
            );
        default:
            return '';
    }
};

const renderStatusBadge = (label) => {
    const tone = getStatusTone(label);
    return `<span class="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${badgeClasses[tone]}">${escapeHtml(label)}</span>`;
};

const renderAvatar = (employee, sizeClass = 'h-14 w-14') => {
    if (employee.avatar) {
        return `<img src="${escapeHtml(employee.avatar)}" alt="${escapeHtml(employee.name)}" class="${sizeClass} rounded-2xl object-cover">`;
    }

    return `<div class="flex ${sizeClass} items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">${escapeHtml(getInitials(employee.name))}</div>`;
};

const renderEmptyState = ({ title, description, buttonLabel, buttonAction }) => `
    <section class="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            ${icon('M4 6.75A2.75 2.75 0 0 1 6.75 4h10.5A2.75 2.75 0 0 1 20 6.75v10.5A2.75 2.75 0 0 1 17.25 20H6.75A2.75 2.75 0 0 1 4 17.25V6.75Zm3.75 3.5h8.5m-8.5 3.5h8.5', 'h-6 w-6')}
        </div>
        <h2 class="mt-4 text-lg font-semibold text-slate-950">${escapeHtml(title)}</h2>
        <p class="mt-2 text-sm leading-6 text-slate-600">${escapeHtml(description)}</p>
        ${buttonLabel ? `<button type="button" data-action="${escapeHtml(buttonAction)}" class="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">${escapeHtml(buttonLabel)}</button>` : ''}
    </section>
`;

const renderSummaryCard = (label, value, note, valueClass = 'text-slate-950') => `
    <article class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p class="text-sm font-medium text-slate-500">${escapeHtml(label)}</p>
        <p class="mt-3 text-3xl font-semibold tracking-tight ${valueClass}">${escapeHtml(value)}</p>
        <p class="mt-2 text-sm text-slate-500">${escapeHtml(note)}</p>
    </article>
`;

const renderInfoPair = (label, value, valueClass = 'text-slate-950') => `
    <div class="rounded-2xl bg-slate-50 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">${escapeHtml(label)}</p>
        <p class="mt-2 text-sm font-semibold ${valueClass}">${escapeHtml(value)}</p>
    </div>
`;

const renderTabNav = (activeTab) => `
    <div class="flex flex-wrap gap-2">
        ${DETAIL_TABS.map((tab) => `
            <button
                type="button"
                data-tab="${escapeHtml(tab.value)}"
                class="inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold transition ${tab.value === activeTab ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}"
            >
                ${escapeHtml(tab.label)}
            </button>
        `).join('')}
    </div>
`;

const renderDirectoryEmployeeCard = ({ employee, summary, query, month }) => `
    <article class="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
        <button type="button" data-view-employee="${escapeHtml(employee.id)}" class="block w-full text-left">
            <div class="flex items-start justify-between gap-4">
                <div class="flex items-center gap-4">
                    ${renderAvatar(employee, 'h-12 w-12')}
                    <div>
                        <h2 class="text-lg font-semibold text-slate-950">${highlightMatch(employee.name, query)}</h2>
                        <p class="mt-1 text-sm text-slate-500">${highlightMatch(employee.employeeCode, query)} / ${highlightMatch(employee.department, query)}</p>
                        <p class="text-sm text-slate-500">${highlightMatch(employee.position, query)}</p>
                    </div>
                </div>
                ${renderStatusBadge(summary.attendanceStatus)}
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-2">
                ${renderInfoPair('Selected Month', getMonthLabel(month))}
                ${renderInfoPair('Monthly Salary', formatCurrency(summary.baseSalary, employee.salarySettings.currency))}
                ${renderInfoPair('Net Salary', formatCurrency(summary.finalSalary, employee.salarySettings.currency), 'text-emerald-700')}
                ${renderInfoPair('Required Hours', formatHours(summary.requiredMinutes))}
                ${renderInfoPair('Actual Hours', formatHours(summary.actualMinutes))}
                ${renderInfoPair('Total Deductions', formatCurrency(summary.totalDeductions, employee.salarySettings.currency), summary.totalDeductions > 0 ? 'text-rose-700' : 'text-slate-950')}
            </div>
        </button>

        <div class="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" data-view-employee="${escapeHtml(employee.id)}" class="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                View Employee Details
            </button>
            <button type="button" data-open-settings="${escapeHtml(employee.id)}" class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                Edit Settings
            </button>
        </div>
    </article>
`;

export const renderDirectoryView = ({ month, filters, visibleEmployees, hasMore, summaryCards, totalFilteredEmployees }) => `
    <div class="space-y-8">
        <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div class="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div class="max-w-3xl">
                    <p class="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Attendance Monitor</p>
                    <h1 class="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Employee Attendance & Payroll</h1>
                    <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                        Manage each employee with independent salary, schedule, holiday, leave, and deduction settings without affecting the rest of the system.
                    </p>
                </div>

                <div class="flex flex-col gap-3 sm:flex-row">
                    <label class="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <span class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Month & Year</span>
                        <input type="month" value="${escapeHtml(month)}" data-filter-month class="mt-2 block h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                    </label>
                    <button type="button" data-action="open-add-employee" class="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
                        Add Employee
                    </button>
                </div>
            </div>

            <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                ${summaryCards.map((card) => renderSummaryCard(card.label, card.value, card.note, card.valueClass)).join('')}
            </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
                <label class="block">
                    <span class="text-sm font-semibold text-slate-800">Search Employees</span>
                    <div class="relative mt-2">
                        <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                            ${icon('m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z')}
                        </span>
                        <input
                            type="search"
                            value="${escapeHtml(filters.query)}"
                            data-filter-query
                            placeholder="Search by employee name, ID, department, or position"
                            class="h-12 w-full rounded-2xl border border-slate-300 pr-11 pl-4 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        >
                    </div>
                </label>

                <label class="block">
                    <span class="text-sm font-semibold text-slate-800">Department</span>
                    <select data-filter-department class="mt-2 h-12 w-full rounded-2xl border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                        ${filters.departmentOptions.map((option) => `
                            <option value="${escapeHtml(option.value)}" ${option.value === filters.department ? 'selected' : ''}>${escapeHtml(option.label)}</option>
                        `).join('')}
                    </select>
                </label>

                <label class="block">
                    <span class="text-sm font-semibold text-slate-800">Setup Status</span>
                    <select data-filter-attendance class="mt-2 h-12 w-full rounded-2xl border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                        ${STATUS_FILTER_OPTIONS.map((option) => `
                            <option value="${escapeHtml(option.value)}" ${option.value === filters.attendance ? 'selected' : ''}>${escapeHtml(option.label)}</option>
                        `).join('')}
                    </select>
                </label>

                <div class="flex items-end">
                    <button type="button" data-action="clear-directory-filters" class="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                        Clear Filters
                    </button>
                </div>
            </div>

            <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <p class="text-sm text-slate-500">Found ${escapeHtml(formatInteger(totalFilteredEmployees))} employees for ${escapeHtml(getMonthLabel(month))}.</p>
                <p class="text-sm text-slate-500">Each card opens a dedicated profile page with that employee's own schedule, leave, and payroll settings.</p>
            </div>
        </section>

        ${visibleEmployees.length
            ? `
                <section class="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                    ${visibleEmployees.map((item) => renderDirectoryEmployeeCard(item)).join('')}
                </section>
                ${hasMore ? `
                    <div class="flex justify-center">
                        <button type="button" data-action="load-more" class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                            Load More Employees
                        </button>
                    </div>
                ` : ''}
            `
            : renderEmptyState({
                title: 'No employees match your search.',
                description: 'Try another name, another department, or change the setup-status filter.',
                buttonLabel: 'Clear Filters',
                buttonAction: 'clear-directory-filters',
            })}
    </div>
`;

const renderOverviewTab = (employee, summary) => `
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        ${renderSummaryCard('Required Workdays', formatInteger(summary.requiredWorkDays), 'Working days after excluding weekly off, holidays, and leave.')}
        ${renderSummaryCard('Required Hours', formatHours(summary.requiredMinutes), 'Calculated from the employee schedule day by day.')}
        ${renderSummaryCard('Actual Hours', formatHours(summary.actualMinutes), 'Attendance hours recorded by fingerprint or static entries this month.')}
        ${renderSummaryCard('Net Salary', formatCurrency(summary.finalSalary, employee.salarySettings.currency), 'Final salary after deductions and additions.', 'text-emerald-700')}
    </section>

    <section class="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <h2 class="text-xl font-semibold text-slate-950">Attendance Progress</h2>
                    <p class="mt-2 text-sm leading-6 text-slate-600">Monthly progress is calculated from this employee's work schedule.</p>
                </div>
                ${renderStatusBadge(summary.attendanceStatus)}
            </div>

            <div class="mt-6 rounded-3xl bg-slate-50 p-5">
                <div class="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p class="text-sm text-slate-500">Completion Rate</p>
                        <p class="mt-2 text-4xl font-semibold tracking-tight text-slate-950">${escapeHtml(formatPercentage(summary.completionPercentage))}</p>
                    </div>
                    <div class="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <p>Late Hours: <span class="font-semibold text-slate-900">${escapeHtml(formatHours(summary.lateMinutes))}</span></p>
                        <p>Early departure: <span class="font-semibold text-slate-900">${escapeHtml(formatHours(summary.earlyLeaveMinutes))}</span></p>
                        <p>Missing Hours: <span class="font-semibold text-rose-700">${escapeHtml(formatHours(summary.missingMinutes))}</span></p>
                        <p>Overtime: <span class="font-semibold text-emerald-700">${escapeHtml(formatHours(summary.overtimeMinutes))}</span></p>
                    </div>
                </div>
                <div class="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div class="h-full rounded-full bg-emerald-600 transition-all" style="width: ${Math.min(summary.completionPercentage, 100)}%"></div>
                </div>
            </div>
        </article>

        <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="text-xl font-semibold text-slate-950">Quick Salary Summary</h2>
            <p class="mt-2 text-sm leading-6 text-slate-600">This gives the manager a quick view of the core salary result before opening the full payroll tab.</p>

            <div class="mt-5 space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm">
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Base Salary</span>
                    <span class="font-semibold text-slate-950">${escapeHtml(formatCurrency(summary.salaryBreakdown.baseSalary, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Hourly Value</span>
                    <span class="font-semibold text-slate-950">${escapeHtml(formatCurrency(summary.salaryBreakdown.hourlyValue, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Additions</span>
                    <span class="font-semibold text-emerald-700">${escapeHtml(formatCurrency(summary.additions, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Total Deductions</span>
                    <span class="font-semibold text-rose-700">${escapeHtml(formatCurrency(summary.totalDeductions, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                    <span class="text-base font-semibold text-slate-950">Net Salary</span>
                    <span class="text-2xl font-semibold text-emerald-700">${escapeHtml(formatCurrency(summary.finalSalary, employee.salarySettings.currency))}</span>
                </div>
            </div>
        </article>
    </section>
`;

const renderDailyCard = ({ employee, record, expanded }) => `
    <article class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button type="button" data-toggle-day="${escapeHtml(record.id)}" class="flex w-full flex-col gap-4 p-4 text-left sm:flex-row sm:items-center sm:justify-between">
            <div>
                <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-base font-semibold text-slate-950">${escapeHtml(formatDateLabel(record.dateKey))}</h3>
                    ${renderStatusBadge(record.status)}
                </div>
                <p class="mt-1 text-sm text-slate-500">${escapeHtml(record.dayName)} / ${escapeHtml(record.scheduleLabel)}</p>
            </div>
            <div class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                    <p class="text-slate-500">Check-in Time</p>
                    <p class="mt-1 font-semibold text-slate-900">${escapeHtml(formatTime(record.actualCheckIn))}</p>
                </div>
                <div>
                    <p class="text-slate-500">Check-out Time</p>
                    <p class="mt-1 font-semibold text-slate-900">${escapeHtml(formatTime(record.actualCheckOut))}</p>
                </div>
                <div>
                    <p class="text-slate-500">Required Hours</p>
                    <p class="mt-1 font-semibold text-slate-900">${escapeHtml(formatHours(record.requiredMinutes))}</p>
                </div>
                <div>
                    <p class="text-slate-500">Day Deduction</p>
                    <p class="mt-1 font-semibold ${record.deductionDetails.totalDeduction > 0 ? 'text-rose-700' : 'text-slate-900'}">${escapeHtml(formatCurrency(record.deductionDetails.totalDeduction, employee.salarySettings.currency))}</p>
                </div>
            </div>
        </button>

        ${expanded ? `
            <div class="border-t border-slate-200 px-4 pb-4 pt-4">
                <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    ${renderInfoPair('Shift Start', formatTime(record.scheduleStart))}
                    ${renderInfoPair('Shift End', formatTime(record.scheduleEnd))}
                    ${renderInfoPair('Actual Hours', formatHours(record.actualMinutes))}
                    ${renderInfoPair('Lateness', formatHours(record.lateMinutes), record.lateMinutes > 0 ? 'text-amber-700' : 'text-slate-950')}
                    ${renderInfoPair('Early departure', formatHours(record.earlyLeaveMinutes), record.earlyLeaveMinutes > 0 ? 'text-rose-700' : 'text-slate-950')}
                    ${renderInfoPair('Short Work Hours', formatHours(record.shortWorkMinutes), record.shortWorkMinutes > 0 ? 'text-rose-700' : 'text-slate-950')}
                    ${renderInfoPair('Overtime', formatHours(record.overtimeMinutes), record.overtimeMinutes > 0 ? 'text-emerald-700' : 'text-slate-950')}
                    ${renderInfoPair('Missing Hours', formatHours(record.missingMinutes), record.missingMinutes > 0 ? 'text-rose-700' : 'text-slate-950')}
                </div>

                <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <h4 class="text-sm font-semibold text-slate-950">Day Deduction Formula</h4>
                        <p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Clear breakdown</p>
                    </div>
                    <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                            <p class="text-sm text-slate-500">Monthly Salary</p>
                            <p class="mt-1 font-semibold text-slate-900">${escapeHtml(formatCurrency(employee.salarySettings.monthlySalary, employee.salarySettings.currency))}</p>
                        </div>
                        <div>
                            <p class="text-sm text-slate-500">Hourly Value</p>
                            <p class="mt-1 font-semibold text-slate-900">${escapeHtml(formatCurrency(record.deductionDetails.hourlyValue, employee.salarySettings.currency))}</p>
                        </div>
                        <div>
                            <p class="text-sm text-slate-500">Rounded Late Minutes</p>
                            <p class="mt-1 font-semibold text-slate-900">${escapeHtml(String(record.deductionDetails.roundedLateMinutes))} min</p>
                        </div>
                        <div>
                            <p class="text-sm text-slate-500">Rounded Early Departure Minutes</p>
                            <p class="mt-1 font-semibold text-slate-900">${escapeHtml(String(record.deductionDetails.roundedEarlyLeaveMinutes))} min</p>
                        </div>
                        <div>
                            <p class="text-sm text-slate-500">Rounded Short Work Minutes</p>
                            <p class="mt-1 font-semibold text-slate-900">${escapeHtml(String(record.deductionDetails.roundedShortWorkMinutes))} min</p>
                        </div>
                        <div>
                            <p class="text-sm text-slate-500">Double Penalty Minutes</p>
                            <p class="mt-1 font-semibold text-slate-900">${escapeHtml(String(record.deductionDetails.doublePenaltyMinutes))} min</p>
                        </div>
                        <div>
                            <p class="text-sm text-slate-500">Addition Overtime</p>
                            <p class="mt-1 font-semibold text-emerald-700">${escapeHtml(formatCurrency(record.deductionDetails.overtimeAddition, employee.salarySettings.currency))}</p>
                        </div>
                    </div>
                    <p class="mt-4 text-sm leading-6 text-slate-600">
                        Day Deduction = Holiday Deduction ${escapeHtml(formatCurrency(record.deductionDetails.holidayDeduction, employee.salarySettings.currency))}
                        + Deduction Lateness ${escapeHtml(formatCurrency(record.deductionDetails.lateDeduction, employee.salarySettings.currency))}
                        + Deduction Early departure ${escapeHtml(formatCurrency(record.deductionDetails.earlyLeaveDeduction, employee.salarySettings.currency))}
                        + Deduction Short Work Hours ${escapeHtml(formatCurrency(record.deductionDetails.shortWorkDeduction, employee.salarySettings.currency))}
                        + Absence Deduction ${escapeHtml(formatCurrency(record.deductionDetails.absenceDeduction, employee.salarySettings.currency))}
                        + Unpaid Leave Deduction ${escapeHtml(formatCurrency(record.deductionDetails.unpaidLeaveDeduction, employee.salarySettings.currency))}
                        + Double penalty ${escapeHtml(formatCurrency(record.deductionDetails.doublePenaltyDeduction, employee.salarySettings.currency))}.
                    </p>
                </div>
            </div>
        ` : ''}
    </article>
`;

const renderMonthlyStatsTab = (employee, summary) => `
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        ${renderSummaryCard('Required Workdays', formatInteger(summary.requiredWorkDays), 'Calculated from the employee weekly schedule.')}
        ${renderSummaryCard('Weekly Off Days', formatInteger(summary.weeklyOffDays), 'Weekly non-working days inside the selected month.')}
        ${renderSummaryCard('Official Holidays', formatInteger(summary.holidayDays), 'Public or targeted holidays, treated as unpaid days.')}
        ${renderSummaryCard('Paid Leave Days', formatInteger(summary.paidLeaveDays), 'Paid leave is not counted as absence.')}
        ${renderSummaryCard('Unpaid Leave Days', formatInteger(summary.unpaidLeaveDays), 'Unpaid leave may reduce salary.')}
        ${renderSummaryCard('Required Hours', formatHours(summary.requiredMinutes), 'Based on the actual daily schedule.')}
        ${renderSummaryCard('Actual Hours', formatHours(summary.actualMinutes), 'Fingerprint hours or recorded static hours.')}
        ${renderSummaryCard('Missing Hours', formatHours(summary.missingMinutes), 'Includes lateness, early departure, and short work hours in the flexible 8-hour system.', 'text-rose-700')}
        ${renderSummaryCard('Late Hours', formatHours(summary.lateMinutes), 'Total lateness during the month.', 'text-amber-700')}
        ${renderSummaryCard('Hours Early departure', formatHours(summary.earlyLeaveMinutes), 'Total early departure time.', 'text-rose-700')}
        ${renderSummaryCard('Short Work Hours', formatHours(summary.shortWorkMinutes), 'Difference between actual hours and the required 8 hours in flexible mode.', 'text-rose-700')}
        ${renderSummaryCard('Hours Overtime', formatHours(summary.overtimeMinutes), 'Approved overtime only.', 'text-emerald-700')}
        ${renderSummaryCard('Absence days', formatInteger(summary.absentDays), 'Elapsed workdays only, with no attendance or approved leave, excluding holidays.', 'text-rose-700')}
        ${renderSummaryCard('Full Attendance Days', formatInteger(summary.fullAttendanceDays), 'Completed days with no missing time.', 'text-emerald-700')}
        ${renderSummaryCard('No Fingerprint Days', formatInteger(summary.noDataDays), 'A workday was expected but no valid fingerprint data was recorded.')}
        ${renderSummaryCard('Base Salary', formatCurrency(summary.baseSalary, employee.salarySettings.currency), 'Monthly salary before any deductions.')}
        ${renderSummaryCard('Net Salary', formatCurrency(summary.finalSalary, employee.salarySettings.currency), 'Final salary after deductions and additions.', 'text-emerald-700')}
    </section>
`;

const renderPayrollTab = (employee, summary) => `
    <section class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <h2 class="text-xl font-semibold text-slate-950">Salary Calculation Breakdown</h2>
                    <p class="mt-2 text-sm leading-6 text-slate-600">Every deduction here is based on this employee's own salary, leave, schedule, and monthly attendance settings.</p>
                </div>
                <div class="rounded-2xl bg-slate-50 px-3 py-2 text-left">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Deduction Method</p>
                    <p class="mt-1 text-sm font-semibold text-slate-950">${escapeHtml(deductionMethodLabel(employee.salarySettings.deductionMethod))}</p>
                </div>
            </div>

            <div class="mt-5 space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm">
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Base Salary</span>
                    <span class="font-semibold text-slate-950">${escapeHtml(formatCurrency(summary.salaryBreakdown.baseSalary, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Hourly Value</span>
                    <span class="font-semibold text-slate-950">${escapeHtml(formatCurrency(summary.salaryBreakdown.hourlyValue, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Official Holiday Deductions</span>
                    <span class="font-semibold text-rose-700">${escapeHtml(formatCurrency(summary.salaryBreakdown.holidayDeductions, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Late Deductions</span>
                    <span class="font-semibold text-rose-700">${escapeHtml(formatCurrency(summary.salaryBreakdown.lateDeductions, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Early Departure Deductions</span>
                    <span class="font-semibold text-rose-700">${escapeHtml(formatCurrency(summary.salaryBreakdown.earlyLeaveDeductions, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Short Work Deductions</span>
                    <span class="font-semibold text-rose-700">${escapeHtml(formatCurrency(summary.salaryBreakdown.shortWorkDeductions, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Absence Deductions</span>
                    <span class="font-semibold text-rose-700">${escapeHtml(formatCurrency(summary.salaryBreakdown.absenceDeductions, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Unpaid Leave Deductions</span>
                    <span class="font-semibold text-rose-700">${escapeHtml(formatCurrency(summary.salaryBreakdown.unpaidLeaveDeductions, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Double Penalty Increase</span>
                    <span class="font-semibold text-rose-700">${escapeHtml(formatCurrency(summary.salaryBreakdown.doublePenaltyAmount, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Overtime Additions</span>
                    <span class="font-semibold text-emerald-700">${escapeHtml(formatCurrency(summary.salaryBreakdown.overtimeAdditions, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Manual Additions</span>
                    <span class="font-semibold text-emerald-700">${escapeHtml(formatCurrency(summary.salaryBreakdown.manualAdditions, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-600">Manual Deductions</span>
                    <span class="font-semibold text-rose-700">${escapeHtml(formatCurrency(summary.salaryBreakdown.manualDeductions, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <span class="text-slate-700">Total Deductions</span>
                    <span class="font-semibold text-rose-700">${escapeHtml(formatCurrency(summary.salaryBreakdown.totalDeductions, employee.salarySettings.currency))}</span>
                </div>
                <div class="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                    <span class="text-base font-semibold text-slate-950">Net Salary</span>
                    <span class="text-2xl font-semibold text-emerald-700">${escapeHtml(formatCurrency(summary.salaryBreakdown.netSalary, employee.salarySettings.currency))}</span>
                </div>
            </div>
        </article>

        <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="text-xl font-semibold text-slate-950">Formula</h2>
            <p class="mt-2 text-sm leading-6 text-slate-600">This page shows the exact components used in net salary so the manager does not have to guess how deductions were applied.</p>
            <div class="mt-5 rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                <p>Net salary = base salary - official holiday deductions - lateness deductions - early departure deductions - missing work hour deductions - absence deductions - unpaid leave deductions - double penalty - manual deductions + overtime additions + manual additions</p>
            </div>
            <div class="mt-5 grid gap-3">
                ${renderInfoPair('Salary Currency', employee.salarySettings.currency)}
                ${renderInfoPair('Deduct by minute', enabledDisabledLabel(employee.deductionRules.calculateByMinute))}
                ${renderInfoPair('Rounding Method', roundingMethodLabel(employee.deductionRules.roundingMethod))}
                ${renderInfoPair('Double Penalty Threshold', `${escapeHtml(String(employee.deductionRules.doublePenaltyThresholdMinutes || 0))} min`)}
                ${renderInfoPair('Double penalty multiplier', `${escapeHtml(String(employee.deductionRules.doublePenaltyMultiplier || 1))}x`)}
                ${renderInfoPair('Maximum monthly deduction', employee.deductionRules.maximumMonthlyDeduction ? formatCurrency(employee.deductionRules.maximumMonthlyDeduction, employee.salarySettings.currency) : 'No maximum')}
            </div>
        </article>
    </section>
`;

const renderScheduleTab = (employee) => `
    <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 class="text-xl font-semibold text-slate-950">Employee Work Schedule</h2>
                <p class="mt-2 text-sm leading-6 text-slate-600">Each day is configured separately, with no shared default schedule forced on everyone.</p>
            </div>
            <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Weekly Off: <span class="font-semibold text-slate-950">${escapeHtml(getWeeklyOffLabel(employee))}</span>
            </div>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            ${DAY_CONFIGS.map((day) => {
                const schedule = employee.weeklySchedule?.[day.key];
                const enabled = Boolean(schedule?.isWorkingDay);

                return `
                    <article class="rounded-2xl border border-slate-200 ${enabled ? 'bg-white' : 'bg-slate-50'} p-4">
                        <div class="flex items-center justify-between gap-3">
                            <h3 class="text-base font-semibold text-slate-950">${escapeHtml(day.label)}</h3>
                            ${renderStatusBadge(enabled ? 'Working day' : 'Weekly off')}
                        </div>
                        <div class="mt-4 grid gap-3">
                            ${renderInfoPair('Start', enabled ? formatTime(schedule.startTime) : '-')}
                            ${renderInfoPair('End', enabled ? formatTime(schedule.endTime) : '-')}
                            ${renderInfoPair('Required Hours', enabled ? `${escapeHtml(String(schedule.requiredHours ?? 0))} h` : '-')}
                            ${renderInfoPair('Allow overtime', yesNoLabel(enabled && schedule.overtimeAllowed))}
                        </div>
                    </article>
                `;
            }).join('')}
        </div>
    </section>
`;

const renderHolidaysTab = (employee, summary) => `
    <section class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <h2 class="text-xl font-semibold text-slate-950">Official Holidays</h2>
                    <p class="mt-2 text-sm leading-6 text-slate-600">The weekly off is not counted as absence. Official holidays in this system are unpaid and reduce salary without being counted as absence.</p>
                </div>
                <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Holidays this month: <span class="font-semibold text-slate-950">${escapeHtml(String(summary.holidayDays))}</span>
                </div>
            </div>

            <div class="mt-5 space-y-3">
                ${(employee.holidays ?? []).length
                    ? employee.holidays.map((holiday) => `
                        <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div class="flex items-center justify-between gap-3">
                                <h3 class="text-base font-semibold text-slate-950">${escapeHtml(holiday.name)}</h3>
                                ${renderStatusBadge('Unpaid holiday')}
                            </div>
                            <p class="mt-2 text-sm text-slate-600">${escapeHtml(holiday.startDate)} to ${escapeHtml(holiday.endDate)}</p>
                            <p class="mt-2 text-sm text-slate-500">
                                Scope:
                                ${holiday.appliesToAll
                                    ? 'All employees'
                                    : (holiday.employeeIds?.length
                                        ? `Selected employees (${holiday.employeeIds.join(', ')})`
                                        : `Departments (${(holiday.departmentIds ?? []).join(', ') || 'None'})`)}
                            </p>
                        </article>
                    `).join('')
                    : `<p class="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No holiday rules are configured for this employee yet.</p>`}
            </div>
        </article>

        <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <h2 class="text-xl font-semibold text-slate-950">Employee Leave</h2>
                    <p class="mt-2 text-sm leading-6 text-slate-600">Paid leave is not recorded as absence, while unpaid leave may affect salary according to this employee's rules.</p>
                </div>
                <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Paid / Unpaid: <span class="font-semibold text-slate-950">${escapeHtml(String(summary.paidLeaveDays))} / ${escapeHtml(String(summary.unpaidLeaveDays))}</span>
                </div>
            </div>

            <div class="mt-5 space-y-3">
                ${(employee.leaves ?? []).length
                    ? employee.leaves.map((leave) => `
                        <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div class="flex items-center justify-between gap-3">
                                <h3 class="text-base font-semibold text-slate-950">${escapeHtml(leave.type)}</h3>
                                ${renderStatusBadge(leave.isPaid ? 'Paid leave' : 'Unpaid leave')}
                            </div>
                            <p class="mt-2 text-sm text-slate-600">${escapeHtml(leave.startDate)} to ${escapeHtml(leave.endDate)}</p>
                            <p class="mt-2 text-sm text-slate-500">${escapeHtml(leave.reason || 'No reason provided')}</p>
                            ${leave.notes ? `<p class="mt-2 text-sm text-slate-500">${escapeHtml(leave.notes)}</p>` : ''}
                        </article>
                    `).join('')
                    : `<p class="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No leave entries have been added for this employee yet.</p>`}
            </div>
        </article>
    </section>
`;

const renderSettingsSummaryTab = (employee) => `
    <section class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <h2 class="text-xl font-semibold text-slate-950">Salary Settings</h2>
                    <p class="mt-2 text-sm leading-6 text-slate-600">These values determine how missing time and overtime affect salary.</p>
                </div>
                <button type="button" data-open-settings="${escapeHtml(employee.id)}" class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                    Edit Employee Settings
                </button>
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-2">
                ${renderInfoPair('Monthly Salary', formatCurrency(employee.salarySettings.monthlySalary, employee.salarySettings.currency))}
                ${renderInfoPair('Currency', employee.salarySettings.currency)}
                ${renderInfoPair('Work Mode', hasFlexibleEightHourDay(employee) ? 'Flexible 8-hour day' : 'Based on daily schedule')}
                ${renderInfoPair('Deduction Method', deductionMethodLabel(employee.salarySettings.deductionMethod))}
                ${renderDeductionMethodSetting(employee.salarySettings)}
                ${renderInfoPair('Overtime Enabled', yesNoLabel(employee.overtimeSettings.enabled))}
            </div>
        </article>

        <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="text-xl font-semibold text-slate-950">Deduction Rules</h2>
            <p class="mt-2 text-sm leading-6 text-slate-600">Grace period, rounding, double penalty, and deduction caps are all configured per employee.</p>

            <div class="mt-5 grid gap-3 sm:grid-cols-2">
                ${renderInfoPair('Grace Period', `${escapeHtml(String(employee.deductionRules.gracePeriodMinutes || 0))} min`)}
                ${renderInfoPair('Deduct by minute', yesNoLabel(employee.deductionRules.calculateByMinute))}
                ${renderInfoPair('Rounding Method', roundingMethodLabel(employee.deductionRules.roundingMethod))}
                ${renderInfoPair('Double penalty', enabledDisabledLabel(employee.deductionRules.doublePenaltyEnabled))}
                ${renderInfoPair('Time Threshold', `${escapeHtml(String(employee.deductionRules.doublePenaltyThresholdMinutes || 0))} min`)}
                ${renderInfoPair('Multiplier', `${escapeHtml(String(employee.deductionRules.doublePenaltyMultiplier || 1))}x`)}
                ${renderInfoPair('Daily Limit', employee.deductionRules.maximumDailyDeduction ? formatCurrency(employee.deductionRules.maximumDailyDeduction, employee.salarySettings.currency) : 'No maximum')}
                ${renderInfoPair('Monthly Limit', employee.deductionRules.maximumMonthlyDeduction ? formatCurrency(employee.deductionRules.maximumMonthlyDeduction, employee.salarySettings.currency) : 'No maximum')}
            </div>
        </article>
    </section>
`;

export const renderDetailView = ({ employee, month, summary, activeTab, dayFilter, visibleRecords, expandedDays }) => {
    const tabContent = {
        overview: renderOverviewTab(employee, summary),
        daily: `
            <section class="space-y-5">
                <div class="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 class="text-xl font-semibold text-slate-950">Daily Attendance</h2>
                        <p class="mt-2 text-sm leading-6 text-slate-600">Daily cards replace the dense old table and keep the salary deduction formula visible for each day.</p>
                    </div>
                    <label class="block sm:min-w-60">
                        <span class="text-sm font-semibold text-slate-800">Day Filter</span>
                        <select data-filter-day class="mt-2 h-12 w-full rounded-2xl border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                            ${DAY_FILTER_OPTIONS.map((option) => `
                                <option value="${escapeHtml(option.value)}" ${option.value === dayFilter ? 'selected' : ''}>${escapeHtml(option.label)}</option>
                            `).join('')}
                        </select>
                    </label>
                </div>

                ${visibleRecords.length
                    ? `<div class="space-y-4">${visibleRecords.map((record) => renderDailyCard({
                        employee,
                        record,
                        expanded: expandedDays.has(record.id),
                    })).join('')}</div>`
                    : renderEmptyState({
                        title: 'No daily records match this filter.',
                        description: 'Change the filter to review more attendance events.',
                    })}
            </section>
        `,
        monthly: renderMonthlyStatsTab(employee, summary),
        payroll: renderPayrollTab(employee, summary),
        schedule: renderScheduleTab(employee),
        holidays: renderHolidaysTab(employee, summary),
        settings: renderSettingsSummaryTab(employee),
    }[activeTab] ?? renderOverviewTab(employee, summary);

    return `
        <div class="space-y-8">
            <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div class="flex items-start gap-4">
                        ${renderAvatar(employee, 'h-16 w-16')}
                        <div>
                            <button type="button" data-action="back-to-directory" class="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                                ${icon('m15.75 19.5-7.5-7.5 7.5-7.5', 'h-4 w-4')}
                                Back to employee directory
                            </button>
                            <h1 class="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">${escapeHtml(employee.name)}</h1>
                            <div class="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                <span>${escapeHtml(employee.employeeCode)}</span>
                                <span>•</span>
                                <span>${escapeHtml(employee.department)}</span>
                                <span>•</span>
                                <span>${escapeHtml(employee.position)}</span>
                                <span>•</span>
                                <span>${escapeHtml(employeeStatusLabel(employee.status))}</span>
                            </div>
                        </div>
                    </div>

                    <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[27rem]">
                        ${renderInfoPair('Monthly Salary', formatCurrency(employee.salarySettings.monthlySalary, employee.salarySettings.currency))}
                        ${renderInfoPair('Current Schedule', getWorkingScheduleLabel(employee))}
                        ${renderInfoPair('Selected Month', getMonthLabel(month))}
                        ${renderInfoPair('Weekly Off', getWeeklyOffLabel(employee))}
                    </div>
                </div>

                <div class="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    ${renderTabNav(activeTab)}
                    <div class="flex flex-col gap-3 sm:flex-row">
                        <label class="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <span class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Selected Month</span>
                            <input type="month" value="${escapeHtml(month)}" data-filter-month class="mt-2 block h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                        </label>
                        <button type="button" data-open-settings="${escapeHtml(employee.id)}" class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
                            Edit Employee Settings
                        </button>
                    </div>
                </div>
            </section>

            ${tabContent}
        </div>
    `;
};

const renderWizardErrors = (errors) => errors.length
    ? `
        <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            <p class="font-semibold">Please fix the following:</p>
            <ul class="mt-2 list-disc pl-5">
                ${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}
            </ul>
        </div>
    `
    : '';

const renderTextField = (label, path, value, type = 'text', extra = '') => `
    <label class="block">
        <span class="text-sm font-semibold text-slate-800">${escapeHtml(label)}</span>
        <input type="${escapeHtml(type)}" data-path="${escapeHtml(path)}" value="${escapeHtml(value ?? '')}" ${extra} class="mt-2 h-11 w-full rounded-2xl border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
    </label>
`;

const renderNumberField = (label, path, value, extra = '') => `
    <label class="block">
        <span class="text-sm font-semibold text-slate-800">${escapeHtml(label)}</span>
        <input type="number" data-path="${escapeHtml(path)}" data-input-type="number" value="${escapeHtml(value ?? '')}" ${extra} class="mt-2 h-11 w-full rounded-2xl border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
    </label>
`;

const renderCheckboxField = (label, path, checked, helper = '') => `
    <label class="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4">
        <span>
            <span class="block text-sm font-semibold text-slate-900">${escapeHtml(label)}</span>
            ${helper ? `<span class="mt-1 block text-sm text-slate-500">${escapeHtml(helper)}</span>` : ''}
        </span>
        <input type="checkbox" data-path="${escapeHtml(path)}" data-input-type="checkbox" ${checked ? 'checked' : ''} class="mt-1 h-5 w-5 rounded border-slate-300 text-slate-950 focus:ring-slate-400">
    </label>
`;

const renderSelectField = (label, path, value, options) => `
    <label class="block">
        <span class="text-sm font-semibold text-slate-800">${escapeHtml(label)}</span>
        <select data-path="${escapeHtml(path)}" class="mt-2 h-11 w-full rounded-2xl border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
            ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
        </select>
    </label>
`;

const renderImageUploadField = (label, path, value, employeeName = '') => `
    <div class="block">
        <span class="text-sm font-semibold text-slate-800">${escapeHtml(label)}</span>
        <div class="mt-2 rounded-2xl border border-slate-300 bg-white p-4">
            <div class="flex items-center gap-4">
                ${value
                    ? `<img src="${escapeHtml(value)}" alt="${escapeHtml(employeeName || 'Employee photo')}" class="h-16 w-16 rounded-2xl object-cover">`
                    : `<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-xs font-semibold text-slate-500">No image</div>`}
                <div class="flex flex-wrap gap-3">
                    <label class="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                        <input type="file" accept="image/*" data-path="${escapeHtml(path)}" data-input-type="image" class="sr-only">
                        <span>${value ? 'Change Image' : 'Add Image'}</span>
                    </label>
                    ${value ? `
                        <button type="button" data-action="remove-avatar" class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                            Delete Image
                        </button>
                    ` : ''}
                </div>
            </div>
            <p class="mt-3 text-sm text-slate-500">Choose an image from your device and it will be saved directly to the employee profile.</p>
        </div>
    </div>
`;

const renderPersonalStep = (draftEmployee) => `
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        ${renderTextField('Employee Name', 'name', draftEmployee.name)}
        ${renderTextField('Employee ID', 'employeeCode', draftEmployee.employeeCode)}
        ${renderTextField('Department', 'department', draftEmployee.department)}
        ${renderTextField('Position', 'position', draftEmployee.position)}
        ${renderImageUploadField('Photo', 'avatar', draftEmployee.avatar, draftEmployee.name)}
        ${renderSelectField('Employee Status', 'status', draftEmployee.status, [
            { value: 'Active', label: 'Active' },
            { value: 'Suspended', label: 'Suspended temporarily' },
            { value: 'Inactive', label: 'Inactive' },
        ])}
    </div>
`;

const renderSalaryStep = (draftEmployee) => `
    <div class="space-y-6">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            ${renderNumberField('Monthly Salary', 'salarySettings.monthlySalary', draftEmployee.salarySettings.monthlySalary, 'step="25" min="0"')}
            ${renderSelectField('Salary Currency', 'salarySettings.currency', draftEmployee.salarySettings.currency, [
                { value: 'EUR', label: 'EUR' },
                { value: 'USD', label: 'USD' },
                { value: 'SYP', label: 'SYP' },
            ])}
            ${renderSelectField('Deduction Method', 'salarySettings.deductionMethod', draftEmployee.salarySettings.deductionMethod, [
                { value: 'percentage_of_salary', label: 'Percentage of salary' },
                { value: 'fixed_per_hour', label: 'Fixed amount per hour' },
                { value: 'automatic_hourly_rate', label: 'Automatic from hourly work rate' },
            ])}
            ${draftEmployee.salarySettings.deductionMethod === 'fixed_per_hour'
                ? renderNumberField('Fixed hourly deduction', 'salarySettings.fixedHourlyDeduction', draftEmployee.salarySettings.fixedHourlyDeduction, 'step="0.25" min="0"')
                : ''}
            ${draftEmployee.salarySettings.deductionMethod === 'percentage_of_salary'
                ? renderNumberField('Deduction percentage per hour', 'salarySettings.percentageHourlyDeduction', draftEmployee.salarySettings.percentageHourlyDeduction, 'step="0.1" min="0"')
                : ''}
            ${renderNumberField('Overtime Hourly Rate', 'overtimeSettings.hourlyRate', draftEmployee.overtimeSettings.hourlyRate, 'step="0.25" min="0"')}
        </div>
        <div class="grid gap-4 md:grid-cols-2">
            ${renderCheckboxField('Enable overtime calculation', 'overtimeSettings.enabled', draftEmployee.overtimeSettings.enabled, 'When enabled, approved overtime is added to the final salary.')}
        </div>
    </div>
`;

const renderScheduleStep = (draftEmployee) => `
    <div class="space-y-4">
        ${DAY_CONFIGS.map((day) => {
            const schedule = draftEmployee.weeklySchedule?.[day.key];

            return `
                <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div class="xl:w-40">
                            <h3 class="text-base font-semibold text-slate-950">${escapeHtml(day.label)}</h3>
                            <p class="mt-1 text-sm text-slate-500">Configure this day independently.</p>
                        </div>
                        <div class="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                            ${renderCheckboxField('Working day', `weeklySchedule.${day.key}.isWorkingDay`, schedule.isWorkingDay).replace('rounded-2xl border border-slate-200 px-4 py-4', 'rounded-2xl border border-slate-200 bg-white px-4 py-3 xl:col-span-1')}
                            ${renderTextField('Start Time', `weeklySchedule.${day.key}.startTime`, schedule.startTime, 'time')}
                            ${renderTextField('End Time', `weeklySchedule.${day.key}.endTime`, schedule.endTime, 'time')}
                            ${renderNumberField('Required Hours', `weeklySchedule.${day.key}.requiredHours`, schedule.requiredHours, 'step="0.25" min="0"')}
                            ${renderCheckboxField('Allow overtime', `weeklySchedule.${day.key}.overtimeAllowed`, schedule.overtimeAllowed).replace('rounded-2xl border border-slate-200 px-4 py-4', 'rounded-2xl border border-slate-200 bg-white px-4 py-3')}
                        </div>
                    </div>
                </article>
            `;
        }).join('')}
    </div>
`;

const renderHolidayScope = (holiday, index) => `
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        ${renderTextField('Holiday Name', `holidays.${index}.name`, holiday.name)}
        ${renderTextField('Start Date', `holidays.${index}.startDate`, holiday.startDate, 'date')}
        ${renderTextField('End Date', `holidays.${index}.endDate`, holiday.endDate, 'date')}
        ${renderSelectField('Scope', `holidays.${index}.targetScope`, holiday.targetScope || 'current_employee', [
            { value: 'all', label: 'All employees' },
            { value: 'current_employee', label: 'Current employee only' },
            { value: 'current_department', label: 'Current department' },
        ])}
    </div>
`;

const renderHolidaysStep = (draftEmployee) => `
    <div class="space-y-6">
        <section class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <h3 class="text-lg font-semibold text-slate-950">Official Holidays</h3>
                    <p class="mt-1 text-sm text-slate-600">Apply holidays to all employees, the current department, or this employee only. Holidays here are always unpaid.</p>
                </div>
                <button type="button" data-action="add-holiday" class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                    Add Holiday
                </button>
            </div>

            <div class="mt-4 space-y-4">
                ${(draftEmployee.holidays ?? []).length
                    ? draftEmployee.holidays.map((holiday, index) => `
                        <article class="rounded-2xl border border-slate-200 bg-white p-4">
                            <div class="flex items-center justify-between gap-3">
                                <h4 class="text-sm font-semibold text-slate-950">Holiday ${index + 1}</h4>
                                <button type="button" data-action="remove-holiday" data-index="${index}" class="text-sm font-semibold text-rose-600">Delete</button>
                            </div>
                            <div class="mt-4 space-y-4">
                                ${renderHolidayScope(holiday, index)}
                            </div>
                        </article>
                    `).join('')
                    : `<p class="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No official holidays are configured for this employee yet.</p>`}
            </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <h3 class="text-lg font-semibold text-slate-950">Employee Leave</h3>
                    <p class="mt-1 text-sm text-slate-600">Add paid or unpaid leave without treating it as absence.</p>
                </div>
                <button type="button" data-action="add-leave" class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                    Add Leave
                </button>
            </div>

            <div class="mt-4 space-y-4">
                ${(draftEmployee.leaves ?? []).length
                    ? draftEmployee.leaves.map((leave, index) => `
                        <article class="rounded-2xl border border-slate-200 bg-white p-4">
                            <div class="flex items-center justify-between gap-3">
                                <h4 class="text-sm font-semibold text-slate-950">Leave ${index + 1}</h4>
                                <button type="button" data-action="remove-leave" data-index="${index}" class="text-sm font-semibold text-rose-600">Delete</button>
                            </div>
                            <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                ${renderSelectField('Leave Type', `leaves.${index}.type`, leave.type, [
                                    { value: 'Annual leave', label: 'Annual leave' },
                                    { value: 'Sick leave', label: 'Sick leave' },
                                    { value: 'Unpaid leave', label: 'Unpaid leave' },
                                    { value: 'Official holiday', label: 'Official holiday' },
                                    { value: 'Administrative leave', label: 'Administrative leave' },
                                    { value: 'Custom leave', label: 'Custom leave' },
                                ])}
                                ${renderTextField('Start Date', `leaves.${index}.startDate`, leave.startDate, 'date')}
                                ${renderTextField('End Date', `leaves.${index}.endDate`, leave.endDate, 'date')}
                                ${renderCheckboxField('Paid leave', `leaves.${index}.isPaid`, leave.isPaid)}
                                ${renderTextField('Reason', `leaves.${index}.reason`, leave.reason)}
                                ${renderTextField('Notes', `leaves.${index}.notes`, leave.notes)}
                            </div>
                        </article>
                    `).join('')
                    : `<p class="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No leave entries configured yet.</p>`}
            </div>
        </section>
    </div>
`;

const renderRulesStep = (draftEmployee) => `
    <div class="space-y-6">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            ${renderNumberField('Grace minutes', 'deductionRules.gracePeriodMinutes', draftEmployee.deductionRules.gracePeriodMinutes, 'step="1" min="0"')}
            ${renderSelectField('Rounding Method', 'deductionRules.roundingMethod', draftEmployee.deductionRules.roundingMethod, [
                { value: 'none', label: 'No rounding' },
                { value: 'nearest_15', label: 'Nearest 15 minutes' },
                { value: 'nearest_30', label: 'Nearest 30 minutes' },
                { value: 'nearest_hour', label: 'Nearest full hour' },
            ])}
            ${renderNumberField('Double penalty threshold (min)', 'deductionRules.doublePenaltyThresholdMinutes', draftEmployee.deductionRules.doublePenaltyThresholdMinutes, 'step="5" min="0"')}
            ${renderNumberField('Double penalty multiplier', 'deductionRules.doublePenaltyMultiplier', draftEmployee.deductionRules.doublePenaltyMultiplier, 'step="0.5" min="1"')}
            ${renderNumberField('Maximum daily deduction', 'deductionRules.maximumDailyDeduction', draftEmployee.deductionRules.maximumDailyDeduction, 'step="1" min="0"')}
            ${renderNumberField('Maximum monthly deduction', 'deductionRules.maximumMonthlyDeduction', draftEmployee.deductionRules.maximumMonthlyDeduction, 'step="1" min="0"')}
        </div>

        <div class="grid gap-4 md:grid-cols-2">
            ${renderCheckboxField('Deduct by minute', 'deductionRules.calculateByMinute', draftEmployee.deductionRules.calculateByMinute, 'When disabled, the selected rounding method controls the deducted time block.')}
            ${renderCheckboxField('Enable double penalty', 'deductionRules.doublePenaltyEnabled', draftEmployee.deductionRules.doublePenaltyEnabled, 'Add an extra multiplier when missing time exceeds the configured threshold.')}
        </div>

        <section class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <h3 class="text-lg font-semibold text-slate-950">Manual adjustments</h3>
                    <p class="mt-1 text-sm text-slate-600">Add manual additions or deductions that should affect the final salary.</p>
                </div>
                <button type="button" data-action="add-adjustment" class="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                    Add Adjustment
                </button>
            </div>

            <div class="mt-4 space-y-4">
                ${(draftEmployee.manualAdjustments ?? []).length
                    ? draftEmployee.manualAdjustments.map((adjustment, index) => `
                        <article class="rounded-2xl border border-slate-200 bg-white p-4">
                            <div class="flex items-center justify-between gap-3">
                                <h4 class="text-sm font-semibold text-slate-950">Adjustment ${index + 1}</h4>
                                <button type="button" data-action="remove-adjustment" data-index="${index}" class="text-sm font-semibold text-rose-600">Delete</button>
                            </div>
                            <div class="mt-4 grid gap-4 md:grid-cols-3">
                                ${renderTextField('Description', `manualAdjustments.${index}.label`, adjustment.label)}
                                ${renderNumberField('Amount', `manualAdjustments.${index}.amount`, adjustment.amount, 'step="0.25" min="0"')}
                                ${renderSelectField('Type', `manualAdjustments.${index}.kind`, adjustment.kind, [
                                    { value: 'addition', label: 'Addition' },
                                    { value: 'deduction', label: 'Deduction' },
                                ])}
                            </div>
                        </article>
                    `).join('')
                    : `<p class="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No manual adjustments added yet.</p>`}
            </div>
        </section>
    </div>
`;

const renderReviewStep = (draftEmployee, reviewSummary) => `
    <div class="space-y-6">
        <section class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 class="text-lg font-semibold text-slate-950">Review before saving</h3>
            <p class="mt-1 text-sm text-slate-600">This summary gives the manager a final review before saving the employee profile.</p>

            <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                ${renderInfoPair('Employee', draftEmployee.name || 'Not entered')}
                ${renderInfoPair('Employee ID', draftEmployee.employeeCode || 'Not entered')}
                ${renderInfoPair('Department', draftEmployee.department || 'Not entered')}
                ${renderInfoPair('Monthly Salary', draftEmployee.salarySettings.monthlySalary ? formatCurrency(draftEmployee.salarySettings.monthlySalary, draftEmployee.salarySettings.currency) : 'Not set')}
                ${renderInfoPair('Weekly working days', `${escapeHtml(String(reviewSummary.weeklyWorkDays))} day`)}
                ${renderInfoPair('Required weekly hours', `${escapeHtml(String(reviewSummary.weeklyHours))} h`)}
                ${renderInfoPair('Weekly Off', reviewSummary.weeklyOffLabel || 'None')}
                ${renderInfoPair('Work Mode', hasFlexibleEightHourDay(draftEmployee) ? 'Flexible 8-hour day' : 'Based on daily schedule')}
                ${renderInfoPair('Deduction Method', deductionMethodLabel(draftEmployee.salarySettings.deductionMethod))}
                ${renderDeductionMethodSetting(draftEmployee.salarySettings)}
                ${renderInfoPair('Double penalty', draftEmployee.deductionRules.doublePenaltyEnabled ? `${escapeHtml(String(draftEmployee.deductionRules.doublePenaltyMultiplier))}x after ${escapeHtml(String(draftEmployee.deductionRules.doublePenaltyThresholdMinutes))} min` : 'Disabled')}
            </div>
        </section>
    </div>
`;

export const renderSettingsModal = ({ draftEmployee, mode, stepIndex, errors, reviewSummary }) => `
    <div data-settings-modal-scroll class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8">
        <div class="w-full max-w-6xl rounded-3xl bg-white shadow-2xl">
            <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                <div>
                    <p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">${mode === 'add' ? 'Add Employee' : 'Edit Employee'}</p>
                    <h2 class="mt-2 text-2xl font-semibold text-slate-950">${escapeHtml(draftEmployee.name || 'Employee setup wizard')}</h2>
                    <p class="mt-2 text-sm text-slate-600">Each employee should keep independent salary, schedule, holiday, leave, and deduction-rule settings.</p>
                </div>
                <button type="button" data-action="wizard-close" class="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50">
                    ${icon('M6 18 18 6M6 6l12 12')}
                </button>
            </div>

            <div class="border-b border-slate-200 px-6 py-4">
                <div class="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                    ${WIZARD_STEPS.map((step, index) => `
                        <div class="rounded-2xl border px-4 py-3 ${index === stepIndex ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}">
                            <p class="text-xs font-semibold uppercase tracking-[0.18em] ${index === stepIndex ? 'text-slate-200' : 'text-slate-500'}">Step ${index + 1}</p>
                            <p class="mt-1 text-sm font-semibold">${escapeHtml(step.label)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="space-y-6 px-6 py-6">
                ${renderWizardErrors(errors)}
                ${[
                    renderPersonalStep(draftEmployee),
                    renderSalaryStep(draftEmployee),
                    renderScheduleStep(draftEmployee),
                    renderHolidaysStep(draftEmployee),
                    renderRulesStep(draftEmployee),
                    renderReviewStep(draftEmployee, reviewSummary),
                ][stepIndex]}
            </div>

            <div class="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <p class="text-sm text-slate-500">Saving requires a salary, at least one working day, valid times, and a selected deduction method.</p>
                <div class="flex flex-col gap-3 sm:flex-row">
                    <button type="button" data-action="wizard-close" class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                        Cancel
                    </button>
                    ${stepIndex > 0 ? `
                        <button type="button" data-action="wizard-prev" class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                            Previous
                        </button>
                    ` : ''}
                    ${stepIndex < WIZARD_STEPS.length - 1 ? `
                        <button type="button" data-action="wizard-next" class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
                            Next
                        </button>
                    ` : `
                        <button type="button" data-action="wizard-save" class="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
                            Save Employee
                        </button>
                    `}
                </div>
            </div>
        </div>
    </div>
`;

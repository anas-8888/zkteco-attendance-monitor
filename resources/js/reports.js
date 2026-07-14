import './bootstrap';

const reportsPage = document.querySelector('[data-reports-page]');

if (reportsPage) {
    const englishLocale = 'en-US';
    const preselectedEmployeeId = reportsPage.getAttribute('data-selected-employee-id') ?? '';
    const elements = {
        form: reportsPage.querySelector('[data-report-form]'),
        user: reportsPage.querySelector('[data-report-user]'),
        fromDate: reportsPage.querySelector('[data-report-from-date]'),
        toDate: reportsPage.querySelector('[data-report-to-date]'),
        submit: reportsPage.querySelector('[data-report-submit]'),
        status: reportsPage.querySelector('[data-report-status]'),
        content: reportsPage.querySelector('[data-report-content]'),
        workingHoursSummary: reportsPage.querySelector('[data-working-hours-summary]'),
        workingHoursOpenButton: reportsPage.querySelector('[data-working-hours-open]'),
        workingHoursModal: reportsPage.querySelector('[data-working-hours-modal]'),
        workingHoursCloseButtons: reportsPage.querySelectorAll('[data-working-hours-close]'),
        workingHoursForm: reportsPage.querySelector('[data-working-hours-form]'),
        workingHoursEmployee: reportsPage.querySelector('[data-working-hours-employee]'),
        workingHoursStart: reportsPage.querySelector('[data-working-hours-start]'),
        workingHoursEnd: reportsPage.querySelector('[data-working-hours-end]'),
        workingHoursResult: reportsPage.querySelector('[data-working-hours-result]'),
        workingHoursSubmit: reportsPage.querySelector('[data-working-hours-submit]'),
        workingHoursReset: reportsPage.querySelector('[data-working-hours-reset]'),
    };
    const defaultWorkingHours = {
        start: '10:00',
        end: '18:00',
        off_days: [0],
    };
    let workingHoursRequestInFlight = false;
    let allEmployees = [];

    const selectedEmployeeId = () => elements.user?.value ?? '';
    const isEmployeeReportMode = () => selectedEmployeeId() !== '';

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const formatDate = (value) => new Intl.DateTimeFormat(englishLocale, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    }).format(new Date(value));

    const formatClockTime = (value) => {
        const normalized = String(value ?? '').trim();

        if (!normalized || normalized === '--') {
            return '--';
        }

        const match = normalized.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);

        if (!match) {
            return normalized;
        }

        const [, hours, minutes, seconds = '00'] = match;
        const date = new Date(2000, 0, 1, Number(hours), Number(minutes), Number(seconds));

        return new Intl.DateTimeFormat(englishLocale, {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(date);
    };

    const stateBadgeClass = (state) => {
        switch (state) {
            case 'check_in':
                return 'border-emerald-200 bg-emerald-50 text-emerald-700';
            case 'check_out':
                return 'border-rose-200 bg-rose-50 text-rose-700';
            case 'overtime_in':
                return 'border-amber-200 bg-amber-50 text-amber-800';
            case 'overtime_out':
                return 'border-sky-200 bg-sky-50 text-sky-700';
            case 'break_in':
                return 'border-indigo-200 bg-indigo-50 text-indigo-700';
            case 'break_out':
                return 'border-violet-200 bg-violet-50 text-violet-700';
            default:
                return 'border-slate-200 bg-slate-100 text-slate-700';
        }
    };

    const sessionTypeBadgeClass = (sessionType) => sessionType === 'overtime'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : (sessionType === 'absence'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700');

    const getTodayDateString = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    };

    const getMonthStartDateString = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        return `${year}-${month}-01`;
    };

    const isValidDateRange = (fromDate, toDate) => {
        if (!fromDate || !toDate) {
            return false;
        }

        return new Date(`${fromDate}T00:00:00`).getTime() <= new Date(`${toDate}T00:00:00`).getTime();
    };

    const setStatusMessage = (message = '', tone = 'zinc') => {
        if (!elements.status) {
            return;
        }

        if (!message) {
            elements.status.innerHTML = '';
            return;
        }

        const toneClasses = {
            zinc: 'alert-success border-slate-200 bg-slate-50 text-slate-700',
            rose: 'alert-error',
        };

        elements.status.innerHTML = `
            <div class="${toneClasses[tone] || toneClasses.zinc}">
                ${escapeHtml(message)}
            </div>
        `;
    };

    const getSelectedEmployeeOption = () => elements.user?.selectedOptions?.[0] ?? null;
    const collectEmployeesFromOptions = () => Array.from(elements.user?.options ?? [])
        .filter((option) => option.value)
        .map((option) => ({
            device_user_id: option.value,
            name: option.textContent.replace(/\s*\([^)]*\)\s*$/, ''),
            working_hours: {
                start_time: option.dataset.workStart || defaultWorkingHours.start,
                end_time: option.dataset.workEnd || defaultWorkingHours.end,
            },
        }));

    const updateWorkingHoursSummary = () => {
        if (!elements.workingHoursSummary) {
            return;
        }

        const selectedOption = getSelectedEmployeeOption();
        const customizeButton = elements.workingHoursOpenButton;

        if (!selectedOption || !selectedOption.value) {
            elements.workingHoursSummary.textContent = `Viewing all employees with default working hours ${formatClockTime(defaultWorkingHours.start)} - ${formatClockTime(defaultWorkingHours.end)}`;
            if (customizeButton) {
                customizeButton.disabled = true;
                customizeButton.classList.add('opacity-60', 'cursor-not-allowed');
            }
            return;
        }

        const start = selectedOption.dataset.workStart || defaultWorkingHours.start;
        const end = selectedOption.dataset.workEnd || defaultWorkingHours.end;
        const hasCustomHours = selectedOption.dataset.hasCustomHours === 'true';

        if (customizeButton) {
            customizeButton.disabled = false;
            customizeButton.classList.remove('opacity-60', 'cursor-not-allowed');
        }

        elements.workingHoursSummary.textContent = hasCustomHours
            ? `Custom working hours for this employee: ${formatClockTime(start)} - ${formatClockTime(end)}`
            : `This employee uses the default working hours: ${formatClockTime(start)} - ${formatClockTime(end)}`;
    };

    const formatAttendanceDuration = (checkInAt, checkOutAt) => {
        if (!checkInAt || !checkOutAt) {
            return '--';
        }

        const durationMs = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime();

        if (!Number.isFinite(durationMs) || durationMs <= 0) {
            return '--';
        }

        const totalMinutes = Math.floor(durationMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0 && minutes > 0) {
            return `${hours}h ${minutes}m`;
        }

        if (hours > 0) {
            return `${hours}h`;
        }

        return `${minutes}m`;
    };

    const parseTimeToMinutes = (value) => {
        const normalized = String(value ?? '').trim();

        if (!/^\d{2}:\d{2}(:\d{2})?$/.test(normalized)) {
            return null;
        }

        const [hours, minutes] = normalized.split(':').map(Number);

        if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
            return null;
        }

        return (hours * 60) + minutes;
    };

    const formatMinutesDuration = (totalMinutes) => {
        if (!Number.isFinite(totalMinutes)) {
            return '--';
        }

        if (totalMinutes <= 0) {
            return '0m';
        }

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0 && minutes > 0) {
            return `${hours}h ${minutes}m`;
        }

        if (hours > 0) {
            return `${hours}h`;
        }

        return `${minutes}m`;
    };

    const normalizeOffDays = (value) => Array.isArray(value)
        ? value
            .map((day) => Number.parseInt(day, 10))
            .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        : [];

    const isOffDay = (dateValue, hours = defaultWorkingHours) => {
        if (!dateValue) {
            return false;
        }

        const offDays = normalizeOffDays(hours?.off_days);

        if (!offDays.length) {
            return false;
        }

        return offDays.includes(new Date(`${dateValue}T00:00:00`).getDay());
    };

    const resolveEmployeeWorkingHours = (deviceUserId) => {
        const employee = allEmployees.find((item) => item.device_user_id === deviceUserId);

        return employee?.working_hours ?? {
            start_time: defaultWorkingHours.start,
            end_time: defaultWorkingHours.end,
            off_days: defaultWorkingHours.off_days,
        };
    };

    const calculateEmployeeLateDuration = (deviceUserId, checkInTime, attendanceDate = '') => {
        const employeeWorkingHours = resolveEmployeeWorkingHours(deviceUserId);

        if (attendanceDate && isOffDay(attendanceDate, employeeWorkingHours)) {
            return '0m';
        }

        const workStartMinutes = parseTimeToMinutes(employeeWorkingHours.start_time);
        const checkInMinutes = parseTimeToMinutes(checkInTime);

        if (workStartMinutes === null || checkInMinutes === null) {
            return '--';
        }

        return formatMinutesDuration(Math.max(checkInMinutes - workStartMinutes, 0));
    };

    const renderWorkingHoursMessage = (message, tone = 'zinc') => {
        if (!elements.workingHoursResult) {
            return;
        }

        const toneClasses = {
            zinc: 'text-slate-500',
            rose: 'text-rose-600',
            emerald: 'text-emerald-700',
        };

        elements.workingHoursResult.innerHTML = `
            <p class="text-sm ${toneClasses[tone] || toneClasses.zinc}">${escapeHtml(message)}</p>
        `;
    };

    const hydrateWorkingHoursModalFromSelection = () => {
        const selectedOption = getSelectedEmployeeOption();

        if (!selectedOption || !selectedOption.value) {
            if (elements.workingHoursEmployee) {
                elements.workingHoursEmployee.value = '';
            }

            if (elements.workingHoursStart) {
                elements.workingHoursStart.value = defaultWorkingHours.start;
            }

            if (elements.workingHoursEnd) {
                elements.workingHoursEnd.value = defaultWorkingHours.end;
            }

            renderWorkingHoursMessage('Choose an employee from the report form first.', 'rose');
            return false;
        }

        if (elements.workingHoursEmployee) {
            elements.workingHoursEmployee.value = selectedOption.textContent.trim();
        }

        if (elements.workingHoursStart) {
            elements.workingHoursStart.value = selectedOption.dataset.workStart || defaultWorkingHours.start;
        }

        if (elements.workingHoursEnd) {
            elements.workingHoursEnd.value = selectedOption.dataset.workEnd || defaultWorkingHours.end;
        }

        renderWorkingHoursMessage('Change the hours for this employee, or reset them to use the default schedule again.');
        return true;
    };

    const openWorkingHoursModal = () => {
        if (!hydrateWorkingHoursModalFromSelection()) {
            return;
        }

        elements.workingHoursModal?.classList.remove('hidden');
        elements.workingHoursModal?.classList.add('flex');
        elements.workingHoursModal?.setAttribute('aria-hidden', 'false');
        elements.workingHoursStart?.focus();
    };

    const closeWorkingHoursModal = () => {
        elements.workingHoursModal?.classList.add('hidden');
        elements.workingHoursModal?.classList.remove('flex');
        elements.workingHoursModal?.setAttribute('aria-hidden', 'true');
    };

    const updateSelectedOptionWorkingHours = (start, end, hasCustomHours) => {
        const selectedOption = getSelectedEmployeeOption();

        if (!selectedOption || !selectedOption.value) {
            return;
        }

        selectedOption.dataset.workStart = start;
        selectedOption.dataset.workEnd = end;
        selectedOption.dataset.hasCustomHours = hasCustomHours ? 'true' : 'false';
        updateWorkingHoursSummary();
    };

    const renderPlaceholder = () => {
        elements.content.innerHTML = `
            <section class="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
                <h2 class="text-lg font-semibold text-slate-950">No report loaded</h2>
                <p class="mt-2 text-sm text-slate-600">${escapeHtml(isEmployeeReportMode() ? 'Choose a date range to generate this employee report.' : 'Choose a date range to load the all-employees attendance report.')}</p>
            </section>
        `;
    };

    const renderLoading = () => {
        elements.content.innerHTML = `
            <section class="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
                <h2 class="text-lg font-semibold text-slate-950">Loading report...</h2>
                <p class="mt-2 text-sm text-slate-600">${escapeHtml(isEmployeeReportMode() ? 'Fetching attendance sessions and attendance duration for the selected range.' : 'Fetching all employee attendance for the selected range.')}</p>
            </section>
        `;
    };

    const renderReport = (payload) => {
        const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
        const records = Array.isArray(payload.records) ? payload.records : [];
        const totals = payload.totals ?? {};
        const summary = payload.summary ?? {};
        const employee = payload.employee ?? {};
        const workingHours = payload.working_hours ?? {};
        defaultWorkingHours.off_days = normalizeOffDays(workingHours.off_days ?? defaultWorkingHours.off_days);

        elements.content.innerHTML = `
            <div class="space-y-6">
                <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <article class="metric">
                        <p class="text-sm text-slate-500">Employee</p>
                        <p class="mt-3 text-2xl font-semibold text-slate-950">${escapeHtml(employee.name ?? '--')}</p>
                        <p class="mt-1 text-sm text-slate-500">${escapeHtml(employee.device_user_id ?? '--')}</p>
                    </article>
                    <article class="metric">
                        <p class="text-sm text-slate-500">Total Sessions</p>
                        <p class="mt-3 text-2xl font-semibold text-slate-950">${escapeHtml(String(totals.session_count ?? 0))}</p>
                    </article>
                    <article class="metric">
                        <p class="text-sm text-slate-500">Completed Sessions</p>
                        <p class="mt-3 text-2xl font-semibold text-slate-950">${escapeHtml(String(totals.completed_session_count ?? 0))}</p>
                    </article>
                    <article class="metric">
                        <p class="text-sm text-slate-500">Total Attendance</p>
                        <p class="mt-3 text-2xl font-semibold text-slate-950">${escapeHtml(summary.total_duration_human ?? '0m')}</p>
                    </article>
                    <article class="metric">
                        <p class="text-sm text-slate-500">Total Late Check-in</p>
                        <p class="mt-3 text-2xl font-semibold text-amber-700">${escapeHtml(summary.late_duration_human ?? '0m')}</p>
                    </article>
                    <article class="metric">
                        <p class="text-sm text-slate-500">Raw Records</p>
                        <p class="mt-3 text-2xl font-semibold text-slate-950">${escapeHtml(String(totals.record_count ?? 0))}</p>
                    </article>
                </section>

                <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <article class="metric">
                        <p class="text-sm text-slate-500">Date Range</p>
                        <p class="mt-3 text-base font-semibold text-slate-950">${escapeHtml(formatDate(payload.from_date))} - ${escapeHtml(formatDate(payload.to_date))}</p>
                        <p class="mt-1 text-sm text-slate-500">Working hours: ${escapeHtml(formatClockTime(workingHours.start_time ?? '10:00'))} - ${escapeHtml(formatClockTime(workingHours.end_time ?? '18:00'))}</p>
                    </article>
                    <article class="metric">
                        <p class="text-sm text-slate-500">Regular Duration</p>
                        <p class="mt-3 text-2xl font-semibold text-slate-950">${escapeHtml(summary.normal_duration_human ?? '0m')}</p>
                    </article>
                    <article class="metric">
                        <p class="text-sm text-slate-500">Overtime Duration</p>
                        <p class="mt-3 text-2xl font-semibold text-slate-950">${escapeHtml(summary.overtime_duration_human ?? '0m')}</p>
                    </article>
                </section>

                <section class="table-wrap">
                    <div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <h2 class="text-sm font-semibold text-slate-950">Attendance Sessions</h2>
                        <p class="mt-1 text-sm text-slate-600">Each row shows an attendance result for the selected range, including absent days with no check-in or check-out punches.</p>
                    </div>
                    <table class="data-table">
                        <thead class="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                            <tr>
                                <th class="px-4 py-3">Date</th>
                                <th class="px-4 py-3">Type</th>
                                <th class="px-4 py-3">Check-in</th>
                                <th class="px-4 py-3">Check-out</th>
                                <th class="px-4 py-3">Duration</th>
                                <th class="px-4 py-3">Late Check-in</th>
                                <th class="px-4 py-3">Method</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${sessions.length
                                ? sessions.map((session) => `
                                    <tr class="${session.is_absent ? 'bg-rose-50/40' : 'bg-white'}">
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(session.attendance_date ? formatDate(session.attendance_date) : '--')}</td>
                                        <td class="whitespace-nowrap px-4 py-3">
                                            <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${sessionTypeBadgeClass(session.session_type)}">
                                                ${escapeHtml(session.session_type_label ?? 'Attendance')}
                                            </span>
                                        </td>
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(session.is_absent ? 'No check-in' : formatClockTime(session.check_in_time))}</td>
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(session.is_absent ? 'No check-out' : (session.is_in_progress ? 'In progress' : formatClockTime(session.check_out_time)))}</td>
                                        <td class="whitespace-nowrap px-4 py-3 font-medium text-slate-950">${escapeHtml(session.duration_human ?? '--')}</td>
                                        <td class="whitespace-nowrap px-4 py-3 font-medium ${(session.late_human ?? '--') !== '--' && (session.late_human ?? '0m') !== '0m' ? 'text-amber-700' : 'text-slate-700'}">${escapeHtml(session.late_human ?? '--')}</td>
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(session.is_absent ? 'No punches' : (session.method ?? 'Unknown'))}</td>
                                    </tr>
                                `).join('')
                                : `
                                    <tr class="bg-white">
                                        <td colspan="7" class="px-4 py-6 text-sm text-slate-500">No attendance sessions found for this range.</td>
                                    </tr>
                                `}
                        </tbody>
                    </table>
                </section>

                <section class="table-wrap">
                    <div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <h2 class="text-sm font-semibold text-slate-950">Raw Attendance Records</h2>
                        <p class="mt-1 text-sm text-slate-600">State colors help you spot check-ins, check-outs, and overtime punches quickly.</p>
                    </div>
                    <table class="data-table">
                        <thead class="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                            <tr>
                                <th class="px-4 py-3">Date</th>
                                <th class="px-4 py-3">Time</th>
                                <th class="px-4 py-3">State</th>
                                <th class="px-4 py-3">Method</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${records.length
                                ? records.map((record) => `
                                    <tr class="bg-white">
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(record.attendance_date ? formatDate(record.attendance_date) : '--')}</td>
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(formatClockTime(record.time))}</td>
                                        <td class="whitespace-nowrap px-4 py-3">
                                            <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${stateBadgeClass(record.state)}">
                                                ${escapeHtml(record.state_label ?? 'Unknown')}
                                            </span>
                                        </td>
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(record.method ?? 'Unknown')}</td>
                                    </tr>
                                `).join('')
                                : `
                                    <tr class="bg-white">
                                        <td colspan="4" class="px-4 py-6 text-sm text-slate-500">No records found for this range.</td>
                                    </tr>
                                `}
                        </tbody>
                    </table>
                </section>
            </div>
        `;
    };

    const buildDailySummaryRows = (records) => {
        const sessions = [];
        const openSessionsByUser = new Map();
        const statePriority = {
            check_in: 0,
            break_in: 0,
            overtime_in: 1,
            check_out: 2,
            break_out: 2,
            overtime_out: 3,
        };

        const orderedRecords = [...records].sort((left, right) => {
            const timeDifference = new Date(left.timestamp) - new Date(right.timestamp);

            if (timeDifference !== 0) {
                return timeDifference;
            }

            const leftPriority = statePriority[left.state] ?? 99;
            const rightPriority = statePriority[right.state] ?? 99;

            if (leftPriority !== rightPriority) {
                return leftPriority - rightPriority;
            }

            return Number(left.id ?? 0) - Number(right.id ?? 0);
        });

        orderedRecords.forEach((record) => {
            const key = `${record.device_user_id}:${record.employee_name}`;
            const openSession = openSessionsByUser.get(key) ?? null;

            if (record.state === 'check_in' && record.timestamp) {
                if (openSession) {
                    openSession.latest_activity_at = record.timestamp;
                    openSession.latest_event_id = Number(record.id ?? 0);
                } else {
                    const session = {
                        employee_name: record.employee_name,
                        device_user_id: record.device_user_id,
                        check_in_at: record.timestamp,
                        check_in_time: record.time ?? '--',
                        check_in_method: record.verification_type ?? 'Unknown',
                        attendance_date: record.timestamp,
                        check_out_at: null,
                        check_out_time: null,
                        latest_activity_at: record.timestamp,
                        latest_event_id: Number(record.id ?? 0),
                    };

                    sessions.push(session);
                    openSessionsByUser.set(key, session);
                }
            }

            if (record.state === 'check_out' && record.timestamp) {
                if (openSession && new Date(record.timestamp).getTime() >= new Date(openSession.check_in_at).getTime()) {
                    openSession.check_out_at = record.timestamp;
                    openSession.check_out_time = record.time ?? '--';
                    openSession.latest_activity_at = record.timestamp;
                    openSession.latest_event_id = Number(record.id ?? 0);
                    openSessionsByUser.delete(key);
                } else {
                    sessions.push({
                        employee_name: record.employee_name,
                        device_user_id: record.device_user_id,
                        check_in_at: null,
                        check_in_time: '--',
                        check_in_method: '--',
                        attendance_date: record.timestamp,
                        check_out_at: record.timestamp,
                        check_out_time: record.time ?? '--',
                        latest_activity_at: record.timestamp,
                        latest_event_id: Number(record.id ?? 0),
                    });
                }
            }
        });

        return sessions.sort((left, right) => new Date(right.latest_activity_at) - new Date(left.latest_activity_at));
    };

    const renderAllEmployeesReport = (payload) => {
        const totals = payload.totals ?? {};
        const records = Array.isArray(totals.records) ? totals.records : [];
        allEmployees = Array.isArray(payload.employees) ? payload.employees : allEmployees;
        defaultWorkingHours.off_days = normalizeOffDays(payload.working_hours?.off_days ?? defaultWorkingHours.off_days);
        const sessions = buildDailySummaryRows(records);
        const activeEmployeeCount = new Set(records.map((record) => record.device_user_id)).size;

        elements.content.innerHTML = `
            <div class="space-y-6">
                <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <article class="metric">
                        <p class="text-sm text-slate-500">Date Range</p>
                        <p class="mt-3 text-base font-semibold text-slate-950">${escapeHtml(formatDate(totals.from_date ?? getTodayDateString()))} - ${escapeHtml(formatDate(totals.to_date ?? totals.from_date ?? getTodayDateString()))}</p>
                    </article>
                    <article class="metric">
                        <p class="text-sm text-slate-500">Employees With Activity</p>
                        <p class="mt-3 text-2xl font-semibold text-slate-950">${escapeHtml(String(activeEmployeeCount))}</p>
                    </article>
                    <article class="metric">
                        <p class="text-sm text-slate-500">Check-ins</p>
                        <p class="mt-3 text-2xl font-semibold text-emerald-700">${escapeHtml(String(totals.total_check_ins ?? 0))}</p>
                    </article>
                    <article class="metric">
                        <p class="text-sm text-slate-500">Check-outs</p>
                        <p class="mt-3 text-2xl font-semibold text-rose-700">${escapeHtml(String(totals.total_check_outs ?? 0))}</p>
                    </article>
                    <article class="metric">
                        <p class="text-sm text-slate-500">Attendance Sessions</p>
                        <p class="mt-3 text-2xl font-semibold text-slate-950">${escapeHtml(String(sessions.length))}</p>
                    </article>
                    <article class="metric">
                        <p class="text-sm text-slate-500">Raw Records</p>
                        <p class="mt-3 text-2xl font-semibold text-slate-950">${escapeHtml(String(totals.total_records ?? 0))}</p>
                    </article>
                </section>

                <section class="grid gap-4 md:grid-cols-2">
                    <article class="metric">
                        <p class="text-sm text-slate-500">Last Activity</p>
                        <p class="mt-3 text-base font-semibold text-slate-950">${escapeHtml(totals.last_activity ? formatDate(totals.last_activity) : '--')}</p>
                        <p class="mt-1 text-sm text-slate-500">${escapeHtml(totals.last_sync_at ? new Date(totals.last_sync_at).toLocaleString(englishLocale, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, year: 'numeric', month: 'short', day: '2-digit' }) : 'Not synced yet')}</p>
                    </article>
                    <article class="metric">
                        <p class="text-sm text-slate-500">Default Working Hours</p>
                        <p class="mt-3 text-base font-semibold text-slate-950">${escapeHtml(formatClockTime(payload.working_hours?.start_time ?? defaultWorkingHours.start))} - ${escapeHtml(formatClockTime(payload.working_hours?.end_time ?? defaultWorkingHours.end))}</p>
                        <p class="mt-1 text-sm text-slate-500">Employee-specific custom hours are still applied to each person late calculation.</p>
                    </article>
                </section>

                <section class="table-wrap">
                    <div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <h2 class="text-sm font-semibold text-slate-950">Attendance Sessions</h2>
                        <p class="mt-1 text-sm text-slate-600">Each row shows one employee session inside the selected date range.</p>
                    </div>
                    <table class="data-table">
                        <thead class="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                            <tr>
                                <th class="px-4 py-3">Employee</th>
                                <th class="px-4 py-3">User ID</th>
                                <th class="px-4 py-3">Check-in</th>
                                <th class="px-4 py-3">Check-out</th>
                                <th class="px-4 py-3">Duration</th>
                                <th class="px-4 py-3">Late Check-in</th>
                                <th class="px-4 py-3">Method</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${sessions.length
                                ? sessions.map((session) => {
                                    const lateDuration = calculateEmployeeLateDuration(
                                        session.device_user_id,
                                        session.check_in_time,
                                        session.attendance_date ? new Date(session.attendance_date).toISOString().slice(0, 10) : '',
                                    );
                                    return `
                                        <tr class="bg-white">
                                            <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(session.employee_name ?? '--')}</td>
                                            <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(session.device_user_id ?? '--')}</td>
                                            <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(formatClockTime(session.check_in_time))}</td>
                                            <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(formatClockTime(session.check_out_time))}</td>
                                            <td class="whitespace-nowrap px-4 py-3 font-medium text-slate-950">${escapeHtml(formatAttendanceDuration(session.check_in_at, session.check_out_at))}</td>
                                            <td class="whitespace-nowrap px-4 py-3 font-medium ${lateDuration !== '--' && lateDuration !== '0m' ? 'text-amber-700' : 'text-slate-700'}">${escapeHtml(lateDuration)}</td>
                                            <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(session.check_in_method ?? '--')}</td>
                                        </tr>
                                    `;
                                }).join('')
                                : `
                                    <tr class="bg-white">
                                        <td colspan="7" class="px-4 py-6 text-sm text-slate-500">No attendance sessions found for this range.</td>
                                    </tr>
                                `}
                        </tbody>
                    </table>
                </section>

                <section class="table-wrap">
                    <div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <h2 class="text-sm font-semibold text-slate-950">Raw Attendance Records</h2>
                        <p class="mt-1 text-sm text-slate-600">All employee punches for the selected date range.</p>
                    </div>
                    <table class="data-table">
                        <thead class="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                            <tr>
                                <th class="px-4 py-3">Employee</th>
                                <th class="px-4 py-3">User ID</th>
                                <th class="px-4 py-3">Time</th>
                                <th class="px-4 py-3">State</th>
                                <th class="px-4 py-3">Method</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${records.length
                                ? records.map((record) => `
                                    <tr class="bg-white">
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(record.employee_name ?? '--')}</td>
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(record.device_user_id ?? '--')}</td>
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(formatClockTime(record.time))}</td>
                                        <td class="whitespace-nowrap px-4 py-3">
                                            <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${stateBadgeClass(record.state)}">
                                                ${escapeHtml(record.state_label ?? 'Unknown')}
                                            </span>
                                        </td>
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(record.verification_type ?? 'Unknown')}</td>
                                    </tr>
                                `).join('')
                                : `
                                    <tr class="bg-white">
                                        <td colspan="5" class="px-4 py-6 text-sm text-slate-500">No records found for this range.</td>
                                    </tr>
                                `}
                        </tbody>
                    </table>
                </section>
            </div>
        `;
    };

    const runReport = async () => {
        const fromDate = elements.fromDate?.value ?? '';
        const toDate = elements.toDate?.value ?? '';

        if (!fromDate || !toDate) {
            setStatusMessage('Choose both From and To dates first.', 'rose');
            return;
        }

        if (!isValidDateRange(fromDate, toDate)) {
            setStatusMessage('The To date must be the same as or after the From date.', 'rose');
            return;
        }

        renderLoading();
        setStatusMessage('');
        elements.submit.disabled = true;

        try {
            const employeeId = selectedEmployeeId();
            const url = new URL(employeeId ? '/api/attendance/report' : '/api/attendance/dashboard', window.location.origin);

            if (employeeId) {
                url.searchParams.set('device_user_id', employeeId);
                url.searchParams.set('from_date', fromDate);
                url.searchParams.set('to_date', toDate);
            } else {
                url.searchParams.set('from_date', fromDate);
                url.searchParams.set('to_date', toDate);
            }

            const response = await fetch(url, {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error('Failed to load the attendance report.');
            }

            const payload = await response.json();
            if (employeeId) {
                renderReport(payload);
            } else {
                renderAllEmployeesReport(payload);
            }
            setStatusMessage('Report loaded successfully.');
        } catch (error) {
            renderPlaceholder();
            setStatusMessage(error.message ?? 'Failed to load the attendance report.', 'rose');
        } finally {
            elements.submit.disabled = false;
        }
    };

    const today = getTodayDateString();

    if (elements.fromDate) {
        elements.fromDate.value = getMonthStartDateString();
        elements.fromDate.max = today;
    }

    if (elements.toDate) {
        elements.toDate.value = today;
        elements.toDate.max = today;
    }

    allEmployees = collectEmployeesFromOptions();

    elements.form?.addEventListener('submit', (event) => {
        event.preventDefault();
        runReport();
    });

    elements.user?.addEventListener('change', () => {
        updateWorkingHoursSummary();
        runReport();
    });

    elements.workingHoursOpenButton?.addEventListener('click', () => {
        openWorkingHoursModal();
    });

    elements.workingHoursCloseButtons.forEach((button) => {
        button.addEventListener('click', () => {
            closeWorkingHoursModal();
        });
    });

    elements.workingHoursModal?.addEventListener('click', (event) => {
        if (event.target === elements.workingHoursModal) {
            closeWorkingHoursModal();
        }
    });

    elements.workingHoursReset?.addEventListener('click', async () => {
        const selectedOption = getSelectedEmployeeOption();

        if (!selectedOption || !selectedOption.value || workingHoursRequestInFlight) {
            renderWorkingHoursMessage('Choose an employee first.', 'rose');
            return;
        }

        workingHoursRequestInFlight = true;
        if (elements.workingHoursSubmit) {
            elements.workingHoursSubmit.disabled = true;
        }
        if (elements.workingHoursReset) {
            elements.workingHoursReset.disabled = true;
        }

        renderWorkingHoursMessage('Resetting this employee to the default working hours...');

        try {
            const response = await fetch(`/api/employees/${encodeURIComponent(selectedOption.value)}/working-hours`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
                },
                body: JSON.stringify({
                    work_start_time: null,
                    work_end_time: null,
                }),
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload?.message || 'Failed to reset employee working hours.');
            }

            const start = payload?.employee?.working_hours?.start_time || defaultWorkingHours.start;
            const end = payload?.employee?.working_hours?.end_time || defaultWorkingHours.end;
            updateSelectedOptionWorkingHours(start, end, false);
            if (elements.workingHoursStart) {
                elements.workingHoursStart.value = start;
            }
            if (elements.workingHoursEnd) {
                elements.workingHoursEnd.value = end;
            }
            renderWorkingHoursMessage(payload?.message || 'Employee working hours reset to the default schedule.', 'emerald');
            setStatusMessage(payload?.message || 'Employee working hours reset to the default schedule.');

            if ((elements.user?.value ?? '') === selectedOption.value && elements.content?.innerHTML.trim()) {
                await runReport();
            }
        } catch (error) {
            renderWorkingHoursMessage(error.message ?? 'Failed to reset employee working hours.', 'rose');
        } finally {
            workingHoursRequestInFlight = false;
            if (elements.workingHoursSubmit) {
                elements.workingHoursSubmit.disabled = false;
            }
            if (elements.workingHoursReset) {
                elements.workingHoursReset.disabled = false;
            }
        }
    });

    elements.workingHoursForm?.addEventListener('submit', async (event) => {
        event.preventDefault();

        const selectedOption = getSelectedEmployeeOption();
        const workStartTime = elements.workingHoursStart?.value ?? '';
        const workEndTime = elements.workingHoursEnd?.value ?? '';

        if (!selectedOption || !selectedOption.value) {
            renderWorkingHoursMessage('Choose an employee first.', 'rose');
            return;
        }

        if (!workStartTime || !workEndTime) {
            renderWorkingHoursMessage('Choose both work start and work end times.', 'rose');
            return;
        }

        if (workingHoursRequestInFlight) {
            return;
        }

        workingHoursRequestInFlight = true;
        if (elements.workingHoursSubmit) {
            elements.workingHoursSubmit.disabled = true;
        }
        if (elements.workingHoursReset) {
            elements.workingHoursReset.disabled = true;
        }

        renderWorkingHoursMessage('Saving custom working hours...');

        try {
            const response = await fetch(`/api/employees/${encodeURIComponent(selectedOption.value)}/working-hours`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
                },
                body: JSON.stringify({
                    work_start_time: workStartTime,
                    work_end_time: workEndTime,
                }),
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                const validationMessage = Object.values(payload?.errors ?? {})
                    .flat()
                    .find(Boolean);

                throw new Error(validationMessage || payload?.message || 'Failed to save employee working hours.');
            }

            const start = payload?.employee?.working_hours?.start_time || workStartTime;
            const end = payload?.employee?.working_hours?.end_time || workEndTime;
            updateSelectedOptionWorkingHours(start, end, true);
            renderWorkingHoursMessage(payload?.message || 'Custom working hours saved successfully.', 'emerald');
            setStatusMessage(payload?.message || 'Custom working hours saved successfully.');

            if ((elements.user?.value ?? '') === selectedOption.value && elements.content?.innerHTML.trim()) {
                await runReport();
            }
        } catch (error) {
            renderWorkingHoursMessage(error.message ?? 'Failed to save employee working hours.', 'rose');
        } finally {
            workingHoursRequestInFlight = false;
            if (elements.workingHoursSubmit) {
                elements.workingHoursSubmit.disabled = false;
            }
            if (elements.workingHoursReset) {
                elements.workingHoursReset.disabled = false;
            }
        }
    });

    updateWorkingHoursSummary();
    renderPlaceholder();

    if (preselectedEmployeeId && elements.user) {
        elements.user.value = preselectedEmployeeId;
        updateWorkingHoursSummary();
    }

    runReport();
}

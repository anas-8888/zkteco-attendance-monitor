import './bootstrap';

document.querySelectorAll('[data-page-refresh]').forEach((button) => {
    button.addEventListener('click', () => {
        if (document.querySelector('[data-attendance-dashboard]')) {
            window.dispatchEvent(new CustomEvent('attendance-dashboard-refresh-requested'));
            return;
        }

        window.location.reload();
    });
});

const dashboard = document.querySelector('[data-attendance-dashboard]');
const englishLocale = 'en-US';

if (dashboard) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
    const elements = {
        deviceStatus: dashboard.querySelector('[data-device-status]'),
        lastSync: dashboard.querySelector('[data-last-sync]'),
        totalCheckIns: dashboard.querySelector('[data-total-check-ins]'),
        totalCheckOuts: dashboard.querySelector('[data-total-check-outs]'),
        totalRecords: dashboard.querySelector('[data-total-records]'),
        selectedDateLabel: dashboard.querySelector('[data-selected-date-label]'),
        datePickerArea: dashboard.querySelector('[data-date-picker-area]'),
        datePickerOpenButton: dashboard.querySelector('[data-date-picker-open]'),
        dateModal: dashboard.querySelector('[data-date-modal]'),
        dateModalCloseButtons: dashboard.querySelectorAll('[data-date-modal-close]'),
        dateForm: dashboard.querySelector('[data-date-form]'),
        dateInput: dashboard.querySelector('[data-date-input]'),
        summaryPickerArea: dashboard.querySelector('[data-summary-picker-area]'),
        summaryOpenButton: dashboard.querySelector('[data-summary-open]'),
        summaryModal: dashboard.querySelector('[data-summary-modal]'),
        summaryPanel: dashboard.querySelector('[data-summary-panel]'),
        summaryCloseButtons: dashboard.querySelectorAll('[data-summary-close]'),
        summaryForm: dashboard.querySelector('[data-summary-form]'),
        summaryUser: dashboard.querySelector('[data-summary-user]'),
        summaryFromDate: dashboard.querySelector('[data-summary-from-date]'),
        summaryToDate: dashboard.querySelector('[data-summary-to-date]'),
        summaryResult: dashboard.querySelector('[data-summary-result]'),
        summarySubmit: dashboard.querySelector('[data-summary-submit]'),
        manualCheckInOpenButton: dashboard.querySelector('[data-manual-check-in-open]'),
        manualCheckInModal: dashboard.querySelector('[data-manual-check-in-modal]'),
        manualCheckInPanel: dashboard.querySelector('[data-manual-check-in-panel]'),
        manualCheckInCloseButtons: dashboard.querySelectorAll('[data-manual-check-in-close]'),
        manualCheckInForm: dashboard.querySelector('[data-manual-check-in-form]'),
        manualCheckInUser: dashboard.querySelector('[data-manual-check-in-user]'),
        manualCheckInDate: dashboard.querySelector('[data-manual-check-in-date]'),
        manualCheckInTime: dashboard.querySelector('[data-manual-check-in-time]'),
        manualCheckInNote: dashboard.querySelector('[data-manual-check-in-note]'),
        manualCheckInResult: dashboard.querySelector('[data-manual-check-in-result]'),
        manualCheckInSubmit: dashboard.querySelector('[data-manual-check-in-submit]'),
        manualCheckOutOpenButton: dashboard.querySelector('[data-manual-check-out-open]'),
        manualCheckOutModal: dashboard.querySelector('[data-manual-check-out-modal]'),
        manualCheckOutPanel: dashboard.querySelector('[data-manual-check-out-panel]'),
        manualCheckOutCloseButtons: dashboard.querySelectorAll('[data-manual-check-out-close]'),
        manualCheckOutForm: dashboard.querySelector('[data-manual-check-out-form]'),
        manualCheckOutUser: dashboard.querySelector('[data-manual-check-out-user]'),
        manualCheckOutDate: dashboard.querySelector('[data-manual-check-out-date]'),
        manualCheckOutTime: dashboard.querySelector('[data-manual-check-out-time]'),
        manualCheckOutNote: dashboard.querySelector('[data-manual-check-out-note]'),
        manualCheckOutResult: dashboard.querySelector('[data-manual-check-out-result]'),
        manualCheckOutSubmit: dashboard.querySelector('[data-manual-check-out-submit]'),
        rows: dashboard.querySelector('[data-attendance-rows]'),
    };
    const refreshDelayMs = 3000;
    let refreshTimerId = null;
    let refreshInFlight = false;
    let liveStatusRefreshInFlight = false;
    let summaryInFlight = false;
    let manualCheckInInFlight = false;
    let manualCheckOutInFlight = false;
    let employees = [];
    let workingHours = {
        start_time: '10:00',
        end_time: '18:00',
        off_days: [0],
    };
    let selectedDate = (() => {
        const urlDate = new URL(window.location.href).searchParams.get('date');
        return /^\d{4}-\d{2}-\d{2}$/.test(urlDate ?? '') ? urlDate : '';
    })();

    const formatDateTime = (value) => {
        if (!value) {
            return 'Not synced yet';
        }

        return new Intl.DateTimeFormat(englishLocale, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            year: 'numeric',
            month: 'short',
            day: '2-digit',
        }).format(new Date(value));
    };

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

    const formatDate = (value) => {
        if (!value) {
            return '--';
        }

        return new Intl.DateTimeFormat(englishLocale, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
        }).format(new Date(value));
    };

    const formatAttendanceDuration = (checkInAt, checkOutAt) => {
        if (!checkInAt || !checkOutAt) {
            return null;
        }

        const durationMs = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime();

        if (!Number.isFinite(durationMs) || durationMs <= 0) {
            return null;
        }

        const totalMinutes = Math.floor(durationMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0 && minutes > 0) {
            return `${hours} h ${minutes} min`;
        }

        if (hours > 0) {
            return `${hours} h`;
        }

        return `${minutes} min`;
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

    const isOffDay = (dateValue, hours = workingHours) => {
        if (!dateValue) {
            return false;
        }

        const offDays = normalizeOffDays(hours?.off_days);

        if (!offDays.length) {
            return false;
        }

        return offDays.includes(parseDateString(dateValue).getDay());
    };

    const calculateLateDuration = (checkInTime, hours = workingHours) => {
        if (isOffDay(getActiveDateString(), hours)) {
            return '0m';
        }

        const workStartMinutes = parseTimeToMinutes(hours.start_time);

        if (workStartMinutes === null) {
            return '--';
        }

        let totalLateMinutes = 0;
        let hasComparableTime = false;

        const checkInMinutes = parseTimeToMinutes(checkInTime);

        if (checkInMinutes !== null) {
            hasComparableTime = true;
            totalLateMinutes += Math.max(checkInMinutes - workStartMinutes, 0);
        }

        return hasComparableTime ? formatMinutesDuration(totalLateMinutes) : '--';
    };

    const resolveEmployeeWorkingHours = (deviceUserId) => {
        const employee = employees.find((item) => item.device_user_id === deviceUserId);

        return employee?.working_hours ?? workingHours;
    };

    const calculateEmployeeLateDuration = (deviceUserId, checkInTime, attendanceDate = getActiveDateString()) => {
        const employeeWorkingHours = resolveEmployeeWorkingHours(deviceUserId);

        if (isOffDay(attendanceDate, employeeWorkingHours)) {
            return '0m';
        }

        return calculateLateDuration(checkInTime, employeeWorkingHours);
    };

    const getTodayDateString = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    };

    const getActiveDateString = () => selectedDate || getTodayDateString();

    const parseDateString = (value) => {
        const [year, month, day] = value.split('-').map(Number);

        return new Date(year, month - 1, day);
    };

    const isViewingToday = () => getActiveDateString() === getTodayDateString();
    const syncSelectedDateWithUrl = () => {
        const url = new URL(window.location.href);

        if (isViewingToday()) {
            url.searchParams.delete('date');
            selectedDate = '';
        } else {
            url.searchParams.set('date', getActiveDateString());
        }

        window.history.replaceState({}, '', url);
    };

    const formatSelectedDateLabel = (value) => {
        const date = parseDateString(value);

        return new Intl.DateTimeFormat(englishLocale, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: '2-digit',
        }).format(date);
    };

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const renderSummaryPlaceholder = () => {
        if (!elements.summaryResult) {
            return;
        }

        elements.summaryResult.innerHTML = `
            <p class="text-sm text-slate-500">Choose a user and date range to calculate the summary.</p>
        `;
    };

    const renderManualAttendanceMessage = (targetElement, message, tone = 'zinc') => {
        if (!targetElement) {
            return;
        }

        const colorClass = {
            zinc: 'text-slate-500',
            rose: 'text-rose-600',
            emerald: 'text-emerald-700',
        };

        targetElement.innerHTML = `
            <p class="text-sm ${colorClass[tone] || colorClass.zinc}">${escapeHtml(message)}</p>
        `;
    };

    const renderManualCheckInMessage = (message, tone = 'zinc') => {
        renderManualAttendanceMessage(elements.manualCheckInResult, message, tone);
    };

    const renderManualCheckOutMessage = (message, tone = 'zinc') => {
        renderManualAttendanceMessage(elements.manualCheckOutResult, message, tone);
    };

    const renderSummaryLoading = () => {
        if (!elements.summaryResult) {
            return;
        }

        elements.summaryResult.innerHTML = `
            <p class="text-sm text-slate-500">Calculating summary...</p>
        `;
    };

    const renderSummaryError = (message) => {
        if (!elements.summaryResult) {
            return;
        }

        elements.summaryResult.innerHTML = `
            <p class="text-sm text-rose-600">${escapeHtml(message)}</p>
        `;
    };

    const renderSummaryResult = (summary) => {
        if (!elements.summaryResult) {
            return;
        }

        elements.summaryResult.innerHTML = `
            <div class="space-y-3">
                <div>
                    <p class="text-sm font-semibold text-slate-950">${escapeHtml(summary.employee_name)}</p>
                    <p class="mt-1 text-xs text-slate-500">${escapeHtml(summary.from_date)} - ${escapeHtml(summary.to_date)}</p>
                </div>
                <div class="grid gap-3 sm:grid-cols-3">
                    <div class="rounded-md border border-slate-200 bg-white p-3">
                        <p class="text-xs font-medium uppercase text-slate-500">Total</p>
                        <p class="mt-2 text-lg font-semibold text-slate-950">${escapeHtml(summary.total_duration_human)}</p>
                    </div>
                    <div class="rounded-md border border-slate-200 bg-white p-3">
                        <p class="text-xs font-medium uppercase text-slate-500">Regular Hours</p>
                        <p class="mt-2 text-lg font-semibold text-slate-950">${escapeHtml(summary.normal_duration_human)}</p>
                    </div>
                    <div class="rounded-md border border-slate-200 bg-white p-3">
                        <p class="text-xs font-medium uppercase text-slate-500">Overtime Hours</p>
                        <p class="mt-2 text-lg font-semibold text-slate-950">${escapeHtml(summary.overtime_duration_human)}</p>
                    </div>
                </div>
            </div>
        `;
    };

    const renderEmployeeOptions = () => {
        if (!elements.summaryUser && !elements.manualCheckInUser && !elements.manualCheckOutUser) {
            return;
        }

        const summarySelectedUser = elements.summaryUser?.value ?? '';
        const manualSelectedUser = elements.manualCheckInUser?.value ?? '';
        const manualCheckOutSelectedUser = elements.manualCheckOutUser?.value ?? '';
        const options = employees.map((employee) => {
            return `
                <option value="${escapeHtml(employee.device_user_id)}">${escapeHtml(employee.name)} (${escapeHtml(employee.device_user_id)})</option>
            `;
        }).join('');

        if (elements.summaryUser) {
            elements.summaryUser.innerHTML = `
                <option value="">Choose a user</option>
                ${options}
            `;

            if (summarySelectedUser && employees.some((employee) => employee.device_user_id === summarySelectedUser)) {
                elements.summaryUser.value = summarySelectedUser;
            }
        }

        if (elements.manualCheckInUser) {
            elements.manualCheckInUser.innerHTML = `
                <option value="">Choose a user</option>
                ${options}
            `;

            if (manualSelectedUser && employees.some((employee) => employee.device_user_id === manualSelectedUser)) {
                elements.manualCheckInUser.value = manualSelectedUser;
            }
        }

        if (elements.manualCheckOutUser) {
            elements.manualCheckOutUser.innerHTML = `
                <option value="">Choose a user</option>
                ${options}
            `;

            if (manualCheckOutSelectedUser && employees.some((employee) => employee.device_user_id === manualCheckOutSelectedUser)) {
                elements.manualCheckOutUser.value = manualCheckOutSelectedUser;
            }
        }
    };

    const updateSummaryDefaults = () => {
        if (elements.summaryFromDate) {
            elements.summaryFromDate.max = getTodayDateString();
            if (!elements.summaryFromDate.value) {
                elements.summaryFromDate.value = getActiveDateString();
            }
        }

        if (elements.summaryToDate) {
            elements.summaryToDate.max = getTodayDateString();
            if (!elements.summaryToDate.value) {
                elements.summaryToDate.value = getActiveDateString();
            }
        }
    };

    const getCurrentTimeString = () => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');

        return `${hours}:${minutes}`;
    };

    const updateManualCheckInDefaults = () => {
        if (elements.manualCheckInDate) {
            elements.manualCheckInDate.max = getTodayDateString();
            if (!elements.manualCheckInDate.value) {
                elements.manualCheckInDate.value = getActiveDateString();
            }
        }

        if (elements.manualCheckInTime && !elements.manualCheckInTime.value) {
            elements.manualCheckInTime.value = isViewingToday() ? getCurrentTimeString() : '08:00';
        }
    };

    const updateManualCheckOutDefaults = () => {
        if (elements.manualCheckOutDate) {
            elements.manualCheckOutDate.max = getTodayDateString();
            if (!elements.manualCheckOutDate.value) {
                elements.manualCheckOutDate.value = getActiveDateString();
            }
        }

        if (elements.manualCheckOutTime && !elements.manualCheckOutTime.value) {
            elements.manualCheckOutTime.value = isViewingToday() ? getCurrentTimeString() : '17:00';
        }
    };

    const renderStatus = (status) => {
        const checking = Boolean(status?.checking);
        const online = !checking && Boolean(status?.online);
        const color = checking ? 'bg-amber-400' : (online ? 'bg-emerald-500' : 'bg-rose-500');
        const label = checking ? 'Checking...' : (online ? 'Online' : 'Offline');
        const statusTitle = checking
            ? 'Checking the live device status...'
            : (online
                ? 'Device is reachable right now.'
                : (status?.error ? `Offline: ${status.error}` : 'Device is not reachable right now.'));

        elements.deviceStatus.innerHTML = `
            <span class="h-2.5 w-2.5 rounded-full ${color}" title="${escapeHtml(statusTitle)}"></span>
            ${label}
        `;

        elements.deviceStatus.setAttribute('title', statusTitle);
    };

    const refreshLiveDeviceStatus = async ({ triggerSyncOnOnline = false } = {}) => {
        if (liveStatusRefreshInFlight) {
            return;
        }

        liveStatusRefreshInFlight = true;

        try {
            const response = await fetch('/api/device/status', {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error('Failed to read the live device status.');
            }

            const status = await response.json();
            renderStatus(status);

            if (triggerSyncOnOnline && status?.online && isViewingToday() && !refreshInFlight) {
                refreshDashboard({ dispatchSync: true });
            }
        } catch (error) {
            renderStatus({
                online: false,
                error: error?.message ?? 'Failed to read the live device status.',
            });
        } finally {
            liveStatusRefreshInFlight = false;
        }
    };

    const applyPayload = (payload) => {
        const summary = payload?.totals ?? {};
        employees = Array.isArray(payload?.employees) ? payload.employees : [];
        workingHours = payload?.working_hours ?? workingHours;
        selectedDate = summary.selected_date && summary.selected_date !== getTodayDateString()
            ? summary.selected_date
            : '';

        elements.totalCheckIns.textContent = summary.total_check_ins ?? 0;
        elements.totalCheckOuts.textContent = summary.total_check_outs ?? 0;
        elements.totalRecords.textContent = summary.total_records ?? 0;
        elements.lastSync.textContent = formatDateTime(summary.last_sync_at);
        elements.selectedDateLabel.textContent = formatSelectedDateLabel(summary.selected_date ?? getTodayDateString());

        renderRows(summary.records ?? []);
        renderEmployeeOptions();
        updateDateControls();
        updateSummaryDefaults();
        updateManualCheckInDefaults();
        updateManualCheckOutDefaults();
        syncSelectedDateWithUrl();
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
            if (!left.timestamp && !right.timestamp) {
                return 0;
            }

            if (!left.timestamp) {
                return -1;
            }

            if (!right.timestamp) {
                return 1;
            }

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

        return sessions.sort((left, right) => {
            if (!left.latest_activity_at && !right.latest_activity_at) {
                return left.employee_name.localeCompare(right.employee_name);
            }

            if (!left.latest_activity_at) {
                return 1;
            }

            if (!right.latest_activity_at) {
                return -1;
            }

            const activityDifference = new Date(right.latest_activity_at) - new Date(left.latest_activity_at);

            if (activityDifference !== 0) {
                return activityDifference;
            }

            const eventIdDifference = Number(right.latest_event_id ?? 0) - Number(left.latest_event_id ?? 0);

            if (eventIdDifference !== 0) {
                return eventIdDifference;
            }

            return left.employee_name.localeCompare(right.employee_name);
        });
    };

    const buildMissingCheckInRows = (records) => {
        if (!isViewingToday() || !employees.length) {
            return [];
        }

        const now = new Date();
        const nowMinutes = (now.getHours() * 60) + now.getMinutes();
        const employeesWithRecords = new Set(
            records
                .map((record) => String(record?.device_user_id ?? '').trim())
                .filter(Boolean)
        );

        return employees.reduce((rows, employee) => {
            const deviceUserId = String(employee?.device_user_id ?? '').trim();

            if (!deviceUserId || employeesWithRecords.has(deviceUserId)) {
                return rows;
            }

            const employeeWorkingHours = resolveEmployeeWorkingHours(deviceUserId);
            const workStartMinutes = parseTimeToMinutes(employeeWorkingHours.start_time);

            if (isOffDay(getActiveDateString(), employeeWorkingHours) || workStartMinutes === null || nowMinutes <= workStartMinutes) {
                return rows;
            }

            rows.push({
                employee_name: employee?.name ?? deviceUserId,
                device_user_id: deviceUserId,
                check_in_at: null,
                check_in_time: '--',
                check_in_method: '--',
                attendance_date: getActiveDateString(),
                check_out_at: null,
                check_out_time: '--',
                latest_activity_at: null,
                latest_event_id: 0,
                late_duration_override: formatMinutesDuration(nowMinutes - workStartMinutes),
                placeholder_type: 'missing_check_in',
            });

            return rows;
        }, []);
    };

    const renderRows = (records) => {
        const summaryRows = buildDailySummaryRows(records);
        const missingCheckInRows = buildMissingCheckInRows(records);
        const displayRows = [...missingCheckInRows, ...summaryRows];

        if (!displayRows.length) {
            elements.rows.innerHTML = '<tr><td class="px-4 py-6 text-sm text-slate-500" colspan="8">No attendance records for this date.</td></tr>';
            return;
        }

        elements.rows.innerHTML = displayRows.map((record) => {
            const isMissingCheckIn = record.placeholder_type === 'missing_check_in';
            const attendanceDuration = isMissingCheckIn
                ? '--'
                : (formatAttendanceDuration(record.check_in_at, record.check_out_at) ?? '--');
            const lateDuration = record.late_duration_override ?? calculateEmployeeLateDuration(
                record.device_user_id,
                record.check_in_time,
                record.attendance_date ? new Date(record.attendance_date).toISOString().slice(0, 10) : getActiveDateString(),
            );
            const rowClass = isMissingCheckIn ? 'bg-amber-50/60' : 'bg-white';
            const employeeNameMarkup = isMissingCheckIn
                ? `
                    <td class="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-950">
                        <div>${escapeHtml(record.employee_name)}</div>
                        <div class="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Missing check-in</div>
                    </td>
                `
                : `<td class="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-950">${escapeHtml(record.employee_name)}</td>`;

            return `
                <tr class="${rowClass}">
                    <td class="whitespace-nowrap px-4 py-4 text-sm text-slate-600">${escapeHtml(record.device_user_id)}</td>
                    ${employeeNameMarkup}
                    <td class="whitespace-nowrap px-4 py-4 text-sm text-slate-600">${escapeHtml(formatClockTime(record.check_in_time))}</td>
                    <td class="whitespace-nowrap px-4 py-4 text-sm text-slate-600">${escapeHtml(formatClockTime(record.check_out_time))}</td>
                    <td class="whitespace-nowrap px-4 py-4 text-sm text-slate-600">${escapeHtml(attendanceDuration)}</td>
                    <td class="whitespace-nowrap px-4 py-4 text-sm font-medium ${lateDuration !== '--' && lateDuration !== '0m' ? 'text-amber-700' : 'text-slate-600'}">${escapeHtml(lateDuration)}</td>
                    <td class="whitespace-nowrap px-4 py-4 text-sm text-slate-600">${escapeHtml(record.check_in_method ?? '--')}</td>
                    <td class="whitespace-nowrap px-4 py-4 text-sm text-slate-600">${escapeHtml(formatDate(record.attendance_date ?? record.check_in_at ?? record.check_out_at))}</td>
                </tr>
            `;
        }).join('');
    };

    const renderLoadingRows = () => {
        elements.rows.innerHTML = '<tr><td class="px-4 py-6 text-sm text-slate-500" colspan="8">Loading attendance...</td></tr>';
    };

    const updateDateControls = () => {
        if (!elements.dateInput) {
            return;
        }

        elements.dateInput.max = getTodayDateString();
        elements.dateInput.value = getActiveDateString();
    };

    const openNativeDatePicker = () => {
        if (!elements.dateInput) {
            return;
        }

        elements.dateInput.focus();

        if (typeof elements.dateInput.showPicker === 'function') {
            elements.dateInput.showPicker();
        }
    };

    const openDateModal = () => {
        updateDateControls();

        elements.dateModal?.classList.remove('hidden');
        elements.dateModal?.setAttribute('aria-hidden', 'false');
        window.setTimeout(openNativeDatePicker, 0);
    };

    const closeDateModal = () => {
        elements.dateModal?.classList.add('hidden');
        elements.dateModal?.setAttribute('aria-hidden', 'true');
    };

    const openSummaryModal = () => {
        closeDateModal();
        updateSummaryDefaults();
        elements.summaryModal?.classList.remove('hidden');
        elements.summaryModal?.classList.add('flex');
        elements.summaryModal?.setAttribute('aria-hidden', 'false');
        elements.summaryUser?.focus();
    };

    const closeSummaryModal = () => {
        elements.summaryModal?.classList.add('hidden');
        elements.summaryModal?.classList.remove('flex');
        elements.summaryModal?.setAttribute('aria-hidden', 'true');
    };

    const openManualCheckInModal = () => {
        closeDateModal();
        closeSummaryModal();
        closeManualCheckOutModal();
        updateManualCheckInDefaults();
        renderManualCheckInMessage('Select the employee, date, and check-in time to add a manual attendance record.');
        elements.manualCheckInModal?.classList.remove('hidden');
        elements.manualCheckInModal?.classList.add('flex');
        elements.manualCheckInModal?.setAttribute('aria-hidden', 'false');
        elements.manualCheckInUser?.focus();
    };

    const closeManualCheckInModal = () => {
        elements.manualCheckInModal?.classList.add('hidden');
        elements.manualCheckInModal?.classList.remove('flex');
        elements.manualCheckInModal?.setAttribute('aria-hidden', 'true');
    };

    const openManualCheckOutModal = () => {
        closeDateModal();
        closeSummaryModal();
        closeManualCheckInModal();
        updateManualCheckOutDefaults();
        renderManualCheckOutMessage('Select the employee, date, and check-out time to add a manual attendance record.');
        elements.manualCheckOutModal?.classList.remove('hidden');
        elements.manualCheckOutModal?.classList.add('flex');
        elements.manualCheckOutModal?.setAttribute('aria-hidden', 'false');
        elements.manualCheckOutUser?.focus();
    };

    const closeManualCheckOutModal = () => {
        elements.manualCheckOutModal?.classList.add('hidden');
        elements.manualCheckOutModal?.classList.remove('flex');
        elements.manualCheckOutModal?.setAttribute('aria-hidden', 'true');
    };

    const applySelectedDate = (nextDate) => {
        if (!nextDate) {
            return;
        }

        selectedDate = nextDate === getTodayDateString() ? '' : nextDate;
        renderLoadingRows();
        updateDateControls();
        if (elements.manualCheckInDate) {
            elements.manualCheckInDate.value = getActiveDateString();
        }
        if (elements.manualCheckOutDate) {
            elements.manualCheckOutDate.value = getActiveDateString();
        }
        syncSelectedDateWithUrl();
        closeDateModal();
        refreshDashboard();
    };

    const scheduleRefresh = (delay = refreshDelayMs) => {
        if (!isViewingToday()) {
            return;
        }

        if (refreshTimerId) {
            window.clearTimeout(refreshTimerId);
        }

        refreshTimerId = window.setTimeout(refreshDashboard, delay);
    };

    const refreshDashboard = async ({ forceSync = false, dispatchSync = false } = {}) => {
        if (refreshInFlight) {
            scheduleRefresh(500);
            return;
        }

        refreshInFlight = true;
        renderStatus({ checking: true });

        try {
            const url = new URL('/api/attendance/dashboard', window.location.origin);
            url.searchParams.set('date', getActiveDateString());

            if (forceSync && isViewingToday()) {
                url.searchParams.set('force_sync', '1');
            } else if (dispatchSync && isViewingToday()) {
                url.searchParams.set('dispatch_sync', '1');
            }

            const response = await fetch(url, {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error('Failed to update the attendance dashboard.');
            }

            const payload = await response.json();

            applyPayload(payload);
            window.setTimeout(() => {
                refreshLiveDeviceStatus();
            }, 0);
        } catch (error) {
            renderStatus({ online: false });

            if (!navigator.onLine) {
                elements.rows.innerHTML = '<tr><td class="px-4 py-6 text-sm text-rose-600" colspan="8">Waiting for the network connection to return...</td></tr>';
            } else {
                elements.rows.innerHTML = `<tr><td class="px-4 py-6 text-sm text-rose-600" colspan="8">${escapeHtml(error.message ?? 'Failed to update the attendance dashboard.')}</td></tr>`;
            }
        } finally {
            refreshInFlight = false;

            if (isViewingToday()) {
                scheduleRefresh();
            }
        }
    };

    elements.datePickerOpenButton?.addEventListener('click', (event) => {
        event.stopPropagation();
        closeSummaryModal();
        openDateModal();
    });

    window.addEventListener('attendance-dashboard-refresh-requested', () => {
        renderLoadingRows();
        refreshDashboard({ dispatchSync: true });
    });

    elements.dateModalCloseButtons.forEach((button) => {
        button.addEventListener('click', () => {
            closeDateModal();
        });
    });

    document.addEventListener('click', (event) => {
        if (!elements.datePickerArea?.contains(event.target)) {
            closeDateModal();
        }
    });

    elements.summaryModal?.addEventListener('click', (event) => {
        if (event.target === elements.summaryModal) {
            closeSummaryModal();
        }
    });

    elements.manualCheckInModal?.addEventListener('click', (event) => {
        if (event.target === elements.manualCheckInModal) {
            closeManualCheckInModal();
        }
    });

    elements.manualCheckOutModal?.addEventListener('click', (event) => {
        if (event.target === elements.manualCheckOutModal) {
            closeManualCheckOutModal();
        }
    });

    elements.dateForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        applySelectedDate(elements.dateInput?.value);
    });

    elements.dateInput?.addEventListener('change', () => {
        applySelectedDate(elements.dateInput?.value);
    });

    elements.summaryOpenButton?.addEventListener('click', (event) => {
        event.stopPropagation();
        openSummaryModal();
    });

    elements.manualCheckInOpenButton?.addEventListener('click', (event) => {
        event.stopPropagation();
        openManualCheckInModal();
    });

    elements.manualCheckOutOpenButton?.addEventListener('click', (event) => {
        event.stopPropagation();
        openManualCheckOutModal();
    });

    elements.summaryCloseButtons.forEach((button) => {
        button.addEventListener('click', () => {
            closeSummaryModal();
        });
    });

    elements.manualCheckInCloseButtons.forEach((button) => {
        button.addEventListener('click', () => {
            closeManualCheckInModal();
        });
    });

    elements.manualCheckOutCloseButtons.forEach((button) => {
        button.addEventListener('click', () => {
            closeManualCheckOutModal();
        });
    });

    elements.summaryForm?.addEventListener('submit', async (event) => {
        event.preventDefault();

        const deviceUserId = elements.summaryUser?.value ?? '';
        const fromDate = elements.summaryFromDate?.value ?? '';
        const toDate = elements.summaryToDate?.value ?? '';

        if (!deviceUserId) {
            renderSummaryError('Choose a user first.');
            return;
        }

        if (!fromDate || !toDate) {
            renderSummaryError('Choose a start date and end date.');
            return;
        }

        if (fromDate > toDate) {
            renderSummaryError('The end date must be after the start date.');
            return;
        }

        if (summaryInFlight) {
            return;
        }

        summaryInFlight = true;

        if (elements.summarySubmit) {
            elements.summarySubmit.disabled = true;
        }

        renderSummaryLoading();

        try {
            const url = new URL('/api/attendance/summary', window.location.origin);
            url.searchParams.set('device_user_id', deviceUserId);
            url.searchParams.set('from_date', fromDate);
            url.searchParams.set('to_date', toDate);

            const response = await fetch(url, {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error('Failed to calculate the attendance summary.');
            }

            const payload = await response.json();

            renderSummaryResult(payload.summary ?? {});
        } catch (error) {
            renderSummaryError(error.message ?? 'Failed to calculate the attendance summary.');
        } finally {
            summaryInFlight = false;

            if (elements.summarySubmit) {
                elements.summarySubmit.disabled = false;
            }
        }
    });

    elements.manualCheckInForm?.addEventListener('submit', async (event) => {
        event.preventDefault();

        const deviceUserId = elements.manualCheckInUser?.value ?? '';
        const attendanceDate = elements.manualCheckInDate?.value ?? '';
        const attendanceTime = elements.manualCheckInTime?.value ?? '';
        const note = elements.manualCheckInNote?.value?.trim() ?? '';

        if (!deviceUserId) {
            renderManualCheckInMessage('Choose a user first.', 'rose');
            return;
        }

        if (!attendanceDate || !attendanceTime) {
            renderManualCheckInMessage('Choose the attendance date and check-in time.', 'rose');
            return;
        }

        if (manualCheckInInFlight) {
            return;
        }

        manualCheckInInFlight = true;

        if (elements.manualCheckInSubmit) {
            elements.manualCheckInSubmit.disabled = true;
        }

        renderManualCheckInMessage('Saving manual check-in...');

        try {
            const response = await fetch('/api/attendance/manual-check-in', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    device_user_id: deviceUserId,
                    attendance_date: attendanceDate,
                    attendance_time: attendanceTime,
                    note,
                }),
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                const validationMessage = Object.values(payload?.errors ?? {})
                    .flat()
                    .find(Boolean);

                throw new Error(validationMessage || payload?.message || 'Failed to save the manual check-in.');
            }

            renderManualCheckInMessage(payload?.message || 'Manual check-in saved successfully.', 'emerald');
            closeManualCheckInModal();
            refreshDashboard();
        } catch (error) {
            renderManualCheckInMessage(error.message ?? 'Failed to save the manual check-in.', 'rose');
        } finally {
            manualCheckInInFlight = false;

            if (elements.manualCheckInSubmit) {
                elements.manualCheckInSubmit.disabled = false;
            }
        }
    });

    elements.manualCheckOutForm?.addEventListener('submit', async (event) => {
        event.preventDefault();

        const deviceUserId = elements.manualCheckOutUser?.value ?? '';
        const attendanceDate = elements.manualCheckOutDate?.value ?? '';
        const attendanceTime = elements.manualCheckOutTime?.value ?? '';
        const note = elements.manualCheckOutNote?.value?.trim() ?? '';

        if (!deviceUserId) {
            renderManualCheckOutMessage('Choose a user first.', 'rose');
            return;
        }

        if (!attendanceDate || !attendanceTime) {
            renderManualCheckOutMessage('Choose the attendance date and check-out time.', 'rose');
            return;
        }

        if (manualCheckOutInFlight) {
            return;
        }

        manualCheckOutInFlight = true;

        if (elements.manualCheckOutSubmit) {
            elements.manualCheckOutSubmit.disabled = true;
        }

        renderManualCheckOutMessage('Saving manual check-out...');

        try {
            const response = await fetch('/api/attendance/manual-check-out', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    device_user_id: deviceUserId,
                    attendance_date: attendanceDate,
                    attendance_time: attendanceTime,
                    note,
                }),
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                const validationMessage = Object.values(payload?.errors ?? {})
                    .flat()
                    .find(Boolean);

                throw new Error(validationMessage || payload?.message || 'Failed to save the manual check-out.');
            }

            renderManualCheckOutMessage(payload?.message || 'Manual check-out saved successfully.', 'emerald');
            closeManualCheckOutModal();
            refreshDashboard();
        } catch (error) {
            renderManualCheckOutMessage(error.message ?? 'Failed to save the manual check-out.', 'rose');
        } finally {
            manualCheckOutInFlight = false;

            if (elements.manualCheckOutSubmit) {
                elements.manualCheckOutSubmit.disabled = false;
            }
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeDateModal();
            closeSummaryModal();
            closeManualCheckInModal();
            closeManualCheckOutModal();
        }
    });

    window.addEventListener('focus', () => {
        refreshLiveDeviceStatus({ triggerSyncOnOnline: true });

        if (isViewingToday()) {
            scheduleRefresh(0);
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            refreshLiveDeviceStatus({ triggerSyncOnOnline: true });

            if (isViewingToday()) {
                scheduleRefresh(0);
            }
        }
    });

    window.addEventListener('online', () => {
        refreshLiveDeviceStatus({ triggerSyncOnOnline: true });
    });

    window.addEventListener('offline', () => {
        renderStatus({
            online: false,
            error: 'The computer is offline.',
        });
    });

    updateDateControls();
    updateSummaryDefaults();
    updateManualCheckInDefaults();
    updateManualCheckOutDefaults();
    renderSummaryPlaceholder();
    refreshDashboard();
}

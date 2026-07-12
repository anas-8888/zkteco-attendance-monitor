import './bootstrap';

const reportsPage = document.querySelector('[data-reports-page]');

if (reportsPage) {
    const englishLocale = 'en-US';
    const elements = {
        form: reportsPage.querySelector('[data-report-form]'),
        user: reportsPage.querySelector('[data-report-user]'),
        from: reportsPage.querySelector('[data-report-from]'),
        to: reportsPage.querySelector('[data-report-to]'),
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
    };
    let workingHoursRequestInFlight = false;

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
        : 'border-emerald-200 bg-emerald-50 text-emerald-700';

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

    const updateWorkingHoursSummary = () => {
        if (!elements.workingHoursSummary) {
            return;
        }

        const selectedOption = getSelectedEmployeeOption();

        if (!selectedOption || !selectedOption.value) {
            elements.workingHoursSummary.textContent = `Default working hours: ${defaultWorkingHours.start} - ${defaultWorkingHours.end}`;
            return;
        }

        const start = selectedOption.dataset.workStart || defaultWorkingHours.start;
        const end = selectedOption.dataset.workEnd || defaultWorkingHours.end;
        const hasCustomHours = selectedOption.dataset.hasCustomHours === 'true';

        elements.workingHoursSummary.textContent = hasCustomHours
            ? `Custom working hours for this employee: ${start} - ${end}`
            : `This employee uses the default working hours: ${start} - ${end}`;
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
                <p class="mt-2 text-sm text-slate-600">Choose an employee and a date range to generate a report.</p>
            </section>
        `;
    };

    const renderLoading = () => {
        elements.content.innerHTML = `
            <section class="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
                <h2 class="text-lg font-semibold text-slate-950">Loading report...</h2>
                <p class="mt-2 text-sm text-slate-600">Fetching attendance sessions and attendance duration.</p>
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
                        <p class="mt-1 text-sm text-slate-500">Working hours: ${escapeHtml(workingHours.start_time ?? '10:00')} - ${escapeHtml(workingHours.end_time ?? '18:00')}</p>
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
                        <p class="mt-1 text-sm text-slate-600">Each row shows a complete attendance or overtime session with its duration and late check-in time.</p>
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
                                    <tr class="bg-white">
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(session.attendance_date ? formatDate(session.attendance_date) : '--')}</td>
                                        <td class="whitespace-nowrap px-4 py-3">
                                            <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${sessionTypeBadgeClass(session.session_type)}">
                                                ${escapeHtml(session.session_type_label ?? 'Attendance')}
                                            </span>
                                        </td>
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(session.check_in_time ?? '--')}</td>
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(session.is_in_progress ? 'In progress' : (session.check_out_time ?? '--'))}</td>
                                        <td class="whitespace-nowrap px-4 py-3 font-medium text-slate-950">${escapeHtml(session.duration_human ?? '--')}</td>
                                        <td class="whitespace-nowrap px-4 py-3 font-medium ${(session.late_human ?? '--') !== '--' && (session.late_human ?? '0m') !== '0m' ? 'text-amber-700' : 'text-slate-700'}">${escapeHtml(session.late_human ?? '--')}</td>
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(session.method ?? 'Unknown')}</td>
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
                                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${escapeHtml(record.time ?? '--')}</td>
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

    const runReport = async () => {
        const deviceUserId = elements.user?.value ?? '';
        const fromDate = elements.from?.value ?? '';
        const toDate = elements.to?.value ?? '';

        if (!deviceUserId) {
            setStatusMessage('Choose an employee first.', 'rose');
            return;
        }

        if (!fromDate || !toDate) {
            setStatusMessage('Choose a start date and an end date.', 'rose');
            return;
        }

        if (fromDate > toDate) {
            setStatusMessage('The end date must be after the start date.', 'rose');
            return;
        }

        renderLoading();
        setStatusMessage('');
        elements.submit.disabled = true;

        try {
            const url = new URL('/api/attendance/report', window.location.origin);
            url.searchParams.set('device_user_id', deviceUserId);
            url.searchParams.set('from_date', fromDate);
            url.searchParams.set('to_date', toDate);

            const response = await fetch(url, {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error('Failed to load the attendance report.');
            }

            const payload = await response.json();
            renderReport(payload);
            setStatusMessage('Report loaded successfully.');
        } catch (error) {
            renderPlaceholder();
            setStatusMessage(error.message ?? 'Failed to load the attendance report.', 'rose');
        } finally {
            elements.submit.disabled = false;
        }
    };

    const today = getTodayDateString();
    const monthStart = getMonthStartDateString();

    if (elements.from) {
        elements.from.value = monthStart;
        elements.from.max = today;
    }

    if (elements.to) {
        elements.to.value = today;
        elements.to.max = today;
    }

    elements.user?.addEventListener('change', () => {
        updateWorkingHoursSummary();
    });

    elements.form?.addEventListener('submit', (event) => {
        event.preventDefault();
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
}

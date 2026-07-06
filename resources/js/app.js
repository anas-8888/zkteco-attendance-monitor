import './bootstrap';

const dashboard = document.querySelector('[data-attendance-dashboard]');

if (dashboard) {
    const stateClass = {
        check_in: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        check_out: 'bg-red-50 text-red-700 ring-red-200',
    };

    const elements = {
        deviceStatus: dashboard.querySelector('[data-device-status]'),
        lastSync: dashboard.querySelector('[data-last-sync]'),
        totalCheckIns: dashboard.querySelector('[data-total-check-ins]'),
        totalCheckOuts: dashboard.querySelector('[data-total-check-outs]'),
        totalRecords: dashboard.querySelector('[data-total-records]'),
        rows: dashboard.querySelector('[data-attendance-rows]'),
    };

    const formatDateTime = (value) => {
        if (!value) {
            return 'Not synced yet';
        }

        return new Intl.DateTimeFormat(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
        }).format(new Date(value));
    };

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const renderStatus = (status) => {
        const online = Boolean(status?.online);
        const color = online ? 'bg-emerald-500' : 'bg-red-500';
        const label = online ? 'Online' : 'Offline';

        elements.deviceStatus.innerHTML = `
            <span class="h-2.5 w-2.5 rounded-full ${color}"></span>
            ${label}
        `;
    };

    const renderRows = (records) => {
        if (!records.length) {
            elements.rows.innerHTML = '<tr><td class="px-4 py-6 text-sm text-zinc-500" colspan="5">No attendance records today.</td></tr>';
            return;
        }

        elements.rows.innerHTML = records.map((record) => {
            const badgeClass = stateClass[record.state] ?? 'bg-zinc-100 text-zinc-700 ring-zinc-200';

            return `
                <tr class="bg-white">
                    <td class="whitespace-nowrap px-4 py-4 text-sm font-medium text-zinc-950">${escapeHtml(record.employee_name)}</td>
                    <td class="whitespace-nowrap px-4 py-4 text-sm text-zinc-600">${escapeHtml(record.device_user_id)}</td>
                    <td class="whitespace-nowrap px-4 py-4 text-sm text-zinc-600">${escapeHtml(record.time)}</td>
                    <td class="whitespace-nowrap px-4 py-4 text-sm">
                        <span class="inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${badgeClass}">
                            ${escapeHtml(record.state_label)}
                        </span>
                    </td>
                    <td class="whitespace-nowrap px-4 py-4 text-sm text-zinc-600">${escapeHtml(record.verification_type ?? 'Unknown')}</td>
                </tr>
            `;
        }).join('');
    };

    const refreshDashboard = async () => {
        try {
            const [todayResponse, statusResponse] = await Promise.all([
                fetch('/api/attendance/today', { headers: { Accept: 'application/json' } }),
                fetch('/api/device/status', { headers: { Accept: 'application/json' } }),
            ]);

            if (!todayResponse.ok || !statusResponse.ok) {
                throw new Error('Unable to refresh attendance dashboard.');
            }

            const [today, status] = await Promise.all([
                todayResponse.json(),
                statusResponse.json(),
            ]);

            elements.totalCheckIns.textContent = today.total_check_ins ?? 0;
            elements.totalCheckOuts.textContent = today.total_check_outs ?? 0;
            elements.totalRecords.textContent = today.total_records ?? 0;
            elements.lastSync.textContent = formatDateTime(today.last_sync_at);

            renderRows(today.records ?? []);
            renderStatus(status);
        } catch (error) {
            renderStatus({ online: false });
            elements.rows.innerHTML = '<tr><td class="px-4 py-6 text-sm text-red-600" colspan="5">Unable to load attendance data.</td></tr>';
            console.error(error);
        }
    };

    refreshDashboard();
    window.setInterval(refreshDashboard, 30000);
}

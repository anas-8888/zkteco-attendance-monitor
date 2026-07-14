import './bootstrap';

const workingHoursPage = document.querySelector('[data-working-hours-page]');
const englishLocale = 'en-US';

if (workingHoursPage) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
    const elements = {
        form: workingHoursPage.querySelector('[data-default-hours-form]'),
        summary: workingHoursPage.querySelector('[data-default-hours-summary]'),
        start: workingHoursPage.querySelector('[data-default-work-start]'),
        end: workingHoursPage.querySelector('[data-default-work-end]'),
        offDays: Array.from(workingHoursPage.querySelectorAll('[data-default-off-day]')),
        result: workingHoursPage.querySelector('[data-default-hours-result]'),
        submit: workingHoursPage.querySelector('[data-default-hours-submit]'),
    };
    const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const formatClockTime = (value) => {
        const normalized = String(value ?? '').trim();

        if (!normalized) {
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

    const renderResult = (message, tone = 'zinc') => {
        if (!elements.result) {
            return;
        }

        const toneClasses = {
            zinc: 'text-slate-500',
            rose: 'text-rose-600',
            emerald: 'text-emerald-700',
        };

        elements.result.innerHTML = `
            <p class="text-sm ${toneClasses[tone] || toneClasses.zinc}">${escapeHtml(message)}</p>
        `;
    };

    const selectedOffDays = () => elements.offDays
        .filter((input) => input.checked)
        .map((input) => Number.parseInt(input.value, 10))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        .sort((left, right) => left - right);

    const formatOffDays = (days) => {
        if (!days.length) {
            return 'None';
        }

        return days.map((day) => weekdayLabels[day] ?? String(day)).join(', ');
    };

    const updateSummary = (start, end, offDays = selectedOffDays()) => {
        if (!elements.summary) {
            return;
        }

        elements.summary.textContent = `Default working hours: ${formatClockTime(start)} - ${formatClockTime(end)} | Off days: ${formatOffDays(offDays)}`;
    };

    elements.form?.addEventListener('submit', async (event) => {
        event.preventDefault();

        const workStartTime = elements.start?.value ?? '';
        const workEndTime = elements.end?.value ?? '';

        if (!workStartTime || !workEndTime) {
            renderResult('Choose both the work start and work end times.', 'rose');
            return;
        }

        if (workEndTime <= workStartTime) {
            renderResult('The work end time must be after the work start time.', 'rose');
            return;
        }

        const offDays = selectedOffDays();

        if (!offDays.length) {
            renderResult('Choose at least one weekly off day.', 'rose');
            return;
        }

        if (elements.submit) {
            elements.submit.disabled = true;
        }

        renderResult('Saving default working hours and off days...');

        try {
            const response = await fetch('/api/attendance/default-working-hours', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    work_start_time: workStartTime,
                    work_end_time: workEndTime,
                    off_days: offDays,
                }),
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                const validationMessage = Object.values(payload?.errors ?? {})
                    .flat()
                    .find(Boolean);

                throw new Error(validationMessage || payload?.message || 'Failed to save the default working hours.');
            }

            const start = payload?.working_hours?.start_time || workStartTime;
            const end = payload?.working_hours?.end_time || workEndTime;
            const nextOffDays = Array.isArray(payload?.working_hours?.off_days) && payload.working_hours.off_days.length
                ? payload.working_hours.off_days
                : offDays;

            if (elements.start) {
                elements.start.value = start;
            }

            if (elements.end) {
                elements.end.value = end;
            }

            elements.offDays.forEach((input) => {
                input.checked = nextOffDays.includes(Number.parseInt(input.value, 10));
            });

            updateSummary(start, end, nextOffDays);
            renderResult(payload?.message || 'Default working hours saved successfully.', 'emerald');
        } catch (error) {
            renderResult(error.message ?? 'Failed to save the default working hours.', 'rose');
        } finally {
            if (elements.submit) {
                elements.submit.disabled = false;
            }
        }
    });

    updateSummary(elements.start?.value ?? '', elements.end?.value ?? '', selectedOffDays());
}

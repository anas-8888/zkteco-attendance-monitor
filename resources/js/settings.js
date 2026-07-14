import './bootstrap';

const settingsPage = document.querySelector('[data-settings-page]');

if (settingsPage) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
    const elements = {
        form: settingsPage.querySelector('[data-device-settings-form]'),
        summary: settingsPage.querySelector('[data-device-settings-summary]'),
        ip: settingsPage.querySelector('[data-device-ip]'),
        port: settingsPage.querySelector('[data-device-port]'),
        protocol: settingsPage.querySelector('[data-device-protocol]'),
        result: settingsPage.querySelector('[data-device-settings-result]'),
        submit: settingsPage.querySelector('[data-device-settings-submit]'),
    };

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

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

    const updateSummary = (ipAddress, port, protocol) => {
        if (!elements.summary) {
            return;
        }

        elements.summary.textContent = `Device IP: ${ipAddress} | Port: ${port} | Protocol: ${String(protocol).toUpperCase()}`;
    };

    elements.form?.addEventListener('submit', async (event) => {
        event.preventDefault();

        const deviceIp = elements.ip?.value?.trim() ?? '';
        const devicePort = Number.parseInt(elements.port?.value ?? '', 10);
        const deviceProtocol = elements.protocol?.value?.trim() ?? 'auto';

        if (!deviceIp) {
            renderResult('Enter the device IP address first.', 'rose');
            return;
        }

        if (!Number.isInteger(devicePort) || devicePort < 1 || devicePort > 65535) {
            renderResult('Enter a valid device port between 1 and 65535.', 'rose');
            return;
        }

        if (elements.submit) {
            elements.submit.disabled = true;
        }

        renderResult('Saving device connection settings...');

        try {
            const response = await fetch('/api/attendance/device-settings', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    device_ip: deviceIp,
                    device_port: devicePort,
                    device_protocol: deviceProtocol,
                }),
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                const validationMessage = Object.values(payload?.errors ?? {})
                    .flat()
                    .find(Boolean);

                throw new Error(validationMessage || payload?.message || 'Failed to save the device connection settings.');
            }

            const nextIp = payload?.device?.ip || deviceIp;
            const nextPort = payload?.device?.port || devicePort;
            const nextProtocol = payload?.device?.protocol || deviceProtocol;

            if (elements.ip) {
                elements.ip.value = nextIp;
            }

            if (elements.port) {
                elements.port.value = String(nextPort);
            }

            if (elements.protocol) {
                elements.protocol.value = String(nextProtocol);
            }

            updateSummary(nextIp, nextPort, nextProtocol);
            renderResult(payload?.message || `Device connection saved successfully. Current connection: ${nextIp}:${nextPort} over ${String(nextProtocol).toUpperCase()}`, 'emerald');
        } catch (error) {
            renderResult(error.message ?? 'Failed to save the device connection settings.', 'rose');
        } finally {
            if (elements.submit) {
                elements.submit.disabled = false;
            }
        }
    });
}

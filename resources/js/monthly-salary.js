import './bootstrap';

import { buildEmployeesDataset, fetchMonthlyStatistics } from './monthly-salary/backend';
import { renderDetailView, renderDirectoryView, renderSettingsModal } from './monthly-salary/renderers';
import {
    buildWizardReview,
    calculateEmployeeSummary,
    clampNumber,
    createDefaultDaySchedule,
    createEmptyAdjustment,
    createEmptyEmployeeProfile,
    createEmptyHoliday,
    createEmptyLeave,
    DAY_FILTER_OPTIONS,
    deepClone,
    DETAIL_TABS,
    EMPLOYEE_PAGE_SIZE,
    escapeHtml,
    getCurrentMonthString,
    getMonthLabel,
    loadSettings,
    matchesAttendanceFilter,
    matchesDayFilter,
    matchesEmployeeSearch,
    mergeEmployeeProfile,
    normalizeHolidayTargets,
    removeArrayItem,
    saveSettings,
    serializeEmployeeForStorage,
    setPathValue,
    STATUS_FILTER_OPTIONS,
    validateEmployeeDraft,
    validateWizardStep,
    WIZARD_STEPS,
} from './monthly-salary/utils';

const salaryPage = document.querySelector('[data-salary-page]');
const englishLocale = 'en-US';

if (salaryPage) {
    const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read the selected image.'));
        reader.readAsDataURL(file);
    });

    const normalizeEmployeeStatus = (status) => {
        switch (status) {
            case 'Active':
                return 'Active';
            case 'Inactive':
                return 'Inactive';
            case 'Suspended':
            case 'Suspended temporarily':
                return 'Suspended';
            default:
                return status || 'Active';
        }
    };

    const elements = {
        content: salaryPage.querySelector('[data-salary-content]'),
        modal: salaryPage.querySelector('[data-settings-modal-root]'),
        status: salaryPage.querySelector('[data-salary-status]'),
    };

    const state = {
        month: salaryPage.dataset.initialMonth || getCurrentMonthString(),
        mode: salaryPage.dataset.pageMode || 'directory',
        activeEmployeeId: salaryPage.dataset.currentEmployeeId || '',
        activeTab: DETAIL_TABS[0].value,
        employees: [],
        settings: loadSettings(),
        filters: {
            query: '',
            department: 'all',
            attendance: 'all',
            day: 'all',
        },
        visibleCount: EMPLOYEE_PAGE_SIZE,
        expandedDays: new Set(),
        loadError: '',
        wizard: {
            open: false,
            mode: 'add',
            stepIndex: 0,
            draftEmployee: null,
            errors: [],
        },
    };

    const getDirectoryUrl = () => salaryPage.dataset.directoryUrl || '/salary-statistics';

    const getEmployeeDetailUrl = (employeeId) => {
        const template = salaryPage.dataset.detailUrlTemplate || '/employees/EMPLOYEE_ID_PLACEHOLDER';
        return template.replace('EMPLOYEE_ID_PLACEHOLDER', encodeURIComponent(employeeId));
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
            zinc: 'border-slate-200 bg-slate-50 text-slate-700',
            amber: 'border-amber-200 bg-amber-50 text-amber-700',
            red: 'border-rose-200 bg-rose-50 text-rose-700',
        };

        elements.status.innerHTML = `
            <div class="rounded-2xl border px-4 py-3 text-sm ${toneClasses[tone] || toneClasses.zinc}">
                ${escapeHtml(message)}
            </div>
        `;
    };

    const getDepartmentOptions = () => {
        const departments = [...new Set(state.employees.map((employee) => employee.department).filter(Boolean))].sort();

        return [
            { value: 'all', label: 'All departments' },
            ...departments.map((department) => ({ value: department, label: department })),
        ];
    };

    const buildEmployeeSummaries = () => state.employees.map((employee) => ({
        employee,
        summary: calculateEmployeeSummary(employee, state.month),
    }));

    const getEmployeeById = (employeeId) => state.employees.find((employee) => employee.id === employeeId) ?? null;

    const persistSettingsState = () => {
        saveSettings(state.settings);
    };

    const persistEmployeeProfile = (employee) => {
        const serializedEmployee = serializeEmployeeForStorage(employee);
        state.settings.profiles[employee.id] = serializedEmployee;

        if (serializedEmployee.source === 'custom') {
            const customEmployees = state.settings.customEmployees ?? [];
            const existingIndex = customEmployees.findIndex((item) => item.id === serializedEmployee.id);

            if (existingIndex >= 0) {
                customEmployees[existingIndex] = serializedEmployee;
            } else {
                customEmployees.push(serializedEmployee);
            }

            state.settings.customEmployees = customEmployees;
        } else {
            state.settings.customEmployees = (state.settings.customEmployees ?? []).filter((item) => item.id !== serializedEmployee.id);
        }

        persistSettingsState();
    };

    const getFilteredEmployees = () => buildEmployeeSummaries().filter(({ employee, summary }) => {
        const matchesDepartment = state.filters.department === 'all' || employee.department === state.filters.department;

        return matchesDepartment
            && matchesEmployeeSearch(employee, state.filters.query)
            && matchesAttendanceFilter(summary, state.filters.attendance);
    });

    const openWizard = (mode, employeeId = '') => {
        const employee = mode === 'edit' ? getEmployeeById(employeeId) : null;
        const draftEmployee = employee
            ? deepClone(employee)
            : createEmptyEmployeeProfile();
        draftEmployee.status = normalizeEmployeeStatus(draftEmployee.status);

        draftEmployee.holidays = (draftEmployee.holidays ?? []).map((holiday) => normalizeHolidayTargets(draftEmployee, holiday));
        draftEmployee.leaves = (draftEmployee.leaves ?? []).map((leave) => ({
            ...leave,
            employeeId: draftEmployee.id,
        }));

        state.wizard = {
            open: true,
            mode,
            stepIndex: 0,
            draftEmployee,
            errors: [],
        };

        renderModal();
    };

    const closeWizard = () => {
        state.wizard = {
            open: false,
            mode: 'add',
            stepIndex: 0,
            draftEmployee: null,
            errors: [],
        };

        renderModal();
    };

    const syncDraftTargets = () => {
        if (!state.wizard.draftEmployee) {
            return;
        }

        state.wizard.draftEmployee.holidays = (state.wizard.draftEmployee.holidays ?? []).map((holiday) => normalizeHolidayTargets(state.wizard.draftEmployee, holiday));
        state.wizard.draftEmployee.leaves = (state.wizard.draftEmployee.leaves ?? []).map((leave) => ({
            ...leave,
            employeeId: state.wizard.draftEmployee.id,
        }));
    };

    const saveWizardEmployee = () => {
        if (!state.wizard.draftEmployee) {
            return;
        }

        syncDraftTargets();
        const validationErrors = validateEmployeeDraft(
            state.wizard.draftEmployee,
            state.employees,
            state.wizard.mode === 'edit' ? state.wizard.draftEmployee.id : '',
        );

        if (validationErrors.length) {
            state.wizard.errors = validationErrors;
            renderModal();
            return;
        }

        const existingEmployee = getEmployeeById(state.wizard.draftEmployee.id);
        const mergedEmployee = existingEmployee
            ? mergeEmployeeProfile(existingEmployee, state.wizard.draftEmployee)
            : deepClone(state.wizard.draftEmployee);

        const nextEmployees = existingEmployee
            ? state.employees.map((employee) => (employee.id === mergedEmployee.id ? mergedEmployee : employee))
            : [...state.employees, mergedEmployee];

        state.employees = nextEmployees.sort((left, right) => left.name.localeCompare(right.name));
        persistEmployeeProfile(mergedEmployee);
        closeWizard();
        render();
    };

    const handleWizardStepChange = (direction) => {
        if (!state.wizard.draftEmployee) {
            return;
        }

        if (direction === 'next') {
            const errors = validateWizardStep(
                state.wizard.draftEmployee,
                state.wizard.stepIndex,
                state.employees,
                state.wizard.mode === 'edit' ? state.wizard.draftEmployee.id : '',
            );

            if (errors.length) {
                state.wizard.errors = errors;
                renderModal();
                return;
            }
        }

        state.wizard.stepIndex = clampNumber(
            state.wizard.stepIndex + (direction === 'next' ? 1 : -1),
            0,
            WIZARD_STEPS.length - 1,
        );
        state.wizard.errors = [];
        renderModal();
    };

    const renderDirectory = () => {
        const filteredEmployees = getFilteredEmployees();
        const visibleEmployees = filteredEmployees.slice(0, state.visibleCount).map((item) => ({
            ...item,
            query: state.filters.query,
            month: state.month,
        }));
        const summaryCards = [
            {
                label: 'Total employees',
                value: String(filteredEmployees.length),
                note: 'Employees in the current search result.',
                valueClass: 'text-slate-950',
            },
            {
                label: 'Configured',
                value: String(filteredEmployees.filter(({ summary }) => summary.configuredSchedule).length),
                note: 'Profiles with independent salary and schedule settings configured.',
                valueClass: 'text-emerald-700',
            },
            {
                label: 'Needs setup',
                value: String(filteredEmployees.filter(({ summary }) => !summary.configuredSchedule).length),
                note: 'Missing salary, schedule, or deduction rule setup.',
                valueClass: 'text-amber-700',
            },
            {
                label: 'Estimated deductions',
                value: filteredEmployees.reduce((total, item) => total + item.summary.totalDeductions, 0).toLocaleString(englishLocale, {
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 2,
                }),
                note: 'Total deductions in the current month view.',
                valueClass: 'text-rose-700',
            },
        ];

        elements.content.innerHTML = renderDirectoryView({
            month: state.month,
            filters: {
                ...state.filters,
                departmentOptions: getDepartmentOptions(),
            },
            visibleEmployees,
            hasMore: filteredEmployees.length > state.visibleCount,
            summaryCards,
            totalFilteredEmployees: filteredEmployees.length,
        });

        document.title = 'Employee Attendance & Payroll';
    };

    const renderDetail = () => {
        const employee = getEmployeeById(state.activeEmployeeId);

        if (!employee) {
            elements.content.innerHTML = `
                <section class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                    <h1 class="text-2xl font-semibold text-slate-950">Employee not found</h1>
                    <p class="mt-3 text-sm leading-6 text-slate-600">The requested employee profile is not available in the current directory.</p>
                    <button type="button" data-action="back-to-directory" class="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                        Back to employee directory
                    </button>
                </section>
            `;
            document.title = 'Employee not found';
            return;
        }

        const summary = calculateEmployeeSummary(employee, state.month);
        const visibleRecords = summary.dailyRecords.filter((record) => matchesDayFilter(record, state.filters.day));

        elements.content.innerHTML = renderDetailView({
            employee,
            month: state.month,
            summary,
            activeTab: state.activeTab,
            dayFilter: state.filters.day,
            visibleRecords,
            expandedDays: state.expandedDays,
        });

        document.title = `${employee.name} - Attendance & Payroll`;
    };

    const renderModal = () => {
        const previousScrollContainer = elements.modal.querySelector('[data-settings-modal-scroll]');
        const previousScrollTop = previousScrollContainer?.scrollTop ?? 0;

        if (!state.wizard.open || !state.wizard.draftEmployee) {
            elements.modal.innerHTML = '';
            return;
        }

        elements.modal.innerHTML = renderSettingsModal({
            draftEmployee: state.wizard.draftEmployee,
            mode: state.wizard.mode,
            stepIndex: state.wizard.stepIndex,
            errors: state.wizard.errors,
            reviewSummary: buildWizardReview(state.wizard.draftEmployee),
        });

        const nextScrollContainer = elements.modal.querySelector('[data-settings-modal-scroll]');
        if (nextScrollContainer) {
            nextScrollContainer.scrollTop = previousScrollTop;
        }
    };

    const render = () => {
        if (state.mode === 'detail') {
            renderDetail();
        } else {
            renderDirectory();
        }

        renderModal();
    };

    const loadEmployees = async () => {
        setStatusMessage('Loading employee profiles, schedules, leave, and monthly attendance records...');

        try {
            const payload = await fetchMonthlyStatistics(state.month);
            state.employees = buildEmployeesDataset({
                savedSettings: state.settings,
                backendPayload: payload,
                monthKey: state.month,
            });
            state.loadError = '';
            setStatusMessage(`Now showing ${state.employees.length} employee profiles for ${getMonthLabel(state.month)}.`, 'zinc');
        } catch (error) {
            state.employees = buildEmployeesDataset({
                savedSettings: state.settings,
                backendPayload: {
                    employees: [],
                    records: [],
                },
                monthKey: state.month,
            });
            state.loadError = error instanceof Error ? error.message : 'Failed to load monthly attendance records.';
            setStatusMessage('Failed to load live monthly attendance data. The page will not show mock data and will only show locally saved data if available.', 'amber');
        }

        render();
    };

    salaryPage.addEventListener('input', (event) => {
        const target = event.target;

        if (!(target instanceof HTMLInputElement)) {
            return;
        }

        if (target.hasAttribute('data-filter-query')) {
            state.filters.query = target.value;
            state.visibleCount = EMPLOYEE_PAGE_SIZE;
            render();
            return;
        }

        if (state.wizard.open && target.dataset.path && state.wizard.draftEmployee) {
            if (target.dataset.inputType === 'image') {
                return;
            }

            const value = target.dataset.inputType === 'number'
                ? (target.value === '' ? '' : Number(target.value))
                : target.value;

            setPathValue(state.wizard.draftEmployee, target.dataset.path, value);
            state.wizard.errors = [];
        }
    });

    salaryPage.addEventListener('change', async (event) => {
        const target = event.target;

        if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
            return;
        }

        if (target.hasAttribute('data-filter-month')) {
            state.month = target.value || getCurrentMonthString();
            state.expandedDays.clear();
            state.visibleCount = EMPLOYEE_PAGE_SIZE;
            await loadEmployees();
            return;
        }

        if (target.hasAttribute('data-filter-department')) {
            state.filters.department = target.value || 'all';
            state.visibleCount = EMPLOYEE_PAGE_SIZE;
            render();
            return;
        }

        if (target.hasAttribute('data-filter-attendance')) {
            state.filters.attendance = STATUS_FILTER_OPTIONS.some((option) => option.value === target.value) ? target.value : 'all';
            state.visibleCount = EMPLOYEE_PAGE_SIZE;
            render();
            return;
        }

        if (target.hasAttribute('data-filter-day')) {
            state.filters.day = DAY_FILTER_OPTIONS.some((option) => option.value === target.value) ? target.value : 'all';
            render();
            return;
        }

        if (state.wizard.open && target.dataset.path && state.wizard.draftEmployee) {
            if (target instanceof HTMLInputElement && target.dataset.inputType === 'image') {
                const file = target.files?.[0];

                if (!file) {
                    return;
                }

                try {
                    const imageDataUrl = await readFileAsDataUrl(file);
                    setPathValue(state.wizard.draftEmployee, target.dataset.path, imageDataUrl);
                    state.wizard.errors = [];
                    renderModal();
                } catch (error) {
                    state.wizard.errors = [error instanceof Error ? error.message : 'Failed to read the selected image.'];
                    renderModal();
                }

                return;
            }

            const value = target instanceof HTMLInputElement && target.dataset.inputType === 'checkbox'
                ? target.checked
                : target instanceof HTMLInputElement && target.dataset.inputType === 'number'
                    ? (target.value === '' ? '' : Number(target.value))
                    : target.value;

            setPathValue(state.wizard.draftEmployee, target.dataset.path, value);

            if (
                target instanceof HTMLInputElement
                && target.dataset.inputType === 'checkbox'
                && target.checked
                && target.dataset.path?.startsWith('weeklySchedule.')
                && target.dataset.path?.endsWith('.isWorkingDay')
            ) {
                const dayKey = target.dataset.path.split('.')[1];
                const defaultDaySchedule = createDefaultDaySchedule();
                const currentSchedule = state.wizard.draftEmployee.weeklySchedule?.[dayKey] ?? {};

                state.wizard.draftEmployee.weeklySchedule[dayKey] = {
                    ...defaultDaySchedule,
                    ...currentSchedule,
                    isWorkingDay: true,
                    startTime: currentSchedule.startTime || defaultDaySchedule.startTime,
                    endTime: currentSchedule.endTime || defaultDaySchedule.endTime,
                    requiredHours: Number(currentSchedule.requiredHours ?? 0) > 0
                        ? currentSchedule.requiredHours
                        : defaultDaySchedule.requiredHours,
                };
            }

            syncDraftTargets();
            state.wizard.errors = [];
            renderModal();
        }
    });

    salaryPage.addEventListener('click', (event) => {
        const target = event.target;

        if (!(target instanceof HTMLElement)) {
            return;
        }

        const actionElement = target.closest('[data-action]');
        const employeeTrigger = target.closest('[data-view-employee]');
        const settingsTrigger = target.closest('[data-open-settings]');
        const tabTrigger = target.closest('[data-tab]');
        const dayTrigger = target.closest('[data-toggle-day]');

        if (employeeTrigger instanceof HTMLElement) {
            const employeeId = employeeTrigger.dataset.viewEmployee;

            if (employeeId) {
                window.location.assign(getEmployeeDetailUrl(employeeId));
            }
            return;
        }

        if (settingsTrigger instanceof HTMLElement) {
            const employeeId = settingsTrigger.dataset.openSettings;

            if (employeeId) {
                openWizard('edit', employeeId);
            }
            return;
        }

        if (tabTrigger instanceof HTMLElement) {
            const tab = tabTrigger.dataset.tab;

            if (tab && DETAIL_TABS.some((item) => item.value === tab)) {
                state.activeTab = tab;
                render();
            }
            return;
        }

        if (dayTrigger instanceof HTMLElement) {
            const dayId = dayTrigger.dataset.toggleDay;

            if (!dayId) {
                return;
            }

            if (state.expandedDays.has(dayId)) {
                state.expandedDays.delete(dayId);
            } else {
                state.expandedDays.add(dayId);
            }

            render();
            return;
        }

        if (!(actionElement instanceof HTMLElement)) {
            return;
        }

        switch (actionElement.dataset.action) {
            case 'clear-directory-filters':
                state.filters.query = '';
                state.filters.department = 'all';
                state.filters.attendance = 'all';
                state.visibleCount = EMPLOYEE_PAGE_SIZE;
                render();
                break;
            case 'load-more':
                state.visibleCount += EMPLOYEE_PAGE_SIZE;
                render();
                break;
            case 'back-to-directory':
                window.location.assign(getDirectoryUrl());
                break;
            case 'open-add-employee':
                openWizard('add');
                break;
            case 'wizard-close':
                closeWizard();
                break;
            case 'wizard-next':
                handleWizardStepChange('next');
                break;
            case 'wizard-prev':
                handleWizardStepChange('prev');
                break;
            case 'wizard-save':
                saveWizardEmployee();
                break;
            case 'remove-avatar':
                if (state.wizard.draftEmployee) {
                    state.wizard.draftEmployee.avatar = '';
                    state.wizard.errors = [];
                    renderModal();
                }
                break;
            case 'add-holiday':
                if (state.wizard.draftEmployee) {
                    state.wizard.draftEmployee.holidays = [...(state.wizard.draftEmployee.holidays ?? []), normalizeHolidayTargets(state.wizard.draftEmployee, createEmptyHoliday())];
                    renderModal();
                }
                break;
            case 'remove-holiday':
                if (state.wizard.draftEmployee) {
                    const index = Number(actionElement.dataset.index);
                    state.wizard.draftEmployee.holidays = removeArrayItem(state.wizard.draftEmployee.holidays ?? [], index);
                    renderModal();
                }
                break;
            case 'add-leave':
                if (state.wizard.draftEmployee) {
                    state.wizard.draftEmployee.leaves = [...(state.wizard.draftEmployee.leaves ?? []), createEmptyLeave(state.wizard.draftEmployee.id)];
                    renderModal();
                }
                break;
            case 'remove-leave':
                if (state.wizard.draftEmployee) {
                    const index = Number(actionElement.dataset.index);
                    state.wizard.draftEmployee.leaves = removeArrayItem(state.wizard.draftEmployee.leaves ?? [], index);
                    renderModal();
                }
                break;
            case 'add-adjustment':
                if (state.wizard.draftEmployee) {
                    state.wizard.draftEmployee.manualAdjustments = [...(state.wizard.draftEmployee.manualAdjustments ?? []), createEmptyAdjustment()];
                    renderModal();
                }
                break;
            case 'remove-adjustment':
                if (state.wizard.draftEmployee) {
                    const index = Number(actionElement.dataset.index);
                    state.wizard.draftEmployee.manualAdjustments = removeArrayItem(state.wizard.draftEmployee.manualAdjustments ?? [], index);
                    renderModal();
                }
                break;
        }
    });

    loadEmployees();
}


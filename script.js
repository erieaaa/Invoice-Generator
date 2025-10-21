document.addEventListener('DOMContentLoaded', function() {
    // --- CONFIGURATION ---
    const API_KEY = 'AIzaSyDC19jZi4kwBD-3Pr0bFIdESTw5FrAZO8M'; // IMPORTANT! Replace with your actual Google Sheets API key

 // --- GLOBAL STATE ---
    let totalMinutes = 0;
    let rawData = []; // Store data from either source (file or GSheet)

    // --- ELEMENT SELECTORS ---
    const inputs = {
        clientName: document.getElementById('client-name'),
        clientCompany: document.getElementById('client-company'),
        clientEmail: document.getElementById('client-email'),
        spreadsheetId: document.getElementById('spreadsheet-id'),
        sheetSelector: document.getElementById('sheet-selector'),
        fileUploader: document.getElementById('file-uploader'),
        startDate: document.getElementById('start-date'),
        endDate: document.getElementById('end-date'),
        paymentMethod: document.getElementById('payment-method'),
        paymentDetails: document.getElementById('payment-details'),
        billingMethod: document.getElementById('billing-method'),
        hourlyRate: document.getElementById('hourly-rate'),
        fixedRate: document.getElementById('fixed-rate'),
    };
    const inputGroups = {
        hourlyRate: document.getElementById('hourly-rate-group'),
        fixedRate: document.getElementById('fixed-rate-group'),
    };
    const previews = {
        invoiceId: document.getElementById('preview-invoice-id'),
        invoiceDate: document.getElementById('preview-invoice-date'),
        clientName: document.getElementById('preview-client-name'),
        clientCompany: document.getElementById('preview-client-company'),
        clientEmail: document.getElementById('preview-client-email'),
        billingPeriod: document.getElementById('preview-billing-period'),
        paymentMethod: document.getElementById('preview-payment-method'),
        paymentDetails: document.getElementById('preview-payment-details'),
        invoiceBody: document.getElementById('invoice-body'),
        totalHours: document.getElementById('total-hours'),
        subtotalContainer: document.getElementById('subtotal-container'),
        feeContainer: document.getElementById('fee-container'),
        subtotal: document.getElementById('preview-subtotal'),
        fee: document.getElementById('preview-fee'),
        totalAmount: document.getElementById('total-amount'),
        totalAmountLabel: document.getElementById('total-amount-label'),
    };
    const buttons = {
        loadSheets: document.getElementById('load-sheets-btn'),
        fetchData: document.getElementById('fetch-data-btn'),
        generatePdf: document.getElementById('generate-pdf-btn'),
        saveDefaults: document.getElementById('save-defaults-btn'),
        clearDefaults: document.getElementById('clear-defaults-btn'),
    };

    // --- DEFAULTS FUNCTIONS ---
    function saveDefaults() {
        // ... (This function remains unchanged)
    }
    function clearDefaults() {
        // ... (This function remains unchanged)
    }
    function loadDefaults() {
        // ... (This function remains unchanged)
    }

    // --- HELPER FUNCTIONS ---
    function formatTime(timeString) {
        // ... (This function remains unchanged)
    }
    function parseDurationToMinutes(durationStr) {
        if (!durationStr) return 0;
        durationStr = String(durationStr).trim();

        if (durationStr.includes(':')) {
            const [hours, minutes] = durationStr.split(':').map(Number);
            return (hours || 0) * 60 + (minutes || 0);
        } else {
            const decimalHours = parseFloat(durationStr);
            return isNaN(decimalHours) ? 0 : decimalHours * 60;
        }
    }
    function parseTimeValueToMinutes(timeValue) {
        if (typeof timeValue === 'number') {
            return timeValue;
        }
        if (typeof timeValue === 'string') {
            return parseDurationToMinutes(timeValue);
        }
        return 0;
    }
    function handleBillingMethodChange() {
        // ... (This function remains unchanged)
    }
    function calculateAndDisplayTotals() {
        // ... (This function remains unchanged)
    }
    function generateInvoiceId() {
        // ... (This function remains unchanged)
    }
    function updatePreview() {
        // ... (This function remains unchanged)
    }
    function generateFromSource() {
        // ... (This function remains unchanged)
    }

    // --- DATA SOURCE LOGIC (FILE UPLOAD) ---
    function handleFile(file) {
        // ... (This function remains unchanged)
    }

    // --- DATA SOURCE LOGIC (GOOGLE SHEETS) ---
    async function populateSheetDropdown() {
        // ... (This function remains unchanged)
    }
    async function fetchDataFromGoogleSheet() {
        // ... (This function remains unchanged)
    }

    // --- SMART HEADER MAPPING ---
    function mapHeaders(headers) {
        const mapping = {};
        const aliases = {
            date: ['date', 'day'],
            tasks: ['tasks', 'task', 'description', 'activity', 'work done', 'note', 'project'],
            from: ['from', 'start time', 'start'],
            to: ['to', 'end time', 'end'],
            duration: ['duration', 'hours', 'time spent', 'total time', 'entry time (minutes)']
        };

        for (const key in aliases) {
            for (const originalHeader of headers) {
                const lowerHeader = String(originalHeader).trim().toLowerCase();
                if (aliases[key].includes(lowerHeader)) {
                    mapping[key] = originalHeader;
                    break;
                }
            }
        }
        return mapping;
    }

    // --- UPGRADED: CENTRAL DATA PROCESSING FUNCTION ---
    function processAndDisplayData() {
        totalMinutes = 0;
        previews.invoiceBody.innerHTML = '';
        updatePreview();

        if (rawData.length === 0) {
            previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No data loaded. Please upload a file or fetch from a Google Sheet.</td></tr>';
            return;
        }

        const headers = Object.keys(rawData[0]);
        const mappedHeaders = mapHeaders(headers);

        if (!mappedHeaders.date || !mappedHeaders.tasks || (!mappedHeaders.duration && (!mappedHeaders.from || !mappedHeaders.to))) {
            const message = 'Error: Could not find required columns. Please ensure your file has headers for "Date", "Tasks" (e.g., Note, Description), and "Duration" (or "From"/"To").';
            alert(message);
            previews.invoiceBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">${message}</td></tr>`;
            return;
        }

        if (!inputs.startDate.value || !inputs.endDate.value) {
            previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Please select a billing period to filter the data.</td></tr>';
            return;
        }

        const startDate = new Date(inputs.startDate.value);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(inputs.endDate.value);
        endDate.setHours(23, 59, 59, 999);

        const filteredRows = rawData.filter(row => {
            const dateValue = row[mappedHeaders.date];
            if (dateValue === null || dateValue === undefined) return false;

            let rowDate;
            if (typeof dateValue === 'number' && dateValue > 1) {
                rowDate = new Date(Date.UTC(1899, 11, 30 + dateValue));
            } else {
                rowDate = new Date(dateValue);
            }

            return !isNaN(rowDate) && startDate <= rowDate && rowDate <= endDate;
        });

        if (filteredRows.length === 0) {
            previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No entries found for the selected period.</td></tr>';
            calculateAndDisplayTotals();
            return;
        }

        const isDetailedLayout = mappedHeaders.from && mappedHeaders.to;

        document.getElementById('from-th').style.display = isDetailedLayout ? 'table-cell' : 'none';
        document.getElementById('to-th').style.display = isDetailedLayout ? 'table-cell' : 'none';

        filteredRows.forEach(row => {
            const dateValue = row[mappedHeaders.date];
            let rowDate;
            if (typeof dateValue === 'number' && dateValue > 1) {
                rowDate = new Date(Date.UTC(1899, 11, 30 + dateValue));
            } else {
                rowDate = new Date(dateValue);
            }

            const tasks = row[mappedHeaders.tasks] || '';
            const durationValue = row[mappedHeaders.duration] || '0:0';

            if (mappedHeaders.duration.toLowerCase().includes('minutes')) {
                totalMinutes += parseFloat(durationValue) || 0;
            } else {
                totalMinutes += parseTimeValueToMinutes(durationValue);
            }

            const tr = document.createElement('tr');

            if (isDetailedLayout) {
                tr.innerHTML = `
                    <td>${rowDate.toLocaleDateString()}</td>
                    <td>${tasks}</td>
                    <td>${formatTime(row[mappedHeaders.from] || '')}</td>
                    <td>${formatTime(row[mappedHeaders.to] || '')}</td>
                    <td>${durationValue}</td>
                `;
            } else { // Simple layout (Date, Task, Duration)
                // --- THIS IS THE FIX ---
                // We now generate simpler HTML directly, with only 3 cells.
                // The middle cell spans 3 columns to keep the table aligned.
                tr.innerHTML = `
                    <td>${rowDate.toLocaleDateString()}</td>
                    <td colspan="3">${tasks}</td>
                    <td>${durationValue}</td>
                `;
                // The broken lines that caused the error have been removed.
            }
            previews.invoiceBody.appendChild(tr);
        });

        const totalHoursVal = Math.floor(totalMinutes / 60);
        const remainingMinutes = Math.round(totalMinutes % 60);
        previews.totalHours.textContent = `${String(totalHoursVal).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
        calculateAndDisplayTotals();
    }

    function generatePdf() {
        window.scrollTo(0, 0);
        const invoiceElement = document.getElementById('invoice-preview');
        const clientName = inputs.clientCompany.value || 'Invoice';
        const invoiceId = previews.invoiceId.textContent;
        const opt = {
            margin: [0.5, 0.25, 0.5, 0.25],
            filename: `${clientName}_${invoiceId}.pdf`,
            pagebreak: { mode: 'css', avoid: ['thead', 'tr', '.invoice-footer'] },
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().from(invoiceElement).set(opt).save();
    }

    // --- INITIALIZATION & EVENT LISTENERS ---
    previews.invoiceId.textContent = generateInvoiceId();
    previews.invoiceDate.textContent = new Date().toLocaleDateString();

    buttons.loadSheets.addEventListener('click', populateSheetDropdown);
    buttons.fetchData.addEventListener('click', generateFromSource);
    inputs.fileUploader.addEventListener('change', (e) => handleFile(e.target.files[0]));

    const reprocessOnChange = () => { if (rawData.length > 0) processAndDisplayData(); };
    inputs.startDate.addEventListener('change', reprocessOnChange);
    inputs.endDate.addEventListener('change', reprocessOnChange);

    inputs.billingMethod.addEventListener('change', handleBillingMethodChange);
    inputs.paymentMethod.addEventListener('input', calculateAndDisplayTotals);
    inputs.hourlyRate.addEventListener('input', calculateAndDisplayTotals);
    inputs.fixedRate.addEventListener('input', calculateAndDisplayTotals);

    Object.values(inputs).forEach(input => {
        if (!['billingMethod', 'hourlyRate', 'fixedRate', 'paymentMethod', 'startDate', 'endDate', 'fileUploader'].includes(input.id)) {
            input.addEventListener('input', updatePreview);
        }
    });

    buttons.generatePdf.addEventListener('click', generatePdf);
    buttons.saveDefaults.addEventListener('click', saveDefaults);
    buttons.clearDefaults.addEventListener('click', clearDefaults);

    loadDefaults();
    updatePreview();
    handleBillingMethodChange();
});


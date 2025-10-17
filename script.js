document.addEventListener('DOMContentLoaded', function() {
    // --- NO LONGER NEEDED: API_KEY ---

    // --- GLOBAL STATE ---
    let totalMinutes = 0;
    let rawData = []; // Store the parsed file data globally

    // --- ELEMENT SELECTORS ---
    const inputs = {
        clientName: document.getElementById('client-name'),
        clientCompany: document.getElementById('client-company'),
        clientEmail: document.getElementById('client-email'),
        fileUploader: document.getElementById('file-uploader'), // NEW
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
        generatePdf: document.getElementById('generate-pdf-btn'),
        saveDefaults: document.getElementById('save-defaults-btn'),
        clearDefaults: document.getElementById('clear-defaults-btn'),
    };

    // --- DEFAULTS FUNCTIONS (REMOVED spreadsheetId) ---
    function saveDefaults() {
        const defaults = {
            clientName: inputs.clientName.value,
            clientCompany: inputs.clientCompany.value,
            clientEmail: inputs.clientEmail.value,
            paymentMethod: inputs.paymentMethod.value,
            paymentDetails: inputs.paymentDetails.value,
            billingMethod: inputs.billingMethod.value,
            hourlyRate: inputs.hourlyRate.value,
        };
        localStorage.setItem('invoiceDefaults', JSON.stringify(defaults));
        alert('Default client and payment info saved!');
    }
    function clearDefaults() {
        localStorage.removeItem('invoiceDefaults');
        // keep other fields as is
    }
    function loadDefaults() {
        const savedDefaults = localStorage.getItem('invoiceDefaults');
        if (savedDefaults) {
            const defaults = JSON.parse(savedDefaults);
            inputs.clientName.value = defaults.clientName || '';
            inputs.clientCompany.value = defaults.clientCompany || '';
            inputs.clientEmail.value = defaults.clientEmail || '';
            inputs.paymentMethod.value = defaults.paymentMethod || '';
            inputs.paymentDetails.value = defaults.paymentDetails || '';
            inputs.billingMethod.value = defaults.billingMethod || 'hourly';
            inputs.hourlyRate.value = defaults.hourlyRate || '5.00';
        }
    }

    // --- HELPER FUNCTIONS ---
    function formatTime(timeString) { /* ... no changes ... */ }
    function parseDurationToMinutes(durationStr) { /* ... no changes ... */ }
    function handleBillingMethodChange() { /* ... no changes ... */ }
    function calculateAndDisplayTotals() { /* ... no changes ... */ }
    function generateInvoiceId() { /* ... no changes ... */ }
    function updatePreview() { /* ... no changes ... */ }

    // --- NEW: File Handling and Processing Logic ---
    function handleFile(file) {
        if (!file) return;

        const reader = new FileReader();
        const fileExtension = file.name.split('.').pop().toLowerCase();

        reader.onload = function(e) {
            const data = e.target.result;
            if (fileExtension === 'csv') {
                // Use PapaParse for CSV
                const parsed = Papa.parse(data, { header: true, skipEmptyLines: true });
                rawData = parsed.data;
            } else if (fileExtension === 'xlsx') {
                // Use SheetJS for Excel
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                rawData = XLSX.utils.sheet_to_json(worksheet);
            }
            processAndDisplayData(); // Automatically process data after reading
        };

        if (fileExtension === 'csv') {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    }

    function processAndDisplayData() {
        totalMinutes = 0;
        previews.invoiceBody.innerHTML = '';

        // Reset UI
        document.getElementById('from-th').style.display = 'table-cell';
        document.getElementById('to-th').style.display = 'table-cell';

        if (rawData.length === 0) {
            previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No data found in the file.</td></tr>';
            return;
        }

        if (!inputs.startDate.value || !inputs.endDate.value) {
            previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Please select a billing period to filter the data.</td></tr>';
            return;
        }
        
        // Use the first data row to create the header map
        const firstRow = rawData[0];
        const headerMap = {};
        Object.keys(firstRow).forEach(header => {
            headerMap[header.trim().toLowerCase()] = header; // Map lowercase to original case
        });
        
        const startDate = new Date(inputs.startDate.value);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(inputs.endDate.value);
        endDate.setHours(23, 59, 59, 999);
            
        const filteredRows = rawData.filter(row => {
            const dateStr = row[headerMap.date];
            if (!dateStr) return false;
            // Handle Excel's integer date format
            const rowDate = typeof dateStr === 'number' ? new Date(Date.UTC(0, 0, dateStr - 1)) : new Date(dateStr);
            return !isNaN(rowDate) && startDate <= rowDate && rowDate <= endDate;
        });

        if (filteredRows.length === 0) {
            previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No entries found for the selected period.</td></tr>';
            return;
        }

        const isDetailedLayout = headerMap.from !== undefined && headerMap.to !== undefined;
        const isSimpleLayout = headerMap.duration !== undefined;

        if (isDetailedLayout) {
            filteredRows.forEach(row => {
                const date = row[headerMap.date];
                const tasks = row[headerMap.tasks] || '';
                const durationStr = row[headerMap.duration] || '0:0';
                totalMinutes += parseDurationToMinutes(durationStr);
                const rowDate = typeof date === 'number' ? new Date(Date.UTC(0, 0, date - 1)) : new Date(date);

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${rowDate.toLocaleDateString()}</td>
                    <td>${tasks}</td>
                    <td>${formatTime(row[headerMap.from] || '')}</td>
                    <td>${formatTime(row[headerMap.to] || '')}</td>
                    <td>${durationStr}</td>
                `;
                previews.invoiceBody.appendChild(tr);
            });
        } else if (isSimpleLayout) {
            document.getElementById('from-th').style.display = 'none';
            document.getElementById('to-th').style.display = 'none';
            filteredRows.forEach(row => {
                const date = row[headerMap.date];
                const tasks = row[headerMap.tasks] || '';
                const durationStr = row[headerMap.duration] || '0';
                totalMinutes += parseDurationToMinutes(durationStr);
                const rowDate = typeof date === 'number' ? new Date(Date.UTC(0, 0, date - 1)) : new Date(date);
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${rowDate.toLocaleDateString()}</td>
                    <td>${tasks}</td>
                    <td style="display: none;"></td>
                    <td style="display: none;"></td>
                    <td>${durationStr}</td>
                `;
                previews.invoiceBody.appendChild(tr);
            });
        } else {
            alert('Sheet format not recognized. Please ensure your file has a header row with either ("date", "tasks", "from", "to", "duration") or ("date", "tasks", "duration").');
        }

        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        previews.totalHours.textContent = `${String(totalHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
        calculateAndDisplayTotals();
    }
    
    // --- INITIALIZATION & EVENT LISTENERS ---
    previews.invoiceId.textContent = generateInvoiceId();
    previews.invoiceDate.textContent = new Date().toLocaleDateString();
    
    // NEW: Listen for file uploads
    inputs.fileUploader.addEventListener('change', (e) => handleFile(e.target.files[0]));
    // NEW: Re-filter data when dates change
    inputs.startDate.addEventListener('change', processAndDisplayData);
    inputs.endDate.addEventListener('change', processAndDisplayData);

    inputs.billingMethod.addEventListener('change', handleBillingMethodChange);
    inputs.paymentMethod.addEventListener('input', calculateAndDisplayTotals);
    inputs.hourlyRate.addEventListener('input', calculateAndDisplayTotals);
    inputs.fixedRate.addEventListener('input', calculateAndDisplayTotals);
    
    Object.values(inputs).forEach(input => {
        if (!['billingMethod', 'hourlyRate', 'fixedRate', 'paymentMethod'].includes(input.id)) {
            input.addEventListener('input', updatePreview);
        }
    });
    
    buttons.generatePdf.addEventListener('click', generatePdf);
    buttons.saveDefaults.addEventListener('click', saveDefaults);
    buttons.clearDefaults.addEventListener('click', clearDefaults);
    
    // --- FINAL SETUP ---
    loadDefaults(); 
    updatePreview(); 
    handleBillingMethodChange();
});

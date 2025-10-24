document.addEventListener('DOMContentLoaded', function() {
    // --- CONFIGURATION ---
    // Make sure your real, valid API key from Google Cloud Console is pasted here.
    const API_KEY = 'YOUR_REAL_API_KEY_HERE'; 


    // --- GLOBAL STATE ---
    let totalMinutes = 0;
    let rawData = []; // Store the fetched data globally

    // --- ELEMENT SELECTORS ---
    const inputs = {
        clientName: document.getElementById('client-name'),
        clientCompany: document.getElementById('client-company'),
        clientEmail: document.getElementById('client-email'),
        spreadsheetId: document.getElementById('spreadsheet-id'),
        sheetSelector: document.getElementById('sheet-selector'),
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
        const defaults = {
            clientName: inputs.clientName.value,
            clientCompany: inputs.clientCompany.value,
            clientEmail: inputs.clientEmail.value,
            paymentMethod: inputs.paymentMethod.value,
            paymentDetails: inputs.paymentDetails.value,
            billingMethod: inputs.billingMethod.value,
            hourlyRate: inputs.hourlyRate.value,
            spreadsheetId: inputs.spreadsheetId.value,
        };
        localStorage.setItem('invoiceDefaults', JSON.stringify(defaults));
        alert('Default client and payment info saved!');
    }

    function clearDefaults() {
        localStorage.removeItem('invoiceDefaults');
        alert('Default info cleared!');
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
            inputs.spreadsheetId.value = defaults.spreadsheetId || '';
        }
    }

    // --- HELPER FUNCTIONS ---
    function formatTime(timeString) {
        if (!timeString || String(timeString).toUpperCase().includes('AM') || String(timeString).toUpperCase().includes('PM')) {
            return timeString;
        }
        try {
            let [hours, minutes] = String(timeString).split(':').map(Number);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const minutesStr = String(minutes).padStart(2, '0');
            return `${hours}:${minutesStr} ${ampm}`;
        } catch (e) {
            return timeString;
        }
    }

    function handleBillingMethodChange() {
        const selectedMethod = inputs.billingMethod.value;
        if (selectedMethod === 'hourly') {
            inputGroups.hourlyRate.classList.remove('hidden');
            inputGroups.fixedRate.classList.add('hidden');
        } else {
            inputGroups.hourlyRate.classList.add('hidden');
            inputGroups.fixedRate.classList.remove('hidden');
        }
        calculateAndDisplayTotals();
    }

    function calculateAndDisplayTotals() {
        const method = inputs.billingMethod.value;
        const paymentMethod = inputs.paymentMethod.value;
        let subtotal = 0;

        if (method === 'hourly') {
            const hourlyRate = parseFloat(inputs.hourlyRate.value) || 0;
            const totalDecimalHours = totalMinutes / 60;
            subtotal = totalDecimalHours * hourlyRate;
        } else {
            subtotal = parseFloat(inputs.fixedRate.value) || 0;
        }

        let fee = 0;
        let totalAmount = subtotal;
        
        if (paymentMethod.toLowerCase().trim() === 'payoneer' && subtotal > 0) {
            fee = subtotal * 0.02;
            totalAmount = subtotal + fee;
            previews.subtotal.textContent = `$${subtotal.toFixed(2)}`;
            previews.fee.textContent = `$${fee.toFixed(2)}`;
            previews.subtotalContainer.classList.remove('hidden');
            previews.feeContainer.classList.remove('hidden');
            previews.totalAmountLabel.textContent = 'Grand Total';
        } else {
            previews.subtotalContainer.classList.add('hidden');
            previews.feeContainer.classList.add('hidden');
            previews.totalAmountLabel.textContent = method === 'fixed' ? 'Fixed Project Total' : 'Total Amount';
        }

        previews.totalAmount.textContent = `$${totalAmount.toFixed(2)}`;
    }

    function generateInvoiceId() {
        return `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    function updatePreview() {
        previews.clientName.textContent = inputs.clientName.value || 'Client Name';
        previews.clientCompany.textContent = inputs.clientCompany.value || 'Company Name';
        previews.clientEmail.textContent = inputs.clientEmail.value || 'Email Address';
        previews.paymentMethod.textContent = inputs.paymentMethod.value || 'N/A';
        previews.paymentDetails.textContent = inputs.paymentDetails.value || 'N/A';
        const start = inputs.startDate.value ? new Date(inputs.startDate.value + 'T00:00:00').toLocaleDateString() : '...';
        const end = inputs.endDate.value ? new Date(inputs.endDate.value + 'T00:00:00').toLocaleDateString() : '...';
        previews.billingPeriod.textContent = `${start} – ${end}`;
    }

    // --- DATA FETCHING & PROCESSING ---
    
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
    
    async function populateSheetDropdown() {
        let spreadsheetId = inputs.spreadsheetId.value.trim();
        if (spreadsheetId.includes('/d/')) {
            const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (match && match[1]) {
                spreadsheetId = match[1];
                inputs.spreadsheetId.value = spreadsheetId;
            }
        }
        if (!spreadsheetId) {
            alert('Please paste a valid Google Sheet ID or URL first.');
            return;
        }
        inputs.sheetSelector.innerHTML = '<option value="">Loading tabs...</option>';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${API_KEY}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error.message || `HTTP error! Status: ${response.status}`;
                throw new Error(errorMessage);
            }
            const data = await response.json();
            inputs.sheetSelector.innerHTML = '';
            data.sheets.forEach(sheet => {
                const option = document.createElement('option');
                option.value = sheet.properties.title;
                option.textContent = sheet.properties.title;
                inputs.sheetSelector.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching sheet names:', error);
            alert(`Failed to load sheet tabs. Check the console, but the most likely reasons are:\n1. Invalid Google Sheet ID.\n2. Invalid API Key.\n3. The "Google Sheets API" is not enabled in your Google Cloud project.\n\nError: ${error.message}`);
            inputs.sheetSelector.innerHTML = '<option value="">Error loading tabs</option>';
        }
    }

    async function fetchData() {
        const selectedSheet = inputs.sheetSelector.value;
        const spreadsheetId = inputs.spreadsheetId.value.trim();
        if (!spreadsheetId || !selectedSheet) {
            alert('Please provide a Google Sheet ID and select a tab.');
            return;
        }
        
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(selectedSheet)}?key=${API_KEY}`;
        try {
            const response = await fetch(url);
             if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error.message || `HTTP error! Status: ${response.status}`;
                throw new Error(errorMessage);
            }
            const data = await response.json();

            if (!data.values || data.values.length < 1) { // Changed to < 1 to allow sheets with only a header
                rawData = [];
            } else {
                const headers = data.values[0];
                const dataRows = data.values.slice(1);
                rawData = dataRows.map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index];
                    });
                    return obj;
                });
            }
            processAndDisplayData();
        } catch (error) {
            console.error('Error fetching from Google Sheet:', error);
            alert(`Failed to fetch timesheet data. Check the console, but the most likely reason is:\n1. The Google Sheet is NOT public ("Anyone with the link").\n\nError: ${error.message}`);
        }
    }

    function processAndDisplayData() {
        totalMinutes = 0;
        previews.invoiceBody.innerHTML = '';
        updatePreview();

        if (rawData.length === 0 && !inputs.startDate.value) {
            previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No data loaded. Click "Get Timesheet Data".</td></tr>';
            return;
        }
        if (!inputs.startDate.value || !inputs.endDate.value) {
            previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Please select a billing period to filter the data.</td></tr>';
            return;
        }
        
        // This handles the case where the sheet has headers but no data rows
        if(rawData.length === 0) {
            previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No entries found for the selected period.</td></tr>';
            previews.totalHours.textContent = '00:00';
            calculateAndDisplayTotals();
            return;
        }

        const headers = Object.keys(rawData[0]);
        const mappedHeaders = mapHeaders(headers);

        if (!mappedHeaders.date || !mappedHeaders.tasks || !mappedHeaders.duration) {
             const message = 'Error: Could not find required columns. Please ensure your sheet has headers like "Date", "Tasks", and "Duration".';
            alert(message);
            previews.invoiceBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">${message}</td></tr>`;
            return;
        }

        const startDateStr = inputs.startDate.value.split('-');
        const startDate = new Date(Date.UTC(startDateStr[0], startDateStr[1] - 1, startDateStr[2]));

        const endDateStr = inputs.endDate.value.split('-');
        const endDate = new Date(Date.UTC(endDateStr[0], endDateStr[1] - 1, endDateStr[2]));
        
        const filteredRows = rawData.filter(row => {
            const dateStr = row[mappedHeaders.date];
            if (!dateStr) return false;
            const rowDate = new Date(dateStr + 'T00:00:00Z'); 
            return !isNaN(rowDate) && startDate.getTime() <= rowDate.getTime() && rowDate.getTime() <= endDate.getTime();
        });

        if (filteredRows.length === 0) {
            previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No entries found for the selected period.</td></tr>';
        } else {
            filteredRows.forEach(row => {
                const date = row[mappedHeaders.date];
                const tasks = row[mappedHeaders.tasks] || '';
                const from = row[mappedHeaders.from] || '';
                const to = row[mappedHeaders.to] || '';
                const durationStr = row[mappedHeaders.duration] || '0:0';
                
                // Robustly handle duration that might be just a number (of minutes)
                if (String(durationStr).includes(':')) {
                    const [hours, minutes] = String(durationStr).split(':').map(Number);
                    totalMinutes += (hours || 0) * 60 + (minutes || 0);
                } else if (!isNaN(Number(durationStr))) {
                    totalMinutes += Number(durationStr);
                }
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(date + 'T00:00:00Z').toLocaleDateString()}</td>
                    <td>${tasks}</td>
                    <td>${formatTime(from)}</td>
                    <td>${formatTime(to)}</td>
                    <td>${durationStr}</td>
                `;
                previews.invoiceBody.appendChild(tr);
            });
        }

        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        previews.totalHours.textContent = `${String(totalHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
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
    
    inputs.billingMethod.addEventListener('change', handleBillingMethodChange);
    inputs.paymentMethod.addEventListener('input', calculateAndDisplayTotals);
    inputs.hourlyRate.addEventListener('input', calculateAndDisplayTotals);
    inputs.fixedRate.addEventListener('input', calculateAndDisplayTotals);
    
    Object.keys(inputs).forEach(key => {
        if (['clientName', 'clientCompany', 'clientEmail', 'paymentMethod', 'paymentDetails'].includes(key)) {
            inputs[key].addEventListener('input', updatePreview);
        }
    });

    inputs.startDate.addEventListener('change', processAndDisplayData);
    inputs.endDate.addEventListener('change', processAndDisplayData);
    
    buttons.loadSheets.addEventListener('click', populateSheetDropdown);
    buttons.fetchData.addEventListener('click', fetchData);
    buttons.generatePdf.addEventListener('click', generatePdf);
    buttons.saveDefaults.addEventListener('click', saveDefaults);
    buttons.clearDefaults.addEventListener('click', clearDefaults);
    
    // --- FINAL SETUP ---
    loadDefaults(); 
    updatePreview(); 
    handleBillingMethodChange();
});

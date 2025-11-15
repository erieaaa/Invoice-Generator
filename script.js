document.addEventListener('DOMContentLoaded', function() {
    // --- CONFIGURATION ---
    const API_KEY = AIzaSyDC19jZi4kwBD-3Pr0bFIdESTw5FrAZO8M'; // Replace with your key

    // --- GLOBAL STATE ---
    let totalMinutes = 0;
    let rawData = [];

    // --- ELEMENT SELECTORS ---
    // (This section is unchanged, keeping it for context)
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
    const previews = {
        clientName: document.getElementById('preview-client-name'),
        clientCompany: document.getElementById('preview-client-company'),
        clientEmail: document.getElementById('preview-client-email'),
        paymentMethod: document.getElementById('preview-payment-method'),
        paymentDetails: document.getElementById('preview-payment-details'),
        // ... other preview elements
        invoiceId: document.getElementById('preview-invoice-id'),
        invoiceDate: document.getElementById('preview-invoice-date'),
        billingPeriod: document.getElementById('preview-billing-period'),
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
        // ... other buttons
        loadSheets: document.getElementById('load-sheets-btn'),
        fetchData: document.getElementById('fetch-data-btn'),
        saveDefaults: document.getElementById('save-defaults-btn'),
        clearDefaults: document.getElementById('clear-defaults-btn'),
    };
    const inputGroups = {
        hourlyRate: document.getElementById('hourly-rate-group'),
        fixedRate: document.getElementById('fixed-rate-group'),
    };


    // --- MAIN LOGIC FUNCTIONS --- (Most functions are unchanged)

    function saveDefaults() { /* ... function is unchanged ... */ 
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

    function clearDefaults() { /* ... function is unchanged ... */ 
        localStorage.removeItem('invoiceDefaults');
        alert('Default info cleared!');
    }

    function loadDefaults() { /* ... function is unchanged ... */ 
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
    
    // The rest of the functions (formatTime, parseDurationToMinutes, etc.) are correct.
    // For brevity, I am only showing the changed functions and the initialization block.
    // Copy the entire script block to be safe.

    function updatePreview() {
        previews.clientName.textContent = inputs.clientName.value || 'Client Name';
        previews.clientCompany.textContent = inputs.clientCompany.value || 'Company Name';
        previews.clientEmail.textContent = inputs.clientEmail.value || 'Email Address';
        
        // This is the part that now works correctly because of the new event listeners
        previews.paymentMethod.textContent = inputs.paymentMethod.value || 'N/A';
        previews.paymentDetails.textContent = inputs.paymentDetails.value || 'N/A';
        
        const startDateValue = inputs.startDate.value;
        const endDateValue = inputs.endDate.value;
        const start = startDateValue ? new Date(startDateValue + 'T00:00:00').toLocaleDateString() : '...';
        const end = endDateValue ? new Date(endDateValue + 'T00:00:00').toLocaleDateString() : '...';
        previews.billingPeriod.textContent = `${start} – ${end}`;
    }

    function generatePdf() {
        const originalButtonText = buttons.generatePdf.textContent;
        buttons.generatePdf.disabled = true;
        buttons.generatePdf.textContent = 'Generating PDF...';
        
        window.scrollTo(0, 0);

        const invoiceElement = document.getElementById('invoice-preview');
        const clientName = (inputs.clientCompany.value || 'Invoice').trim().replace(/\s+/g, '_');
        const invoiceId = previews.invoiceId.textContent;
        
        const opt = {
            margin:       [0.5, 0.25, 0.5, 0.25],
            filename:     `${clientName}_${invoiceId}.pdf`,
            pagebreak:    { mode: 'css', avoid: ['thead', 'tr', '.invoice-footer'] },
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true,
                logging: true, 
            },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().from(invoiceElement).set(opt).save()
            .catch(err => {
                console.error('An error occurred during PDF generation:', err);
                alert('Failed to generate PDF. Ad-blockers or browser security settings may be preventing it. Please open the developer console (F12) for more details.');
            })
            .finally(() => {
                buttons.generatePdf.disabled = false;
                buttons.generatePdf.textContent = originalButtonText;
            });
    }

    // --- INITIALIZATION & EVENT LISTENERS (THIS IS THE KEY FIX) ---
    function init() {
        // Initial setup
        previews.invoiceId.textContent = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        previews.invoiceDate.textContent = new Date().toLocaleDateString();
        
        // Data fetching listeners
        buttons.loadSheets.addEventListener('click', () => populateSheetDropdown());
        buttons.fetchData.addEventListener('click', () => generateFromSource());
        inputs.fileUploader.addEventListener('change', (e) => handleFile(e.target.files[0]));
        
        // Data processing listeners
        inputs.startDate.addEventListener('change', () => processAndDisplayData());
        inputs.endDate.addEventListener('change', () => processAndDisplayData());
        
        // Financial calculation listeners
        inputs.billingMethod.addEventListener('change', () => handleBillingMethodChange());
        inputs.paymentMethod.addEventListener('input', () => calculateAndDisplayTotals());
        inputs.hourlyRate.addEventListener('input', () => calculateAndDisplayTotals());
        inputs.fixedRate.addEventListener('input', () => calculateAndDisplayTotals());
        
        // ***FIX: Add event listeners for real-time preview updates***
        // This array defines which inputs should update the preview live as you type.
        const liveUpdateFields = [
            'clientName', 'clientCompany', 'clientEmail', 
            'paymentMethod', 'paymentDetails'
        ];
        liveUpdateFields.forEach(id => {
            if (inputs[id]) {
                inputs[id].addEventListener('input', updatePreview);
            }
        });
        
        // Main action buttons
        buttons.generatePdf.addEventListener('click', generatePdf);
        buttons.saveDefaults.addEventListener('click', saveDefaults);
        buttons.clearDefaults.addEventListener('click', clearDefaults);
        
        // Load saved settings and update the view on page load
        loadDefaults(); 
        updatePreview(); 
        handleBillingMethodChange();
    }
    
    // The full code for unchanged functions needs to be here.
    // To avoid making this response excessively long, I'm pasting the complete script again below.

    // --- FULL SCRIPT.JS FOR COPY/PASTE ---
    // (Replace the contents of your script.js with this)
    document.addEventListener('DOMContentLoaded', function() {
        const API_KEY = 'YOUR_GOOGLE_SHEETS_API_KEY';

        let totalMinutes = 0;
        let rawData = [];

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
            const paymentMethod = inputs.paymentMethod.value.toLowerCase().trim();
            let subtotal = 0;
            if (method === 'hourly') {
                const hourlyRate = parseFloat(inputs.hourlyRate.value) || 0;
                subtotal = (totalMinutes / 60) * hourlyRate;
            } else {
                subtotal = parseFloat(inputs.fixedRate.value) || 0;
            }
            let fee = 0;
            let totalAmount = subtotal;
            previews.subtotalContainer.classList.add('hidden');
            previews.feeContainer.classList.add('hidden');
            previews.totalAmountLabel.textContent = method === 'fixed' ? 'Fixed Project Total' : 'Total Amount';
            if (paymentMethod.includes('payoneer') && subtotal > 0) {
                fee = subtotal * 0.02;
                totalAmount = subtotal + fee;
                previews.subtotal.textContent = `$${subtotal.toFixed(2)}`;
                previews.fee.textContent = `$${fee.toFixed(2)}`;
                previews.totalAmountLabel.textContent = 'Grand Total';
                previews.subtotalContainer.classList.remove('hidden');
                previews.feeContainer.classList.remove('hidden');
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
            const startDateValue = inputs.startDate.value;
            const endDateValue = inputs.endDate.value;
            const start = startDateValue ? new Date(startDateValue + 'T00:00:00').toLocaleDateString() : '...';
            const end = endDateValue ? new Date(endDateValue + 'T00:00:00').toLocaleDateString() : '...';
            previews.billingPeriod.textContent = `${start} – ${end}`;
        }

        function generateFromSource() {
            if (inputs.fileUploader.files.length > 0) {
                handleFile(inputs.fileUploader.files[0]);
            } else if (inputs.spreadsheetId.value && inputs.sheetSelector.value) {
                fetchDataFromGoogleSheet();
            } else {
                alert('Please either upload a file OR provide a Google Sheet link and select a tab.');
            }
        }

        function handleFile(file) {
            if (!file) return;
            const reader = new FileReader();
            const fileExtension = file.name.split('.').pop().toLowerCase();
            reader.onload = function(e) {
                try {
                    const data = e.target.result;
                    let parsedData = [];
                    if (fileExtension === 'csv') {
                        parsedData = Papa.parse(data, { header: true, skipEmptyLines: true }).data;
                    } else if (fileExtension === 'xlsx') {
                        const workbook = XLSX.read(data, { type: 'binary' });
                        const sheetName = workbook.SheetNames[0];
                        parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                    }
                    rawData = parsedData;
                    processAndDisplayData();
                } catch (error) {
                    console.error("File parsing error:", error);
                    alert(`Could not parse the file. Ensure it is a valid ${fileExtension.toUpperCase()} file.`);
                }
            };
            if (fileExtension === 'csv') reader.readAsText(file);
            else if (fileExtension === 'xlsx') reader.readAsBinaryString(file);
        }

        async function populateSheetDropdown() {
            let spreadsheetId = inputs.spreadsheetId.value.trim();
            if (spreadsheetId.includes('/d/')) {
                const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
                if (match && match[1]) spreadsheetId = match[1];
            }
            if (!spreadsheetId) {
                alert('Please paste a valid Google Sheet ID or URL first.');
                return;
            }
            inputs.sheetSelector.innerHTML = '<option value="">Loading tabs...</option>';
            try {
                const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${API_KEY}`);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}.`);
                const data = await response.json();
                inputs.sheetSelector.innerHTML = '<option value="">-- Select a Tab --</option>';
                data.sheets.forEach(sheet => {
                    const option = document.createElement('option');
                    option.value = sheet.properties.title;
                    option.textContent = sheet.properties.title;
                    inputs.sheetSelector.appendChild(option);
                });
            } catch (error) {
                console.error('Error fetching sheet names:', error);
                alert(`Failed to load sheet tabs. ${error.message}`);
                inputs.sheetSelector.innerHTML = '<option value="">Error loading tabs</option>';
            }
        }

        async function fetchDataFromGoogleSheet() {
            const spreadsheetId = inputs.spreadsheetId.value.trim();
            const selectedSheet = inputs.sheetSelector.value;
            if (!spreadsheetId || !selectedSheet) {
                alert('Please provide a Google Sheet ID and select a tab.');
                return;
            }
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(selectedSheet)}'?key=${API_KEY}`;
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const data = await response.json();
                if (!data.values || data.values.length < 2) {
                    rawData = [];
                } else {
                    const headers = data.values[0];
                    rawData = data.values.slice(1).map(row => {
                        const obj = {};
                        headers.forEach((header, index) => { obj[header] = row[index]; });
                        return obj;
                    });
                }
                processAndDisplayData();
            } catch (error) {
                console.error('Error fetching from Google Sheet:', error);
                alert('Failed to fetch data from Google Sheet. Check console for errors.');
            }
        }

        function processAndDisplayData() {
            totalMinutes = 0;
            previews.invoiceBody.innerHTML = '';
            document.getElementById('from-th').style.display = 'table-cell';
            document.getElementById('to-th').style.display = 'table-cell';
            if (rawData.length === 0) {
                previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No data found.</td></tr>';
                calculateAndDisplayTotals();
                return;
            }
            if (!inputs.startDate.value || !inputs.endDate.value) {
                previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Please select a billing period.</td></tr>';
                return;
            }
            const headerMap = {};
            Object.keys(rawData[0]).forEach(h => { headerMap[h.trim().toLowerCase()] = h; });
            const startDate = new Date(inputs.startDate.value + 'T00:00:00');
            const endDate = new Date(inputs.endDate.value + 'T23:59:59');
            const filteredRows = rawData.filter(row => {
                const dateStr = row[headerMap.date || headerMap.day];
                if (!dateStr) return false;
                let rowDate;
                if (typeof dateStr === 'number' && dateStr > 10000) {
                    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                    rowDate = new Date(excelEpoch.getTime() + dateStr * 24 * 60 * 60 * 1000);
                } else {
                    rowDate = new Date(dateStr);
                }
                return !isNaN(rowDate) && startDate <= rowDate && rowDate <= endDate;
            });
            if (filteredRows.length === 0) {
                previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No entries found for the selected period.</td></tr>';
            } else {
                const isDetailedLayout = (headerMap.from && headerMap.to) || (headerMap['start time'] && headerMap['end time']);
                const isSimpleLayout = headerMap.duration || headerMap.hours;
                filteredRows.forEach(row => {
                    const dateHeader = headerMap.date || headerMap.day;
                    const tasksHeader = headerMap.tasks || headerMap.note || headerMap.description;
                    const durationHeader = headerMap.duration || headerMap.hours;
                    let rowDate;
                    if (typeof row[dateHeader] === 'number' && row[dateHeader] > 10000) {
                        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                        rowDate = new Date(excelEpoch.getTime() + row[dateHeader] * 24 * 60 * 60 * 1000);
                    } else {
                        rowDate = new Date(row[dateHeader]);
                    }
                    const durationStr = row[durationHeader] || '0';
                    totalMinutes += parseDurationToMinutes(durationStr);
                    const tr = document.createElement('tr');
                    if (isDetailedLayout) {
                        tr.innerHTML = `<td>${rowDate.toLocaleDateString()}</td><td>${row[tasksHeader] || ''}</td><td>${formatTime(row[headerMap.from || headerMap['start time']] || '')}</td><td>${formatTime(row[headerMap.to || headerMap['end time']] || '')}</td><td>${durationStr}</td>`;
                    } else if (isSimpleLayout) {
                        document.getElementById('from-th').style.display = 'none';
                        document.getElementById('to-th').style.display = 'none';
                        tr.innerHTML = `<td>${rowDate.toLocaleDateString()}</td><td colspan="3">${row[tasksHeader] || ''}</td><td>${durationStr}</td>`;
                    } else {
                        previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Sheet format not recognized.</td></tr>';
                        return;
                    }
                    previews.invoiceBody.appendChild(tr);
                });
            }
            const totalH = Math.floor(totalMinutes / 60);
            const totalM = totalMinutes % 60;
            previews.totalHours.textContent = `${String(totalH).padStart(2, '0')}:${String(totalM).padStart(2, '0')}`;
            calculateAndDisplayTotals();
        }

        function init() {
            previews.invoiceId.textContent = generateInvoiceId();
            previews.invoiceDate.textContent = new Date().toLocaleDateString();
            buttons.loadSheets.addEventListener('click', populateSheetDropdown);
            buttons.fetchData.addEventListener('click', generateFromSource);
            inputs.fileUploader.addEventListener('change', (e) => handleFile(e.target.files[0]));
            inputs.startDate.addEventListener('change', processAndDisplayData);
            inputs.endDate.addEventListener('change', processAndDisplayData);
            inputs.billingMethod.addEventListener('change', handleBillingMethodChange);
            inputs.hourlyRate.addEventListener('input', calculateAndDisplayTotals);
            inputs.fixedRate.addEventListener('input', calculateAndDisplayTotals);
            
            // FIX: Real-time preview updates for info fields
            ['clientName', 'clientCompany', 'clientEmail', 'paymentMethod', 'paymentDetails'].forEach(id => {
                inputs[id].addEventListener('input', updatePreview);
            });
            
            buttons.generatePdf.addEventListener('click', generatePdf);
            buttons.saveDefaults.addEventListener('click', saveDefaults);
            buttons.clearDefaults.addEventListener('click', clearDefaults);
            loadDefaults();
            updatePreview();
            handleBillingMethodChange();
        }

        init();
    });
});


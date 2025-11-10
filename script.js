document.addEventListener('DOMContentLoaded', function() {
    // --- CONFIGURATION ---
    // IMPORTANT! You still need to replace this placeholder with your real API key.
    const API_KEY = 'AIzaSyDC19jZi4kwBD-3Pr0bFIdESTw5FrAZO8M'; 

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
    
    // --- THIS IS THE CORRECTED FUNCTION ---
    function calculateAndDisplayTotals() {
        const method = inputs.billingMethod.value;
        const paymentMethod = inputs.paymentMethod.value.toLowerCase().trim(); // Get and clean the value
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

        // 1. Set the default state first: Hide all fee-related elements.
        previews.subtotalContainer.classList.add('hidden');
        previews.feeContainer.classList.add('hidden');
        previews.totalAmountLabel.textContent = method === 'fixed' ? 'Fixed Project Total' : 'Total Amount';

        // 2. Use a more flexible check with .includes()
        // This will now work for "Payoneer", "payoneer transfer", etc.
        if (paymentMethod.includes('payoneer') && subtotal > 0) {
            fee = subtotal * 0.02;
            totalAmount = subtotal + fee;

            // Update the text content for the fee breakdown
            previews.subtotal.textContent = `$${subtotal.toFixed(2)}`;
            previews.fee.textContent = `$${fee.toFixed(2)}`;
            previews.totalAmountLabel.textContent = 'Grand Total';

            // Now, show the fee elements
            previews.subtotalContainer.classList.remove('hidden');
            previews.feeContainer.classList.remove('hidden');
        }

        // Finally, always update the main total amount
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
        // Fix: Ensure dates are handled correctly even if one is missing
        const startDateValue = inputs.startDate.value;
        const endDateValue = inputs.endDate.value;
        const start = startDateValue ? new Date(startDateValue + 'T00:00:00').toLocaleDateString() : '...';
        const end = endDateValue ? new Date(endDateValue + 'T00:00:00').toLocaleDateString() : '...';
        previews.billingPeriod.textContent = `${start} – ${end}`;
    }

    // --- NEW MASTER FUNCTION TO DECIDE WHICH SOURCE TO USE ---
    function generateFromSource() {
        if (inputs.fileUploader.files.length > 0) {
            handleFile(inputs.fileUploader.files[0]);
        } 
        else if (inputs.spreadsheetId.value && inputs.sheetSelector.value) {
            fetchDataFromGoogleSheet();
        } 
        else {
            alert('Please either upload a file OR provide a Google Sheet link and select a tab.');
        }
    }

    // --- DATA SOURCE LOGIC (FILE UPLOAD) ---
    function handleFile(file) {
        if (!file) return;
        const reader = new FileReader();
        const fileExtension = file.name.split('.').pop().toLowerCase();

        reader.onload = function(e) {
            const data = e.target.result;
            let parsedData = [];
            if (fileExtension === 'csv') {
                const parsed = Papa.parse(data, { header: true, skipEmptyLines: true });
                parsedData = parsed.data;
            } else if (fileExtension === 'xlsx') {
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                parsedData = XLSX.utils.sheet_to_json(worksheet);
            }
            rawData = parsedData; 
            processAndDisplayData();
        };

        if (fileExtension === 'csv') reader.readAsText(file);
        else if (fileExtension === 'xlsx') reader.readAsBinaryString(file);
    }

    // --- DATA SOURCE LOGIC (GOOGLE SHEETS) ---
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
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}. Check if the Sheet is public or if the API key is correct.`);
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
            alert('Failed to fetch data from Google Sheet. Check console for errors.');
        }
    }

    // --- CENTRAL DATA PROCESSING FUNCTION ---
    function processAndDisplayData() {
        totalMinutes = 0;
        previews.invoiceBody.innerHTML = '';
        document.getElementById('from-th').style.display = 'table-cell';
        document.getElementById('to-th').style.display = 'table-cell';

        if (rawData.length === 0) {
            previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No data found in the source.</td></tr>';
            calculateAndDisplayTotals();
            return;
        }

        if (!inputs.startDate.value || !inputs.endDate.value) {
            previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Please select a billing period to filter the data.</td></tr>';
            return;
        }
        updatePreview();
        
        const firstRow = rawData[0];
        const headerMap = {};
        Object.keys(firstRow).forEach(header => {
            headerMap[header.trim().toLowerCase()] = header;
        });
        
        const startDate = new Date(inputs.startDate.value + 'T00:00:00');
        const endDate = new Date(inputs.endDate.value + 'T23:59:59');
            
        const filteredRows = rawData.filter(row => {
            const dateHeader = headerMap.date || headerMap.day;
            const dateStr = row[dateHeader];
            if (!dateStr) return false;

            // Handle Excel's numeric date format
            let rowDate;
            if (typeof dateStr === 'number' && dateStr > 10000) { // Likely an Excel date serial number
                rowDate = new Date(Date.UTC(0, 0, dateStr - 1));
            } else {
                rowDate = new Date(dateStr);
            }
            
            return !isNaN(rowDate) && startDate <= rowDate && rowDate <= endDate;
        });

        if (filteredRows.length === 0) {
            previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No entries found for the selected period.</td></tr>';
        } else {
            const isDetailedLayout = (headerMap.from !== undefined && headerMap.to !== undefined) || (headerMap['start time'] !== undefined && headerMap['end time'] !== undefined);
            const isSimpleLayout = headerMap.duration !== undefined || headerMap.hours !== undefined;

            if (isDetailedLayout) {
                filteredRows.forEach(row => {
                    const dateHeader = headerMap.date || headerMap.day;
                    const tasksHeader = headerMap.tasks || headerMap.note || headerMap.description;
                    const fromHeader = headerMap.from || headerMap['start time'];
                    const toHeader = headerMap.to || headerMap['end time'];
                    const durationHeader = headerMap.duration || headerMap.hours;

                    const date = row[dateHeader];
                    const tasks = row[tasksHeader] || '';
                    const durationStr = row[durationHeader] || '0:0';
                    totalMinutes += parseDurationToMinutes(durationStr);
                    
                    let rowDate;
                    if (typeof date === 'number' && date > 10000) {
                        rowDate = new Date(Date.UTC(0, 0, date - 1));
                    } else {
                        rowDate = new Date(date);
                    }

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${rowDate.toLocaleDateString()}</td>
                        <td>${tasks}</td>
                        <td>${formatTime(row[fromHeader] || '')}</td>
                        <td>${formatTime(row[toHeader] || '')}</td>
                        <td>${durationStr}</td>
                    `;
                    previews.invoiceBody.appendChild(tr);
                });
            } else if (isSimpleLayout) {
                document.getElementById('from-th').style.display = 'none';
                document.getElementById('to-th').style.display = 'none';
                filteredRows.forEach(row => {
                    const dateHeader = headerMap.date || headerMap.day;
                    const tasksHeader = headerMap.tasks || headerMap.note || headerMap.description;
                    const durationHeader = headerMap.duration || headerMap.hours;
                    
                    const date = row[dateHeader];
                    const tasks = row[tasksHeader] || '';
                    const durationStr = row[durationHeader] || '0';
                    totalMinutes += parseDurationToMinutes(durationStr);

                    let rowDate;
                    if (typeof date === 'number' && date > 10000) {
                        rowDate = new Date(Date.UTC(0, 0, date - 1));
                    } else {
                        rowDate = new Date(date);
                    }
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${rowDate.toLocaleDateString()}</td>
                        <td colspan="2">${tasks}</td>
                        <td style="display: none;"></td>
                        <td>${durationStr}</td>
                    `;
                    previews.invoiceBody.appendChild(tr);
                });
            } else {
                alert('Sheet format not recognized. Header row must contain columns for "Date", "Tasks", and "Duration".');
            }
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
    
    buttons.loadSheets.addEventListener('click', populateSheetDropdown);
    buttons.fetchData.addEventListener('click', generateFromSource);
    inputs.fileUploader.addEventListener('change', (e) => handleFile(e.target.files[0]));
    
    inputs.startDate.addEventListener('change', processAndDisplayData);
    inputs.endDate.addEventListener('change', processAndDisplayData);
    
    inputs.billingMethod.addEventListener('change', handleBillingMethodChange);
    inputs.paymentMethod.addEventListener('input', calculateAndDisplayTotals);
    inputs.hourlyRate.addEventListener('input', calculateAndDisplayTotals);
    inputs.fixedRate.addEventListener('input', calculateAndDisplayTotals);
    
    // Simplified updatePreview listeners
    ['clientName', 'clientCompany', 'clientEmail', 'paymentMethod', 'paymentDetails'].forEach(id => {
        document.getElementById(id).addEventListener('input', updatePreview);
    });
    
    buttons.generatePdf.addEventListener('click', generatePdf);
    buttons.saveDefaults.addEventListener('click', saveDefaults);
    buttons.clearDefaults.addEventListener('click', clearDefaults);
    
    // --- FINAL SETUP ---
    loadDefaults(); 
    updatePreview(); 
    handleBillingMethodChange();
});

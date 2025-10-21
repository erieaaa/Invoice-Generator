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

    function generateFromSource() {
        if (inputs.fileUploader.files.length > 0) {
            processAndDisplayData();
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
            try {
                if (fileExtension === 'csv') {
                    const parsed = Papa.parse(data, { header: true, skipEmptyLines: true });
                    parsedData = parsed.data;
                } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                    const workbook = XLSX.read(data, { type: 'binary', cellDates:true });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    parsedData = XLSX.utils.sheet_to_json(worksheet);
                }
                rawData = parsedData; // Store globally
                processAndDisplayData(); // Automatically process data
            } catch (error) {
                alert("There was an error parsing your file. Please ensure it's a valid CSV or XLSX file.");
                console.error("File parsing error:", error);
            }
        };

        if (fileExtension === 'csv') reader.readAsText(file);
        else reader.readAsBinaryString(file);
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

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(selectedSheet)}'?key=${API_KEY}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;
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

    // --- NEW: SMART HEADER MAPPING ---
    function mapHeaders(headers) {
        const mapping = {};
        const aliases = {
            date: ['date', 'day'],
            tasks: ['tasks', 'task', 'description', 'activity', 'work done'],
            from: ['from', 'start time', 'start'],
            to: ['to', 'end time', 'end'],
            duration: ['duration', 'hours', 'time spent', 'total time']
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

        // 1. Smart Header Detection
        const headers = Object.keys(rawData[0]);
        const mappedHeaders = mapHeaders(headers);

        // 2. Validate that we found the essential columns
        if (!mappedHeaders.date || (!mappedHeaders.duration && (!mappedHeaders.from || !mappedHeaders.to))) {
            const message = 'Error: Could not find required columns. Please ensure your file has headers like "Date", and either "Duration" or "From"/"To".';
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
            // Handle Excel's serial number dates and standard date strings
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
        const isSimpleLayout = mappedHeaders.duration;

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
            const durationStr = row[mappedHeaders.duration] || '0:0';
            totalMinutes += parseDurationToMinutes(durationStr);
            
            const tr = document.createElement('tr');

            if(isDetailedLayout) {
                tr.innerHTML = `
                    <td>${rowDate.toLocaleDateString()}</td>
                    <td>${tasks}</td>
                    <td>${formatTime(row[mappedHeaders.from] || '')}</td>
                    <td>${formatTime(row[mappedHeaders.to] || '')}</td>
                    <td>${durationStr}</td>
                `;
            } else { // Simple layout (Date, Task, Duration)
                 tr.innerHTML = `
                    <td>${rowDate.toLocaleDateString()}</td>
                    <td colspan="3">${tasks}</td>
                    <td>${durationStr}</td>
                `;
                // Hide the 'from'/'to' columns in the row as well for proper alignment
                tr.cells[2].style.display = 'none';
                tr.cells[3].style.display = 'none';
                tr.cells[1].setAttribute('colspan', '3');
            }
            previews.invoiceBody.appendChild(tr);
        });

        const totalHoursVal = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
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
    
    // Make date changes automatically re-process the loaded data
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
    
    // --- FINAL SETUP ---
    loadDefaults(); 
    updatePreview(); 
    handleBillingMethodChange();
});

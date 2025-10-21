document.addEventListener('DOMContentLoaded', function() {
    // --- CONFIGURATION ---
    const API_KEY = 'AIzaSyDC19jZi4kwBD-3Pr0bFIdESTw5FrAZO8M'; // IMPORTANT! Replace with your actual Google Sheets API key

    // --- GLOBAL STATE ---
    let totalMinutes = 0;

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
        if (!timeString || timeString.toUpperCase().includes('AM') || timeString.toUpperCase().includes('PM')) {
            return timeString;
        }
        try {
            let [hours, minutes] = timeString.split(':').map(Number);
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

    function generateInvoiceId() {
        return `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    function updatePreview() {
        previews.clientName.textContent = inputs.clientName.value || 'Client Name';
        previews.clientCompany.textContent = inputs.clientCompany.value || 'Company Name';
        previews.clientEmail.textContent = inputs.clientEmail.value || 'Email Address';
        previews.paymentMethod.textContent = inputs.paymentMethod.value || 'N/A';
        previews.paymentDetails.textContent = inputs.paymentDetails.value || 'N/A';
        const start = inputs.startDate.value ? new Date(inputs.startDate.value).toLocaleDateString() : '...';
        const end = inputs.endDate.value ? new Date(inputs.endDate.value).toLocaleDateString() : '...';
        previews.billingPeriod.textContent = `${start} – ${end}`;
    }
    
    async function fetchAndDisplayData() {
        totalMinutes = 0;
        previews.invoiceBody.innerHTML = '';
        const selectedSheet = inputs.sheetSelector.value;
        const spreadsheetId = inputs.spreadsheetId.value.trim();

        if (!spreadsheetId) {
            alert('The Google Sheet ID is missing.');
            return;
        }
        if (!selectedSheet || !inputs.startDate.value || !inputs.endDate.value) {
            alert('Please select a timesheet tab and a valid date range.');
            return;
        }

        updatePreview();
        
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(selectedSheet)}'?key=${API_KEY}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();

            if (!data.values || data.values.length <= 1) {
                previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No data found in this sheet.</td></tr>';
                return;
            }

            const headerRow = data.values[0];
            const headerMap = {};
            headerRow.forEach((header, index) => {
                headerMap[header.trim().toLowerCase()] = index;
            });

            const requiredHeaders = ['date', 'tasks', 'from', 'to', 'duration'];
            const missingHeaders = requiredHeaders.filter(h => headerMap[h] === undefined);

            if (missingHeaders.length > 0) {
                alert(`Error: Your sheet is missing the following required columns: ${missingHeaders.join(', ')}`);
                return;
            }
            
            const dataRows = data.values.slice(1);
            
            // --- ========================================================= ---
            // --- THIS IS THE FIX FOR THE DATE RANGE PROBLEM ---
            // --- ========================================================= ---
            const startDate = new Date(inputs.startDate.value);
            startDate.setHours(0, 0, 0, 0); // Set to the beginning of the start day

            const endDate = new Date(inputs.endDate.value);
            endDate.setHours(23, 59, 59, 999); // Set to the end of the end day
            
            const filteredRows = dataRows.filter(row => {
                const dateStr = row[headerMap.date];
                if (!dateStr) return false;
                const rowDate = new Date(dateStr);
                // Use the adjusted start and end dates for comparison
                return !isNaN(rowDate) && startDate <= rowDate && rowDate <= endDate;
            });
            // --- END OF FIX ---

            if (filteredRows.length === 0) {
                previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No entries found for the selected period.</td></tr>';
            } else {
                filteredRows.forEach(row => {
                    const date = row[headerMap.date];
                    const tasks = row[headerMap.tasks] || '';
                    const rawTimeFrom = row[headerMap.from] || '';
                    const rawTimeTo = row[headerMap.to] || '';
                    const durationStr = row[headerMap.duration] || '0:0';
                    
                    const timeFrom = formatTime(rawTimeFrom);
                    const timeTo = formatTime(rawTimeTo);
                    const [hours, minutes] = durationStr.split(':').map(Number);
                    totalMinutes += (hours || 0) * 60 + (minutes || 0);
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${new Date(date).toLocaleDateString()}</td>
                        <td>${tasks}</td>
                        <td>${timeFrom}</td>
                        <td>${timeTo}</td>
                        <td>${durationStr}</td>
                    `;
                    previews.invoiceBody.appendChild(tr);
                });
            }

            const totalHours = Math.floor(totalMinutes / 60);
            const remainingMinutes = totalMinutes % 60;
            previews.totalHours.textContent = `${String(totalHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
            calculateAndDisplayTotals();

        } catch (error) {
            console.error('Error fetching sheet data:', error);
            alert('Failed to fetch data from Google Sheet. Check console for errors.');
        }
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
    
    Object.values(inputs).forEach(input => {
        if (!['billingMethod', 'hourlyRate', 'fixedRate', 'paymentMethod'].includes(input.id)) {
            input.addEventListener('input', updatePreview);
        }
    });
    
    buttons.loadSheets.addEventListener('click', populateSheetDropdown);
    buttons.fetchData.addEventListener('click', fetchAndDisplayData);
    buttons.generatePdf.addEventListener('click', generatePdf);
    buttons.saveDefaults.addEventListener('click', saveDefaults);
    buttons.clearDefaults.addEventListener('click', clearDefaults);
    
    // --- FINAL SETUP ---
    loadDefaults(); 
    updatePreview(); 
    handleBillingMethodChange();
});

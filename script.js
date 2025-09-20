document.addEventListener('DOMContentLoaded', function() {
    // --- CONFIGURATION ---
    const SPREADSHEET_ID = '1-54sXsMbJmZlm-ecaNRjP9weSf9sBBBWs2XA0CGNhgg';
    // --- GLOBAL STATE ---
    let totalMinutes = 0;

    // --- ELEMENT SELECTORS ---
    const inputs = {
        clientName: document.getElementById('client-name'),
        clientCompany: document.getElementById('client-company'),
        clientEmail: document.getElementById('client-email'),
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
        totalAmount: document.getElementById('total-amount'),
        totalAmountLabel: document.getElementById('total-amount-label'),
    };
    const buttons = {
        fetchData: document.getElementById('fetch-data-btn'),
        generatePdf: document.getElementById('generate-pdf-btn'),
        // --- NEW BUTTONS ADDED ---
        saveDefaults: document.getElementById('save-defaults-btn'),
        clearDefaults: document.getElementById('clear-defaults-btn'),
    };

    // --- NEW: DEFAULTS FUNCTIONS ---
    // Function to save the current client and payment info to localStorage
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

    // Function to clear the saved defaults from localStorage
    function clearDefaults() {
        localStorage.removeItem('invoiceDefaults');
        alert('Default info cleared!');
    }

    // Function to load the saved defaults from localStorage into the form
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
    // --- END OF NEW FUNCTIONS ---


    // Helper function to normalize time format
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
        let totalAmount = 0;
        if (method === 'hourly') {
            const hourlyRate = parseFloat(inputs.hourlyRate.value) || 0;
            const totalDecimalHours = totalMinutes / 60;
            totalAmount = totalDecimalHours * hourlyRate;
            previews.totalAmountLabel.textContent = 'Total Amount';
        } else {
            totalAmount = parseFloat(inputs.fixedRate.value) || 0;
            previews.totalAmountLabel.textContent = 'Fixed Project Total';
        }
        previews.totalAmount.textContent = `$${totalAmount.toFixed(2)}`;
    }

    async function populateSheetDropdown() {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
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
            inputs.sheetSelector.innerHTML = '<option value="">Error loading sheets</option>';
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
        if (!selectedSheet || !inputs.startDate.value || !inputs.endDate.value) {
            alert('Please select a timesheet and a valid date range.');
            return;
        }
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'${encodeURIComponent(selectedSheet)}'!A:G?key=${API_KEY}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            if (!data.values || data.values.length <= 1) {
                previews.invoiceBody.innerHTML = '<tr><td colspan="5">No data found in this sheet.</td></tr>';
            } else {
                const rows = data.values.slice(1);
                const filteredRows = rows.filter(row => {
                    if (!row[1]) return false;
                    const rowDate = new Date(row[1]);
                    return new Date(inputs.startDate.value) <= rowDate && rowDate <= new Date(inputs.endDate.value);
                });
                if (filteredRows.length === 0) {
                    previews.invoiceBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No entries found for the selected period.</td></tr>';
                } else {
                    filteredRows.forEach(row => {
                        const [, date, rawTimeFrom, rawTimeTo, durationStr, tasks] = row;
                        const timeFrom = formatTime(rawTimeFrom || '');
                        const timeTo = formatTime(rawTimeTo || '');
                        const [hours, minutes] = (durationStr || '0:0').split(':').map(Number);
                        totalMinutes += (hours || 0) * 60 + (minutes || 0);
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${new Date(date).toLocaleDateString()}</td>
                            <td>${tasks || ''}</td>
                            <td>${timeFrom}</td>
                            <td>${timeTo}</td>
                            <td>${durationStr || '0:00'}</td>
                        `;
                        previews.invoiceBody.appendChild(tr);
                    });
                }
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
    
    // Listen for changes
    inputs.billingMethod.addEventListener('change', handleBillingMethodChange);
    inputs.hourlyRate.addEventListener('input', calculateAndDisplayTotals);
    inputs.fixedRate.addEventListener('input', calculateAndDisplayTotals);
    
    // Update preview on any input
    Object.values(inputs).forEach(input => {
        if (!['billingMethod', 'hourlyRate', 'fixedRate'].includes(input.id)) {
            input.addEventListener('input', updatePreview);
        }
    });
    
    // Listen for button clicks
    buttons.fetchData.addEventListener('click', fetchAndDisplayData);
    buttons.generatePdf.addEventListener('click', generatePdf);
    // --- NEW EVENT LISTENERS ---
    buttons.saveDefaults.addEventListener('click', saveDefaults);
    buttons.clearDefaults.addEventListener('click', clearDefaults);
    
    // --- FINAL SETUP ---
    loadDefaults(); // Now this function exists and will run without error.
    updatePreview(); // Update preview with any loaded defaults
    populateSheetDropdown();
    handleBillingMethodChange(); // Set the correct billing view
});


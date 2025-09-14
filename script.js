document.addEventListener('DOMContentLoaded', function() {
    // --- CONFIGURATION ---
    const SPREADSHEET_ID = '1-54sXsMbJmZlm-ecaNRjP9weSf9sBBBWs2XA0CGNhgg'; // 👈 Replace with your Spreadsheet ID
    const API_KEY = 'YOUR_API_KEY'; // 👈 Replace with your API Key

    // --- ELEMENT SELECTORS ---
    const inputs = {
        clientName: document.getElementById('client-name'),
        clientCompany: document.getElementById('client-company'),
        clientEmail: document.getElementById('client-email'),
        sheetSelector: document.getElementById('sheet-selector'), // New selector
        startDate: document.getElementById('start-date'),
        endDate: document.getElementById('end-date'),
        paymentMethod: document.getElementById('payment-method'),
        paymentDetails: document.getElementById('payment-details'),
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
    };

    const buttons = {
        fetchData: document.getElementById('fetch-data-btn'),
        generatePdf: document.getElementById('generate-pdf-btn'),
    };

    // --- FUNCTIONS ---

    // NEW: Fetches all sheet names and populates the dropdown
    async function populateSheetDropdown() {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            
            inputs.sheetSelector.innerHTML = ''; // Clear "Loading..."
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

    // Generate a unique invoice ID
    function generateInvoiceId() {
        return `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Update preview pane based on input fields
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

    // MODIFIED: Fetches data from the SELECTED sheet and filters by date
    async function fetchAndDisplayData() {
        const selectedSheet = inputs.sheetSelector.value;
        const startDate = new Date(inputs.startDate.value);
        const endDate = new Date(inputs.endDate.value);

        if (!selectedSheet) {
            alert('Please select a timesheet from the dropdown.');
            return;
        }
        if (!inputs.startDate.value || !inputs.endDate.value) {
            alert('Please select a valid start and end date for the billing period.');
            return;
        }

        // Use encodeURIComponent to handle sheet names with spaces or special characters
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(selectedSheet)}?key=${API_KEY}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            
            previews.invoiceBody.innerHTML = ''; 
            let totalDuration = 0;

            if (!data.values || data.values.length <= 1) {
                 previews.invoiceBody.innerHTML = '<tr><td colspan="3">No data found in this sheet.</td></tr>';
                 previews.totalHours.textContent = "0.00";
                 return;
            }

            const rows = data.values.slice(1);
            const filteredRows = rows.filter(row => {
                if (!row[1]) return false; // Skip rows with no date in column B
                const rowDate = new Date(row[1]);
                return rowDate >= startDate && rowDate <= endDate;
            });

            if (filteredRows.length === 0) {
                 previews.invoiceBody.innerHTML = '<tr><td colspan="3">No entries found for the selected period.</td></tr>';
            }

            filteredRows.forEach(row => {
                const date = new Date(row[1]).toLocaleDateString();
                const tasks = row[6] || 'N/A'; // Column G for Tasks/Notes
                const durationStr = row[4] || '0:0'; // Column E for Duration
                
                const [hours, minutes] = durationStr.split(':').map(Number);
                const decimalDuration = (hours || 0) + ((minutes || 0) / 60);
                totalDuration += decimalDuration;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${date}</td>
                    <td>${tasks}</td>
                    <td>${decimalDuration.toFixed(2)}</td>
                `;
                previews.invoiceBody.appendChild(tr);
            });

            previews.totalHours.textContent = totalDuration.toFixed(2);

        } catch (error) {
            console.error('Error fetching sheet data:', error);
            alert('Failed to fetch data from Google Sheet. Check console for errors.');
        }
    }
    
    // Generate PDF from the preview element
    function generatePdf() {
        const invoiceElement = document.getElementById('invoice-preview');
        const clientName = inputs.clientCompany.value || 'Invoice';
        const invoiceId = previews.invoiceId.textContent;
        
        const opt = {
            margin: 0.5,
            filename: `${clientName}_${invoiceId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().from(invoiceElement).set(opt).save();
    }

    // --- INITIALIZATION & EVENT LISTENERS ---

    // Set initial static values
    previews.invoiceId.textContent = generateInvoiceId();
    previews.invoiceDate.textContent = new Date().toLocaleDateString();

    // Add listeners to all input fields for live updates
    Object.values(inputs).forEach(input => {
        if (input.id !== 'sheet-selector') { // Don't need live updates for the dropdown
             input.addEventListener('input', updatePreview);
        }
    });

    // Add listeners to buttons
    buttons.fetchData.addEventListener('click', fetchAndDisplayData);
    buttons.generatePdf.addEventListener('click', generatePdf);

    // Initial calls on page load
    updatePreview();
    populateSheetDropdown(); // Call the new function to fill the dropdown
});

/* =======================================================
   SINTETIZADOR DE SONIDO WEB (Audio interactivo nativo)
   ======================================================= */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSuccessSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.3);
}

/* =======================================================
   ESTADO Y VARIABLES GLOBALES
   ======================================================= */
let items = [];
let savedQuotes = JSON.parse(localStorage.getItem('myQuotes')) || [];
let companyInfo = JSON.parse(localStorage.getItem('myCompanyInfo')) || { name: '', contact: '' };
let symbol = '$';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('myCompanyName').value = companyInfo.name;
    document.getElementById('myCompanyContact').value = companyInfo.contact;
    renderSavedQuotes();
    addNewItem();
});

function saveCompanyInfo() {
    companyInfo.name = document.getElementById('myCompanyName').value.trim();
    companyInfo.contact = document.getElementById('myCompanyContact').value.trim();
    localStorage.setItem('myCompanyInfo', JSON.stringify(companyInfo));
    renderSavedQuotes();
}

function changeCurrency() {
    const currency = document.getElementById('currency').value;
    symbol = (currency === 'USD') ? 'US$' : '$';
    renderItemsForm();
    calculateTotals();
}

function addNewItem() {
    items.push({ id: Date.now(), description: '', qty: 1, unit: 'u.', price: 0 });
    renderItemsForm();
}

function renderItemsForm() {
    const container = document.getElementById('itemsContainer');
    container.innerHTML = '';

    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'row g-2 align-items-center bg-white p-2 rounded border shadow-sm position-relative item-row';

        row.innerHTML = `
            <div class="col-12 col-md-4">
                <input type="text" class="form-control form-control-sm border-0 border-bottom bg-transparent fw-medium rounded-0" value="${item.description}" placeholder="Descripción del trabajo..." oninput="updateItem(${item.id}, 'description', this.value)">
            </div>
            <div class="col-4 col-md-2">
                <input type="number" step="0.1" min="0" class="form-control form-control-sm bg-light text-center border-0 rounded" value="${item.qty || 0}" placeholder="Cant." oninput="updateItem(${item.id}, 'qty', this.value)">
            </div>
            <div class="col-4 col-md-2">
                <select class="form-select form-select-sm border-0 bg-light text-secondary rounded" onchange="updateItem(${item.id}, 'unit', this.value)">
                    <option value="u." ${item.unit === 'u.' ? 'selected' : ''}>Unid.</option>
                    <option value="m" ${item.unit === 'm' ? 'selected' : ''}>m (Metros)</option>
                    <option value="m²" ${item.unit === 'm²' ? 'selected' : ''}>m²</option>
                    <option value="m³" ${item.unit === 'm³' ? 'selected' : ''}>m³</option>
                    <option value="kg" ${item.unit === 'kg' ? 'selected' : ''}>kg</option>
                    <option value="g" ${item.unit === 'g' ? 'selected' : ''}>g (Gramos)</option>
                    <option value="hrs" ${item.unit === 'hrs' ? 'selected' : ''}>Horas</option>
                    <option value="gl" ${item.unit === 'gl' ? 'selected' : ''}>Global</option>
                </select>
            </div>
            <div class="col-4 col-md-3">
                <div class="input-group input-group-sm">
                    <span class="input-group-text bg-light border-0 text-muted">${symbol}</span>
                    <input type="number" min="0" class="form-control border-0 bg-light text-end fw-bold rounded-end" value="${item.price || 0}" placeholder="0.00" oninput="updateItem(${item.id}, 'price', this.value)">
                </div>
            </div>
            <div class="col-12 col-md-1 text-end">
                <button onclick="removeItem(${item.id})" class="btn btn-link text-danger p-0 text-decoration-none fw-bold fs-5 btn-hover" title="Eliminar fila">&times;</button>
            </div>
        `;
        container.appendChild(row);
    });
    calculateTotals();
}

function updateItem(id, field, value) {
    const itemIndex = items.findIndex(i => i.id === id);
    if (itemIndex > -1) {
        if (field === 'qty' || field === 'price') {
            let num = parseFloat(value);
            items[itemIndex][field] = isNaN(num) ? 0 : num;
        } else {
            items[itemIndex][field] = value;
        }
        calculateTotals();
    }
}

function removeItem(id) {
    items = items.filter(i => i.id !== id);
    if (items.length === 0) addNewItem();
    else renderItemsForm();
}

function calculateTotals() {
    let subtotal = 0;
    items.forEach(item => subtotal += (item.qty * item.price));

    let taxRate = parseFloat(document.getElementById('taxRate').value);
    if (isNaN(taxRate) || taxRate < 0) taxRate = 0;

    const taxName = document.getElementById('taxName').value || 'Impuesto';
    const taxAmount = subtotal * (taxRate / 100);
    const grandTotal = subtotal + taxAmount;

    const formatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    document.getElementById('subtotal').innerText = `${symbol} ${formatter.format(subtotal)}`;
    document.getElementById('taxAmount').innerText = `${symbol} ${formatter.format(taxAmount)}`;
    document.getElementById('grandTotal').innerText = `${symbol} ${formatter.format(grandTotal)}`;

    return { subtotal, taxName, taxRate, taxAmount, grandTotal, formatter };
}

/* =======================================================
   GUARDADO Y GENERACIÓN DE PDF
   ======================================================= */
function saveQuote() {
    const clientName = document.getElementById('clientName').value.trim();
    if (!clientName) return alert("Por favor, ingresa el nombre del cliente u obra.");

    const validItems = items.filter(i => i.description.trim() !== '' && i.price > 0);
    if (validItems.length === 0) return alert("El presupuesto debe tener al menos un ítem con precio.");

    const notes = document.getElementById('quoteNotes').value.trim();
    const date = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });

    const currencyCode = document.getElementById('currency').value;
    const currencyName = currencyCode === 'USD' ? 'Dólares (US$)' : 'Pesos (ARS)';

    let refNumber = document.getElementById('quoteRef').value.trim();
    if (!refNumber) refNumber = Math.floor(1000 + Math.random() * 9000).toString();

    const newQuote = {
        id: Date.now(),
        refNumber: refNumber,
        date: date,
        client: clientName,
        currencySymbol: symbol,
        currencyName: currencyName,
        items: validItems,
        notes: notes,
        totals: calculateTotals(),
        company: { name: companyInfo.name, contact: companyInfo.contact }
    };

    savedQuotes.unshift(newQuote);
    localStorage.setItem('myQuotes', JSON.stringify(savedQuotes));

    document.getElementById('clientName').value = '';
    document.getElementById('quoteRef').value = '';
    document.getElementById('quoteNotes').value = '';
    items = [];
    addNewItem();
    renderSavedQuotes();

    playSuccessSound();
    showToast("Presupuesto guardado exitosamente");
}

function renderSavedQuotes() {
    const list = document.getElementById('savedQuotesList');
    if (savedQuotes.length === 0) {
        list.innerHTML = `
            <div class="text-center py-5 text-white">
                <div class="fs-1 mb-2 opacity-50">📄</div>
                <h6 class="fw-bold">Aún no hay presupuestos</h6>
                <p class="small opacity-75">Tus documentos generados aparecerán aquí.</p>
            </div>`;
        return;
    }

    const formatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    list.innerHTML = savedQuotes.map(quote => `
        <div class="quote-card card border-0 shadow-sm rounded p-4 p-md-5 bg-white position-relative panel-hover" id="quote-${quote.id}">
            
            <div class="position-absolute top-0 end-0 m-3 d-flex gap-2 hide-on-print" data-html2canvas-ignore="true">
                <button onclick="downloadPDF('quote-${quote.id}')" class="btn btn-dark btn-sm fw-bold shadow-sm d-flex align-items-center gap-2 btn-hover rounded" style="font-size: 0.75rem;">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                    Descargar
                </button>
                <button onclick="deleteQuote(${quote.id})" class="btn btn-outline-danger btn-sm fw-bold d-flex align-items-center btn-hover rounded" style="font-size: 0.8rem;" title="Eliminar Documento">
                    &times;
                </button>
            </div>
            
            <div class="d-flex flex-column flex-md-row justify-content-between border-bottom pb-4 mb-4 gap-3 mt-4 mt-md-0">
                <div>
                    <h1 class="fw-black text-dark mb-0 tracking-tight" style="letter-spacing: -1px;">PRESUPUESTO</h1>
                    <p class="text-muted small mb-3">Ref: #${quote.refNumber} &nbsp;|&nbsp; Fecha: ${quote.date}</p>
                    
                    <p class="text-muted text-uppercase fw-bold mb-0" style="font-size: 0.7rem;">Preparado para:</p>
                    <p class="fw-bold fs-5 text-dark mb-0 text-break">${quote.client}</p>
                </div>
                <div class="text-md-end text-break">
                    <p class="text-muted text-uppercase fw-bold mb-0" style="font-size: 0.7rem;">Emitido por:</p>
                    <h5 class="fw-bold text-dark mb-0">${quote.company.name || 'Sin Nombre de Empresa'}</h5>
                    <p class="text-muted small mb-2">${quote.company.contact || 'Sin datos de contacto'}</p>
                    
                    <span class="badge bg-light text-secondary border border-secondary-subtle px-2 py-1 text-wrap rounded">
                        Moneda: ${quote.currencyName}
                    </span>
                </div>
            </div>
            
            <div class="table-responsive mb-4">
                <table class="table table-borderless table-sm mb-0">
                    <thead class="border-bottom text-muted">
                        <tr>
                            <th class="py-2 fw-semibold w-50">Descripción</th>
                            <th class="py-2 fw-semibold text-center">Cant.</th>
                            <th class="py-2 fw-semibold text-end">Precio Un.</th>
                            <th class="py-2 fw-semibold text-end">Monto</th>
                        </tr>
                    </thead>
                    <tbody class="border-bottom">
                        ${quote.items.map(i => `
                            <tr>
                                <td class="py-3 text-dark fw-medium">${i.description}</td>
                                <td class="py-3 text-center text-muted text-nowrap">${i.qty} <span style="font-size: 0.7rem;">${i.unit}</span></td>
                                <td class="py-3 text-end text-muted font-monospace text-nowrap">${quote.currencySymbol} ${formatter.format(i.price)}</td>
                                <td class="py-3 text-end text-dark fw-bold font-monospace text-nowrap">${quote.currencySymbol} ${formatter.format(i.qty * i.price)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="row">
                <div class="col-md-6 mb-4 mb-md-0">
                    ${quote.notes ? `
                        <p class="text-muted text-uppercase fw-bold mb-1" style="font-size: 0.7rem;">Notas / Condiciones</p>
                        <div class="bg-light p-3 rounded text-secondary small" style="white-space: pre-wrap;">${quote.notes}</div>
                    ` : ''}
                </div>

                <div class="col-md-5 ms-auto">
                    <table class="table table-borderless table-sm mb-0">
                        <tbody>
                            <tr>
                                <td class="text-muted small text-end">Subtotal:</td>
                                <td class="text-end font-monospace text-nowrap" style="width: 140px;">${quote.currencySymbol} ${formatter.format(quote.totals.subtotal)}</td>
                            </tr>
                            ${quote.totals.taxRate > 0 ? `
                            <tr class="border-bottom">
                                <td class="text-muted small text-end pb-2">${quote.totals.taxName} (${quote.totals.taxRate}%):</td>
                                <td class="text-end font-monospace text-nowrap pb-2">+ ${quote.currencySymbol} ${formatter.format(quote.totals.taxAmount)}</td>
                            </tr>` : ''}
                            <tr>
                                <td class="fw-bold text-dark text-end pt-3 align-middle">TOTAL:</td>
                                <td class="fs-4 fw-black text-dark text-end font-monospace text-nowrap pt-3">${quote.currencySymbol} ${formatter.format(quote.totals.grandTotal)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `).join('');
}

function deleteQuote(id) {
    if (confirm("¿Estás seguro de eliminar este documento definitivamente?")) {
        savedQuotes = savedQuotes.filter(q => q.id !== id);
        localStorage.setItem('myQuotes', JSON.stringify(savedQuotes));
        renderSavedQuotes();
    }
}

function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast-enter bg-white text-dark border px-4 py-3 rounded shadow-lg d-flex align-items-center gap-2 mb-3';
    toast.innerHTML = `<span class="fs-5 text-success">
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg>
    </span> <span class="fw-medium">${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function downloadPDF(cardId) {
    const element = document.getElementById(cardId);

    const opt = {
        margin: 10,
        filename: `Presupuesto_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        playSuccessSound();
        showToast("¡Documento descargado exitosamente!");
    });
}
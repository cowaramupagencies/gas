// Gas Bottle Order Entry System - V1
// Local-first order entry system using localStorage

// Data storage keys
const STORAGE_KEYS = {
    CUSTOMERS: 'gasOrders_customers',
    ORDERS: 'gasOrders_orders',
    RUNS: 'gasOrders_runs',
    MANIFESTS: 'gasOrders_manifests'
};

// Initialize data structures if they don't exist
function initializeStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.RUNS)) {
        localStorage.setItem(STORAGE_KEYS.RUNS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MANIFESTS)) {
        localStorage.setItem(STORAGE_KEYS.MANIFESTS, JSON.stringify([]));
    }
}

// Get all customers from storage
function getCustomers() {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : [];
}

// Save customers to storage
function saveCustomers(customers) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
}

// Get all orders from storage
function getOrders() {
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return data ? JSON.parse(data) : [];
}

// Save orders to storage
function saveOrders(orders) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

// Get all runs from storage
function getRuns() {
    const data = localStorage.getItem(STORAGE_KEYS.RUNS);
    return data ? JSON.parse(data) : [];
}

// Save runs to storage
function saveRuns(runs) {
    localStorage.setItem(STORAGE_KEYS.RUNS, JSON.stringify(runs));
}

// Get all manifests from storage
function getManifests() {
    const data = localStorage.getItem(STORAGE_KEYS.MANIFESTS);
    return data ? JSON.parse(data) : [];
}

// Save manifests to storage
function saveManifests(manifests) {
    localStorage.setItem(STORAGE_KEYS.MANIFESTS, JSON.stringify(manifests));
}

// Generate a simple ID (timestamp-based)
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ---------------------------------------------------------------------------
// Multi-bottle order support: constants, migration, helpers
// ---------------------------------------------------------------------------

const BOTTLE_TYPES = ['45kg', '8.5kg', 'Forklift 18kg', 'Forklift 15kg'];
const MAX_BOTTLES_PER_RUN = 8; // Only 45kg bottles count toward this limit

// Migrate existing orders to bottles + totalBottleCount (run once on load)
function migrateOrdersToMultiBottle() {
    const orders = getOrders();
    let changed = false;
    orders.forEach(order => {
        if (order.bottles !== undefined && order.totalBottleCount !== undefined) {
            // Ensure all bottle types exist (for orders created before new types added)
            const bottles = order.bottles || {};
            order.bottles = {
                '45kg': bottles['45kg'] || 0,
                '8.5kg': bottles['8.5kg'] || 0,
                'Forklift 18kg': bottles['Forklift 18kg'] || 0,
                'Forklift 15kg': bottles['Forklift 15kg'] || 0
            };
            // Recalculate totalBottleCount (drop any old 'Forklift' entries)
            order.totalBottleCount = Object.values(order.bottles).reduce((sum, qty) => sum + (parseInt(qty, 10) || 0), 0);
            changed = true;
            return;
        }
        // Legacy: bottleType + quantity
        const type = order.bottleType || '45kg';
        const qty = Math.max(0, parseInt(order.quantity, 10) || 0);
        order.bottles = {
            '45kg': type === '45kg' ? qty : 0,
            '8.5kg': type === '8.5kg' ? qty : 0,
            'Forklift 18kg': type === 'Forklift 18kg' ? qty : 0,
            'Forklift 15kg': type === 'Forklift 15kg' ? qty : 0
        };
        // If legacy order was 'Forklift', drop it (we removed that type)
        order.totalBottleCount = qty;
        changed = true;
    });
    if (changed) saveOrders(orders);
}

// Get total bottle count for an order (works for both legacy and new format)
function getOrderTotalBottles(order) {
    if (order.totalBottleCount !== undefined) return order.totalBottleCount;
    return Math.max(0, parseInt(order.quantity, 10) || 0);
}

// Get bottles object for an order (always returns all bottle types)
function getOrderBottles(order) {
    if (order.bottles && typeof order.bottles === 'object') {
        return {
            '45kg': Math.max(0, parseInt(order.bottles['45kg'], 10) || 0),
            '8.5kg': Math.max(0, parseInt(order.bottles['8.5kg'], 10) || 0),
            'Forklift 18kg': Math.max(0, parseInt(order.bottles['Forklift 18kg'], 10) || 0),
            'Forklift 15kg': Math.max(0, parseInt(order.bottles['Forklift 15kg'], 10) || 0)
        };
    }
    const type = order.bottleType || '45kg';
    const qty = Math.max(0, parseInt(order.quantity, 10) || 0);
    return {
        '45kg': type === '45kg' ? qty : 0,
        '8.5kg': type === '8.5kg' ? qty : 0,
        'Forklift 18kg': type === 'Forklift 18kg' ? qty : 0,
        'Forklift 15kg': type === 'Forklift 15kg' ? qty : 0
    };
}

// Get only 45kg bottles for capacity checking (trailer limit)
function getOrderTrailerBottles(order) {
    const bottles = getOrderBottles(order);
    return bottles['45kg'] || 0;
}

// Human-readable bottle breakdown for display (e.g. "45kg ×1, Forklift ×2")
function formatBottleBreakdown(order) {
    const b = getOrderBottles(order);
    const parts = [];
    BOTTLE_TYPES.forEach(t => {
        if (b[t] > 0) parts.push(t + ' ×' + b[t]);
    });
    return parts.length ? parts.join(', ') : '—';
}

// Format bottle types only (without quantities) for customer history
function formatBottleTypesOnly(order) {
    const b = getOrderBottles(order);
    const parts = [];
    BOTTLE_TYPES.forEach(t => {
        if (b[t] > 0) parts.push(t);
    });
    return parts.length ? parts.join(', ') : '—';
}

// Get current bottle count for a run (excluding optional orderId to add)
// Returns total bottles for display purposes
function getRunBottleCount(runId, excludeOrderId) {
    const orders = getOrders().filter(o => o.runId === runId && o.id !== excludeOrderId);
    return orders.reduce((sum, o) => sum + getOrderTotalBottles(o), 0);
}

// Get current 45kg bottle count for a run (for capacity checking - trailer limit)
function getRunTrailerBottleCount(runId, excludeOrderId) {
    const orders = getOrders().filter(o => o.runId === runId && o.id !== excludeOrderId);
    return orders.reduce((sum, o) => sum + getOrderTrailerBottles(o), 0);
}

// Update the "Total: N bottles" display under bottle selector
function updateBottleTotalDisplay() {
    const el = document.getElementById('bottle-total-display');
    if (!el) return;
    const total = getFormTotalBottleCount();
    el.textContent = 'Total: ' + total + ' bottle' + (total !== 1 ? 's' : '');
}

// Populate Assign to Run dropdown for selected delivery date; disable runs that would exceed capacity
function populateAssignRunDropdown() {
    const dateInput = document.getElementById('delivery-date');
    const runSelect = document.getElementById('assign-run');
    if (!dateInput || !runSelect) return;
    
    const deliveryDate = dateInput.value;
    const orderTrailerBottles = getFormTrailerBottleCount(); // Only 45kg bottles count
    
    runSelect.innerHTML = '<option value="">Auto</option>';
    
    if (!deliveryDate) {
        document.getElementById('assign-run-hint').textContent = 'Select a date to see runs. Max 8 bottles per run (45kg only).';
        return;
    }
    
    const runs = getRuns().filter(r => r.deliveryDate === deliveryDate);
    runs.forEach(run => {
        const current = getRunTrailerBottleCount(run.id);
        const wouldBe = current + orderTrailerBottles;
        const full = wouldBe > MAX_BOTTLES_PER_RUN;
        const option = document.createElement('option');
        option.value = run.id;
        option.textContent = 'Run ' + run.runNumber + ' (' + current + '/8)' + (full ? ' — full' : '');
        if (full) option.disabled = true;
        runSelect.appendChild(option);
    });
    
    const hint = document.getElementById('assign-run-hint');
    if (hint) hint.textContent = orderTrailerBottles > MAX_BOTTLES_PER_RUN ? 'Order exceeds 8 bottles (45kg only); cannot assign to a single run.' : 'Max 8 bottles per run (45kg only). Auto picks first run with space.';
}

// Search customers by query string
function searchCustomers(query) {
    if (!query || query.trim().length < 2) {
        return [];
    }
    
    const customers = getCustomers();
    const lowerQuery = query.toLowerCase().trim();
    
    return customers.filter(customer => {
        const nameMatch = customer.name.toLowerCase().includes(lowerQuery);
        const mobileMatch = customer.mobile.toLowerCase().includes(lowerQuery);
        const addressMatch = customer.address.toLowerCase().includes(lowerQuery);
        return nameMatch || mobileMatch || addressMatch;
    });
}

// Display search results
function displaySearchResults(results) {
    const resultsContainer = document.getElementById('search-results');
    
    if (results.length === 0) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'block';
    
    results.forEach(customer => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
            <div class="search-result-name">${escapeHtml(customer.name)}</div>
            <div class="search-result-details">
                ${escapeHtml(customer.mobile)} • ${escapeHtml(customer.address)}
            </div>
        `;
        
        item.addEventListener('click', () => {
            selectCustomer(customer);
            resultsContainer.style.display = 'none';
            document.getElementById('customer-search').value = '';
        });
        
        resultsContainer.appendChild(item);
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Select a customer and populate form
function selectCustomer(customer) {
    document.getElementById('customer-name').value = customer.name || '';
    document.getElementById('customer-mobile').value = customer.mobile || '';
    document.getElementById('customer-address').value = customer.address || '';
    
    // Store customer ID for later use
    document.getElementById('customer-name').dataset.customerId = customer.id;
    
    // Load customer notes if they exist
    if (customer.notes) {
        const orderNotes = document.getElementById('order-notes');
        if (!orderNotes.value) {
            orderNotes.value = customer.notes;
        }
    }
}

// Find or create customer
function findOrCreateCustomer(name, mobile, address) {
    const customers = getCustomers();
    
    // Try to find existing customer by mobile (most reliable identifier)
    let customer = customers.find(c => 
        c.mobile.toLowerCase().trim() === mobile.toLowerCase().trim()
    );
    
    if (customer) {
        // Update existing customer details if they've changed
        customer.name = name;
        customer.address = address;
    } else {
        // Create new customer
        customer = {
            id: generateId(),
            name: name.trim(),
            mobile: mobile.trim(),
            address: address.trim(),
            notes: '',
            orderHistory: []
        };
        customers.push(customer);
    }
    
    saveCustomers(customers);
    return customer;
}

// Update customer notes
function updateCustomerNotes(customerId, notes) {
    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);
    
    if (customer && notes.trim()) {
        // Append to existing notes or set new notes
        if (customer.notes) {
            customer.notes = customer.notes + '\n' + notes.trim();
        } else {
            customer.notes = notes.trim();
        }
        saveCustomers(customers);
    }
}

// Read bottle quantities from form
function getFormBottleQuantities() {
    const bottles = {};
    BOTTLE_TYPES.forEach(type => {
        const el = document.getElementById('bottle-qty-' + type);
        bottles[type] = el ? Math.max(0, parseInt(el.value, 10) || 0) : 0;
    });
    return bottles;
}

function getFormTotalBottleCount() {
    const b = getFormBottleQuantities();
    return Object.values(b).reduce((sum, qty) => sum + qty, 0);
}

// Get only 45kg bottles from form (for capacity checking - trailer limit)
function getFormTrailerBottleCount() {
    const b = getFormBottleQuantities();
    return b['45kg'] || 0;
}

// Validate form
function validateForm() {
    const name = document.getElementById('customer-name').value.trim();
    const mobile = document.getElementById('customer-mobile').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    const totalBottles = getFormTotalBottleCount();
    
    if (!name) {
        showMessage('Please enter customer name', 'error');
        document.getElementById('customer-name').focus();
        return false;
    }
    
    if (!mobile) {
        showMessage('Please enter mobile number', 'error');
        document.getElementById('customer-mobile').focus();
        return false;
    }
    
    if (!address) {
        showMessage('Please enter address', 'error');
        document.getElementById('customer-address').focus();
        return false;
    }
    
    if (totalBottles < 1) {
        showMessage('Please add at least one bottle (set quantity for a bottle type)', 'error');
        return false;
    }
    
    // If a specific run is selected, check capacity (only 45kg bottles count)
    const runSelect = document.getElementById('assign-run');
    const selectedRunId = runSelect && runSelect.value;
    if (selectedRunId) {
        const currentTrailer = getRunTrailerBottleCount(selectedRunId);
        const orderTrailer = getFormTrailerBottleCount();
        if (currentTrailer + orderTrailer > MAX_BOTTLES_PER_RUN) {
            showMessage('This run is full (max ' + MAX_BOTTLES_PER_RUN + ' bottles, 45kg only). Choose another run or leave as Auto.', 'error');
            return false;
        }
    }
    
    return true;
}

// Save order
function saveOrder() {
    if (!validateForm()) {
        return;
    }
    
    const name = document.getElementById('customer-name').value.trim();
    const mobile = document.getElementById('customer-mobile').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    const bottles = getFormBottleQuantities();
    const totalBottleCount = getFormTotalBottleCount();
    const preferredDay = document.querySelector('input[name="preferred-day"]:checked').value;
    const orderNotes = document.getElementById('order-notes').value.trim();
    let deliveryDate = document.getElementById('delivery-date').value || null;
    const invoiceNumber = document.getElementById('invoice-number').value.trim() || null;
    const assignRunSelect = document.getElementById('assign-run');
    const assignRunValue = assignRunSelect ? assignRunSelect.value : '';
    
    // Resolve run assignment: specific run or Auto (only 45kg bottles count for capacity)
    let runId = null;
    const orderTrailerBottles = getFormTrailerBottleCount();
    if (deliveryDate && assignRunValue) {
        if (assignRunValue === 'auto' || assignRunValue === '') {
            // Auto: first run with capacity
            const runs = getRuns().filter(r => r.deliveryDate === deliveryDate);
            for (let i = 0; i < runs.length; i++) {
                const currentTrailer = getRunTrailerBottleCount(runs[i].id);
                if (currentTrailer + orderTrailerBottles <= MAX_BOTTLES_PER_RUN) {
                    runId = runs[i].id;
                    break;
                }
            }
            // If no run has capacity, leave unassigned (order goes to undelivered)
        } else {
            runId = assignRunValue;
            const currentTrailer = getRunTrailerBottleCount(runId);
            if (currentTrailer + orderTrailerBottles > MAX_BOTTLES_PER_RUN) {
                showMessage('This run is full (max ' + MAX_BOTTLES_PER_RUN + ' bottles, 45kg only). Save blocked.', 'error');
                return;
            }
        }
    }
    
    // Find or create customer
    const customer = findOrCreateCustomer(name, mobile, address);
    
    // Create order
    const order = {
        id: generateId(),
        customerId: customer.id,
        bottles: bottles,
        totalBottleCount: totalBottleCount,
        preferredDay: preferredDay,
        deliveryDate: deliveryDate,
        invoiceNumber: invoiceNumber,
        notes: orderNotes,
        status: runId ? 'Assigned' : 'Unassigned',
        runId: runId,
        delivered: false,
        deliveredAt: null,
        deliveredRunId: null,
        createdAt: new Date().toISOString()
    };
    
    // Save order
    const orders = getOrders();
    orders.push(order);
    saveOrders(orders);
    
    // Update customer order history
    customer.orderHistory.push(order.id);
    const customers = getCustomers();
    const customerIndex = customers.findIndex(c => c.id === customer.id);
    if (customerIndex !== -1) {
        customers[customerIndex] = customer;
        saveCustomers(customers);
    }
    
    // Update customer notes if order notes provided
    if (orderNotes) {
        updateCustomerNotes(customer.id, orderNotes);
    }
    
    showMessage('Order saved successfully!', 'success');
    
    // Refresh undelivered orders display
    renderUndeliveredOrders();
    
    // Reset form after short delay
    setTimeout(() => {
        resetForm();
    }, 1500);
}

// Reset form
function resetForm() {
    document.getElementById('customer-search').value = '';
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-mobile').value = '';
    document.getElementById('customer-address').value = '';
    document.getElementById('customer-name').dataset.customerId = '';
    
    // Reset bottle quantities
    BOTTLE_TYPES.forEach(type => {
        const el = document.getElementById('bottle-qty-' + type);
        if (el) el.value = '0';
    });
    updateBottleTotalDisplay();
    
    // Reset preferred day
    document.querySelector('input[name="preferred-day"][value="Any"]').checked = true;
    
    // Reset notes
    document.getElementById('order-notes').value = '';
    
    // Reset staff options
    document.getElementById('delivery-date').value = '';
    document.getElementById('invoice-number').value = '';
    const assignRun = document.getElementById('assign-run');
    if (assignRun) {
        assignRun.innerHTML = '<option value="">Auto</option>';
    }
    populateAssignRunDropdown();
    
    // Hide search results
    document.getElementById('search-results').style.display = 'none';
    
    // Focus on customer search for next entry
    document.getElementById('customer-search').focus();
}

// Show message
function showMessage(message, type) {
    const messageEl = document.getElementById('save-message');
    messageEl.textContent = message;
    messageEl.className = `save-message ${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            messageEl.className = 'save-message';
        }, 3000);
    }
}

// ============================================
// STAFF / ADMIN SECTION FUNCTIONS
// ============================================

// Get orders for a specific date
function getOrdersByDate(date) {
    const orders = getOrders();
    // Ensure all orders have status field and delivered fields
    orders.forEach(order => {
        if (!order.status) {
            order.status = order.runId ? 'Assigned' : 'Unassigned';
        }
        if (order.delivered === undefined) {
            order.delivered = false;
        }
        if (order.deliveredAt === undefined) {
            order.deliveredAt = null;
        }
        if (order.deliveredRunId === undefined) {
            order.deliveredRunId = null;
        }
    });
    return orders.filter(order => order.deliveryDate === date);
}

// Get orders for a date range
function getOrdersByDateRange(startDate, endDate) {
    const orders = getOrders();
    return orders.filter(order => {
        if (!order.deliveryDate) return false;
        return order.deliveryDate >= startDate && order.deliveryDate <= endDate;
    });
}

// Get customer by ID
function getCustomerById(customerId) {
    const customers = getCustomers();
    return customers.find(c => c.id === customerId) || null;
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'No date';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Get start of week (Monday)
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

// Get week range string
function getWeekRange(date) {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

// Render weekly overview
function renderWeeklyOverview(date) {
    const start = getStartOfWeek(date);
    const grid = document.getElementById('weekly-grid');
    grid.innerHTML = '';
    
    const weekRange = document.getElementById('week-range');
    weekRange.textContent = getWeekRange(date);
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const orders = getOrdersByDate(dateStr);
        const totalBottles = orders.reduce((sum, order) => sum + getOrderTotalBottles(order), 0);
        
        const dayEl = document.createElement('div');
        dayEl.className = 'week-day';
        dayEl.innerHTML = `
            <div class="week-day-name">${currentDate.toLocaleDateString('en-AU', { weekday: 'short' })}</div>
            <div class="week-day-date">${currentDate.getDate()}</div>
            <div class="week-day-stats">
                <div>${orders.length} orders</div>
                <div>${totalBottles} bottles</div>
            </div>
        `;
        
        dayEl.addEventListener('click', () => {
            document.getElementById('daily-view-date').value = dateStr;
            renderDailyView(dateStr);
        });
        
        grid.appendChild(dayEl);
    }
}

// Render daily view
function renderDailyView(date) {
    const orders = getOrdersByDate(date);
    const container = document.getElementById('daily-orders');
    
    if (orders.length === 0) {
        container.innerHTML = '<p>No orders for this date.</p>';
        return;
    }
    
    const customers = getCustomers();
    const runs = getRuns();
    
    let html = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Customer</th>
                    <th>Address</th>
                    <th>Mobile</th>
                    <th>Bottle Type</th>
                    <th>Qty</th>
                    <th>Notes</th>
                    <th>Invoice</th>
                    <th>Status</th>
                    <th>Run</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    orders.forEach(order => {
        const customer = getCustomerById(order.customerId);
        const run = runs.find(r => r.id === order.runId);
        
        html += `
            <tr>
                <td>${escapeHtml(customer ? customer.name : 'Unknown')}</td>
                <td>${escapeHtml(customer ? customer.address : '')}</td>
                <td>${escapeHtml(customer ? customer.mobile : '')}</td>
                <td>${escapeHtml(formatBottleBreakdown(order))}</td>
                <td>${getOrderTotalBottles(order)}</td>
                <td>${escapeHtml(order.notes || '')}</td>
                <td>${escapeHtml(order.invoiceNumber || '')}</td>
                <td>${order.status || 'Unassigned'}</td>
                <td>${run ? `Run ${run.runNumber}` : '-'}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Render run builder
function renderRunBuilder(date) {
    const container = document.getElementById('run-builder-content');
    
    if (!date) {
        container.innerHTML = '<p>Please select a delivery date.</p>';
        return;
    }
    
    const orders = getOrdersByDate(date);
    const unassignedOrders = orders.filter(o => !o.runId);
    const runs = getRuns().filter(r => r.deliveryDate === date);
    
    let html = '<div class="runs-container">';
    
    // Existing runs
    runs.forEach(run => {
        const runOrders = orders.filter(o => o.runId === run.id);
        const totalBottles = runOrders.reduce((sum, o) => sum + getOrderTotalBottles(o), 0);
        const activeManifest = getActiveManifestForRun(run.id);
        
        html += `
            <div class="run-card">
                <div class="run-header">
                    <h4>Run ${run.runNumber} (${totalBottles} / 8 bottles)</h4>
                    ${activeManifest ? '<span class="manifest-locked">Manifest Generated</span>' : ''}
                </div>
                <div class="run-orders">
        `;
        
        runOrders.forEach(order => {
            const customer = getCustomerById(order.customerId);
            html += `
                <div class="run-order-item">
                    ${escapeHtml(customer ? customer.name : 'Unknown')} - 
                    ${escapeHtml(formatBottleBreakdown(order))} (${getOrderTotalBottles(order)})
                </div>
            `;
        });
        
        html += `
                </div>
                <div class="run-actions">
                    ${!activeManifest ? `<button onclick="removeRun('${run.id}')">Remove Run</button>` : ''}
                    ${activeManifest ? `
                        <button onclick="generateManifest('${run.id}')">Regenerate Manifest</button>
                        <button onclick="downloadManifestPDF(getManifestById('${activeManifest.id}'))">Download Manifest</button>
                        <p class="field-hint" style="margin-top: 8px; font-size: 12px;">Regenerating will replace the existing manifest with an updated version.</p>
                    ` : `
                        <button onclick="generateManifest('${run.id}')">Generate Manifest</button>
                    `}
                </div>
            </div>
        `;
    });
    
    // Create new run button
    const allAssignedBottles = runs.reduce((sum, run) => {
        const runOrders = orders.filter(o => o.runId === run.id);
        return sum + runOrders.reduce((s, o) => s + o.quantity, 0);
    }, 0);
    
    html += '</div>';
    
    html += `
        <div class="create-run-section">
            <button id="create-new-run" class="create-run-btn">Create New Run</button>
            <div class="run-counter">Total bottles assigned: ${allAssignedBottles} / ${orders.reduce((s, o) => s + getOrderTotalBottles(o), 0)}</div>
        </div>
    `;
    
    html += `
        <div class="unassigned-orders">
            <h4>Unassigned Orders</h4>
            <div id="unassigned-orders-list"></div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Render unassigned orders
    renderUnassignedOrders(unassignedOrders, date);
    
    // Create new run handler
    document.getElementById('create-new-run')?.addEventListener('click', () => {
        createNewRun(date);
    });
}

// Render unassigned orders
function renderUnassignedOrders(orders, date) {
    const container = document.getElementById('unassigned-orders-list');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = '<p>All orders are assigned to runs.</p>';
        return;
    }
    
    const customers = getCustomers();
    let html = '<div class="unassigned-grid">';
    
    orders.forEach(order => {
        const customer = getCustomerById(order.customerId);
        const runs = getRuns().filter(r => r.deliveryDate === date);
        const availableRuns = runs.filter(run => {
            const runOrders = getOrdersByDate(date).filter(o => o.runId === run.id);
            const currentTrailer = runOrders.reduce((sum, o) => sum + getOrderTrailerBottles(o), 0);
            const orderTrailer = getOrderTrailerBottles(order);
            return currentTrailer + orderTrailer <= 8;
        });
        
        html += `
            <div class="unassigned-order-card" data-order-id="${order.id}">
                <div class="order-info">
                    <strong>${escapeHtml(customer ? customer.name : 'Unknown')}</strong><br>
                    ${escapeHtml(formatBottleBreakdown(order))} (${getOrderTotalBottles(order)})<br>
                    <small>${escapeHtml(customer ? customer.address : '')}</small>
                </div>
                <div class="order-actions">
                    ${availableRuns.length > 0 ? `
                        <select onchange="assignOrderToRun('${order.id}', this.value)">
                            <option value="">Assign to run...</option>
                            ${availableRuns.map(run => {
                                const runOrders = getOrdersByDate(date).filter(o => o.runId === run.id);
                                const totalBottles = runOrders.reduce((sum, o) => sum + getOrderTotalBottles(o), 0);
                                return `<option value="${run.id}">Run ${run.runNumber} (${totalBottles}/8)</option>`;
                            }).join('')}
                        </select>
                    ` : '<span class="no-runs">Create a run first</span>'}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Create new run
function createNewRun(date) {
    const runs = getRuns().filter(r => r.deliveryDate === date);
    const runNumber = runs.length + 1;
    
    const run = {
        id: generateId(),
        deliveryDate: date,
        runNumber: runNumber,
        orderIds: [],
        manifestId: null,
        status: 'Pending', // Pending / In Progress / Completed
        completedAt: null,
        previousRunId: null,
        createdAt: new Date().toISOString()
    };
    
    const allRuns = getRuns();
    allRuns.push(run);
    saveRuns(allRuns);
    
    renderRunBuilder(date);
}

// Assign order to run
function assignOrderToRun(orderId, runId) {
    if (!runId) return;
    
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const runs = getRuns();
    const run = runs.find(r => r.id === runId);
    if (!run) return;
    
    // Check if adding this order would exceed 8 bottles (45kg only)
    const runOrders = orders.filter(o => o.runId === runId);
    const currentTrailer = runOrders.reduce((sum, o) => sum + getOrderTrailerBottles(o), 0);
    const orderTrailer = getOrderTrailerBottles(order);
    
    if (currentTrailer + orderTrailer > 8) {
        alert('Cannot add order: would exceed 8 bottles limit (45kg only)');
        return;
    }
    
    // Update order
    order.runId = runId;
    order.status = 'Assigned';
    
    // Update run
    if (!run.orderIds.includes(orderId)) {
        run.orderIds.push(orderId);
    }
    
    saveOrders(orders);
    saveRuns(runs);
    
    const date = document.getElementById('run-date').value;
    renderRunBuilder(date);
    
    // Refresh undelivered orders display
    const searchQuery = document.getElementById('undelivered-search')?.value || '';
    renderUndeliveredOrders(searchQuery);
}

// Remove run
function removeRun(runId) {
    if (!confirm('Remove this run? Orders will be unassigned.')) return;
    
    const runs = getRuns();
    const run = runs.find(r => r.id === runId);
    if (!run) return;
    
    // Unassign orders
    const orders = getOrders();
    orders.forEach(order => {
        if (order.runId === runId) {
            order.runId = null;
            order.status = 'Unassigned';
        }
    });
    
    // Remove run
    const filteredRuns = runs.filter(r => r.id !== runId);
    
    saveOrders(orders);
    saveRuns(filteredRuns);
    
    const date = document.getElementById('run-date').value;
    renderRunBuilder(date);
    
    // Refresh undelivered orders display
    const searchQuery = document.getElementById('undelivered-search')?.value || '';
    renderUndeliveredOrders(searchQuery);
}

// Generate manifest
function generateManifest(runId) {
    const runs = getRuns();
    const run = runs.find(r => r.id === runId);
    if (!run) return;
    
    // Block regeneration if run is completed
    if (run.status === 'Completed') {
        alert('This run is completed and cannot be modified.');
        return;
    }
    
    const manifests = getManifests();
    const activeManifest = manifests.find(m => m.runId === runId && m.status === 'ACTIVE');
    
    // Archive existing ACTIVE manifest if it exists
    if (activeManifest) {
        activeManifest.status = 'SUPERSEDED';
        activeManifest.supersededAt = new Date().toISOString();
    }
    
    // Create new manifest with current run orders
    const orders = getOrders().filter(o => o.runId === runId);
    const customers = getCustomers();
    
    // Snapshot data
    const snapshotData = {
        runId: runId,
        deliveryDate: run.deliveryDate,
        runNumber: run.runNumber,
        stops: orders.map((order, index) => {
            const customer = getCustomerById(order.customerId);
            return {
                stopNumber: index + 1,
                customerName: customer ? customer.name : 'Unknown',
                address: customer ? customer.address : '',
                mobile: customer ? customer.mobile : '',
                bottleBreakdown: formatBottleBreakdown(order),
                quantity: getOrderTotalBottles(order),
                notes: order.notes || '',
                invoiceNumber: order.invoiceNumber || ''
            };
        }),
        totalStops: orders.length,
        totalBottles: orders.reduce((sum, o) => sum + getOrderTotalBottles(o), 0),
        breakdown: (() => {
            const b = {};
            BOTTLE_TYPES.forEach(t => { b[t] = 0; });
            orders.forEach(o => {
                const ob = getOrderBottles(o);
                BOTTLE_TYPES.forEach(t => { b[t] += ob[t] || 0; });
            });
            return b;
        })()
    };
    
    // Get next version number (count all manifests for this run, including SUPERSEDED)
    const existingManifestsForRun = manifests.filter(m => m.runId === runId);
    const nextVersion = existingManifestsForRun.length + 1;
    
    const manifest = {
        id: generateId(),
        runId: runId,
        version: nextVersion,
        status: 'ACTIVE',
        generatedAt: new Date().toISOString(),
        supersededAt: null,
        snapshotData: snapshotData
    };
    
    // Update run to point to new manifest
    run.manifestId = manifest.id;
    // Set run status to Pending when manifest is generated
    if (!run.status) {
        run.status = 'Pending';
    }
    
    manifests.push(manifest);
    saveManifests(manifests);
    saveRuns(runs);
    
    downloadManifestPDF(manifest);
    
    // Refresh run builder if visible
    const runDate = document.getElementById('run-date')?.value;
    if (runDate === run.deliveryDate) {
        renderRunBuilder(runDate);
    }
    
    // Refresh run detail view if visible
    const detailView = document.getElementById('run-detail-view');
    if (detailView && detailView.style.display !== 'none') {
        viewRunDetail(runId);
    }
}

// Download manifest PDF
function downloadManifestPDF(manifest) {
    const data = manifest.snapshotData;
    const manifestId = manifest.id.substring(0, 8).toUpperCase();
    
    // Create printable HTML for PDF
    const manifestVersion = manifest.version || 1;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Gas Delivery Manifest - ${data.deliveryDate}</title>
            <style>
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 1cm;
                    }
                }
                body {
                    font-family: Arial, sans-serif;
                    padding: 10px;
                    margin: 0;
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #000;
                    padding-bottom: 10px;
                    margin-bottom: 15px;
                    page-break-after: avoid;
                }
                .header-logo {
                    max-width: 180px;
                    max-height: 70px;
                    margin-bottom: 8px;
                }
                .header h1 {
                    margin: 0;
                    font-size: 22px;
                }
                .manifest-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 15px;
                    font-size: 12px;
                    page-break-after: avoid;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 15px;
                    page-break-inside: auto;
                }
                thead {
                    display: table-header-group;
                }
                tbody {
                    display: table-row-group;
                }
                tr {
                    page-break-inside: avoid;
                    page-break-after: auto;
                }
                th, td {
                    border: 1px solid #000;
                    padding: 6px 4px;
                    text-align: left;
                    font-size: 10px;
                    word-wrap: break-word;
                }
                th {
                    background-color: #f0f0f0;
                    font-weight: bold;
                }
                td:nth-child(1) {
                    width: 40px;
                    text-align: center;
                }
                td:nth-child(2) {
                    width: 100px;
                }
                td:nth-child(3) {
                    width: 120px;
                }
                td:nth-child(4) {
                    width: 80px;
                }
                td:nth-child(5) {
                    width: 100px;
                }
                td:nth-child(6) {
                    width: 50px;
                    text-align: center;
                }
                td:nth-child(7) {
                    min-width: 100px;
                    max-width: 150px;
                }
                td:nth-child(8) {
                    width: 80px;
                }
                td:nth-child(9) {
                    width: 35px;
                    text-align: center;
                }
                .footer {
                    margin-top: 20px;
                    padding-top: 10px;
                    border-top: 2px solid #000;
                    page-break-inside: avoid;
                }
                .footer-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 11px;
                }
                .hazardous-info {
                    margin-top: 20px;
                    padding: 10px;
                    border: 2px solid #000;
                    background-color: #fffacd;
                    page-break-inside: avoid;
                }
                .hazardous-info h3 {
                    margin: 0 0 8px 0;
                    font-size: 12px;
                    color: #000;
                }
                .hazardous-details {
                    font-size: 10px;
                }
                .hazardous-details p {
                    margin: 3px 0;
                }
                .signature-box {
                    margin-top: 20px;
                    padding-top: 10px;
                    border-top: 1px solid #000;
                    page-break-inside: avoid;
                }
                .signature-box p {
                    margin: 5px 0;
                    font-size: 11px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="cowaglogo.png" alt="Company Logo" class="header-logo">
                <h1>GAS DELIVERY MANIFEST</h1>
            </div>
            
            <div class="manifest-info">
                <div>
                    <strong>Delivery Date:</strong> ${formatDate(data.deliveryDate)}<br>
                    <strong>Run Number:</strong> Run ${data.runNumber}<br>
                    <strong>Manifest ID:</strong> ${manifestId}<br>
                    ${manifestVersion > 1 ? `<strong>Version:</strong> v${manifestVersion}` : ''}
                </div>
                <div>
                    <strong>Generated:</strong> ${new Date(manifest.generatedAt).toLocaleString('en-AU')}
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Stop #</th>
                        <th>Customer Name</th>
                        <th>Address</th>
                        <th>Mobile</th>
                        <th>Bottle Type</th>
                        <th>Quantity</th>
                        <th>Notes</th>
                        <th>Invoice #</th>
                        <th>Delivered</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.stops.map(stop => `
                        <tr>
                            <td>${stop.stopNumber}</td>
                            <td>${escapeHtml(stop.customerName || '')}</td>
                            <td>${escapeHtml(stop.address || '')}</td>
                            <td>${escapeHtml(stop.mobile || '')}</td>
                            <td>${escapeHtml(stop.bottleBreakdown || (stop.bottleType ? stop.bottleType + ' x' + stop.quantity : stop.quantity || ''))}</td>
                            <td>${stop.quantity || 0}</td>
                            <td style="min-width: 120px;">${escapeHtml(stop.notes || '')}</td>
                            <td>${escapeHtml(stop.invoiceNumber || '')}</td>
                            <td style="width: 40px; height: 30px; text-align: center;"></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <div class="footer-row">
                    <div><strong>Total Stops:</strong> ${data.totalStops}</div>
                    <div><strong>Total Bottles:</strong> ${data.totalBottles}</div>
                </div>
                <div class="footer-row">
                    <div>
                        <strong>Breakdown:</strong><br>
                        ${BOTTLE_TYPES.map(t => `${t} x ${data.breakdown[t] || 0}`).join('<br>')}
                    </div>
                    <div>
                        <strong>Vehicle Type:</strong> _____________<br>
                        <strong>Driver Name:</strong> _____________
                    </div>
                </div>
            </div>
            
            <div class="hazardous-info">
                <h3>Dangerous Goods Information (Western Australia)</h3>
                <div class="hazardous-details">
                    <p><strong>Class:</strong> Class 2 - Gases</p>
                    <p><strong>UN Number:</strong> UN 1075 (Liquefied Petroleum Gas)</p>
                    <p><strong>Proper Shipping Name:</strong> LPG (Liquefied Petroleum Gas)</p>
                    <p><strong>Packing Group:</strong> Not applicable</p>
                    <p><strong>Emergency Contact:</strong> _________________________</p>
                    <p><strong>Emergency Phone:</strong> _________________________</p>
                </div>
            </div>
            
            <div class="signature-box">
                <p><strong>Driver Signature:</strong> _________________________________</p>
                <p><strong>Date:</strong> _______________</p>
            </div>
        </body>
        </html>
    `;
    
    // Create blob and download instead of printing
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Generate filename: Gas_Manifest_YYYY-MM-DD_Run1_v2.pdf
    const dateStr = data.deliveryDate.replace(/-/g, '');
    const fileVersion = manifest.version || 1;
    const filename = `Gas_Manifest_${dateStr}_Run${data.runNumber}_v${fileVersion}.html`;
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Render stock count
function renderStockCount() {
    const orders = getOrders();
    const undeliveredOrders = orders.filter(o => !o.delivered && o.status !== 'Delivered');
    
    const totals = {
        '45kg': 0,
        '8.5kg': 0,
        'Forklift 18kg': 0,
        'Forklift 15kg': 0,
        total: 0
    };
    
    undeliveredOrders.forEach(order => {
        const ob = getOrderBottles(order);
        BOTTLE_TYPES.forEach(t => { totals[t] += ob[t]; });
        totals.total += getOrderTotalBottles(order);
    });
    
    // Combine forklift 15kg and 18kg
    const forkliftTotal = totals['Forklift 18kg'] + totals['Forklift 15kg'];
    
    const container = document.getElementById('stock-summary');
    container.innerHTML = `
        <div class="stock-card">
            <h4>Total Undelivered Bottles</h4>
            <div class="stock-total">${totals.total}</div>
        </div>
        <div class="stock-breakdown">
            <div class="stock-item">
                <span class="stock-label">45kg:</span>
                <span class="stock-value">${totals['45kg']}</span>
            </div>
            <div class="stock-item">
                <span class="stock-label">8.5kg:</span>
                <span class="stock-value">${totals['8.5kg']}</span>
            </div>
            <div class="stock-item">
                <span class="stock-label">Forklift 15kg / 18kg:</span>
                <span class="stock-value">${forkliftTotal}</span>
            </div>
        </div>
    `;
}

// CSV Export functions
function exportToCSV(data, filename) {
    if (data.length === 0) {
        alert('No data to export');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

function exportCustomers() {
    const customers = getCustomers();
    const data = customers.map(c => ({
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        address: c.address,
        notes: c.notes || ''
    }));
    exportToCSV(data, `customers_${new Date().toISOString().split('T')[0]}.csv`);
}

function exportOrders() {
    const orders = getOrders();
    const customers = getCustomers();
    const data = orders.map(order => {
        const customer = getCustomerById(order.customerId);
        return {
            id: order.id,
            customerName: customer ? customer.name : '',
            customerMobile: customer ? customer.mobile : '',
            customerAddress: customer ? customer.address : '',
            bottleBreakdown: formatBottleBreakdown(order),
            quantity: getOrderTotalBottles(order),
            preferredDay: order.preferredDay,
            deliveryDate: order.deliveryDate || '',
            invoiceNumber: order.invoiceNumber || '',
            notes: order.notes || '',
            status: order.status || 'Unassigned',
            createdAt: order.createdAt
        };
    });
    exportToCSV(data, `orders_${new Date().toISOString().split('T')[0]}.csv`);
}

function exportOrdersByDate() {
    const date = prompt('Enter date (YYYY-MM-DD):');
    if (!date) return;
    
    const orders = getOrdersByDate(date);
    const customers = getCustomers();
    const data = orders.map(order => {
        const customer = getCustomerById(order.customerId);
        return {
            id: order.id,
            customerName: customer ? customer.name : '',
            customerMobile: customer ? customer.mobile : '',
            customerAddress: customer ? customer.address : '',
            bottleBreakdown: formatBottleBreakdown(order),
            quantity: getOrderTotalBottles(order),
            invoiceNumber: order.invoiceNumber || '',
            notes: order.notes || '',
            status: order.status || 'Unassigned'
        };
    });
    exportToCSV(data, `orders_${date}.csv`);
}

function exportOrdersByRun() {
    const runs = getRuns();
    if (runs.length === 0) {
        alert('No runs available');
        return;
    }
    
    const orders = getOrders();
    const customers = getCustomers();
    const data = [];
    
    runs.forEach(run => {
        const runOrders = orders.filter(o => o.runId === run.id);
        runOrders.forEach(order => {
            const customer = getCustomerById(order.customerId);
            data.push({
                runId: run.id,
                runNumber: run.runNumber,
                deliveryDate: run.deliveryDate,
                orderId: order.id,
                customerName: customer ? customer.name : '',
                customerMobile: customer ? customer.mobile : '',
                customerAddress: customer ? customer.address : '',
                bottleBreakdown: formatBottleBreakdown(order),
                quantity: getOrderTotalBottles(order),
                invoiceNumber: order.invoiceNumber || '',
                notes: order.notes || ''
            });
        });
    });
    
    exportToCSV(data, `orders_by_run_${new Date().toISOString().split('T')[0]}.csv`);
}

function exportUndelivered() {
    const orders = getOrders().filter(o => !o.delivered && o.status !== 'Delivered');
    const customers = getCustomers();
    const data = orders.map(order => {
        const customer = getCustomerById(order.customerId);
        return {
            id: order.id,
            customerName: customer ? customer.name : '',
            customerMobile: customer ? customer.mobile : '',
            customerAddress: customer ? customer.address : '',
            bottleBreakdown: formatBottleBreakdown(order),
            quantity: getOrderTotalBottles(order),
            deliveryDate: order.deliveryDate || '',
            invoiceNumber: order.invoiceNumber || '',
            notes: order.notes || '',
            status: order.status || 'Unassigned'
        };
    });
    exportToCSV(data, `undelivered_orders_${new Date().toISOString().split('T')[0]}.csv`);
}

function exportTenciaFormat() {
    const orders = getOrders().filter(o => !o.delivered && o.status !== 'Delivered' && o.deliveryDate);
    const customers = getCustomers();
    const data = orders.map(order => {
        const customer = getCustomerById(order.customerId);
        return {
            Date: order.deliveryDate,
            Customer: customer ? customer.name : '',
            Mobile: customer ? customer.mobile : '',
            Address: customer ? customer.address : '',
            'Bottle Type': formatBottleBreakdown(order),
            Quantity: getOrderTotalBottles(order),
            'Invoice Number': order.invoiceNumber || '',
            Notes: order.notes || ''
        };
    });
    exportToCSV(data, `tencia_export_${new Date().toISOString().split('T')[0]}.csv`);
}

// CSV Import
function importCSV(file, type) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            showImportMessage('CSV file is empty or invalid', 'error');
            return;
        }
        
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const rows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = values[i] || '';
            });
            return obj;
        });
        
        if (type === 'customers') {
            importCustomers(rows);
        } else if (type === 'orders') {
            importOrders(rows);
        }
    };
    reader.readAsText(file);
}

function importCustomers(rows) {
    const customers = getCustomers();
    let imported = 0;
    
    rows.forEach(row => {
        if (!row.name || !row.mobile) return;
        
        const existing = customers.find(c => c.mobile === row.mobile);
        if (!existing) {
            customers.push({
                id: row.id || generateId(),
                name: row.name,
                mobile: row.mobile,
                address: row.address || '',
                notes: row.notes || '',
                orderHistory: []
            });
            imported++;
        }
    });
    
    saveCustomers(customers);
    showImportMessage(`Imported ${imported} customers`, 'success');
}

function importOrders(rows) {
    const orders = getOrders();
    const customers = getCustomers();
    let imported = 0;
    
    rows.forEach(row => {
        let bottles = {};
        BOTTLE_TYPES.forEach(type => { bottles[type] = 0; });
        let totalBottleCount = 0;
        
        if (row.bottleBreakdown && (row.quantity !== undefined && row.quantity !== '')) {
            totalBottleCount = Math.max(0, parseInt(row.quantity, 10) || 0);
            const parts = (row.bottleBreakdown || '').split(',');
            parts.forEach(p => {
                const m = p.trim().match(/^(.+?)\s*×\s*(\d+)$/i);
                if (m) {
                    let type = m[1].trim();
                    // Normalize type names to match BOTTLE_TYPES
                    const typeLower = type.toLowerCase();
                    if (typeLower === 'forklift 18kg') type = 'Forklift 18kg';
                    else if (typeLower === 'forklift 15kg') type = 'Forklift 15kg';
                    else if (type === '8.5kg') type = '8.5kg';
                    else if (type === '45kg') type = '45kg';
                    // Skip old 'Forklift' type (removed)
                    if (BOTTLE_TYPES.includes(type)) {
                        bottles[type] = Math.max(0, parseInt(m[2], 10) || 0);
                    }
                }
            });
            if (totalBottleCount === 0) totalBottleCount = Object.values(bottles).reduce((sum, qty) => sum + qty, 0);
        } else if (row.bottleType && (row.quantity !== undefined && row.quantity !== '')) {
            let type = row.bottleType;
            // Normalize type names
            if (type.toLowerCase() === 'forklift 18kg') type = 'Forklift 18kg';
            else if (type.toLowerCase() === 'forklift 15kg') type = 'Forklift 15kg';
            else if (type === '8.5kg') type = '8.5kg';
            else if (type === '45kg') type = '45kg';
            else if (type.toLowerCase().startsWith('forklift')) {
                // Old 'Forklift' type removed - skip it
                return;
            } else type = '45kg'; // default
            if (BOTTLE_TYPES.includes(type)) {
                bottles[type] = Math.max(0, parseInt(row.quantity, 10) || 1);
                totalBottleCount = bottles[type];
            } else {
                return;
            }
        } else {
            return;
        }
        
        let customer = null;
        if (row.customerMobile) {
            customer = customers.find(c => c.mobile === row.customerMobile);
        }
        
        if (!customer && row.customerName && row.customerMobile) {
            customer = {
                id: generateId(),
                name: row.customerName,
                mobile: row.customerMobile,
                address: row.customerAddress || '',
                notes: '',
                orderHistory: []
            };
            customers.push(customer);
        }
        
        if (customer) {
            orders.push({
                id: row.id || generateId(),
                customerId: customer.id,
                bottles: bottles,
                totalBottleCount: totalBottleCount,
                preferredDay: row.preferredDay || 'Any',
                deliveryDate: row.deliveryDate || null,
                invoiceNumber: row.invoiceNumber || null,
                notes: row.notes || '',
                status: row.status || 'Unassigned',
                runId: row.runId || null,
                delivered: row.delivered === 'true' || row.delivered === true || false,
                deliveredAt: row.deliveredAt || null,
                deliveredRunId: row.deliveredRunId || null,
                createdAt: row.createdAt || new Date().toISOString()
            });
            imported++;
        }
    });
    
    saveOrders(orders);
    saveCustomers(customers);
    showImportMessage(`Imported ${imported} orders`, 'success');
}

function showImportMessage(message, type) {
    const msgEl = document.getElementById('import-message');
    msgEl.textContent = message;
    msgEl.className = `import-message ${type}`;
    setTimeout(() => {
        msgEl.className = 'import-message';
    }, 3000);
}

// ============================================
// GENERATED RUNS / DELIVERY COMPLETION FUNCTIONS
// ============================================

// Get ACTIVE manifest for a run
function getActiveManifestForRun(runId) {
    const manifests = getManifests();
    return manifests.find(m => m.runId === runId && m.status === 'ACTIVE');
}

// Get all runs that have ACTIVE manifests (generated runs)
function getGeneratedRuns() {
    const runs = getRuns();
    const manifests = getManifests();
    const activeManifestRunIds = new Set(
        manifests
            .filter(m => m.status === 'ACTIVE')
            .map(m => m.runId)
    );
    
    return runs
        .filter(run => activeManifestRunIds.has(run.id))
        .sort((a, b) => {
            // Sort by delivery date (newest first), then by run number
            if (a.deliveryDate !== b.deliveryDate) {
                return b.deliveryDate.localeCompare(a.deliveryDate);
            }
            return a.runNumber - b.runNumber;
        });
}

// Calculate run status based on deliveries
function calculateRunStatus(run) {
    if (run.status === 'Completed') {
        return 'Completed'; // Locked, don't recalculate
    }
    
    const orders = getOrders().filter(o => o.runId === run.id);
    if (orders.length === 0) {
        return run.status || 'Pending';
    }
    
    const deliveredCount = orders.filter(o => o.delivered).length;
    
    if (deliveredCount === 0) {
        return 'Pending';
    } else if (deliveredCount === orders.length) {
        return 'Completed';
    } else {
        return 'In Progress';
    }
}

// Update run status based on deliveries
function updateRunStatus(runId) {
    const runs = getRuns();
    const run = runs.find(r => r.id === runId);
    if (!run || run.status === 'Completed') {
        return; // Don't update completed runs
    }
    
    const newStatus = calculateRunStatus(run);
    if (run.status !== newStatus) {
        run.status = newStatus;
        saveRuns(runs);
    }
}

// Render generated runs list
function renderGeneratedRuns() {
    const container = document.getElementById('generated-runs-list');
    const detailView = document.getElementById('run-detail-view');
    
    if (!container) return;
    
    // Hide detail view
    detailView.style.display = 'none';
    container.style.display = 'block';
    
    const runs = getGeneratedRuns();
    
    if (runs.length === 0) {
        container.innerHTML = '<p class="no-runs-message">No generated runs yet. Generate a manifest from Run Builder to see runs here.</p>';
        return;
    }
    
    const orders = getOrders();
    
    let html = '<div class="generated-runs-list-collapsible">';
    
    runs.forEach(run => {
        const manifest = getActiveManifestForRun(run.id);
        const runOrders = orders.filter(o => o.runId === run.id);
        const totalBottles = runOrders.reduce((sum, o) => sum + getOrderTotalBottles(o), 0);
        const deliveredBottles = runOrders.filter(o => o.delivered).reduce((sum, o) => sum + getOrderTotalBottles(o), 0);
        const status = calculateRunStatus(run);
        const manifestId = manifest ? manifest.id.substring(0, 8).toUpperCase() : 'N/A';
        const version = manifest ? (manifest.version || 1) : null;
        
        html += `
            <div class="generated-run-item-collapsible">
                <div class="run-item-header-collapsible" onclick="toggleGeneratedRun('${run.id}')">
                    <span class="run-item-title">${formatDate(run.deliveryDate)} - Run ${run.runNumber}</span>
                    <span class="run-status-badge status-${status.toLowerCase().replace(' ', '-')}">${status}</span>
                    <span class="toggle-icon-run" id="toggle-run-${run.id}">▸</span>
                </div>
                <div class="run-item-details-collapsible" id="run-details-${run.id}" style="display: none;">
                    <div class="run-card-info">
                        <div><strong>Manifest ID:</strong> ${manifestId}${version ? ` (v${version})` : ''}</div>
                        <div><strong>Status:</strong> <span class="manifest-status-badge status-active">ACTIVE</span></div>
                        <div><strong>Bottles:</strong> ${deliveredBottles} / ${totalBottles} delivered</div>
                        <div><strong>Stops:</strong> ${runOrders.length}</div>
                    </div>
                    <div class="run-card-actions">
                        <button class="view-run-btn" onclick="viewRunDetail('${run.id}')">View Run</button>
                        ${manifest ? `<button class="download-manifest-btn" onclick="downloadManifestPDF(getManifestById('${manifest.id}'))">Download Manifest</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Toggle generated run details
function toggleGeneratedRun(runId) {
    const detailsDiv = document.getElementById('run-details-' + runId);
    const toggleIcon = document.getElementById('toggle-run-' + runId);
    
    if (detailsDiv.style.display === 'none') {
        detailsDiv.style.display = 'block';
        toggleIcon.textContent = '▾';
    } else {
        detailsDiv.style.display = 'none';
        toggleIcon.textContent = '▸';
    }
}

// Get manifest by ID
function getManifestById(manifestId) {
    const manifests = getManifests();
    return manifests.find(m => m.id === manifestId);
}

// View run detail
function viewRunDetail(runId) {
    const container = document.getElementById('generated-runs-list');
    const detailView = document.getElementById('run-detail-view');
    
    if (!container || !detailView) return;
    
    // Hide list, show detail
    container.style.display = 'none';
    detailView.style.display = 'block';
    
    const runs = getRuns();
    const run = runs.find(r => r.id === runId);
    if (!run) return;
    
    const manifest = getActiveManifestForRun(run.id);
    const orders = getOrders().filter(o => o.runId === run.id);
    const customers = getCustomers();
    const status = calculateRunStatus(run);
    
    // Update run status if needed
    updateRunStatus(runId);
    
    const manifestId = manifest ? manifest.id.substring(0, 8).toUpperCase() : 'N/A';
    const version = manifest ? (manifest.version || 1) : null;
    const generatedAt = manifest ? new Date(manifest.generatedAt).toLocaleString('en-AU') : 'N/A';
    const completedAt = run.completedAt ? new Date(run.completedAt).toLocaleString('en-AU') : null;
    
    const allDelivered = orders.length > 0 && orders.every(o => o.delivered);
    const isCompleted = run.status === 'Completed';
    const canOverride = manifest && !isCompleted;
    
    let html = `
        <div class="run-detail-header">
            <button class="back-to-runs-btn" onclick="renderGeneratedRuns()">← Back to Runs</button>
            <h3>Run Detail - ${formatDate(run.deliveryDate)} - Run ${run.runNumber}</h3>
        </div>
        
        <div class="run-detail-info">
            <div class="info-row">
                <div><strong>Delivery Date:</strong> ${formatDate(run.deliveryDate)}</div>
                <div><strong>Run Number:</strong> Run ${run.runNumber}</div>
                <div><strong>Manifest ID:</strong> ${manifestId}${version ? ` (v${version})` : ''}</div>
            </div>
            <div class="info-row">
                <div><strong>Generated:</strong> ${generatedAt}</div>
                <div><strong>Run Status:</strong> <span class="run-status-badge status-${status.toLowerCase().replace(' ', '-')}">${status}</span></div>
                <div><strong>Manifest Status:</strong> <span class="manifest-status-badge status-active">ACTIVE</span></div>
                ${completedAt ? `<div><strong>Completed:</strong> ${completedAt}</div>` : ''}
            </div>
        </div>
        
        ${manifest && !isCompleted ? `
            <div class="regenerate-manifest-section">
                <button class="regenerate-manifest-btn" onclick="generateManifest('${runId}')">Regenerate Manifest</button>
                <p class="field-hint" style="margin-top: 8px;">This will replace the existing manifest with an updated version.</p>
            </div>
        ` : ''}
        
        <div class="run-delivery-checklist">
            <h4>Delivery Checklist</h4>
            <div class="checklist-summary">
                ${orders.filter(o => o.delivered).length} / ${orders.length} orders delivered
            </div>
            <table class="delivery-checklist-table">
                <thead>
                    <tr>
                        <th>Stop #</th>
                        <th>Customer Name</th>
                        <th>Address</th>
                        <th>Bottle Type</th>
                        <th>Quantity</th>
                        <th>Notes</th>
                        <th>Invoice #</th>
                        <th>Delivered</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    orders.forEach((order, index) => {
        const customer = getCustomerById(order.customerId);
        const delivered = order.delivered || false;
        const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt).toLocaleString('en-AU') : '';
        
        html += `
            <tr class="${delivered ? 'delivered' : ''} ${isCompleted ? 'read-only' : ''}">
                <td>${index + 1}</td>
                <td>${escapeHtml(customer ? customer.name : 'Unknown')}</td>
                <td>${escapeHtml(customer ? customer.address : '')}</td>
                <td>${escapeHtml(formatBottleBreakdown(order))}</td>
                <td>${getOrderTotalBottles(order)}</td>
                <td class="notes-cell">${escapeHtml(order.notes || '')}</td>
                <td>${escapeHtml(order.invoiceNumber || '')}</td>
                <td>
                    ${isCompleted ? (
                        delivered ? `<span class="delivered-badge">✓ Delivered<br><small>${deliveredAt}</small></span>` : '<span class="not-delivered-badge">Not Delivered</span>'
                    ) : (
                        `<label class="delivery-checkbox-label">
                            <input 
                                type="checkbox" 
                                class="delivery-checkbox" 
                                ${delivered ? 'checked' : ''}
                                onchange="toggleDelivery('${order.id}', '${runId}', this.checked)"
                            >
                            ${delivered ? `<small>${deliveredAt}</small>` : ''}
                        </label>`
                    )}
                </td>
                <td>
                    ${!isCompleted && !delivered ? (
                        `<button class="reschedule-btn" onclick="rescheduleOrder('${order.id}', '${runId}')">Reschedule</button>`
                    ) : ''}
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        
        <div class="run-detail-actions">
            ${manifest ? `<button class="download-manifest-btn" onclick="downloadManifestPDF(getManifestById('${manifest.id}'))">Download Manifest PDF</button>` : ''}
            ${!manifest && !isCompleted ? `<button class="generate-manifest-btn" onclick="generateManifest('${runId}')">Generate Manifest</button>` : ''}
            ${allDelivered && !isCompleted ? (
                `<button class="mark-complete-btn" onclick="markRunComplete('${runId}')">Mark Run Complete</button>`
            ) : ''}
        </div>
    `;
    
    detailView.innerHTML = html;
}

// Override manifest (deprecated - use generateManifest instead, but kept for backward compatibility)
function overrideManifest(runId) {
    // Just call generateManifest which now handles archiving automatically
    generateManifest(runId);
}

// Toggle delivery status (only works with ACTIVE manifest)
function toggleDelivery(orderId, runId, delivered) {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const runs = getRuns();
    const run = runs.find(r => r.id === runId);
    if (!run || run.status === 'Completed') {
        alert('Cannot modify completed run');
        return;
    }
    
    // Verify ACTIVE manifest exists
    const activeManifest = getActiveManifestForRun(runId);
    if (!activeManifest) {
        alert('Cannot mark delivery: No active manifest found for this run');
        return;
    }
    
    if (delivered) {
        order.delivered = true;
        order.deliveredAt = new Date().toISOString();
        order.deliveredRunId = runId;
        order.status = 'Delivered';
    } else {
        order.delivered = false;
        order.deliveredAt = null;
        order.deliveredRunId = null;
        order.status = 'Assigned';
    }
    
    saveOrders(orders);
    
    // Update run status
    updateRunStatus(runId);
    
    // Refresh detail view
    viewRunDetail(runId);
    
    // Refresh undelivered orders if visible
    const searchQuery = document.getElementById('undelivered-search')?.value || '';
    renderUndeliveredOrders(searchQuery);
}

// Mark run as complete
function markRunComplete(runId) {
    if (!confirm('Mark this run as complete? This will lock all delivery states.')) {
        return;
    }
    
    const runs = getRuns();
    const run = runs.find(r => r.id === runId);
    if (!run) return;
    
    const orders = getOrders().filter(o => o.runId === runId);
    const allDelivered = orders.length > 0 && orders.every(o => o.delivered);
    
    if (!allDelivered) {
        alert('Cannot complete run: not all orders are delivered');
        return;
    }
    
    run.status = 'Completed';
    run.completedAt = new Date().toISOString();
    
    // Mark ACTIVE manifest as COMPLETED
    const manifests = getManifests();
    const activeManifest = manifests.find(m => m.runId === runId && m.status === 'ACTIVE');
    if (activeManifest) {
        activeManifest.status = 'COMPLETED';
        saveManifests(manifests);
    }
    
    saveRuns(runs);
    
    // Refresh detail view
    viewRunDetail(runId);
    
    showMessage('Run marked as complete', 'success');
}

// Reschedule order
function rescheduleOrder(orderId, runId) {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const runs = getRuns();
    const run = runs.find(r => r.id === runId);
    if (!run || run.status === 'Completed') {
        alert('Cannot reschedule from completed run');
        return;
    }
    
    const newDate = prompt('Enter new delivery date (YYYY-MM-DD):');
    if (!newDate) return;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        alert('Invalid date format. Use YYYY-MM-DD');
        return;
    }
    
    // Remove from current run
    order.runId = null;
    order.status = 'Unassigned';
    order.delivered = false;
    order.deliveredAt = null;
    order.deliveredRunId = null;
    
    // Set new delivery date
    order.deliveryDate = newDate;
    
    saveOrders(orders);
    
    // Update run status
    updateRunStatus(runId);
    
    // Refresh views
    viewRunDetail(runId);
    
    const searchQuery = document.getElementById('undelivered-search')?.value || '';
    renderUndeliveredOrders(searchQuery);
    
    showMessage('Order rescheduled and returned to undelivered queue', 'success');
}

// Make functions globally available
window.viewRunDetail = viewRunDetail;
window.toggleDelivery = toggleDelivery;
window.markRunComplete = markRunComplete;
window.rescheduleOrder = rescheduleOrder;
window.getManifestById = getManifestById;
window.downloadManifestPDF = downloadManifestPDF;
window.overrideManifest = overrideManifest;

// ============================================
// RESET DATA FUNCTION (TESTING ONLY)
// ============================================

function resetAllData() {
    if (!confirm('This will delete all customers and orders. Continue?')) {
        return;
    }
    
    // Clear all app-related localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    
    // Reload page
    window.location.reload();
}

// ============================================
// UNDELIVERED BOTTLES SECTION FUNCTIONS
// ============================================

// Get all undelivered orders
function getUndeliveredOrders() {
    const orders = getOrders();
    return orders.filter(order => {
        // Order is undelivered if not marked as delivered
        return !order.delivered && order.status !== 'Delivered';
    });
}

// Filter undelivered orders by search query
function filterUndeliveredOrders(orders, query) {
    if (!query || query.trim().length === 0) {
        return orders;
    }
    
    const lowerQuery = query.toLowerCase().trim();
    const customers = getCustomers();
    
    return orders.filter(order => {
        const customer = getCustomerById(order.customerId);
        if (!customer) return false;
        
        const nameMatch = customer.name.toLowerCase().includes(lowerQuery);
        const mobileMatch = customer.mobile.toLowerCase().includes(lowerQuery);
        const addressMatch = customer.address.toLowerCase().includes(lowerQuery);
        
        return nameMatch || mobileMatch || addressMatch;
    });
}

// Render undelivered orders summary strip
function renderUndeliveredSummary() {
    const container = document.getElementById('undelivered-summary-strip');
    if (!container) return;
    
    const orders = getUndeliveredOrders();
    const totalBottles = orders.reduce((sum, order) => sum + getOrderTotalBottles(order), 0);
    
    const breakdown = {
        '45kg': orders.reduce((s, o) => s + getOrderBottles(o)['45kg'], 0),
        '8.5kg': orders.reduce((s, o) => s + getOrderBottles(o)['8.5kg'], 0),
        'Forklift': orders.reduce((s, o) => s + getOrderBottles(o)['Forklift'], 0)
    };
    
    container.innerHTML = `
        <div class="summary-strip-grid">
            <div class="summary-card">
                <div class="summary-label">Total Orders</div>
                <div class="summary-value">${orders.length}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Bottles</div>
                <div class="summary-value">${totalBottles}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">45kg</div>
                <div class="summary-value">${breakdown['45kg']}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">8.5kg</div>
                <div class="summary-value">${breakdown['8.5kg']}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Forklift</div>
                <div class="summary-value">${breakdown['Forklift']}</div>
            </div>
        </div>
    `;
}

// Render undelivered orders table
function renderUndeliveredOrders(searchQuery = '') {
    const container = document.getElementById('undelivered-orders-table');
    if (!container) return;
    
    // Update summary strip
    renderUndeliveredSummary();
    
    let orders = getUndeliveredOrders();
    
    // Apply search filter if provided
    if (searchQuery) {
        orders = filterUndeliveredOrders(orders, searchQuery);
    }
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="no-orders-message">No undelivered orders found.</p>';
        return;
    }
    
    const customers = getCustomers();
    
    let html = `
        <div class="undelivered-table-wrapper">
            <table class="undelivered-table">
                <thead>
                    <tr>
                        <th>Customer Name</th>
                        <th>Mobile</th>
                        <th>Address</th>
                        <th>Bottle Type</th>
                        <th>Quantity</th>
                        <th>Preferred Day</th>
                        <th>Current Delivery Date</th>
                        <th>Assign Delivery Date</th>
                        <th>Notes</th>
                        <th>Invoice #</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    orders.forEach(order => {
        const customer = getCustomerById(order.customerId);
        if (!customer) return;
        
        const preferredDay = order.preferredDay || 'Any';
        const currentDeliveryDate = order.deliveryDate || '';
        const notes = order.notes || '';
        const invoiceNumber = order.invoiceNumber || '';
        
        html += `
            <tr data-order-id="${order.id}" class="order-row-clickable" onclick="openEditOrderModal('${order.id}')" style="cursor: pointer;">
                <td>${escapeHtml(customer.name)}</td>
                <td>${escapeHtml(customer.mobile)}</td>
                <td>${escapeHtml(customer.address)}</td>
                <td>${escapeHtml(formatBottleBreakdown(order))}</td>
                <td>${getOrderTotalBottles(order)}</td>
                <td>${escapeHtml(preferredDay)}</td>
                <td>${currentDeliveryDate ? formatDate(currentDeliveryDate) : '<span class="no-date">No date</span>'}</td>
                <td>
                    <input 
                        type="date" 
                        class="assign-delivery-date" 
                        data-order-id="${order.id}"
                        value="${currentDeliveryDate}"
                        onclick="event.stopPropagation();"
                        onchange="assignDeliveryDateToOrder('${order.id}', this.value); event.stopPropagation();"
                    >
                </td>
                <td class="notes-cell">${escapeHtml(notes)}</td>
                <td>${escapeHtml(invoiceNumber)}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div class="undelivered-summary">
            <strong>Total undelivered orders: ${orders.length}</strong>
        </div>
    `;
    
    container.innerHTML = html;
}

// Open edit order modal
function openEditOrderModal(orderId) {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) {
        alert('Order not found');
        return;
    }
    
    const customer = getCustomerById(order.customerId);
    if (!customer) {
        alert('Customer not found');
        return;
    }
    
    // Populate form fields
    document.getElementById('edit-order-id').value = order.id;
    document.getElementById('edit-customer-name').value = customer.name;
    document.getElementById('edit-customer-mobile').value = customer.mobile;
    document.getElementById('edit-customer-address').value = customer.address;
    
    // Set bottle quantities
    const bottles = getOrderBottles(order);
    BOTTLE_TYPES.forEach(type => {
        const input = document.getElementById('edit-bottle-qty-' + type);
        if (input) input.value = bottles[type] || 0;
    });
    updateEditBottleTotalDisplay();
    
    // Set preferred day
    const preferredDay = order.preferredDay || 'Any';
    document.querySelector(`input[name="edit-preferred-day"][value="${preferredDay}"]`).checked = true;
    
    // Set notes
    document.getElementById('edit-order-notes').value = order.notes || '';
    
    // Set staff options
    document.getElementById('edit-delivery-date').value = order.deliveryDate || '';
    document.getElementById('edit-invoice-number').value = order.invoiceNumber || '';
    
    // Populate run dropdown if delivery date exists
    populateEditAssignRunDropdown();
    
    // Set current run if assigned
    const assignRunSelect = document.getElementById('edit-assign-run');
    if (assignRunSelect && order.runId) {
        // Find the run and set it
        const runs = getRuns();
        const run = runs.find(r => r.id === order.runId);
        if (run) {
            assignRunSelect.value = order.runId;
        }
    } else if (assignRunSelect) {
        assignRunSelect.value = '';
    }
    
    // Show modal
    document.getElementById('edit-order-modal').style.display = 'flex';
}

// Close edit order modal
function closeEditOrderModal() {
    document.getElementById('edit-order-modal').style.display = 'none';
}

// Get edit form bottle quantities
function getEditFormBottleQuantities() {
    const bottles = {};
    BOTTLE_TYPES.forEach(type => {
        const el = document.getElementById('edit-bottle-qty-' + type);
        bottles[type] = el ? Math.max(0, parseInt(el.value, 10) || 0) : 0;
    });
    return bottles;
}

// Get edit form total bottle count
function getEditFormTotalBottleCount() {
    const b = getEditFormBottleQuantities();
    return Object.values(b).reduce((sum, qty) => sum + qty, 0);
}

// Get edit form trailer bottle count (45kg only)
function getEditFormTrailerBottleCount() {
    const b = getEditFormBottleQuantities();
    return b['45kg'] || 0;
}

// Update edit bottle total display
function updateEditBottleTotalDisplay() {
    const el = document.getElementById('edit-bottle-total-display');
    if (!el) return;
    const total = getEditFormTotalBottleCount();
    el.textContent = 'Total: ' + total + ' bottle' + (total !== 1 ? 's' : '');
}

// Populate edit assign run dropdown
function populateEditAssignRunDropdown() {
    const dateInput = document.getElementById('edit-delivery-date');
    const runSelect = document.getElementById('edit-assign-run');
    if (!dateInput || !runSelect) return;
    
    const deliveryDate = dateInput.value;
    const orderTrailerBottles = getEditFormTrailerBottleCount();
    
    runSelect.innerHTML = '<option value="">Auto</option>';
    
    if (!deliveryDate) {
        const hint = document.getElementById('edit-assign-run-hint');
        if (hint) hint.textContent = 'Select a date to see runs. Max 8 bottles per run (45kg only).';
        return;
    }
    
    const runs = getRuns().filter(r => r.deliveryDate === deliveryDate);
    const currentOrderId = document.getElementById('edit-order-id').value;
    
    runs.forEach(run => {
        const current = getRunTrailerBottleCount(run.id, currentOrderId);
        const wouldBe = current + orderTrailerBottles;
        const full = wouldBe > MAX_BOTTLES_PER_RUN;
        const option = document.createElement('option');
        option.value = run.id;
        option.textContent = 'Run ' + run.runNumber + ' (' + current + '/8)' + (full ? ' — full' : '');
        if (full) option.disabled = true;
        runSelect.appendChild(option);
    });
    
    const hint = document.getElementById('edit-assign-run-hint');
    if (hint) hint.textContent = orderTrailerBottles > MAX_BOTTLES_PER_RUN ? 'Order exceeds 8 bottles (45kg only); cannot assign to a single run.' : 'Max 8 bottles per run (45kg only). Auto picks first run with space.';
}

// Validate edit form
function validateEditForm() {
    const name = document.getElementById('edit-customer-name').value.trim();
    const mobile = document.getElementById('edit-customer-mobile').value.trim();
    const address = document.getElementById('edit-customer-address').value.trim();
    const totalBottles = getEditFormTotalBottleCount();
    
    if (!name) {
        alert('Please enter customer name');
        document.getElementById('edit-customer-name').focus();
        return false;
    }
    
    if (!mobile) {
        alert('Please enter mobile number');
        document.getElementById('edit-customer-mobile').focus();
        return false;
    }
    
    if (!address) {
        alert('Please enter address');
        document.getElementById('edit-customer-address').focus();
        return false;
    }
    
    if (totalBottles < 1) {
        alert('Please add at least one bottle (set quantity for a bottle type)');
        return false;
    }
    
    // If a specific run is selected, check capacity (only 45kg bottles count)
    const runSelect = document.getElementById('edit-assign-run');
    const selectedRunId = runSelect && runSelect.value;
    const currentOrderId = document.getElementById('edit-order-id').value;
    if (selectedRunId) {
        const currentTrailer = getRunTrailerBottleCount(selectedRunId, currentOrderId);
        const orderTrailer = getEditFormTrailerBottleCount();
        if (currentTrailer + orderTrailer > MAX_BOTTLES_PER_RUN) {
            alert('This run is full (max ' + MAX_BOTTLES_PER_RUN + ' bottles, 45kg only). Choose another run or leave as Auto.');
            return false;
        }
    }
    
    return true;
}

// Save edited order
function saveEditedOrder() {
    if (!validateEditForm()) {
        return;
    }
    
    const orderId = document.getElementById('edit-order-id').value;
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) {
        alert('Order not found');
        return;
    }
    
    const name = document.getElementById('edit-customer-name').value.trim();
    const mobile = document.getElementById('edit-customer-mobile').value.trim();
    const address = document.getElementById('edit-customer-address').value.trim();
    const bottles = getEditFormBottleQuantities();
    const totalBottleCount = getEditFormTotalBottleCount();
    const preferredDay = document.querySelector('input[name="edit-preferred-day"]:checked').value;
    const orderNotes = document.getElementById('edit-order-notes').value.trim();
    let deliveryDate = document.getElementById('edit-delivery-date').value || null;
    const invoiceNumber = document.getElementById('edit-invoice-number').value.trim() || null;
    const assignRunSelect = document.getElementById('edit-assign-run');
    const assignRunValue = assignRunSelect ? assignRunSelect.value : '';
    
    // Update customer
    const customers = getCustomers();
    let customer = customers.find(c => c.id === order.customerId);
    if (customer) {
        customer.name = name;
        customer.mobile = mobile;
        customer.address = address;
        saveCustomers(customers);
    } else {
        // Create new customer if not found
        customer = findOrCreateCustomer(name, mobile, address);
        order.customerId = customer.id;
    }
    
    // Resolve run assignment: specific run or Auto (only 45kg bottles count for capacity)
    let runId = null;
    const orderTrailerBottles = getEditFormTrailerBottleCount();
    if (deliveryDate && assignRunValue) {
        if (assignRunValue === 'auto' || assignRunValue === '') {
            // Auto: first run with capacity (excluding current order)
            const runs = getRuns().filter(r => r.deliveryDate === deliveryDate);
            for (let i = 0; i < runs.length; i++) {
                const currentTrailer = getRunTrailerBottleCount(runs[i].id, orderId);
                if (currentTrailer + orderTrailerBottles <= MAX_BOTTLES_PER_RUN) {
                    runId = runs[i].id;
                    break;
                }
            }
        } else {
            runId = assignRunValue;
            const currentTrailer = getRunTrailerBottleCount(runId, orderId);
            if (currentTrailer + orderTrailerBottles > MAX_BOTTLES_PER_RUN) {
                alert('This run is full (max ' + MAX_BOTTLES_PER_RUN + ' bottles, 45kg only). Save blocked.');
                return;
            }
        }
    }
    
    // Update order
    order.bottles = bottles;
    order.totalBottleCount = totalBottleCount;
    order.preferredDay = preferredDay;
    order.deliveryDate = deliveryDate;
    order.invoiceNumber = invoiceNumber;
    order.notes = orderNotes;
    
    // Handle run assignment change
    const oldRunId = order.runId;
    order.runId = runId;
    order.status = runId ? 'Assigned' : 'Unassigned';
    
    // If run changed, update old and new runs
    if (oldRunId !== runId) {
        const runs = getRuns();
        if (oldRunId) {
            const oldRun = runs.find(r => r.id === oldRunId);
            if (oldRun && oldRun.orderIds) {
                oldRun.orderIds = oldRun.orderIds.filter(id => id !== orderId);
            }
        }
        if (runId) {
            const newRun = runs.find(r => r.id === runId);
            if (newRun && !newRun.orderIds.includes(orderId)) {
                newRun.orderIds.push(orderId);
            }
        }
        saveRuns(runs);
    }
    
    saveOrders(orders);
    
    // Update customer notes if order notes provided
    if (orderNotes) {
        updateCustomerNotes(customer.id, orderNotes);
    }
    
    // Close modal
    closeEditOrderModal();
    
    // Refresh displays
    const searchQuery = document.getElementById('undelivered-search')?.value || '';
    renderUndeliveredOrders(searchQuery);
    
    // Refresh run builder if visible
    const runDate = document.getElementById('run-date')?.value;
    if (runDate) {
        renderRunBuilder(runDate);
    }
    
    alert('Order updated successfully!');
}

// Render customer history
function renderCustomerHistory(searchQuery = '') {
    const container = document.getElementById('customer-history-list');
    if (!container) return;
    
    const customers = getCustomers();
    const orders = getOrders();
    const runs = getRuns();
    
    // Filter customers by search query
    let filteredCustomers = customers;
    if (searchQuery && searchQuery.trim()) {
        const lowerQuery = searchQuery.toLowerCase().trim();
        filteredCustomers = customers.filter(customer => {
            const nameMatch = customer.name.toLowerCase().includes(lowerQuery);
            const mobileMatch = customer.mobile.toLowerCase().includes(lowerQuery);
            const addressMatch = customer.address.toLowerCase().includes(lowerQuery);
            return nameMatch || mobileMatch || addressMatch;
        });
    }
    
    if (filteredCustomers.length === 0) {
        container.innerHTML = '<p class="no-orders-message">No customers found.</p>';
        return;
    }
    
    // Sort customers by name
    filteredCustomers.sort((a, b) => a.name.localeCompare(b.name));
    
    let html = '<div class="customer-list-simple">';
    
    filteredCustomers.forEach(customer => {
        // Get all orders for this customer
        const customerOrders = orders.filter(o => o.customerId === customer.id);
        
        // Sort orders by creation date (newest first)
        customerOrders.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
        });
        
        // Calculate totals
        const totalOrders = customerOrders.length;
        const deliveredOrders = customerOrders.filter(o => o.delivered).length;
        const totalBottles = customerOrders.reduce((sum, o) => sum + getOrderTotalBottles(o), 0);
        
        html += `
            <div class="customer-list-item">
                <div class="customer-name-header" onclick="toggleCustomerOrders('${customer.id}')">
                    <span class="customer-name">${escapeHtml(customer.name)}</span>
                    <span class="customer-order-count">${totalOrders} order${totalOrders !== 1 ? 's' : ''} • ${totalBottles} bottle${totalBottles !== 1 ? 's' : ''}</span>
                    <span class="toggle-icon" id="toggle-${customer.id}">▸</span>
                </div>
                <div class="customer-orders-details" id="orders-${customer.id}" style="display: none;">
                    <div class="customer-details-expanded">
                        <div class="customer-contact-expanded">
                            <div><strong>Mobile:</strong> ${escapeHtml(customer.mobile)}</div>
                            <div><strong>Address:</strong> ${escapeHtml(customer.address)}</div>
                        </div>
                        ${customer.notes ? `<div class="customer-notes"><strong>Customer Notes:</strong> ${escapeHtml(customer.notes)}</div>` : ''}
                        <div class="customer-summary-expanded">
                            <span>Total Orders: <strong>${totalOrders}</strong></span>
                            <span>Delivered: <strong>${deliveredOrders}</strong></span>
                            <span>Total Bottles: <strong>${totalBottles}</strong></span>
                        </div>
                    </div>
                    <div class="customer-orders-section">
                        <table class="customer-orders-table">
                            <thead>
                                <tr>
                                    <th>Order Date</th>
                                    <th>Delivery Date</th>
                                    <th>Bottles</th>
                                    <th>Bottle Types</th>
                                    <th>Preferred Day</th>
                                    <th>Status</th>
                                    <th>Delivered</th>
                                    <th>Delivered Date</th>
                                    <th>Run</th>
                                    <th>Invoice #</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
        `;
        
        customerOrders.forEach(order => {
            let orderDate = 'N/A';
            if (order.createdAt) {
                const dateStr = order.createdAt.split('T')[0];
                orderDate = formatDate(dateStr);
            }
            const deliveryDate = order.deliveryDate ? formatDate(order.deliveryDate) : '—';
            const deliveredDate = order.deliveredAt ? new Date(order.deliveredAt).toLocaleString('en-AU') : '—';
            const run = order.runId ? runs.find(r => r.id === order.runId) : null;
            const runInfo = run ? `Run ${run.runNumber} (${formatDate(run.deliveryDate)})` : '—';
            const status = order.delivered ? 'Delivered' : (order.runId ? 'Assigned' : 'Unassigned');
            
            html += `
                <tr class="${order.delivered ? 'delivered-order' : ''}">
                    <td>${orderDate}</td>
                    <td>${deliveryDate}</td>
                    <td>${getOrderTotalBottles(order)}</td>
                    <td>${escapeHtml(formatBottleTypesOnly(order))}</td>
                    <td>${escapeHtml(order.preferredDay || 'Any')}</td>
                    <td><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
                    <td>${order.delivered ? '<span class="delivered-badge">✓ Yes</span>' : '<span class="not-delivered-badge">No</span>'}</td>
                    <td>${deliveredDate}</td>
                    <td>${runInfo}</td>
                    <td>${escapeHtml(order.invoiceNumber || '—')}</td>
                    <td class="notes-cell">${escapeHtml(order.notes || '—')}</td>
                </tr>
            `;
        });
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Toggle customer orders visibility
function toggleCustomerOrders(customerId) {
    const ordersDiv = document.getElementById('orders-' + customerId);
    const toggleIcon = document.getElementById('toggle-' + customerId);
    
    if (ordersDiv.style.display === 'none') {
        ordersDiv.style.display = 'block';
        toggleIcon.textContent = '▾';
    } else {
        ordersDiv.style.display = 'none';
        toggleIcon.textContent = '▸';
    }
}

// Assign delivery date to an order
function assignDeliveryDateToOrder(orderId, deliveryDate) {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
        alert('Order not found');
        return;
    }
    
    const oldDeliveryDate = order.deliveryDate;
    const oldRunId = order.runId;
    
    // Update order
    if (deliveryDate) {
        order.deliveryDate = deliveryDate;
        
        // If delivery date changed and order was assigned to a run on the old date, unassign it
        if (oldDeliveryDate && oldDeliveryDate !== deliveryDate && oldRunId) {
            const runs = getRuns();
            const oldRun = runs.find(r => r.id === oldRunId);
            
            // Only unassign if the old run was for the old date
            if (oldRun && oldRun.deliveryDate === oldDeliveryDate) {
                order.runId = null;
                order.status = 'Unassigned';
                
                // Remove order from old run's orderIds if it exists
                if (oldRun.orderIds && oldRun.orderIds.includes(orderId)) {
                    oldRun.orderIds = oldRun.orderIds.filter(id => id !== orderId);
                }
                
                saveRuns(runs);
            }
        }
    } else {
        // If date is cleared, remove it and unassign from run
        order.deliveryDate = null;
        if (order.runId) {
            const runs = getRuns();
            const run = runs.find(r => r.id === order.runId);
            if (run && run.orderIds && run.orderIds.includes(orderId)) {
                run.orderIds = run.orderIds.filter(id => id !== orderId);
            }
            order.runId = null;
            order.status = 'Unassigned';
            saveRuns(runs);
        }
    }
    
    saveOrders(orders);
    
    // Refresh the display
    const searchQuery = document.getElementById('undelivered-search')?.value || '';
    renderUndeliveredOrders(searchQuery);
    
    // Refresh run builder if visible and if date changed
    const runDate = document.getElementById('run-date')?.value;
    if (runDate) {
        // Refresh both old and new dates if they're different
        if (oldDeliveryDate && oldDeliveryDate !== deliveryDate) {
            renderRunBuilder(oldDeliveryDate);
        }
        if (deliveryDate && deliveryDate === runDate) {
            renderRunBuilder(deliveryDate);
        }
    }
    
    // Show confirmation
    showMessage(`Delivery date ${deliveryDate ? 'assigned' : 'removed'} for order${oldRunId && oldDeliveryDate !== deliveryDate ? '. Order unassigned from previous run.' : ''}`, 'success');
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize storage
    initializeStorage();
    migrateOrdersToMultiBottle();
    
    // Customer search functionality
    const searchInput = document.getElementById('customer-search');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        const results = searchCustomers(query);
        displaySearchResults(results);
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-section')) {
            document.getElementById('search-results').style.display = 'none';
        }
    });
    
    // Multi-bottle quantity controls
    document.querySelectorAll('.bottle-qty-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const input = document.getElementById('bottle-qty-' + type);
            if (input) {
                const v = Math.min(99, (parseInt(input.value, 10) || 0) + 1);
                input.value = v;
                updateBottleTotalDisplay();
                populateAssignRunDropdown();
            }
        });
    });
    document.querySelectorAll('.bottle-qty-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const input = document.getElementById('bottle-qty-' + type);
            if (input) {
                const v = Math.max(0, (parseInt(input.value, 10) || 0) - 1);
                input.value = v;
                updateBottleTotalDisplay();
                populateAssignRunDropdown();
            }
        });
    });
    
    // Delivery date change: populate run dropdown
    document.getElementById('delivery-date')?.addEventListener('change', () => {
        populateAssignRunDropdown();
    });
    
    // When bottle totals change, run dropdown may need to refresh (already done in +/- handlers)
    
    // Staff options toggle
    document.getElementById('staff-toggle').addEventListener('click', () => {
        const options = document.getElementById('staff-options');
        const toggle = document.getElementById('staff-toggle');
        
        if (options.style.display === 'none') {
            options.style.display = 'block';
            toggle.classList.add('expanded');
            toggle.textContent = toggle.textContent.replace('▸', '▾');
        } else {
            options.style.display = 'none';
            toggle.classList.remove('expanded');
            toggle.textContent = toggle.textContent.replace('▾', '▸');
        }
    });
    
    // Save order button
    document.getElementById('save-order').addEventListener('click', saveOrder);
    
    // Allow Ctrl+Enter to save order from anywhere
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            saveOrder();
        }
    });
    
    // Focus on search input when page loads
    searchInput.focus();
    
    // ============================================
    // MAIN VIEW TOGGLE (CUSTOMER / STAFF)
    // ============================================
    
    const customerViewBtn = document.getElementById('customer-view-btn');
    const staffViewBtn = document.getElementById('staff-view-btn');
    const customerView = document.getElementById('customer-view');
    const staffView = document.getElementById('staff-view');
    
    function switchToCustomerView() {
        customerView.style.display = 'block';
        staffView.style.display = 'none';
        customerViewBtn.classList.add('active');
        staffViewBtn.classList.remove('active');
        // Focus on search input when switching to customer view
        setTimeout(() => {
            document.getElementById('customer-search')?.focus();
        }, 100);
    }
    
    function switchToStaffView() {
        customerView.style.display = 'none';
        staffView.style.display = 'block';
        customerViewBtn.classList.remove('active');
        staffViewBtn.classList.add('active');
        // Load undelivered orders when switching to staff view (it's the default active tab)
        const activeTab = document.querySelector('.staff-tab.active')?.dataset.tab;
        if (activeTab === 'undelivered' || !activeTab) {
            renderUndeliveredOrders();
        }
    }
    
    customerViewBtn?.addEventListener('click', switchToCustomerView);
    staffViewBtn?.addEventListener('click', switchToStaffView);
    
    // ============================================
    // STAFF / ADMIN SECTION EVENT LISTENERS
    // ============================================
    
    // Tab switching
    document.querySelectorAll('.staff-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Update tab buttons
            document.querySelectorAll('.staff-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update tab content
            document.querySelectorAll('.staff-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`tab-${targetTab}`)?.classList.add('active');
            
            // Load tab-specific data
            if (targetTab === 'undelivered') {
                renderUndeliveredOrders();
            } else if (targetTab === 'generated-runs') {
                renderGeneratedRuns();
            } else if (targetTab === 'daily-view') {
                const today = new Date().toISOString().split('T')[0];
                const dateInput = document.getElementById('daily-view-date');
                if (dateInput) {
                    dateInput.value = today;
                    renderWeeklyOverview(new Date());
                    renderDailyView(today);
                }
            } else if (targetTab === 'run-builder') {
                const today = new Date().toISOString().split('T')[0];
                const dateInput = document.getElementById('run-date');
                if (dateInput) {
                    dateInput.value = today;
                    renderRunBuilder(today);
                }
            } else if (targetTab === 'stock-count') {
                renderStockCount();
            } else if (targetTab === 'customer-history') {
                renderCustomerHistory();
            }
        });
    });
    
    // Weekly view navigation
    let currentWeekDate = new Date();
    document.getElementById('prev-week')?.addEventListener('click', () => {
        currentWeekDate.setDate(currentWeekDate.getDate() - 7);
        renderWeeklyOverview(currentWeekDate);
    });
    
    document.getElementById('next-week')?.addEventListener('click', () => {
        currentWeekDate.setDate(currentWeekDate.getDate() + 7);
        renderWeeklyOverview(currentWeekDate);
    });
    
    // Daily view date change
    document.getElementById('daily-view-date')?.addEventListener('change', (e) => {
        renderDailyView(e.target.value);
    });
    
    // Run builder date change
    document.getElementById('run-date')?.addEventListener('change', (e) => {
        renderRunBuilder(e.target.value);
    });
    
    // CSV Export buttons
    document.getElementById('export-customers')?.addEventListener('click', exportCustomers);
    document.getElementById('export-orders')?.addEventListener('click', exportOrders);
    document.getElementById('export-orders-date')?.addEventListener('click', exportOrdersByDate);
    document.getElementById('export-orders-run')?.addEventListener('click', exportOrdersByRun);
    document.getElementById('export-undelivered')?.addEventListener('click', exportUndelivered);
    document.getElementById('export-tencia-format')?.addEventListener('click', exportTenciaFormat);
    
    // CSV Import
    document.getElementById('import-csv')?.addEventListener('click', () => {
        const fileInput = document.getElementById('csv-file');
        const importType = document.querySelector('input[name="import-type"]:checked')?.value;
        
        if (!fileInput.files.length) {
            showImportMessage('Please select a CSV file', 'error');
            return;
        }
        
        importCSV(fileInput.files[0], importType);
    });
    
    // Make functions globally available for inline handlers
    window.assignOrderToRun = assignOrderToRun;
    window.removeRun = removeRun;
    window.generateManifest = generateManifest;
    window.assignDeliveryDateToOrder = assignDeliveryDateToOrder;
    window.openEditOrderModal = openEditOrderModal;
    window.closeEditOrderModal = closeEditOrderModal;
    window.saveEditedOrder = saveEditedOrder;
    window.toggleCustomerOrders = toggleCustomerOrders;
    window.toggleGeneratedRun = toggleGeneratedRun;
    
    // Edit form bottle quantity controls
    document.querySelectorAll('.bottle-qty-plus-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const input = document.getElementById('edit-bottle-qty-' + type);
            if (input) {
                const v = Math.min(99, (parseInt(input.value, 10) || 0) + 1);
                input.value = v;
                updateEditBottleTotalDisplay();
                populateEditAssignRunDropdown();
            }
        });
    });
    document.querySelectorAll('.bottle-qty-minus-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const input = document.getElementById('edit-bottle-qty-' + type);
            if (input) {
                const v = Math.max(0, (parseInt(input.value, 10) || 0) - 1);
                input.value = v;
                updateEditBottleTotalDisplay();
                populateEditAssignRunDropdown();
            }
        });
    });
    
    // Edit delivery date change: populate run dropdown
    document.getElementById('edit-delivery-date')?.addEventListener('change', () => {
        populateEditAssignRunDropdown();
    });
    
    // Edit staff options toggle
    document.getElementById('edit-staff-toggle')?.addEventListener('click', () => {
        const options = document.getElementById('edit-staff-options');
        const toggle = document.getElementById('edit-staff-toggle');
        
        if (options.style.display === 'none') {
            options.style.display = 'block';
            toggle.classList.add('expanded');
            toggle.textContent = toggle.textContent.replace('▸', '▾');
        } else {
            options.style.display = 'none';
            toggle.classList.remove('expanded');
            toggle.textContent = toggle.textContent.replace('▾', '▸');
        }
    });
    
    // Close modal when clicking outside
    document.getElementById('edit-order-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'edit-order-modal') {
            closeEditOrderModal();
        }
    });
    
    // ============================================
    // RESET DATA BUTTON
    // ============================================
    document.getElementById('reset-data-btn')?.addEventListener('click', resetAllData);
    
    // ============================================
    // UNDELIVERED BOTTLES SECTION
    // ============================================
    
    // Search functionality
    const undeliveredSearchInput = document.getElementById('undelivered-search');
    undeliveredSearchInput?.addEventListener('input', (e) => {
        renderUndeliveredOrders(e.target.value);
    });
    
    // Customer history search
    const customerHistorySearchInput = document.getElementById('customer-history-search');
    customerHistorySearchInput?.addEventListener('input', (e) => {
        renderCustomerHistory(e.target.value);
    });
});

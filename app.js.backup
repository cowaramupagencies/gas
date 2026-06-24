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

// Validate form
function validateForm() {
    const name = document.getElementById('customer-name').value.trim();
    const mobile = document.getElementById('customer-mobile').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    const bottleType = document.getElementById('bottle-type').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    
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
    
    if (!bottleType) {
        showMessage('Please select a bottle type', 'error');
        return false;
    }
    
    if (!quantity || quantity < 1) {
        showMessage('Please enter a valid quantity', 'error');
        return false;
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
    const bottleType = document.getElementById('bottle-type').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const preferredDay = document.querySelector('input[name="preferred-day"]:checked').value;
    const orderNotes = document.getElementById('order-notes').value.trim();
    const deliveryDate = document.getElementById('delivery-date').value || null;
    const invoiceNumber = document.getElementById('invoice-number').value.trim() || null;
    
    // Find or create customer
    const customer = findOrCreateCustomer(name, mobile, address);
    
    // Create order
    const order = {
        id: generateId(),
        customerId: customer.id,
        bottleType: bottleType,
        quantity: quantity,
        preferredDay: preferredDay,
        deliveryDate: deliveryDate,
        invoiceNumber: invoiceNumber,
        notes: orderNotes,
        status: 'Unassigned', // Assigned / Unassigned / Delivered
        runId: null,
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
    
    // Reset bottle type selection
    document.querySelectorAll('.bottle-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.getElementById('bottle-type').value = '';
    
    // Reset quantity
    document.getElementById('quantity').value = 1;
    
    // Reset preferred day
    document.querySelector('input[name="preferred-day"][value="Any"]').checked = true;
    
    // Reset notes
    document.getElementById('order-notes').value = '';
    
    // Reset staff options
    document.getElementById('delivery-date').value = '';
    document.getElementById('invoice-number').value = '';
    
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
        const totalBottles = orders.reduce((sum, order) => sum + order.quantity, 0);
        
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
                <td>${escapeHtml(order.bottleType)}</td>
                <td>${order.quantity}</td>
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
        const totalBottles = runOrders.reduce((sum, o) => sum + o.quantity, 0);
        const manifest = getManifests().find(m => m.runId === run.id);
        
        html += `
            <div class="run-card">
                <div class="run-header">
                    <h4>Run ${run.runNumber} (${totalBottles} / 8 bottles)</h4>
                    ${manifest ? '<span class="manifest-locked">Manifest Generated</span>' : ''}
                </div>
                <div class="run-orders">
        `;
        
        runOrders.forEach(order => {
            const customer = getCustomerById(order.customerId);
            html += `
                <div class="run-order-item">
                    ${escapeHtml(customer ? customer.name : 'Unknown')} - 
                    ${escapeHtml(order.bottleType)} × ${order.quantity}
                </div>
            `;
        });
        
        html += `
                </div>
                <div class="run-actions">
                    ${!manifest ? `<button onclick="removeRun('${run.id}')">Remove Run</button>` : ''}
                    <button onclick="generateManifest('${run.id}')">${manifest ? 'Download Manifest' : 'Generate Manifest'}</button>
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
            <div class="run-counter">Total bottles assigned: ${allAssignedBottles} / ${orders.reduce((s, o) => s + o.quantity, 0)}</div>
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
            const totalBottles = runOrders.reduce((sum, o) => sum + o.quantity, 0);
            return totalBottles + order.quantity <= 8;
        });
        
        html += `
            <div class="unassigned-order-card" data-order-id="${order.id}">
                <div class="order-info">
                    <strong>${escapeHtml(customer ? customer.name : 'Unknown')}</strong><br>
                    ${escapeHtml(order.bottleType)} × ${order.quantity}<br>
                    <small>${escapeHtml(customer ? customer.address : '')}</small>
                </div>
                <div class="order-actions">
                    ${availableRuns.length > 0 ? `
                        <select onchange="assignOrderToRun('${order.id}', this.value)">
                            <option value="">Assign to run...</option>
                            ${availableRuns.map(run => {
                                const runOrders = getOrdersByDate(date).filter(o => o.runId === run.id);
                                const totalBottles = runOrders.reduce((sum, o) => sum + o.quantity, 0);
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
    
    // Check if adding this order would exceed 8 bottles
    const runOrders = orders.filter(o => o.runId === runId);
    const totalBottles = runOrders.reduce((sum, o) => sum + o.quantity, 0);
    
    if (totalBottles + order.quantity > 8) {
        alert('Cannot add order: would exceed 8 bottles limit');
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
    
    const manifests = getManifests();
    const activeManifest = manifests.find(m => m.runId === runId && m.status === 'ACTIVE');
    
    // If ACTIVE manifest exists, download it instead of regenerating
    if (activeManifest) {
        downloadManifestPDF(activeManifest);
        return;
    }
    
    // Create new manifest
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
                bottleType: order.bottleType,
                quantity: order.quantity,
                notes: order.notes || '',
                invoiceNumber: order.invoiceNumber || ''
            };
        }),
        totalStops: orders.length,
        totalBottles: orders.reduce((sum, o) => sum + o.quantity, 0),
        breakdown: {
            '45kg': orders.filter(o => o.bottleType === '45kg').reduce((s, o) => s + o.quantity, 0),
            '8.5kg': orders.filter(o => o.bottleType === '8.5kg').reduce((s, o) => s + o.quantity, 0),
            'Forklift': orders.filter(o => o.bottleType === 'Forklift').reduce((s, o) => s + o.quantity, 0)
        }
    };
    
    // Check for existing ACTIVE manifest
    const existingActiveManifest = manifests.find(m => m.runId === runId && m.status === 'ACTIVE');
    
    if (existingActiveManifest) {
        // This should not happen in normal flow - override should be used
        alert('An active manifest already exists. Use "Override Manifest" to replace it.');
        return;
    }
    
    // Get next version number (count all manifests for this run, including SUPERSEDED)
    const existingManifestsForRun = manifests.filter(m => m.runId === runId);
    const nextVersion = existingManifestsForRun.length + 1;
    
    manifest = {
        id: generateId(),
        runId: runId,
        version: nextVersion,
        status: 'ACTIVE',
        generatedAt: new Date().toISOString(),
        supersededAt: null,
        snapshotData: snapshotData
    };
    
    run.manifestId = manifest.id;
    // Set run status to Pending when manifest is generated
    if (!run.status) {
        run.status = 'Pending';
    }
    
    manifests.push(manifest);
    run.manifestId = manifest.id;
    saveManifests(manifests);
    saveRuns(runs);
    
    downloadManifestPDF(manifest);
    
    // Refresh run builder if visible
    const runDate = document.getElementById('run-date')?.value;
    if (runDate === run.deliveryDate) {
        renderRunBuilder(runDate);
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
                    @page { margin: 1cm; }
                }
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #000;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                }
                .header h2 {
                    margin: 5px 0;
                    font-size: 18px;
                }
                .manifest-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    font-size: 14px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                th, td {
                    border: 1px solid #000;
                    padding: 8px;
                    text-align: left;
                    font-size: 12px;
                }
                th {
                    background-color: #f0f0f0;
                    font-weight: bold;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 2px solid #000;
                }
                .footer-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }
                .signature-box {
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 1px solid #000;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>GAS DELIVERY MANIFEST</h1>
                <h2>Company Name</h2>
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
                            <td>${escapeHtml(stop.customerName)}</td>
                            <td>${escapeHtml(stop.address)}</td>
                            <td>${escapeHtml(stop.mobile)}</td>
                            <td>${escapeHtml(stop.bottleType)}</td>
                            <td>${stop.quantity}</td>
                            <td>${escapeHtml(stop.notes)}</td>
                            <td>${escapeHtml(stop.invoiceNumber)}</td>
                            <td style="width: 80px; height: 40px;"></td>
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
                        45kg × ${data.breakdown['45kg']}<br>
                        8.5kg × ${data.breakdown['8.5kg']}<br>
                        Forklift × ${data.breakdown['Forklift']}
                    </div>
                    <div>
                        <strong>Vehicle Type:</strong> _____________<br>
                        <strong>Driver Name:</strong> _____________
                    </div>
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
        'Forklift': 0,
        total: 0
    };
    
    undeliveredOrders.forEach(order => {
        totals[order.bottleType] = (totals[order.bottleType] || 0) + order.quantity;
        totals.total += order.quantity;
    });
    
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
                <span class="stock-label">Forklift:</span>
                <span class="stock-value">${totals['Forklift']}</span>
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
            bottleType: order.bottleType,
            quantity: order.quantity,
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
            bottleType: order.bottleType,
            quantity: order.quantity,
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
                bottleType: order.bottleType,
                quantity: order.quantity,
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
            bottleType: order.bottleType,
            quantity: order.quantity,
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
            'Bottle Type': order.bottleType,
            Quantity: order.quantity,
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
        if (!row.bottleType || !row.quantity) return;
        
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
                bottleType: row.bottleType,
                quantity: parseInt(row.quantity) || 1,
                preferredDay: row.preferredDay || 'Any',
                deliveryDate: row.deliveryDate || null,
                invoiceNumber: row.invoiceNumber || null,
                delivered: row.delivered === 'true' || row.delivered === true || false,
                deliveredAt: row.deliveredAt || null,
                deliveredRunId: row.deliveredRunId || null,
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
    
    let html = '<div class="generated-runs-grid">';
    
    runs.forEach(run => {
        const manifest = getActiveManifestForRun(run.id);
        const runOrders = orders.filter(o => o.runId === run.id);
        const totalBottles = runOrders.reduce((sum, o) => sum + o.quantity, 0);
        const deliveredBottles = runOrders.filter(o => o.delivered).reduce((sum, o) => sum + o.quantity, 0);
        const status = calculateRunStatus(run);
        const manifestId = manifest ? manifest.id.substring(0, 8).toUpperCase() : 'N/A';
        const version = manifest ? (manifest.version || 1) : null;
        
        html += `
            <div class="generated-run-card" data-run-id="${run.id}">
                <div class="run-card-header">
                    <h4>${formatDate(run.deliveryDate)} - Run ${run.runNumber}</h4>
                    <span class="run-status-badge status-${status.toLowerCase().replace(' ', '-')}">${status}</span>
                </div>
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
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
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
        
        ${canOverride ? `
            <div class="override-manifest-section">
                <button class="override-manifest-btn" onclick="overrideManifest('${runId}')">Override Manifest</button>
                <p class="override-warning">This will archive the current manifest and create a new version. You can then add/remove orders before generating a new PDF.</p>
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
                <td>${escapeHtml(order.bottleType)}</td>
                <td>${order.quantity}</td>
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
            ${allDelivered && !isCompleted ? (
                `<button class="mark-complete-btn" onclick="markRunComplete('${runId}')">Mark Run Complete</button>`
            ) : ''}
        </div>
    `;
    
    detailView.innerHTML = html;
}

// Override manifest
function overrideManifest(runId) {
    if (!confirm('This will replace the existing manifest and archive the old one.\nThe previous manifest will no longer be active.\n\nContinue?')) {
        return;
    }
    
    const runs = getRuns();
    const run = runs.find(r => r.id === runId);
    if (!run) return;
    
    const manifests = getManifests();
    const activeManifest = manifests.find(m => m.runId === runId && m.status === 'ACTIVE');
    
    if (!activeManifest) {
        alert('No active manifest found to override');
        return;
    }
    
    // Mark existing manifest as SUPERSEDED
    activeManifest.status = 'SUPERSEDED';
    activeManifest.supersededAt = new Date().toISOString();
    
    // Remove manifest reference from run (will be set when new manifest is generated)
    run.manifestId = null;
    
    saveManifests(manifests);
    saveRuns(runs);
    
    // Redirect to run builder for this date to allow editing
    const date = run.deliveryDate;
    showMessage('Manifest archived. You can now edit the run and generate a new manifest.', 'success');
    
    // Switch to run builder tab
    document.querySelectorAll('.staff-tab').forEach(tab => {
        if (tab.dataset.tab === 'run-builder') {
            tab.click();
            setTimeout(() => {
                document.getElementById('run-date').value = date;
                renderRunBuilder(date);
            }, 100);
        }
    });
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

// Render undelivered orders table
function renderUndeliveredOrders(searchQuery = '') {
    const container = document.getElementById('undelivered-orders-table');
    if (!container) return;
    
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
            <tr data-order-id="${order.id}">
                <td>${escapeHtml(customer.name)}</td>
                <td>${escapeHtml(customer.mobile)}</td>
                <td>${escapeHtml(customer.address)}</td>
                <td>${escapeHtml(order.bottleType)}</td>
                <td>${order.quantity}</td>
                <td>${escapeHtml(preferredDay)}</td>
                <td>${currentDeliveryDate ? formatDate(currentDeliveryDate) : '<span class="no-date">No date</span>'}</td>
                <td>
                    <input 
                        type="date" 
                        class="assign-delivery-date" 
                        data-order-id="${order.id}"
                        value="${currentDeliveryDate}"
                        onchange="assignDeliveryDateToOrder('${order.id}', this.value)"
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

// Assign delivery date to an order
function assignDeliveryDateToOrder(orderId, deliveryDate) {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
        alert('Order not found');
        return;
    }
    
    // Update order
    if (deliveryDate) {
        order.deliveryDate = deliveryDate;
        // Don't change status - it stays as Unassigned/Assigned until marked Delivered
    } else {
        // If date is cleared, remove it
        order.deliveryDate = null;
    }
    
    saveOrders(orders);
    
    // Refresh the display
    const searchQuery = document.getElementById('undelivered-search')?.value || '';
    renderUndeliveredOrders(searchQuery);
    
    // Show confirmation
    showMessage(`Delivery date ${deliveryDate ? 'assigned' : 'removed'} for order`, 'success');
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize storage
    initializeStorage();
    
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
    
    // Bottle type selection
    document.querySelectorAll('.bottle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.bottle-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('bottle-type').value = btn.dataset.type;
        });
    });
    
    // Quantity controls
    document.getElementById('qty-increase').addEventListener('click', () => {
        const qtyInput = document.getElementById('quantity');
        qtyInput.value = parseInt(qtyInput.value) + 1;
    });
    
    document.getElementById('qty-decrease').addEventListener('click', () => {
        const qtyInput = document.getElementById('quantity');
        const currentValue = parseInt(qtyInput.value);
        if (currentValue > 1) {
            qtyInput.value = currentValue - 1;
        }
    });
    
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
});

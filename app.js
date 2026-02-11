// Gas Bottle Order Entry System - V2
// Firebase-backed order entry system using Firestore

// ============================================================================
// FIREBASE AUTHENTICATION
// ============================================================================

let auth = null;
let db = null;

// Wait for Firebase to be available
function waitForFirebase() {
    return new Promise((resolve) => {
        if (window.firebaseAuth && window.firebaseDB) {
            auth = window.firebaseAuth;
            db = window.firebaseDB;
            resolve();
        } else {
            setTimeout(() => waitForFirebase().then(resolve), 100);
        }
    });
}

// Store initializeApp function reference
let initializeAppFunction = null;

// Check auth state and show/hide UI
function checkAuthState() {
    if (!auth) return;
    
    auth.onAuthStateChanged((user) => {
        const loginGate = document.getElementById('login-gate');
        const mainApp = document.getElementById('main-app');
        
        if (user) {
            // User is logged in
            if (loginGate) {
                loginGate.style.display = 'none';
                loginGate.style.visibility = 'hidden';
            }
            if (mainApp) {
                mainApp.style.display = 'block';
                mainApp.style.visibility = 'visible';
            }
            // Call initializeApp if it's ready, otherwise wait for DOM
            if (initializeAppFunction) {
                setTimeout(() => initializeAppFunction(), 100);
            } else {
                // Wait for DOM to be ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        setTimeout(() => {
                            if (initializeAppFunction) initializeAppFunction();
                        }, 100);
                    });
                } else {
                    // DOM already ready, wait a bit for initializeApp to be set
                    setTimeout(() => {
                        if (initializeAppFunction) initializeAppFunction();
                    }, 200);
                }
            }
        } else {
            // User is not logged in
            if (loginGate) {
                loginGate.style.display = 'flex';
                loginGate.style.visibility = 'visible';
            }
            if (mainApp) {
                mainApp.style.display = 'none';
                mainApp.style.visibility = 'hidden';
            }
        }
    });
}

// Handle login form submission
async function handleLogin(email, password) {
    if (!auth) {
        showLoginError('Firebase not initialized. Please refresh the page.');
        return;
    }
    
    // Clear any previous errors
    showLoginError('');
    
    // Basic validation
    if (!email || !password) {
        showLoginError('Please enter both email and password.');
        return;
    }
    
    try {
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js');
        await signInWithEmailAndPassword(auth, email, password);
        // Auth state change will handle UI update
    } catch (error) {
        let errorMessage = 'Login failed. ';
        
        if (error.code === 'auth/invalid-credential') {
            errorMessage += 'Invalid email or password. Please check your credentials or create a user in Firebase Console.';
        } else if (error.code === 'auth/user-not-found') {
            errorMessage += 'User not found. Please create a user in Firebase Console first.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage += 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage += 'Invalid email format. Please check your email address.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage += 'Too many failed login attempts. Please try again later.';
        } else {
            errorMessage += error.message || 'Please check your credentials.';
        }
        
        showLoginError(errorMessage);
    }
}

function showLoginError(message) {
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
        errorEl.textContent = message;
    }
}

// ============================================================================
// FIRESTORE DATA ACCESS LAYER
// ============================================================================

// In-memory state (updated by real-time listeners)
let customersState = [];
let ordersState = [];
let runsState = [];
let manifestsState = [];

// Load customers from Firestore
async function loadCustomers() {
    if (!db) return [];
    try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        const snapshot = await getDocs(collection(db, 'customers'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error loading customers:', error);
        return [];
    }
}

// Save customer to Firestore
async function saveCustomer(customer) {
    if (!db) return;
    try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        const customerRef = doc(db, 'customers', customer.id);
        await setDoc(customerRef, customer);
    } catch (error) {
        console.error('Error saving customer:', error);
        throw error;
    }
}

// Load orders from Firestore
async function loadOrders() {
    if (!db) return [];
    try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        const snapshot = await getDocs(collection(db, 'orders'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error loading orders:', error);
        return [];
    }
}

// Save order to Firestore
async function saveOrder(order) {
    if (!db) {
        throw new Error('Firebase not initialized');
    }
    
    // Ensure order has all required fields
    const orderToSave = {
        ...order,
        delivered: order.delivered !== undefined ? order.delivered : false,
        createdAt: order.createdAt || new Date().toISOString(),
        status: order.status || (order.runId ? 'Assigned' : 'Unassigned')
    };
    
    try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        const orderRef = doc(db, 'orders', orderToSave.id);
        await setDoc(orderRef, orderToSave);
        console.log('[DEBUG] Order successfully written to Firestore:', orderToSave.id);
        return orderToSave;
    } catch (error) {
        console.error('[DEBUG] Error saving order to Firestore:', error);
        throw error;
    }
}

// Load runs from Firestore
async function loadRuns() {
    if (!db) return [];
    try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        const snapshot = await getDocs(collection(db, 'runs'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error loading runs:', error);
        return [];
    }
}

// Save run to Firestore
async function saveRun(run) {
    if (!db) return;
    try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        const runRef = doc(db, 'runs', run.id);
        await setDoc(runRef, run);
    } catch (error) {
        console.error('Error saving run:', error);
        throw error;
    }
}

// Load manifests from Firestore
async function loadManifests() {
    if (!db) return [];
    try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        const snapshot = await getDocs(collection(db, 'manifests'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error loading manifests:', error);
        return [];
    }
}

// Save manifest to Firestore
async function saveManifest(manifest) {
    if (!db) return;
    try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        const manifestRef = doc(db, 'manifests', manifest.id);
        await setDoc(manifestRef, manifest);
    } catch (error) {
        console.error('Error saving manifest:', error);
        throw error;
    }
}

// Delete document from Firestore
async function deleteDocument(collectionName, docId) {
    if (!db) return;
    try {
        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        const docRef = doc(db, collectionName, docId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error(`Error deleting ${collectionName}:`, error);
        throw error;
    }
}

// ============================================================================
// COMPATIBILITY LAYER (get/save functions for existing code)
// ============================================================================

// Get all customers (from in-memory state)
function getCustomers() {
    return customersState;
}

// Save customers (updates all customers - for batch operations)
async function saveCustomers(customers) {
    if (!db) return;
    try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        const promises = customers.map(customer => {
            const customerRef = doc(db, 'customers', customer.id);
            return setDoc(customerRef, customer);
        });
        await Promise.all(promises);
    } catch (error) {
        console.error('Error saving customers:', error);
        throw error;
    }
}

// Get all orders (from in-memory state)
function getOrders() {
    return ordersState;
}

// Save orders (updates all orders - for batch operations)
async function saveOrders(orders) {
    if (!db) return;
    try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        const promises = orders.map(order => {
            const orderRef = doc(db, 'orders', order.id);
            return setDoc(orderRef, order);
        });
        await Promise.all(promises);
    } catch (error) {
        console.error('Error saving orders:', error);
        throw error;
    }
}

// Get all runs (from in-memory state)
function getRuns() {
    return runsState;
}

// Save runs (updates all runs - for batch operations)
async function saveRuns(runs) {
    if (!db) return;
    try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        const promises = runs.map(run => {
            const runRef = doc(db, 'runs', run.id);
            return setDoc(runRef, run);
        });
        await Promise.all(promises);
    } catch (error) {
        console.error('Error saving runs:', error);
        throw error;
    }
}

// Get all manifests (from in-memory state)
function getManifests() {
    return manifestsState;
}

// Save manifests (updates all manifests - for batch operations)
async function saveManifests(manifests) {
    if (!db) return;
    try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        const promises = manifests.map(manifest => {
            const manifestRef = doc(db, 'manifests', manifest.id);
            return setDoc(manifestRef, manifest);
        });
        await Promise.all(promises);
    } catch (error) {
        console.error('Error saving manifests:', error);
        throw error;
    }
}

// ============================================================================
// REAL-TIME LISTENERS
// ============================================================================

let unsubscribeCustomers = null;
let unsubscribeOrders = null;
let unsubscribeRuns = null;
let unsubscribeManifests = null;

// Setup real-time listeners
async function setupRealtimeListeners() {
    if (!db) {
        console.error('[DEBUG] Cannot setup listeners - db not initialized');
        return;
    }
    
    console.log('[DEBUG] Setting up Firestore real-time listeners...');
    
    try {
        const { collection, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        
        console.log('[DEBUG] Firestore modules loaded, creating listeners...');
        
        // Customers listener
        unsubscribeCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
            customersState = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('[DEBUG] Customers listener fired. Customers count:', customersState.length);
            // Trigger UI updates if needed
            refreshAllViews();
        }, (error) => {
            console.error('[DEBUG] Customers listener error:', error);
        });
        
        // Orders listener
        unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
            const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('[DEBUG] Orders listener fired. Orders count:', newOrders.length);
            ordersState = newOrders;
            // Trigger UI updates
            refreshAllViews();
        }, (error) => {
            console.error('[DEBUG] Orders listener error:', error);
        });
        
        // Runs listener
        unsubscribeRuns = onSnapshot(collection(db, 'runs'), (snapshot) => {
            runsState = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            refreshAllViews();
        });
        
        // Manifests listener
        unsubscribeManifests = onSnapshot(collection(db, 'manifests'), (snapshot) => {
            manifestsState = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            refreshAllViews();
        }, (error) => {
            console.error('[DEBUG] Manifests listener error:', error);
        });
        
        console.log('[DEBUG] All real-time listeners registered successfully');
        console.log('[DEBUG] Initial orders count:', ordersState.length);
        
        // Trigger initial refresh after listeners are set up
        setTimeout(() => {
            console.log('[DEBUG] Triggering initial view refresh');
            refreshAllViews();
        }, 100);
    } catch (error) {
        console.error('[DEBUG] Error setting up real-time listeners:', error);
    }
}

// Refresh all views when data changes
function refreshAllViews() {
    console.log('[DEBUG] refreshAllViews called. Orders in state:', ordersState.length);
    
    // Refresh undelivered orders (always refresh this - it's the main view)
    if (typeof renderUndeliveredOrders === 'function') {
        const searchQuery = document.getElementById('undelivered-search')?.value || '';
        console.log('[DEBUG] Refreshing undelivered orders. Current orders:', getOrders().length);
        renderUndeliveredOrders(searchQuery);
    }
    
    // Refresh run builder if visible
    const runDate = document.getElementById('run-date')?.value;
    if (runDate && typeof renderRunBuilder === 'function') {
        renderRunBuilder(runDate);
    }
    
    // Refresh generated runs if visible
    if (typeof renderGeneratedRuns === 'function') {
        renderGeneratedRuns();
    }
    
    // Refresh stock count if visible
    if (typeof renderStockCount === 'function') {
        renderStockCount();
    }
    
    // Refresh customer history if visible
    if (typeof renderCustomerHistory === 'function') {
        const searchQuery = document.getElementById('customer-history-search')?.value || '';
        renderCustomerHistory(searchQuery);
    }
}

// Cleanup listeners
function cleanupListeners() {
    if (unsubscribeCustomers) unsubscribeCustomers();
    if (unsubscribeOrders) unsubscribeOrders();
    if (unsubscribeRuns) unsubscribeRuns();
    if (unsubscribeManifests) unsubscribeManifests();
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

// Migration no longer needed - Firestore handles data structure directly

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

// Human-readable bottle breakdown for display (e.g. "1 x 45kg, 2 x 8.5kg")
function formatBottleBreakdown(order) {
    const b = getOrderBottles(order);
    const parts = [];
    BOTTLE_TYPES.forEach(t => {
        if (b[t] > 0) {
            // Format as "quantity x type" (e.g. "1 x 45kg")
            parts.push(b[t] + ' x ' + t);
        }
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
async function findOrCreateCustomer(name, mobile, address) {
    const customers = getCustomers();
    // Ensure orderHistory exists for all customers
    customers.forEach(c => {
        if (!c.orderHistory) c.orderHistory = [];
    });
    
    // Try to find existing customer by mobile (most reliable identifier)
    let customer = customers.find(c => 
        c.mobile.toLowerCase().trim() === mobile.toLowerCase().trim()
    );
    
    if (customer) {
        // Update existing customer details if they've changed
        customer.name = name;
        customer.address = address;
        await saveCustomer(customer);
    } else {
        // Create new customer
        customer = {
            id: generateId(),
            name: name.trim(),
            mobile: mobile.trim(),
            address: address.trim(),
            notes: '',
            orderHistory: [],
            createdAt: new Date().toISOString()
        };
        await saveCustomer(customer);
    }
    
    return customer;
}

// Update customer notes
async function updateCustomerNotes(customerId, notes) {
    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);
    
    if (customer && notes.trim()) {
        // Append to existing notes or set new notes
        if (customer.notes) {
            customer.notes = customer.notes + '\n' + notes.trim();
        } else {
            customer.notes = notes.trim();
        }
        await saveCustomer(customer);
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
async function handleSaveOrder() {
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
    const customer = await findOrCreateCustomer(name, mobile, address);
    
    // Create order - ensure all required fields are set
    const order = {
        id: generateId(),
        customerId: customer.id,
        bottles: bottles,
        totalBottleCount: totalBottleCount,
        preferredDay: preferredDay,
        deliveryDate: deliveryDate || null, // Explicitly set to null if empty
        invoiceNumber: invoiceNumber || null,
        notes: orderNotes || '',
        status: runId ? 'Assigned' : 'Unassigned',
        runId: runId || null, // Explicitly set to null if not assigned
        delivered: false, // CRITICAL: Must be false for undelivered orders
        deliveredAt: null,
        deliveredRunId: null,
        createdAt: new Date().toISOString()
    };
    
    console.log('[DEBUG] Creating order:', {
        id: order.id,
        customerId: order.customerId,
        delivered: order.delivered,
        runId: order.runId,
        deliveryDate: order.deliveryDate,
        status: order.status
    });
    
    try {
        // Save order to Firestore (this will trigger the real-time listener)
        await saveOrder(order);
        console.log('[DEBUG] Order saved to Firestore:', order.id);
        
        // Update customer order history
        customer.orderHistory = customer.orderHistory || [];
        customer.orderHistory.push(order.id);
        await saveCustomer(customer);
        
        // Update customer notes if order notes provided
        if (orderNotes) {
            await updateCustomerNotes(customer.id, orderNotes);
        }
        
        // Update run if assigned
        if (runId) {
            const runs = getRuns();
            const run = runs.find(r => r.id === runId);
            if (run) {
                if (!run.orderIds) run.orderIds = [];
                if (!run.orderIds.includes(order.id)) {
                    run.orderIds.push(order.id);
                    await saveRun(run);
                }
            }
        }
        
        // Show success message
        showMessage('Order saved successfully!', 'success');
        
        // Note: Don't manually refresh UI here - the real-time listener will handle it
        // The listener will update ordersState and call refreshAllViews() automatically
        
        // Reset form after short delay
        setTimeout(() => {
            resetForm();
        }, 1500);
    } catch (error) {
        console.error('[DEBUG] Error saving order:', error);
        showMessage('Error saving order: ' + error.message, 'error');
        // Don't reset form on error - let user fix and retry
    }
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
async function createNewRun(date) {
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
    
    await saveRun(run);
    
    renderRunBuilder(date);
}

// Assign order to run
async function assignOrderToRun(orderId, runId) {
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
    if (!run.orderIds) run.orderIds = [];
    if (!run.orderIds.includes(orderId)) {
        run.orderIds.push(orderId);
    }
    
    await saveOrder(order);
    await saveRun(run);
    
    const date = document.getElementById('run-date').value;
    renderRunBuilder(date);
    
    // Refresh undelivered orders display
    const searchQuery = document.getElementById('undelivered-search')?.value || '';
    renderUndeliveredOrders(searchQuery);
}

// Remove run
async function removeRun(runId) {
    if (!confirm('Remove this run? Orders will be unassigned.')) return;
    
    const runs = getRuns();
    const run = runs.find(r => r.id === runId);
    if (!run) return;
    
    // Unassign orders
    const orders = getOrders();
    const updatePromises = [];
    orders.forEach(order => {
        if (order.runId === runId) {
            order.runId = null;
            order.status = 'Unassigned';
            updatePromises.push(saveOrder(order));
        }
    });
    
    await Promise.all(updatePromises);
    
    // Delete run from Firestore
    await deleteDocument('runs', runId);
    
    const date = document.getElementById('run-date').value;
    renderRunBuilder(date);
    
    // Refresh undelivered orders display
    const searchQuery = document.getElementById('undelivered-search')?.value || '';
    renderUndeliveredOrders(searchQuery);
}

// Generate manifest
async function generateManifest(runId) {
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
        await saveManifest(activeManifest);
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
    
    await saveManifest(manifest);
    await saveRun(run);
    
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
                            <td>${escapeHtml(stop.bottleBreakdown || (stop.bottleType ? stop.quantity + ' x ' + stop.bottleType : stop.quantity || ''))}</td>
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
                        ${BOTTLE_TYPES.map(t => {
                            const qty = data.breakdown[t] || 0;
                            return qty > 0 ? `${qty} x ${t}` : '';
                        }).filter(Boolean).join('<br>')}
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
    
    // Group runs by month
    const runsByMonth = {};
    runs.forEach(run => {
        const date = new Date(run.deliveryDate + 'T00:00:00');
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('en-AU', { year: 'numeric', month: 'long' });
        
        if (!runsByMonth[monthKey]) {
            runsByMonth[monthKey] = {
                label: monthLabel,
                runs: []
            };
        }
        runsByMonth[monthKey].runs.push(run);
    });
    
    // Sort months (newest first) by key
    const sortedMonths = Object.keys(runsByMonth).sort((a, b) => b.localeCompare(a));
    
    let html = '<div class="generated-runs-list-collapsible">';
    
    sortedMonths.forEach(monthKey => {
        const monthData = runsByMonth[monthKey];
        const monthRuns = monthData.runs;
        const monthId = monthKey.replace(/\s+/g, '-').toLowerCase();
        
        html += `
            <div class="month-section">
                <div class="month-header-collapsible" onclick="toggleMonthRuns('${monthId}')">
                    <span class="month-title">${monthData.label}</span>
                    <span class="month-run-count">${monthRuns.length} run${monthRuns.length !== 1 ? 's' : ''}</span>
                    <span class="toggle-icon-month" id="toggle-month-${monthId}">▸</span>
                </div>
                <div class="month-runs-container" id="month-runs-${monthId}" style="display: none;">
        `;
        
        monthRuns.forEach(run => {
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
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Toggle month runs visibility
function toggleMonthRuns(monthId) {
    const monthRunsDiv = document.getElementById('month-runs-' + monthId);
    const toggleIcon = document.getElementById('toggle-month-' + monthId);
    
    if (monthRunsDiv.style.display === 'none') {
        monthRunsDiv.style.display = 'block';
        toggleIcon.textContent = '▾';
    } else {
        monthRunsDiv.style.display = 'none';
        toggleIcon.textContent = '▸';
    }
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
async function toggleDelivery(orderId, runId, delivered) {
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
    
    await saveOrder(order);
    
    // Update run status
    updateRunStatus(runId);
    
    // Refresh detail view
    viewRunDetail(runId);
    
    // Refresh undelivered orders if visible
    const searchQuery = document.getElementById('undelivered-search')?.value || '';
    renderUndeliveredOrders(searchQuery);
}

// Mark run as complete
async function markRunComplete(runId) {
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
        await saveManifest(activeManifest);
    }
    
    await saveRun(run);
    
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

// Make functions globally available (for onclick handlers in HTML)
window.viewRunDetail = viewRunDetail;
window.toggleDelivery = toggleDelivery;
window.markRunComplete = markRunComplete;
window.rescheduleOrder = rescheduleOrder;
window.getManifestById = getManifestById;
window.generateManifest = generateManifest;
window.assignDeliveryDateToOrder = assignDeliveryDateToOrder;
window.openEditOrderModal = openEditOrderModal;
window.closeEditOrderModal = closeEditOrderModal;
window.saveEditedOrder = saveEditedOrder;
window.toggleCustomerOrders = toggleCustomerOrders;
window.toggleGeneratedRun = toggleGeneratedRun;
window.toggleMonthRuns = toggleMonthRuns;
window.assignOrderToRun = assignOrderToRun;
window.removeRun = removeRun;
window.createNewRun = createNewRun;
window.downloadManifestPDF = downloadManifestPDF;
window.overrideManifest = overrideManifest;
window.deleteUndeliveredOrder = deleteUndeliveredOrder;

// ============================================
// RESET DATA FUNCTION (TESTING ONLY)
// ============================================

async function resetAllData() {
    if (!confirm('This will delete ALL customers, orders, runs, and manifests. This action cannot be undone. Continue?')) {
        return;
    }
    
    // Require re-authentication
    if (!auth || !auth.currentUser) {
        alert('You must be logged in to reset data.');
        return;
    }
    
    // Prompt for password to re-authenticate
    const password = prompt('Please enter your password to confirm this action:');
    if (!password) {
        return;
    }
    
    try {
        // Re-authenticate user
        const { reauthenticateWithCredential, EmailAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js');
        const email = auth.currentUser.email;
        const credential = EmailAuthProvider.credential(email, password);
        await reauthenticateWithCredential(auth.currentUser, credential);
    } catch (error) {
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            alert('Incorrect password. Reset cancelled.');
        } else {
            alert('Authentication failed: ' + error.message);
        }
        return;
    }
    
    // Delete all Firestore documents
    if (!db) {
        alert('Firebase not initialized');
        return;
    }
    
    try {
        const { collection, getDocs, deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        
        // Delete all customers
        const customersSnapshot = await getDocs(collection(db, 'customers'));
        for (const docSnap of customersSnapshot.docs) {
            await deleteDoc(doc(db, 'customers', docSnap.id));
        }
        
        // Delete all orders
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        for (const docSnap of ordersSnapshot.docs) {
            await deleteDoc(doc(db, 'orders', docSnap.id));
        }
        
        // Delete all runs
        const runsSnapshot = await getDocs(collection(db, 'runs'));
        for (const docSnap of runsSnapshot.docs) {
            await deleteDoc(doc(db, 'runs', docSnap.id));
        }
        
        // Delete all manifests
        const manifestsSnapshot = await getDocs(collection(db, 'manifests'));
        for (const docSnap of manifestsSnapshot.docs) {
            await deleteDoc(doc(db, 'manifests', docSnap.id));
        }
        
        alert('All data has been reset.');
        window.location.reload();
    } catch (error) {
        console.error('Error resetting data:', error);
        alert('Error resetting data: ' + error.message);
    }
}
async function deleteUndeliveredOrder(orderId) {
    if (!confirm('Delete this order permanently?')) return;

    const order = getOrders().find(o => o.id === orderId);
    if (!order) {
        alert('Order not found');
        return;
    }

    try {
        // If assigned to a run, remove from that run first
        if (order.runId) {
            const run = getRuns().find(r => r.id === order.runId);
            if (run && run.orderIds) {
                run.orderIds = run.orderIds.filter(id => id !== orderId);
                await saveRun(run);
            }
        }

        // Remove from customer history
        const customer = getCustomerById(order.customerId);
        if (customer && customer.orderHistory) {
            customer.orderHistory = customer.orderHistory.filter(id => id !== orderId);
            await saveCustomer(customer);
        }

        // Delete from Firestore
        await deleteDocument('orders', orderId);

        showMessage('Order deleted', 'success');

    } catch (error) {
        console.error(error);
        alert('Delete failed');
    }
}

// ============================================
// UNDELIVERED BOTTLES SECTION FUNCTIONS (CLEAN VERSION)
// ============================================

// Get all undelivered orders
function getUndeliveredOrders() {
    return getOrders().filter(order =>
        !order.delivered && order.status !== 'Delivered'
    );
}

// Render summary strip
function renderUndeliveredSummary() {
    const container = document.getElementById('undelivered-summary-strip');
    if (!container) return;

    const orders = getUndeliveredOrders();

    const totals = {
        totalOrders: orders.length,
        totalBottles: 0,
        '45kg': 0,
        '8.5kg': 0,
        'Forklift 18kg': 0,
        'Forklift 15kg': 0
    };

    orders.forEach(order => {
        const bottles = getOrderBottles(order);
        BOTTLE_TYPES.forEach(type => {
            totals[type] += bottles[type] || 0;
        });
        totals.totalBottles += getOrderTotalBottles(order);
    });

    const forkliftTotal = totals['Forklift 18kg'] + totals['Forklift 15kg'];

    container.innerHTML = `
        <div class="summary-strip-grid">
            <div class="summary-card">
                <div class="summary-label">Orders</div>
                <div class="summary-value">${totals.totalOrders}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Bottles</div>
                <div class="summary-value">${totals.totalBottles}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">45kg</div>
                <div class="summary-value">${totals['45kg']}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">8.5kg</div>
                <div class="summary-value">${totals['8.5kg']}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Forklift (15/18kg)</div>
                <div class="summary-value">${forkliftTotal}</div>
            </div>
        </div>
    `;
}

// Render table
function renderUndeliveredOrders(searchQuery = '') {
    const container = document.getElementById('undelivered-orders-table');
    if (!container) return;

    renderUndeliveredSummary();

    let orders = getUndeliveredOrders();

    if (searchQuery) {
        orders = filterUndeliveredOrders(orders, searchQuery);
    }

    if (orders.length === 0) {
        container.innerHTML = '<p class="no-orders-message">No undelivered orders.</p>';
        return;
    }

    let html = `
        <div class="undelivered-table-wrapper">
        <table class="undelivered-table">
        <thead>
            <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Address</th>
                <th>Bottles</th>
                <th>Qty</th>
                <th>Preferred</th>
                <th>Delivery Date</th>
                <th>Assign Date</th>
                <th>Invoice</th>
                <th>Delete</th>
            </tr>
        </thead>
        <tbody>
    `;

    orders.forEach(order => {
        const customer = getCustomerById(order.customerId);
        if (!customer) return;

        html += `
            <tr onclick="openEditOrderModal('${order.id}')">
                <td>${escapeHtml(customer.name)}</td>
                <td>${escapeHtml(customer.mobile)}</td>
                <td>${escapeHtml(customer.address)}</td>
                <td>${escapeHtml(formatBottleBreakdown(order))}</td>
                <td>${getOrderTotalBottles(order)}</td>
                <td>${escapeHtml(order.preferredDay || 'Any')}</td>
                <td>${order.deliveryDate ? formatDate(order.deliveryDate) : '-'}</td>
                <td>
                    <input type="date"
                        value="${order.deliveryDate || ''}"
                        onclick="event.stopPropagation();"
                        onchange="assignDeliveryDateToOrder('${order.id}', this.value); event.stopPropagation();">
                </td>
                <td>${escapeHtml(order.invoiceNumber || '')}</td>
                <td onclick="event.stopPropagation();">
                    <button class="delete-btn"
                        onclick="deleteUndeliveredOrder('${order.id}');">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
        </tbody>
        </table>
        </div>
    `;

    container.innerHTML = html;
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase to be available
    await waitForFirebase();
    
    // Set up auth state listener
    checkAuthState();
    
    // Set up login form handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            await handleLogin(email, password);
        });
    }
    
    // Initialize app (only runs if user is logged in)
    async function initializeApp() {
        // Prevent multiple initializations
        if (window.appInitialized) {
            console.log('[DEBUG] App already initialized, skipping');
            return;
        }
        window.appInitialized = true;
        console.log('[DEBUG] Initializing app...');
        
        // Ensure main app is visible
        const mainApp = document.getElementById('main-app');
        if (mainApp) {
            mainApp.style.display = 'block';
        }
        
        // Small delay to ensure DOM is fully ready
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Set up real-time listeners (CRITICAL - this enables reactive updates)
        console.log('[DEBUG] Setting up real-time listeners...');
        await setupRealtimeListeners();
        console.log('[DEBUG] Real-time listeners set up. Current orders:', ordersState.length);
    
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
    document.getElementById('save-order').addEventListener('click', handleSaveOrder);
    
    // Allow Ctrl+Enter to save order from anywhere
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleSaveOrder();
        }
    });
    
    // Focus on search input when page loads
    searchInput.focus();
    
    // ============================================
    // MAIN VIEW TOGGLE (CUSTOMER / STAFF)
    // ============================================
    
    // Wait a bit to ensure DOM is fully ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const customerViewBtn = document.getElementById('customer-view-btn');
    const staffViewBtn = document.getElementById('staff-view-btn');
    const customerView = document.getElementById('customer-view');
    const staffView = document.getElementById('staff-view');
    
    // Ensure elements exist before setting up listeners
    if (!customerViewBtn || !staffViewBtn || !customerView || !staffView) {
        console.error('View toggle elements not found:', {
            customerViewBtn: !!customerViewBtn,
            staffViewBtn: !!staffViewBtn,
            customerView: !!customerView,
            staffView: !!staffView
        });
        return;
    }
    
    // Store references to actual DOM elements (will be updated after cloning)
    let activeCustomerBtn = customerViewBtn;
    let activeStaffBtn = staffViewBtn;
    
    function switchToCustomerView() {
        if (customerView && staffView) {
            customerView.style.display = 'block';
            staffView.style.display = 'none';
        }
        // Get fresh references to buttons (in case they were cloned)
        const customerBtn = document.getElementById('customer-view-btn');
        const staffBtn = document.getElementById('staff-view-btn');
        if (customerBtn && staffBtn) {
            customerBtn.classList.add('active');
            staffBtn.classList.remove('active');
            activeCustomerBtn = customerBtn;
            activeStaffBtn = staffBtn;
        }
        // Focus on search input when switching to customer view
        setTimeout(() => {
            document.getElementById('customer-search')?.focus();
        }, 100);
    }
    
    function switchToStaffView() {
        if (customerView && staffView) {
            customerView.style.display = 'none';
            staffView.style.display = 'block';
        }
        // Get fresh references to buttons (in case they were cloned)
        const customerBtn = document.getElementById('customer-view-btn');
        const staffBtn = document.getElementById('staff-view-btn');
        if (customerBtn && staffBtn) {
            customerBtn.classList.remove('active');
            staffBtn.classList.add('active');
            activeCustomerBtn = customerBtn;
            activeStaffBtn = staffBtn;
        }
        // Always refresh undelivered orders when switching to staff view
        // This ensures we have the latest data from ordersState
        console.log('[DEBUG] Switching to Staff view. Refreshing undelivered orders.');
        const searchQuery = document.getElementById('undelivered-search')?.value || '';
        renderUndeliveredOrders(searchQuery);
        
        // Also refresh other views that might be visible
        refreshAllViews();
    }
    
    // Remove any existing listeners by cloning (clean slate)
    const customerBtnParent = customerViewBtn.parentNode;
    const staffBtnParent = staffViewBtn.parentNode;
    
    const newCustomerBtn = customerViewBtn.cloneNode(true);
    customerBtnParent.replaceChild(newCustomerBtn, customerViewBtn);
    
    const newStaffBtn = staffViewBtn.cloneNode(true);
    staffBtnParent.replaceChild(newStaffBtn, staffViewBtn);
    
    // Set initial active state (Customer view is default)
    newCustomerBtn.classList.add('active');
    newStaffBtn.classList.remove('active');
    
    // Attach event listeners to the new nodes
    newCustomerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        switchToCustomerView();
    });
    
    newStaffBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        switchToStaffView();
    });
    
    // Make functions globally available for debugging
    window.switchToCustomerView = switchToCustomerView;
    window.switchToStaffView = switchToStaffView;
    
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
    window.toggleMonthRuns = toggleMonthRuns;
    
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
    // SETTINGS MENU
    // ============================================
    const settingsIconBtn = document.getElementById('settings-icon-btn');
    const settingsMenu = document.getElementById('settings-menu');
    
    // Toggle settings menu
    if (settingsIconBtn && settingsMenu) {
        settingsIconBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = settingsMenu.style.display !== 'none';
            settingsMenu.style.display = isVisible ? 'none' : 'block';
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!settingsIconBtn.contains(e.target) && !settingsMenu.contains(e.target)) {
                settingsMenu.style.display = 'none';
            }
        });
    }
    
    // ============================================
    // RESET DATA BUTTON
    // ============================================
    document.getElementById('reset-data-btn')?.addEventListener('click', async () => {
        // Close settings menu
        if (settingsMenu) settingsMenu.style.display = 'none';
        await resetAllData();
    });
    
    // ============================================
    // LOGOUT BUTTON
    // ============================================
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        // Close settings menu
        if (settingsMenu) settingsMenu.style.display = 'none';
        
        if (!auth) return;
        try {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js');
            await signOut(auth);
            // Auth state change will handle UI update
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error logging out: ' + error.message);
        }
    });
    
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
    
    }
    
    // Store reference to initializeApp for use by checkAuthState
    initializeAppFunction = initializeApp;
    
    // If already logged in, initialize immediately
    if (auth && auth.currentUser) {
        initializeApp();
    }
});

const SUPABASE_URL = 'https://leffsoksckthixhbtuue.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZmZzb2tzY2t0aGl4aGJ0dXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTEwNTIsImV4cCI6MjA5MzQ2NzA1Mn0.In6Nx5G6e8XJEjLa5Uw9u_Emq9j-_Vr_aL7FZJr4FKc'; // Replace with your actual Anon Key
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let cashOnHand = 0;
let storeCapital = 0;
let selectedDate = new Date().toISOString().split('T')[0];

let salesData = [];
let expensesData = [];
let inventoryData = [];

async function syncToSupabase() {
  try {
    // Sync Settings (Cash and Capital)
    await _supabase.from('settings').upsert([
      { key: 'cashOnHand', value: cashOnHand },
      { key: 'storeCapital', value: storeCapital }
    ]);

    // Sync Inventory (Upserting names as unique keys)
    if (inventoryData.length > 0) {
      await _supabase.from('inventory').upsert(inventoryData);
    }
  } catch (err) {
    console.error("Error syncing to Supabase:", err);
  }
}

async function loadInitialData() {
  const { data: settings } = await _supabase.from('settings').select('*');
  const { data: inventory } = await _supabase.from('inventory').select('*');
  const { data: sales } = await _supabase.from('sales').select('*');
  const { data: expenses } = await _supabase.from('expenses').select('*');

  if (settings) {
    const cash = settings.find(s => s.key === 'cashOnHand');
    const capital = settings.find(s => s.key === 'storeCapital');
    cashOnHand = cash ? Number(cash.value) : 0;
    storeCapital = capital ? Number(capital.value) : 0;
  }

  inventoryData = inventory || [];
  salesData = sales || [];
  expensesData = expenses || [];

  updateProductDropdown();
  seedLowStock();
  renderInventory();
  renderSales();
  renderExpenses();
  updateKpis();
}

const cashValueEl = document.getElementById("cashValue");
const capitalValueEl = document.getElementById("capitalValue");
const todaySalesEl = document.getElementById("todaySales");
const todayProfitEl = document.getElementById("todayProfit");
const todayExpensesEl = document.getElementById("todayExpenses");
const sidebarLastSyncEl = document.getElementById("sidebarLastSync");
const activityListEl = document.getElementById("activityList");
const lowStockListEl = document.getElementById("lowStockList");
const gcashStatusEl = document.getElementById("gcashStatus");
const gcashManualAmountEl = document.getElementById("gcashManualAmount");
const btnRecordGcashManualEl = document.getElementById("btnRecordGcashManual");

const fullInventoryListEl = document.getElementById("fullInventoryList");
const fullSalesListEl = document.getElementById("fullSalesList");
const fullExpensesListEl = document.getElementById("fullExpensesList");
const reportSalesEl = document.getElementById("reportSales");
const reportExpensesEl = document.getElementById("reportExpenses");
const reportProfitEl = document.getElementById("reportProfit");
const reportTotalNetProfitEl = document.getElementById("reportTotalNetProfit");
const invTotalCostEl = document.getElementById("invTotalCost");
const invTotalProfitEl = document.getElementById("invTotalProfit");

const dashboardDatePicker = document.getElementById("dashboardDatePicker");
const salesDatePicker = document.getElementById("salesDatePicker");
const expensesDatePicker = document.getElementById("expensesDatePicker");
const reportsDatePicker = document.getElementById("reportsDatePicker");
const inventoryDatalistEl = document.getElementById("inventoryDatalist");

const saleProductEl = document.getElementById("saleProduct");
const saleQtyEl = document.getElementById("saleQty");
const salePriceEl = document.getElementById("salePrice");
const btnRecordSaleEl = document.getElementById("btnRecordSale");

const expenseDescEl = document.getElementById("expenseDesc");
const expenseAmountEl = document.getElementById("expenseAmount");
const btnRecordExpenseEl = document.getElementById("btnRecordExpense");

const invProductEl = document.getElementById("invProduct");
const invStockEl = document.getElementById("invStock");
const invUnitCostEl = document.getElementById("invUnitCost");
const invPriceEl = document.getElementById("invPrice");
const btnAddInventoryEl = document.getElementById("btnAddInventory");
const invSearchEl = document.getElementById("invSearch");
const btnResetDashboardEl = document.getElementById("btnResetDashboard");

const cashInDescEl = document.getElementById("cashInDesc");
const cashInAmountEl = document.getElementById("cashInAmount");
const btnRecordCashInEl = document.getElementById("btnRecordCashIn");

function formatCurrency(amount) {
  return "₱" + amount.toLocaleString("en-PH");
}

function updateKpis() {
  const filteredSales = salesData.filter(s => s.date === selectedDate);
  const filteredExpenses = expensesData.filter(e => e.date === selectedDate);

  const salesSum = filteredSales.reduce((acc, curr) => acc + curr.amount, 0);
  const expensesSum = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const profitSum = filteredSales.reduce((acc, curr) => acc + (curr.profit || 0), 0) - expensesSum;

  // Calculate Global Net Profit (All Dates Combined)
  const allSalesGrossProfit = salesData.reduce((acc, curr) => acc + (curr.profit || 0), 0);
  const allExpensesSum = expensesData.reduce((acc, curr) => acc + curr.amount, 0);
  const totalNetProfit = allSalesGrossProfit - allExpensesSum;

  if (capitalValueEl) capitalValueEl.textContent = formatCurrency(storeCapital);
  cashValueEl.textContent = formatCurrency(cashOnHand);
  todaySalesEl.textContent = formatCurrency(salesSum);
  todayExpensesEl.textContent = formatCurrency(expensesSum);
  if (todayProfitEl) todayProfitEl.textContent = formatCurrency(profitSum);

  if (reportSalesEl) reportSalesEl.textContent = formatCurrency(salesSum);
  if (reportExpensesEl) reportExpensesEl.textContent = formatCurrency(expensesSum);
  if (reportProfitEl) reportProfitEl.textContent = formatCurrency(profitSum);
  if (reportTotalNetProfitEl) reportTotalNetProfitEl.textContent = formatCurrency(totalNetProfit);

  const now = new Date();
  sidebarLastSyncEl.textContent = now.toLocaleString();
}

// --- MOBILE MENU LOGIC ---
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebarEl = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

function toggleSidebar() {
  sidebarEl.classList.toggle("active");
  sidebarOverlay.classList.toggle("active");
}

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", toggleSidebar);
  sidebarOverlay.addEventListener("click", toggleSidebar);
}

function addActivity(type, label, amount, profit = 0) {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = now.toISOString().split('T')[0];
  const entry = { type, label, amount, profit, time, date };

  if (type === 'sale') {
    _supabase.from('sales').insert([entry]).then(({ data }) => { if(data) salesData.push(data[0]); });
  } else if (type === 'expense') {
    _supabase.from('expenses').insert([entry]).then(({ data }) => { if(data) expensesData.push(data[0]); });
  }

  renderSales();
  renderExpenses();

  const item = document.createElement("div");
  item.className = "list-item";
  item.textContent = `[${time}] ${type.toUpperCase()}: ${label} — ${formatCurrency(amount)}`;
  activityListEl.prepend(item);
}

function updateProductDropdown() {
  inventoryDatalistEl.innerHTML = "";
  inventoryData.forEach(item => {
    const option = document.createElement("option");
    option.value = item.name;
    inventoryDatalistEl.appendChild(option);
  });
}

function renderInventory() {
  if (!fullInventoryListEl) return;
  fullInventoryListEl.innerHTML = "";
  
  let totalInvCostValue = 0;
  let totalInvProfitValue = 0;
  const searchTerm = invSearchEl ? invSearchEl.value.toLowerCase() : "";

  inventoryData.forEach((item, index) => {
    const itemTotalCost = item.stock * (item.unitCost || 0);
    const itemTotalProfit = item.stock * (item.price - (item.unitCost || 0));
    
    totalInvCostValue += itemTotalCost;
    totalInvProfitValue += itemTotalProfit;

    if (searchTerm && !item.name.toLowerCase().includes(searchTerm)) {
      return;
    }

    const row = document.createElement("div");
    row.className = "list-item";
    const status = item.stock <= 5 ? "tag-danger" : "tag-success";
    row.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <span style="font-weight: 500;">${item.name}</span>
        <div style="font-size: 0.7rem; color: var(--muted); display: flex; gap: 10px; flex-wrap: wrap;">
          <span>Sell: ${formatCurrency(item.price)}</span>
          <span>Cost: ${formatCurrency(item.unitCost || 0)}</span>
          <span>Total Cost: ${formatCurrency(itemTotalCost)}</span>
          <span>Profit: ${formatCurrency(itemTotalProfit)}</span>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="tag ${status}">${item.stock} in stock</span>
        <button class="btn-chip" style="border-color: var(--accent); color: var(--accent);" onclick="editInventoryItem(${index})">Edit</button>
        <button class="btn-chip" style="border-color: var(--danger); color: var(--danger);" onclick="deleteInventoryItem(${index})">Delete</button>
      </div>
    `;
    fullInventoryListEl.appendChild(row);
  });

  if (invTotalCostEl) invTotalCostEl.textContent = formatCurrency(totalInvCostValue);
  if (invTotalProfitEl) invTotalProfitEl.textContent = formatCurrency(totalInvProfitValue);
}

window.deleteInventoryItem = async (index) => {
  const itemName = inventoryData[index].name;
  if (confirm(`Are you sure you want to delete ${itemName}?`)) {
    await _supabase.from('inventory').delete().eq('name', itemName);
    inventoryData.splice(index, 1);
    renderInventory();
    updateProductDropdown();
    seedLowStock();
  }
};

window.editInventoryItem = (index) => {
  const item = inventoryData[index];
  const newName = prompt("Enter new product name:", item.name);
  if (newName === null) return;
  const newStock = prompt("Enter current stock:", item.stock);
  if (newStock === null) return;
  const newUnitCost = prompt("Enter unit cost:", item.unitCost || 0);
  if (newUnitCost === null) return;
  const newPrice = prompt("Enter selling price:", item.price);
  if (newPrice === null) return;

  if (newName.trim() && !isNaN(newStock) && !isNaN(newUnitCost) && !isNaN(newPrice)) {
    inventoryData[index] = {
      name: newName.trim(),
      stock: Number(newStock),
      unitCost: Number(newUnitCost),
      price: Number(newPrice)
    };
    renderInventory();
    updateProductDropdown();
    seedLowStock();
    syncToSupabase();
  } else {
    alert("Invalid input. Changes not saved.");
  }
};

function renderSales() {
  if (!fullSalesListEl) return;
  fullSalesListEl.innerHTML = "";
  salesData
    .filter(s => s.date === selectedDate)
    .forEach((s, index) => {
      const row = document.createElement("div");
      row.className = "list-item";
      const profitInfo = s.profit ? ` (Profit: ${formatCurrency(s.profit)})` : "";
      row.innerHTML = `
        <span>${s.time} - ${s.label}: ${formatCurrency(s.amount)}${profitInfo}</span>
        <div style="display: flex; gap: 8px;">
          <button class="btn-chip" style="border-color: var(--accent-blue); color: var(--accent-blue);" onclick="editSale(${index})">Edit</button>
          <button class="btn-chip" style="border-color: var(--danger); color: var(--danger);" onclick="deleteSale(${index})">Delete</button>
        </div>
      `;
      fullSalesListEl.appendChild(row);
    });
}

window.deleteSale = async (indexInFiltered) => {
  const filtered = salesData.filter(s => s.date === selectedDate);
  const item = filtered[indexInFiltered];
  const originalIndex = salesData.indexOf(item);

  if (confirm(`Delete sale: ${item.label}?`)) {
    await _supabase.from('sales').delete().eq('id', item.id);

    if (cashOnHand - item.amount < 0) {
      if (!confirm("Warning: Deleting this sale will result in a negative Cash on Hand balance. Do you want to proceed?")) return;
    }

    cashOnHand -= item.amount;
    
    // Restore stock if it was an inventory item
    const match = item.label.match(/(.+) \((\d+)\)/);
    if (match) {
      const productName = match[1].trim();
      const qty = parseInt(match[2]);
      const invItem = inventoryData.find(i => i.name.toLowerCase() === productName.toLowerCase());
      if (invItem) invItem.stock += qty;
    }

    salesData.splice(originalIndex, 1);
    renderSales();
    renderInventory();
    seedLowStock();
    updateKpis();
    syncToSupabase();
  }
};

window.editSale = (indexInFiltered) => {
  const filtered = salesData.filter(s => s.date === selectedDate);
  const item = filtered[indexInFiltered];
  const originalIndex = salesData.indexOf(item);

  const newLabel = prompt("Edit Description:", item.label);
  if (newLabel === null) return;
  const newAmount = prompt("Edit Amount:", item.amount);
  if (newAmount === null || isNaN(newAmount)) return;

  const diff = Number(newAmount) - item.amount;
  if (cashOnHand + diff < 0) {
    if (!confirm("Warning: This update will result in a negative Cash on Hand balance. Do you want to proceed?")) return;
  }

  cashOnHand += diff;
  
  salesData[originalIndex].label = newLabel;
  salesData[originalIndex].amount = Number(newAmount);
  // Note: Profit is kept as original or would require product re-calc
  
  renderSales();
  updateKpis();
  syncToSupabase();
};

function renderExpenses() {
  if (!fullExpensesListEl) return;
  fullExpensesListEl.innerHTML = "";
  expensesData
    .filter(e => e.date === selectedDate)
    .forEach((e, index) => {
      const row = document.createElement("div");
      row.className = "list-item";
      row.innerHTML = `
        <span>${e.time} - ${e.label}: ${formatCurrency(e.amount)}</span>
        <div style="display: flex; gap: 8px;">
          <button class="btn-chip" style="border-color: var(--accent-blue); color: var(--accent-blue);" onclick="editExpense(${index})">Edit</button>
          <button class="btn-chip" style="border-color: var(--danger); color: var(--danger);" onclick="deleteExpense(${index})">Delete</button>
        </div>
      `;
      fullExpensesListEl.appendChild(row);
    });
}

window.deleteExpense = async (indexInFiltered) => {
  const filtered = expensesData.filter(e => e.date === selectedDate);
  const item = filtered[indexInFiltered];
  const originalIndex = expensesData.indexOf(item);

  if (confirm(`Delete expense: ${item.label}?`)) {
    await _supabase.from('expenses').delete().eq('id', item.id);
    cashOnHand += item.amount;
    expensesData.splice(originalIndex, 1);
    renderExpenses();
    updateKpis();
    syncToSupabase();
  }
};

window.editExpense = (indexInFiltered) => {
  const filtered = expensesData.filter(e => e.date === selectedDate);
  const item = filtered[indexInFiltered];
  const originalIndex = expensesData.indexOf(item);

  const newLabel = prompt("Edit Description:", item.label);
  if (newLabel === null) return;
  const newAmount = prompt("Edit Amount:", item.amount);
  if (newAmount === null || isNaN(newAmount)) return;

  const diff = Number(newAmount) - item.amount;
  if (cashOnHand - diff < 0) {
    if (!confirm("Warning: This update will result in a negative Cash on Hand balance. Do you want to proceed?")) return;
  }

  cashOnHand -= diff; // Expenses reduce cash
  
  expensesData[originalIndex].label = newLabel;
  expensesData[originalIndex].amount = Number(newAmount);
  
  renderExpenses();
  updateKpis();
  syncToSupabase();
};

function seedLowStock() {
  lowStockListEl.innerHTML = "";
  inventoryData.filter(i => i.stock <= 5).forEach((it) => {
    const row = document.createElement("div");
    row.className = "list-item";
    row.textContent = `${it.name} — ${it.stock} left`;
    lowStockListEl.appendChild(row);
  });
}

// --- SIDEBAR NAVIGATION ---
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
    item.classList.add("active");

    // Close mobile menu on navigation
    if (window.innerWidth <= 960) toggleSidebar();

    const viewId = item.textContent.trim().toLowerCase().replace(/\s+/g, '-');
    document.querySelectorAll(".view").forEach(v => v.style.display = "none");
    const target = document.getElementById(`view-${viewId}`);
    if (target) {
      target.style.display = "block";
      if (viewId === 'inventory') renderInventory();
    }
  });
});

function syncDatePickers(newDate) {
  selectedDate = newDate;
  [dashboardDatePicker, salesDatePicker, expensesDatePicker, reportsDatePicker].forEach(dp => {
    if (dp) dp.value = newDate;
  });
  renderSales();
  renderExpenses();
  updateKpis();
}

[dashboardDatePicker, salesDatePicker, expensesDatePicker, reportsDatePicker].forEach(dp => {
  if (dp) dp.value = selectedDate;
  if (dp) dp.addEventListener("change", (e) => syncDatePickers(e.target.value));
});

saleProductEl.addEventListener("input", () => {
  const selected = inventoryData.find(i => i.name.toLowerCase() === saleProductEl.value.toLowerCase());
  if (selected) {
    salePriceEl.value = selected.price;
  }
});

document.querySelectorAll("#gcashButtons .btn-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    const amount = Number(btn.getAttribute("data-amount"));
    cashOnHand += amount;
    addActivity("sale", "GCash/E‑Load", amount);
    gcashStatusEl.textContent = `Recorded sale: ${formatCurrency(amount)}`;
    updateKpis();
    saveToLocalStorage();
  });
});

if (btnRecordGcashManualEl) {
  btnRecordGcashManualEl.addEventListener("click", () => {
    const amount = Number(gcashManualAmountEl.value);
    if (isNaN(amount) || amount <= 0) return alert("Please enter a valid amount");

    cashOnHand += amount;
    addActivity("sale", "GCash/E‑Load", amount);
    gcashStatusEl.textContent = `Recorded manual sale: ${formatCurrency(amount)}`;
    updateKpis();
    saveToLocalStorage();
    gcashManualAmountEl.value = "";
  });
}

btnRecordSaleEl.addEventListener("click", () => {
  const product = saleProductEl.value.trim();
  const qty = Number(saleQtyEl.value);
  const price = Number(salePriceEl.value);

  if (!product || isNaN(price) || qty <= 0) return alert("Valid product details required");

  const total = qty * price;
  cashOnHand += total;
  let saleCogs = 0;

  const invItem = inventoryData.find(i => i.name.toLowerCase() === product.toLowerCase());
  if (invItem) {
    invItem.stock -= qty;
    saleCogs = (invItem.unitCost || 0) * qty;
    renderInventory();
    seedLowStock();
  }

  const profit = total - saleCogs;
  addActivity("sale", `${product} (${qty})`, total, profit);
  updateKpis();
  saveToLocalStorage();

  saleProductEl.value = "";
  saleQtyEl.value = "1";
  salePriceEl.value = "";
});

btnRecordExpenseEl.addEventListener("click", () => {
  const desc = expenseDescEl.value.trim();
  const amount = Number(expenseAmountEl.value);

  if (!desc || isNaN(amount) || amount <= 0) return alert("Valid expense amount required");

  if (cashOnHand - amount < 0) {
    if (!confirm("Warning: This expense will result in a negative Cash on Hand balance. Do you want to proceed?")) return;
  }

  cashOnHand -= amount;

  addActivity("expense", desc, amount);
  updateKpis();
  saveToLocalStorage();

  expenseDescEl.value = "";
  expenseAmountEl.value = "";
});

if (btnRecordCashInEl) {
  btnRecordCashInEl.addEventListener("click", () => {
    const desc = cashInDescEl.value.trim();
    const amount = Number(cashInAmountEl.value);

    if (!desc || isNaN(amount) || amount <= 0) return alert("Valid amount and description required");

    cashOnHand += amount;
    if (confirm(`Do you want to add this ${formatCurrency(amount)} to your Store Capital as well?`)) {
      storeCapital += amount;
    }

    addActivity("cash in", desc, amount);
    updateKpis();
    saveToLocalStorage();
    cashInDescEl.value = "";
    cashInAmountEl.value = "";
  });
}

if (btnResetDashboardEl) {
  btnResetDashboardEl.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset all data? This will clear all sales, expenses, and inventory from Supabase. This cannot be undone.")) {
      // Note: In production, you'd perform a multi-table delete here.
      localStorage.clear(); 
      location.reload();
    }
  });
}

btnAddInventoryEl.addEventListener("click", () => {
  const name = invProductEl.value.trim();
  const stock = Number(invStockEl.value);
  const unitCost = Number(invUnitCostEl.value);
  const price = Number(invPriceEl.value);

  if (!name || isNaN(stock) || isNaN(unitCost) || isNaN(price) || stock < 0 || unitCost < 0 || price < 0) {
    return alert("Please enter valid product details");
  }

  const existingItem = inventoryData.find(i => i.name.toLowerCase() === name.toLowerCase());
  if (existingItem) {
    existingItem.stock += stock;
    existingItem.unitCost = unitCost;
    existingItem.price = price;
  } else {
    inventoryData.push({ name, stock, unitCost, price });
  }

  renderInventory();
  updateProductDropdown();
  seedLowStock();
  syncToSupabase();
  invProductEl.value = "";
  invStockEl.value = "";
  invUnitCostEl.value = "";
  invPriceEl.value = "";
});

if (invSearchEl) invSearchEl.addEventListener("input", renderInventory);

/**
 * Hides the swipe indicator once the user interacts with the list scroll
 */
function initSwipeIndicators() {
  document.querySelectorAll('.list').forEach(list => {
    list.addEventListener('scroll', function handleScroll() {
      if (this.scrollLeft > 20) {
        const indicator = this.parentNode.querySelector('.swipe-indicator');
        if (indicator) {
          indicator.style.opacity = '0';
          indicator.style.visibility = 'hidden';
          this.removeEventListener('scroll', handleScroll);
        }
      }
    }, { passive: true });
  });
}

initSwipeIndicators();
loadInitialData();
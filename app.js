// Application State
let rawDataset = [];
let filteredDataset = [];
let activeTab = 'overview';

// Filter State
let filterState = {
    startDate: '',
    endDate: '',
    region: 'All',
    category: 'All'
};

// Chart Instances (to destroy/recreate on update)
let charts = {
    salesTrend: null,
    profitVsSales: null,
    salesByCategory: null,
    salesByRegion: null,
    topProducts: null,
    monthlySalesGrowth: null,
    customerSegments: null,
    repeatCustomers: null,
    productCategoryShare: null
};

// Colors matching our CSS variable definitions
const THEME_COLORS = {
    blue: '#2b6cb0',
    blueLight: '#4299e1',
    teal: '#319795',
    tealLight: '#4fd1c5',
    purple: '#805ad5',
    purpleLight: '#b794f4',
    slate: '#4a5568',
    slateLight: '#718096',
    gridLines: '#e2e8f0',
    colorsList: ['#2b6cb0', '#319795', '#805ad5', '#dd6b20', '#38a169', '#e53e3e', '#d69e2e', '#3182ce']
};

document.addEventListener('DOMContentLoaded', () => {
    init();
});

// Initialize Dashboard
async function init() {
    try {
        updateDataStatus('Fetching dataset...', true);
        const response = await fetch('sales_data.csv');
        if (!response.ok) {
            throw new Error(`Failed to load sales_data.csv: ${response.statusText}`);
        }
        const csvText = await response.text();
        updateDataStatus('Parsing CSV...', true);
        
        rawDataset = parseCSV(csvText);
        
        if (rawDataset.length === 0) {
            throw new Error('Parsed dataset is empty. Check sales_data.csv format.');
        }

        updateDataStatus('Dataset Loaded', false);
        
        // Find Date Limits for Slicers
        const dates = rawDataset.map(d => new Date(d.Order_Date));
        const minDate = new Date(Math.min.apply(null, dates));
        const maxDate = new Date(Math.max.apply(null, dates));
        
        const minDateStr = formatDate(minDate);
        const maxDateStr = formatDate(maxDate);

        // Configure Date Slicers Limits and Default Values
        const startInput = document.getElementById('filter-date-start');
        const endInput = document.getElementById('filter-date-end');
        
        startInput.min = minDateStr;
        startInput.max = maxDateStr;
        startInput.value = minDateStr;
        
        endInput.min = minDateStr;
        endInput.max = maxDateStr;
        endInput.value = maxDateStr;
        
        filterState.startDate = minDateStr;
        filterState.endDate = maxDateStr;

        // Configure Chart.js Defaults
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.font.size = 11;
        Chart.defaults.color = '#4a5568';
        Chart.defaults.responsive = true;
        Chart.defaults.maintainAspectRatio = false;

        bindEvents();
        updateDashboard();
        
    } catch (error) {
        console.error(error);
        updateDataStatus(`Error: ${error.message}`, false);
        
        // Show a modal overlay on the page guiding how to run a local server
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(26, 32, 44, 0.95)';
        overlay.style.color = '#ffffff';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.padding = '40px';
        overlay.style.textAlign = 'center';
        overlay.style.fontFamily = "'Inter', sans-serif";
        
        overlay.innerHTML = `
            <div style="max-width: 600px; background: #ffffff; color: #2d3748; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.25); text-align: center;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 50px; color: #dd6b20; margin-bottom: 20px;"></i>
                <h2 style="margin-bottom: 15px; color: #1a365d; font-size: 20px;">Local Web Server Required (CORS Restriction)</h2>
                <p style="margin-bottom: 20px; font-size: 13.5px; line-height: 1.6; text-align: left; color: #4a5568;">
                    Modern browsers restrict scripts from loading local files (such as <code>sales_data.csv</code>) directly from your hard drive via <code>file://</code> URLs for security reasons.
                </p>
                <div style="background: #f7fafc; padding: 18px; border-radius: 8px; margin-bottom: 25px; text-align: left; font-size: 13px; border: 1px solid #e2e8f0; color: #2d3748;">
                    <strong style="color: #1a365d;">To view this dashboard instantly, try one of these options:</strong>
                    <ul style="margin-top: 10px; margin-left: 20px; padding-left: 0; line-height: 1.7; list-style-type: disc;">
                        <li>Open the directory in VS Code and click <strong>Go Live</strong> in the status bar (requires the <em>Live Server</em> extension).</li>
                        <li>Or run a web server in a terminal inside this directory: <br><code style="background: #edf2f7; padding: 2px 5px; border-radius: 4px; display: inline-block; margin-top: 4px;">python -m http.server 8000</code> or <code style="background: #edf2f7; padding: 2px 5px; border-radius: 4px; display: inline-block; margin-top: 4px;">npx http-server</code>. Then visit <a href="http://localhost:8000" target="_blank" style="color: #2b6cb0; text-decoration: underline; font-weight: 600;">http://localhost:8000</a>.</li>
                        <li>Or review the step-by-step instructions in <code style="background: #edf2f7; padding: 2px 5px; border-radius: 4px;">powerbi_guide.md</code> to load the dataset in Power BI Desktop directly.</li>
                    </ul>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="background: #2b6cb0; color: #ffffff; border: none; padding: 10px 22px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s; font-size: 13px;">Dismiss Warning</button>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}

// Update Status Badge
function updateDataStatus(message, isLoading) {
    const statusText = document.getElementById('data-status');
    statusText.textContent = message;
    
    const dot = document.querySelector('.badge-dot');
    if (isLoading) {
        dot.style.backgroundColor = '#d69e2e'; // Warning color
    } else {
        dot.style.backgroundColor = '#38a169'; // Success color
    }
}

// Simple Robust CSV Parser
function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];
    
    // Header Row
    const headers = lines[0].replace(/"/g, '').trim().split(',');
    const results = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple regex to parse CSV taking into account possible quotes
        // Since we don't have nested commas in quotes in our PS1 data, simple split works:
        const values = line.split(',').map(v => v.replace(/"/g, '').trim());
        if (values.length !== headers.length) continue;
        
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index];
        });
        
        // Data Types Conversion
        row.Quantity = parseInt(row.Quantity, 10) || 0;
        row.Sales_Amount = parseFloat(row.Sales_Amount) || 0.0;
        row.Profit = parseFloat(row.Profit) || 0.0;
        
        results.push(row);
    }
    return results;
}

// Bind Page Interactions and Slicers
function bindEvents() {
    // Slicer Inputs
    document.getElementById('filter-date-start').addEventListener('change', (e) => {
        filterState.startDate = e.target.value;
        updateDashboard();
    });
    
    document.getElementById('filter-date-end').addEventListener('change', (e) => {
        filterState.endDate = e.target.value;
        updateDashboard();
    });
    
    document.getElementById('filter-region').addEventListener('change', (e) => {
        filterState.region = e.target.value;
        updateDashboard();
    });
    
    document.getElementById('filter-category').addEventListener('change', (e) => {
        filterState.category = e.target.value;
        updateDashboard();
    });

    // Reset Filters Button
    document.getElementById('btn-reset-filters').addEventListener('click', () => {
        const dates = rawDataset.map(d => new Date(d.Order_Date));
        const minDateStr = formatDate(new Date(Math.min.apply(null, dates)));
        const maxDateStr = formatDate(new Date(Math.max.apply(null, dates)));
        
        document.getElementById('filter-date-start').value = minDateStr;
        document.getElementById('filter-date-end').value = maxDateStr;
        document.getElementById('filter-region').value = 'All';
        document.getElementById('filter-category').value = 'All';
        
        filterState = {
            startDate: minDateStr,
            endDate: maxDateStr,
            region: 'All',
            category: 'All'
        };
        
        updateDashboard();
    });

    // Tab Navigation switching
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Hide all tab content
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            
            activeTab = item.getAttribute('data-tab');
            document.getElementById(`tab-${activeTab}`).classList.add('active');
            
            // Re-render visuals for the newly active page
            renderTabVisuals();
        });
    });
}

// Filter dataset and refresh calculations
function updateDashboard() {
    filteredDataset = rawDataset.filter(item => {
        const itemDate = item.Order_Date;
        
        // Date Slicer Filter
        const dateMatch = itemDate >= filterState.startDate && itemDate <= filterState.endDate;
        
        // Region Slicer Filter
        const regionMatch = filterState.region === 'All' || item.Region === filterState.region;
        
        // Category Slicer Filter
        const catMatch = filterState.category === 'All' || item.Category === filterState.category;
        
        return dateMatch && regionMatch && catMatch;
    });

    calculateKPIs();
    renderTabVisuals();
}

// Calculate top metrics card values
function calculateKPIs() {
    let totalSales = 0;
    let totalProfit = 0;
    let orderIds = new Set();
    let customerIds = new Set();

    filteredDataset.forEach(row => {
        totalSales += row.Sales_Amount;
        totalProfit += row.Profit;
        orderIds.add(row.Order_ID);
        customerIds.add(row.Customer_ID);
    });

    const totalOrders = orderIds.size;
    const totalCustomers = customerIds.size;
    
    // Calculate margins
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Render numbers in DOM
    document.getElementById('val-total-sales').textContent = formatCurrency(totalSales);
    document.getElementById('val-total-profit').textContent = formatCurrency(totalProfit);
    document.getElementById('val-total-orders').textContent = totalOrders.toLocaleString();
    document.getElementById('val-total-customers').textContent = totalCustomers.toLocaleString();
    
    document.getElementById('val-profit-margin').textContent = `Margin: ${profitMargin.toFixed(1)}%`;
    document.getElementById('val-avg-order-value').textContent = `AOV: ${formatCurrency(avgOrderValue)}`;
    
    // Style Profit Value color based on positive/negative profit
    const profitValEl = document.getElementById('val-total-profit');
    if (totalProfit < 0) {
        profitValEl.style.color = '#e53e3e'; // red
    } else {
        profitValEl.style.color = 'var(--primary-color)';
    }
}

// Render active tab visualizations
function renderTabVisuals() {
    if (activeTab === 'overview') {
        renderOverviewTab();
    } else if (activeTab === 'sales') {
        renderSalesTab();
    } else if (activeTab === 'customers') {
        renderCustomersTab();
    } else if (activeTab === 'products') {
        renderProductsTab();
    }
}

// Clean previous charts helper
function resetChart(chartName) {
    if (charts[chartName]) {
        charts[chartName].destroy();
        charts[chartName] = null;
    }
}

/* ==========================================
   PAGE 1: OVERVIEW TAB VISUALIZATIONS
   ========================================== */
function renderOverviewTab() {
    resetChart('salesTrend');
    resetChart('profitVsSales');

    // Aggregate data by Month (YYYY-MM)
    const monthlyData = aggregateByMonth(filteredDataset);
    
    // 1. Sales Trend Line Chart
    const ctxTrend = document.getElementById('chart-sales-trend').getContext('2d');
    charts.salesTrend = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: monthlyData.labels,
            datasets: [{
                label: 'Monthly Sales ($)',
                data: monthlyData.sales,
                borderColor: THEME_COLORS.blue,
                backgroundColor: 'rgba(43, 108, 176, 0.08)',
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { display: false } },
                y: { 
                    grid: { color: THEME_COLORS.gridLines },
                    ticks: { callback: value => '$' + formatNumberCompact(value) }
                }
            }
        }
    });

    // 2. Profit vs. Sales Column-Line Chart
    const ctxProfitSales = document.getElementById('chart-profit-vs-sales').getContext('2d');
    charts.profitVsSales = new Chart(ctxProfitSales, {
        type: 'bar',
        data: {
            labels: monthlyData.labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Sales',
                    data: monthlyData.sales,
                    backgroundColor: 'rgba(43, 108, 176, 0.7)',
                    borderColor: THEME_COLORS.blue,
                    borderWidth: 1,
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Profit Margin (%)',
                    data: monthlyData.margins,
                    borderColor: THEME_COLORS.teal,
                    backgroundColor: 'rgba(49, 151, 149, 0.2)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                    yAxisID: 'yPercentage',
                    order: 1
                }
            ]
        },
        options: {
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12 } }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    type: 'linear',
                    position: 'left',
                    grid: { color: THEME_COLORS.gridLines },
                    ticks: { callback: value => '$' + formatNumberCompact(value) },
                    title: { display: true, text: 'Sales Revenue' }
                },
                yPercentage: {
                    type: 'linear',
                    position: 'right',
                    grid: { drawOnChartArea: false }, // don't draw gridlines overlapping left y-axis
                    ticks: { callback: value => value.toFixed(0) + '%' },
                    title: { display: true, text: 'Profit Margin' }
                }
            }
        }
    });
}

/* ==========================================
   PAGE 2: SALES ANALYSIS TAB VISUALIZATIONS
   ========================================== */
function renderSalesTab() {
    resetChart('salesByCategory');
    resetChart('salesByRegion');
    resetChart('topProducts');
    resetChart('monthlySalesGrowth');

    // 1. Sales By Category Bar Chart (Horizontal)
    const catData = aggregateByKey(filteredDataset, 'Category', 'Sales_Amount');
    const ctxCat = document.getElementById('chart-sales-by-category').getContext('2d');
    charts.salesByCategory = new Chart(ctxCat, {
        type: 'bar',
        data: {
            labels: catData.labels,
            datasets: [{
                data: catData.values,
                backgroundColor: [THEME_COLORS.blue, THEME_COLORS.teal, THEME_COLORS.purple],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: { 
                    grid: { color: THEME_COLORS.gridLines },
                    ticks: { callback: value => '$' + formatNumberCompact(value) }
                },
                y: { grid: { display: false } }
            }
        }
    });

    // 2. Sales by Region Clustered Bar
    const regData = aggregateByKey(filteredDataset, 'Region', 'Sales_Amount');
    const ctxReg = document.getElementById('chart-sales-by-region').getContext('2d');
    charts.salesByRegion = new Chart(ctxReg, {
        type: 'bar',
        data: {
            labels: regData.labels,
            datasets: [{
                label: 'Revenue ($)',
                data: regData.values,
                backgroundColor: 'rgba(49, 151, 149, 0.85)',
                borderRadius: 4
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { 
                    grid: { color: THEME_COLORS.gridLines },
                    ticks: { callback: value => '$' + formatNumberCompact(value) }
                }
            }
        }
    });

    // 3. Top 10 Products by Sales
    const prodData = aggregateByKey(filteredDataset, 'Product_Name', 'Sales_Amount');
    // Sort descending and slice top 10
    const sortedProds = prodData.labels.map((lbl, idx) => ({ name: lbl, val: prodData.values[idx] }))
        .sort((a, b) => b.val - a.val)
        .slice(0, 10);

    const ctxProd = document.getElementById('chart-top-products').getContext('2d');
    charts.topProducts = new Chart(ctxProd, {
        type: 'bar',
        data: {
            labels: sortedProds.map(p => p.name.length > 20 ? p.name.substring(0, 18) + '...' : p.name),
            datasets: [{
                data: sortedProds.map(p => p.val),
                backgroundColor: 'rgba(128, 90, 213, 0.8)',
                borderRadius: 4
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } },
                y: { 
                    grid: { color: THEME_COLORS.gridLines },
                    ticks: { callback: value => '$' + formatNumberCompact(value) }
                }
            }
        }
    });

    // 4. Monthly Sales Growth Area Chart (Cumulative sum)
    const monthlyData = aggregateByMonth(filteredDataset);
    let runTotal = 0;
    const cumSales = monthlyData.sales.map(s => {
        runTotal += s;
        return runTotal;
    });

    const ctxGrowth = document.getElementById('chart-monthly-sales-trend').getContext('2d');
    charts.monthlySalesGrowth = new Chart(ctxGrowth, {
        type: 'line',
        data: {
            labels: monthlyData.labels,
            datasets: [{
                label: 'Cumulative Revenue ($)',
                data: cumSales,
                borderColor: '#dd6b20',
                backgroundColor: 'rgba(221, 107, 32, 0.08)',
                fill: true,
                tension: 0.1,
                borderWidth: 2,
                pointRadius: 2
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { 
                    grid: { color: THEME_COLORS.gridLines },
                    ticks: { callback: value => '$' + formatNumberCompact(value) }
                }
            }
        }
    });
}

/* ==========================================
   PAGE 3: CUSTOMER INSIGHTS TAB VISUALIZATIONS
   ========================================== */
function renderCustomersTab() {
    resetChart('customerSegments');
    resetChart('repeatCustomers');

    // Calculate customer metrics
    const custAgg = {};
    filteredDataset.forEach(row => {
        const cid = row.Customer_ID;
        if (!custAgg[cid]) {
            custAgg[cid] = {
                id: cid,
                name: row.Customer_Name,
                orders: new Set(),
                sales: 0,
                profit: 0
            };
        }
        custAgg[cid].orders.add(row.Order_ID);
        custAgg[cid].sales += row.Sales_Amount;
        custAgg[cid].profit += row.Profit;
    });

    const custArray = Object.values(custAgg);

    // Segment Definition: Spend Segment
    // High Value: > $5,000, Medium Value: $2,000 - $5,000, Low Value: < $2,000
    let segmentCounts = { 'High Value': 0, 'Medium Value': 0, 'Low Value': 0 };
    
    // Repeat vs One-Time customers
    let repeatCount = 0;
    let onetimeCount = 0;

    custArray.forEach(c => {
        const orderCount = c.orders.size;
        c.orderCount = orderCount; // add property for tables
        
        // Spend Segmentation
        if (c.sales >= 5000) {
            c.segment = 'High Value';
            segmentCounts['High Value']++;
        } else if (c.sales >= 2000) {
            c.segment = 'Medium Value';
            segmentCounts['Medium Value']++;
        } else {
            c.segment = 'Low Value';
            segmentCounts['Low Value']++;
        }

        // Repeat Classification
        if (orderCount > 1) {
            repeatCount++;
        } else {
            onetimeCount++;
        }
    });

    // Donut Chart: Customer Segments
    const ctxSeg = document.getElementById('chart-customer-segmentation').getContext('2d');
    charts.customerSegments = new Chart(ctxSeg, {
        type: 'doughnut',
        data: {
            labels: ['High Value', 'Medium Value', 'Low Value'],
            datasets: [{
                data: [segmentCounts['High Value'], segmentCounts['Medium Value'], segmentCounts['Low Value']],
                backgroundColor: [THEME_COLORS.teal, THEME_COLORS.blue, THEME_COLORS.purple],
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            plugins: {
                legend: { display: false } // Custom legend is in HTML
            },
            cutout: '65%'
        }
    });

    // Pie Chart: Repeat vs One-Time Customers
    const ctxRep = document.getElementById('chart-repeat-vs-onetime').getContext('2d');
    charts.repeatCustomers = new Chart(ctxRep, {
        type: 'pie',
        data: {
            labels: ['Repeat (2+ Orders)', 'One-Time (1 Order)'],
            datasets: [{
                data: [repeatCount, onetimeCount],
                backgroundColor: ['#2b6cb0', '#cbd5e0'],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12 } }
            }
        }
    });

    // Render Top Customers Table
    const topCustomers = custArray
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10); // Rank top 10

    const tbody = document.getElementById('table-top-customers').querySelector('tbody');
    tbody.innerHTML = ''; // reset

    topCustomers.forEach((c, idx) => {
        let tagClass = 'tag-low';
        if (c.segment === 'High Value') tagClass = 'tag-high';
        else if (c.segment === 'Medium Value') tagClass = 'tag-med';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${idx + 1}</strong></td>
            <td>${c.id}</td>
            <td>${c.name}</td>
            <td>${c.orderCount}</td>
            <td><strong>${formatCurrency(c.sales)}</strong></td>
            <td>${formatCurrency(c.profit)}</td>
            <td><span class="segment-tag ${tagClass}">${c.segment}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

/* ==========================================
   PAGE 4: PRODUCT PERFORMANCE TAB VISUALIZATIONS
   ========================================== */
function renderProductsTab() {
    resetChart('productCategoryShare');

    // Aggregate Product Statistics
    const prodStats = {};
    filteredDataset.forEach(row => {
        const pname = row.Product_Name;
        if (!prodStats[pname]) {
            prodStats[pname] = {
                name: pname,
                category: row.Category,
                sales: 0,
                qty: 0,
                profit: 0
            };
        }
        prodStats[pname].sales += row.Sales_Amount;
        prodStats[pname].qty += row.Quantity;
        prodStats[pname].profit += row.Profit;
    });

    const prodArray = Object.values(prodStats);

    // Sort to find Best and Least performing
    const bestProds = [...prodArray].sort((a, b) => b.sales - a.sales).slice(0, 5);
    const worstProds = [...prodArray].sort((a, b) => a.sales - b.sales).slice(0, 5);

    // Populate Best Performing Table
    const tbodyBest = document.getElementById('table-best-products').querySelector('tbody');
    tbodyBest.innerHTML = '';
    bestProds.forEach(p => {
        const margin = p.sales > 0 ? (p.profit / p.sales) * 100 : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.name}</strong></td>
            <td>${p.category}</td>
            <td>${p.qty}</td>
            <td><strong>${formatCurrency(p.sales)}</strong></td>
            <td>${margin.toFixed(1)}%</td>
        `;
        tbodyBest.appendChild(tr);
    });

    // Populate Least Performing Table
    const tbodyWorst = document.getElementById('table-worst-products').querySelector('tbody');
    tbodyWorst.innerHTML = '';
    worstProds.forEach(p => {
        const margin = p.sales > 0 ? (p.profit / p.sales) * 100 : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.name}</strong></td>
            <td>${p.category}</td>
            <td>${p.qty}</td>
            <td><strong>${formatCurrency(p.sales)}</strong></td>
            <td>${margin.toFixed(1)}%</td>
        `;
        tbodyWorst.appendChild(tr);
    });

    // Pie Chart: Product Category Share
    const catData = aggregateByKey(filteredDataset, 'Category', 'Quantity'); // Share based on quantity sold
    const ctxShare = document.getElementById('chart-product-category-share').getContext('2d');
    charts.productCategoryShare = new Chart(ctxShare, {
        type: 'pie',
        data: {
            labels: catData.labels,
            datasets: [{
                data: catData.values,
                backgroundColor: [THEME_COLORS.blue, THEME_COLORS.teal, THEME_COLORS.purple],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12 } }
            }
        }
    });

    // Dynamic Business Insights Text Boxes
    generateInsightsText(prodArray, segmentCountsForInsights());
}

// Local helper to count customer segments for insights
function segmentCountsForInsights() {
    const custAgg = {};
    filteredDataset.forEach(row => {
        const cid = row.Customer_ID;
        if (!custAgg[cid]) custAgg[cid] = 0;
        custAgg[cid] += row.Sales_Amount;
    });
    
    let high = 0, med = 0, low = 0;
    Object.values(custAgg).forEach(sales => {
        if (sales >= 5000) high++;
        else if (sales >= 2000) med++;
        else low++;
    });
    return { 'High Value': high, 'Medium Value': med, 'Low Value': low };
}

// Generate Text Insights dynamically based on Active filter state
function generateInsightsText(prodArray, segmentCounts) {
    if (filteredDataset.length === 0) {
        document.getElementById('ins-best-category').textContent = 'No Data';
        document.getElementById('ins-best-month').textContent = 'No Data';
        document.getElementById('ins-top-segment').textContent = 'No Data';
        document.getElementById('ins-best-region').textContent = 'No Data';
        document.getElementById('ins-summary').textContent = 'Adjust your filter parameters to display data insights.';
        return;
    }

    // 1. Best performing category
    const catSales = aggregateByKey(filteredDataset, 'Category', 'Sales_Amount');
    let maxCatIdx = 0;
    let maxCatVal = 0;
    catSales.values.forEach((v, idx) => {
        if (v > maxCatVal) {
            maxCatVal = v;
            maxCatIdx = idx;
        }
    });
    const bestCategory = catSales.labels[maxCatIdx];
    document.getElementById('ins-best-category').innerHTML = `<strong>${bestCategory}</strong> (${formatCurrency(maxCatVal)} Sales)`;

    // 2. Highest Revenue Month
    const monthlyData = aggregateByMonth(filteredDataset);
    let maxMonthIdx = 0;
    let maxMonthVal = 0;
    monthlyData.sales.forEach((v, idx) => {
        if (v > maxMonthVal) {
            maxMonthVal = v;
            maxMonthIdx = idx;
        }
    });
    const rawMonthLabel = monthlyData.labels[maxMonthIdx]; // YYYY-MM
    const bestMonthName = parseMonthLabel(rawMonthLabel);
    document.getElementById('ins-best-month').innerHTML = `<strong>${bestMonthName}</strong> (${formatCurrency(maxMonthVal)})`;

    // 3. Top Customer Segment
    let topSeg = 'Low Value';
    let maxSegCount = segmentCounts['Low Value'];
    if (segmentCounts['High Value'] > maxSegCount) {
        topSeg = 'High Value';
        maxSegCount = segmentCounts['High Value'];
    }
    if (segmentCounts['Medium Value'] > maxSegCount) {
        topSeg = 'Medium Value';
        maxSegCount = segmentCounts['Medium Value'];
    }
    const totalCusts = segmentCounts['High Value'] + segmentCounts['Medium Value'] + segmentCounts['Low Value'];
    const segPerc = totalCusts > 0 ? (maxSegCount / totalCusts) * 100 : 0;
    document.getElementById('ins-top-segment').innerHTML = `<strong>${topSeg} Customers</strong> (${maxSegCount} accounts, ${segPerc.toFixed(1)}%)`;

    // 4. Region with Highest Sales
    const regSales = aggregateByKey(filteredDataset, 'Region', 'Sales_Amount');
    let maxRegIdx = 0;
    let maxRegVal = 0;
    regSales.values.forEach((v, idx) => {
        if (v > maxRegVal) {
            maxRegVal = v;
            maxRegIdx = idx;
        }
    });
    const bestRegion = regSales.labels[maxRegIdx];
    document.getElementById('ins-best-region').innerHTML = `<strong>${bestRegion} Region</strong> (${formatCurrency(maxRegVal)} Sales)`;

    // 5. Executive Synthesis Summary
    const totalSales = filteredDataset.reduce((sum, r) => sum + r.Sales_Amount, 0);
    const totalProfit = filteredDataset.reduce((sum, r) => sum + r.Profit, 0);
    const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
    
    // Sort products by quantity
    const topProdByQty = [...prodArray].sort((a,b) => b.qty - a.qty)[0];
    const topProdName = topProdByQty ? topProdByQty.name : 'N/A';

    let summaryText = `During the filtered period, the business achieved a total revenue of <strong>${formatCurrency(totalSales)}</strong> with an overall profit margin of <strong>${margin.toFixed(1)}%</strong>. `;
    summaryText += `The <strong>${bestRegion} Region</strong> generated the largest sales share, driven heavily by demand in the <strong>${bestCategory}</strong> category. `;
    summaryText += `Our volume leader was <strong>"${topProdName}"</strong>. `;
    
    // Segment strategy suggestion
    if (topSeg === 'High Value' || topSeg === 'Medium Value') {
        summaryText += `High and Medium value clients form a strong foundation. Loyalty programs should target retaining this core base.`;
    } else {
        summaryText += `Low value accounts dominate by volume; focus should be placed on upselling campaigns to raise average order values.`;
    }

    document.getElementById('ins-summary').innerHTML = summaryText;
}

/* ==========================================
   UTILITY & AGGREGATION FUNCTIONS
   ========================================== */

// Aggregate a numeric value by key
function aggregateByKey(dataset, key, valueField) {
    const sums = {};
    dataset.forEach(row => {
        const k = row[key];
        sums[k] = (sums[k] || 0) + row[valueField];
    });

    const labels = Object.keys(sums);
    const values = Object.values(sums);
    
    return { labels, values };
}

// Aggregate Sales, Profits, and Margin by Month (sorted chronologically)
function aggregateByMonth(dataset) {
    const sums = {};
    dataset.forEach(row => {
        // Order_Date is YYYY-MM-DD, parse YYYY-MM
        const month = row.Order_Date.substring(0, 7);
        if (!sums[month]) {
            sums[month] = { sales: 0, profit: 0 };
        }
        sums[month].sales += row.Sales_Amount;
        sums[month].profit += row.Profit;
    });

    // Sort months chronologically
    const sortedMonths = Object.keys(sums).sort();
    
    const sales = [];
    const margins = [];
    
    sortedMonths.forEach(m => {
        sales.push(sums[m].sales);
        const margin = sums[m].sales > 0 ? (sums[m].profit / sums[m].sales) * 100 : 0;
        margins.push(margin);
    });

    return {
        labels: sortedMonths,
        sales,
        margins
    };
}

// Date formatting
function formatDate(dateObj) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Format "YYYY-MM" to readable "Month YYYY"
function parseMonthLabel(lbl) {
    if (!lbl) return '-';
    const parts = lbl.split('-');
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${monthNames[monthIndex]} ${year}`;
}

// Currency Formatter
function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val);
}

// Compact Number Formatter for axis labels (e.g. 15000 -> 15k)
function formatNumberCompact(val) {
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short'
    }).format(val);
}

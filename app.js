// Global State
let channels = [];
let filteredChannels = [];
let selectedChannels = new Set();
let currentSort = { column: null, direction: 'asc' };

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadInitialData();
    updateUsageMeter();
});

// Event Listeners
function initializeEventListeners() {
    // Filter Actions
    document.getElementById('apply-filters-btn').addEventListener('click', applyFilters);
    document.getElementById('reset-filters-btn').addEventListener('click', resetFilters);
    
    // Multi-Select Dropdowns
    initMultiSelect('country');
    initMultiSelect('category');
    
    // Custom Category
    document.getElementById('add-custom-category-btn').addEventListener('click', addCustomCategory);
    
    // Table Actions
    document.getElementById('select-all-checkbox').addEventListener('change', toggleSelectAll);
    document.getElementById('export-csv-btn').addEventListener('click', exportToCSV);
    
    // Table Sorting
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => sortTable(header.dataset.column));
    });
    
    // Usage Meter Refresh
    document.getElementById('refresh-usage-btn').addEventListener('click', updateUsageMeter);
}

// Multi-Select Dropdown Functionality
function initMultiSelect(type) {
    const display = document.getElementById(`${type}-display`);
    const dropdown = document.getElementById(`${type}-dropdown`);
    const searchInput = document.getElementById(`${type}-search`);
    const checkboxes = dropdown.querySelectorAll('.dropdown-options input[type="checkbox"]');
    
    // Toggle dropdown
    display.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
        display.classList.toggle('active');
        
        // Close other dropdowns
        const otherType = type === 'country' ? 'category' : 'country';
        document.getElementById(`${otherType}-dropdown`).classList.remove('active');
        document.getElementById(`${otherType}-display`).classList.remove('active');
    });
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        checkboxes.forEach(checkbox => {
            const label = checkbox.parentElement;
            const text = label.textContent.toLowerCase();
            label.style.display = text.includes(searchTerm) ? 'flex' : 'none';
        });
    });
    
    // Update display on checkbox change
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => updateMultiSelectDisplay(type));
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!display.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
            display.classList.remove('active');
        }
    });
}

function updateMultiSelectDisplay(type) {
    const display = document.getElementById(`${type}-display`);
    const checkboxes = document.querySelectorAll(`#${type}-dropdown .dropdown-options input[type="checkbox"]:checked`);
    
    if (checkboxes.length === 0) {
        display.innerHTML = `<span class="placeholder">All ${type === 'country' ? 'countries' : 'categories'}</span><i class="fas fa-chevron-down"></i>`;
    } else {
        const selectedItems = Array.from(checkboxes).map(cb => cb.value);
        const itemsHTML = selectedItems.map(item => 
            `<span class="selected-item">${item} <i class="fas fa-times" onclick="removeSelection('${type}', '${item}')"></i></span>`
        ).join('');
        display.innerHTML = `<div class="selected-items">${itemsHTML}</div><i class="fas fa-chevron-down"></i>`;
    }
}

function removeSelection(type, value) {
    const checkbox = document.querySelector(`#${type}-dropdown input[value="${value}"]`);
    if (checkbox) {
        checkbox.checked = false;
        updateMultiSelectDisplay(type);
    }
}

// Custom Category
function addCustomCategory() {
    const searchInput = document.getElementById('category-search');
    const customValue = searchInput.value.trim();
    
    if (!customValue) {
        showToast('Please enter a category name', 'warning');
        return;
    }
    
    // Check if already exists
    const existingCheckbox = document.querySelector(`#category-dropdown input[value="${customValue}"]`);
    if (existingCheckbox) {
        existingCheckbox.checked = true;
        updateMultiSelectDisplay('category');
        searchInput.value = '';
        return;
    }
    
    // Add new checkbox
    const optionsContainer = document.querySelector('#category-dropdown .dropdown-options');
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = customValue;
    checkbox.checked = true;
    checkbox.addEventListener('change', () => updateMultiSelectDisplay('category'));
    
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${customValue}`));
    optionsContainer.appendChild(label);
    
    updateMultiSelectDisplay('category');
    searchInput.value = '';
    showToast(`Custom category "${customValue}" added`, 'success');
}

// Load Initial Data
async function loadInitialData() {
    showLoading(true);
    
    try {
        // Try to fetch from backend
        const response = await fetch(`${API_BASE_URL}/searchChannels`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch from API');
        }
        
        const data = await response.json();
        channels = data.channels || [];
        filteredChannels = [...channels];
        
        renderTable();
        updateUsageMeter();
        showToast('Channels loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading channels:', error);
        
        // Fallback to local data
        try {
            const response = await fetch('./channels.json');
            const data = await response.json();
            channels = data.channels || [];
            filteredChannels = [...channels];
            
            renderTable();
            showToast('Using sample data (backend unavailable)', 'warning');
        } catch (fallbackError) {
            console.error('Error loading fallback data:', fallbackError);
            showToast('Failed to load channel data', 'error');
        }
    } finally {
        showLoading(false);
    }
}

// Apply Filters
async function applyFilters() {
    showLoading(true);
    
    const filters = {
        name: document.getElementById('channel-name').value.trim(),
        countries: getSelectedValues('country'),
        categories: getSelectedValues('category'),
        fromDate: document.getElementById('from-date').value,
        toDate: document.getElementById('to-date').value
    };
    
    try {
        // Build query params
        const params = new URLSearchParams();
        if (filters.name) params.append('name', filters.name);
        if (filters.countries.length > 0) params.append('countries', filters.countries.join(','));
        if (filters.categories.length > 0) params.append('categories', filters.categories.join(','));
        if (filters.fromDate) params.append('fromDate', filters.fromDate);
        if (filters.toDate) params.append('toDate', filters.toDate);
        
        const response = await fetch(`${API_BASE_URL}/searchChannels?${params}`);
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        const data = await response.json();
        channels = data.channels || [];
        filteredChannels = [...channels];
        
        renderTable();
        updateUsageMeter();
        showToast(`Found ${channels.length} channels`, 'success');
    } catch (error) {
        console.error('Error applying filters:', error);
        
        // Client-side filtering fallback
        filteredChannels = channels.filter(channel => {
            if (filters.name && !channel.name.toLowerCase().includes(filters.name.toLowerCase())) {
                return false;
            }
            
            if (filters.countries.length > 0 && !filters.countries.includes(channel.country)) {
                return false;
            }
            
            if (filters.categories.length > 0 && !filters.categories.includes(channel.category)) {
                return false;
            }
            
            if (filters.fromDate || filters.toDate) {
                const uploadDate = new Date(channel.lastUpload);
                if (filters.fromDate && uploadDate < new Date(filters.fromDate)) return false;
                if (filters.toDate && uploadDate > new Date(filters.toDate)) return false;
            }
            
            return true;
        });
        
        renderTable();
        showToast(`Filters applied (${filteredChannels.length} channels found)`, 'info');
    } finally {
        showLoading(false);
    }
}

function getSelectedValues(type) {
    const checkboxes = document.querySelectorAll(`#${type}-dropdown .dropdown-options input[type="checkbox"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

// Reset Filters
function resetFilters() {
    document.getElementById('channel-name').value = '';
    document.getElementById('from-date').value = '';
    document.getElementById('to-date').value = '';
    
    // Uncheck all multi-select options
    document.querySelectorAll('.dropdown-options input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    updateMultiSelectDisplay('country');
    updateMultiSelectDisplay('category');
    
    filteredChannels = [...channels];
    renderTable();
    showToast('Filters reset', 'info');
}

// Render Table
function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    if (filteredChannels.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px; color: var(--gray-500);">
                    <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
                    <p style="font-size: 18px; font-weight: 600;">No channels found</p>
                    <p style="font-size: 14px; margin-top: 8px;">Try adjusting your filters or search criteria</p>
                </td>
            </tr>
        `;
        return;
    }
    
    filteredChannels.forEach(channel => {
        const row = createTableRow(channel);
        tbody.appendChild(row);
    });
    
    updateSelectionCounter();
}

function createTableRow(channel) {
    const tr = document.createElement('tr');
    const daysSince = calculateDaysSince(channel.lastUpload);
    const isSelected = selectedChannels.has(channel.id);
    
    if (isSelected) {
        tr.classList.add('selected');
    }
    
    tr.innerHTML = `
        <td class="checkbox-col">
            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleRowSelection('${channel.id}')">
        </td>
        <td>
            <div class="channel-info">
                <img src="${channel.avatar}" alt="${channel.name}" class="channel-avatar">
                <span class="channel-name">${channel.name}</span>
            </div>
        </td>
        <td>
            <a href="${channel.link}" target="_blank" class="channel-link">
                <i class="fab fa-youtube"></i> View Channel
            </a>
        </td>
        <td class="description-cell" title="${channel.description}">${channel.description}</td>
        <td>${formatNumber(channel.subscribers)}</td>
        <td>${channel.country}</td>
        <td><span class="badge badge-${channel.category.toLowerCase().replace(/\s+/g, '-')}">${channel.category}</span></td>
        <td>${channel.lastVideo}</td>
        <td>${formatDate(channel.lastUpload)}</td>
        <td><span class="days-badge ${getDaysBadgeClass(daysSince)}">${daysSince} days</span></td>
    `;
    
    return tr;
}

// Selection Management
function toggleRowSelection(channelId) {
    if (selectedChannels.has(channelId)) {
        selectedChannels.delete(channelId);
    } else {
        selectedChannels.add(channelId);
    }
    
    renderTable();
}

function toggleSelectAll(e) {
    const isChecked = e.target.checked;
    
    if (isChecked) {
        filteredChannels.forEach(channel => selectedChannels.add(channel.id));
    } else {
        selectedChannels.clear();
    }
    
    renderTable();
}

function updateSelectionCounter() {
    document.getElementById('selection-counter').textContent = `Selected: ${selectedChannels.size} channels`;
}

// Table Sorting
function sortTable(column) {
    const header = document.querySelector(`[data-column="${column}"]`);
    
    // Determine sort direction
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    
    // Update header classes
    document.querySelectorAll('.sortable').forEach(h => {
        h.classList.remove('asc', 'desc');
    });
    header.classList.add(currentSort.direction);
    
    // Sort data
    filteredChannels.sort((a, b) => {
        let valA, valB;
        
        switch (column) {
            case 'name':
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
                break;
            case 'subscribers':
                valA = a.subscribers;
                valB = b.subscribers;
                break;
            case 'country':
                valA = a.country;
                valB = b.country;
                break;
            case 'category':
                valA = a.category;
                valB = b.category;
                break;
            case 'lastVideo':
                valA = a.lastVideo.toLowerCase();
                valB = b.lastVideo.toLowerCase();
                break;
            case 'lastUpload':
                valA = new Date(a.lastUpload);
                valB = new Date(b.lastUpload);
                break;
            case 'daysSince':
                valA = calculateDaysSince(a.lastUpload);
                valB = calculateDaysSince(b.lastUpload);
                break;
            default:
                return 0;
        }
        
        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    renderTable();
}

// Export to CSV
function exportToCSV() {
    if (selectedChannels.size === 0) {
        showToast('Please select at least one channel to export', 'warning');
        return;
    }
    
    const selectedData = filteredChannels.filter(channel => selectedChannels.has(channel.id));
    
    const headers = ['Name', 'Link', 'Description', 'Subscribers', 'Country', 'Category', 'Last Video', 'Last Upload', 'Days Since'];
    const rows = selectedData.map(channel => [
        channel.name,
        channel.link,
        channel.description.replace(/,/g, ';'),
        channel.subscribers,
        channel.country,
        channel.category,
        channel.lastVideo.replace(/,/g, ';'),
        channel.lastUpload,
        calculateDaysSince(channel.lastUpload)
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thumbcraft-channels-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showToast(`Exported ${selectedData.length} channels to CSV`, 'success');
}

// API Usage Meter
async function updateUsageMeter() {
    try {
        const response = await fetch(`${API_BASE_URL}/usage`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch usage data');
        }
        
        const data = await response.json();
        
        document.getElementById('quota-used').textContent = formatNumber(data.used);
        document.getElementById('quota-remaining').textContent = formatNumber(data.remaining);
        
        const progressBar = document.getElementById('usage-progress-bar');
        const percentage = Math.round(data.percentage);
        
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('data-percentage', percentage);
        document.getElementById('usage-percentage').textContent = `${percentage}%`;
        
        // Update color based on percentage
        progressBar.classList.remove('warning', 'danger');
        if (percentage > 80) {
            progressBar.classList.add('danger');
            if (percentage > 80 && percentage <= 85) {
                showToast('API usage is above 80%! Consider limiting requests.', 'warning');
            }
        } else if (percentage > 50) {
            progressBar.classList.add('warning');
        }
    } catch (error) {
        console.error('Error updating usage meter:', error);
    }
}

// Utility Functions
function calculateDaysSince(dateString) {
    const uploadDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - uploadDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function getDaysBadgeClass(days) {
    if (days <= 7) return 'days-fresh';
    if (days <= 30) return 'days-recent';
    return 'days-stale';
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = {
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle',
        info: 'fa-info-circle'
    }[type] || 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

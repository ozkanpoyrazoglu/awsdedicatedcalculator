/**
 * AWS Dedicated Host Calculator - Frontend JavaScript
 * Handles UI interactions, file uploads, and data visualization
 */

// Global variables
let currentSessionId = null;
let uploadedData = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());
}

/**
 * Handle drag over event
 */
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

/**
 * Handle drag leave event
 */
function handleDragLeave(e) {
    e.currentTarget.classList.remove('dragover');
}

/**
 * Handle file drop event
 */
function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

/**
 * Handle file selection from input
 */
function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
}

/**
 * Validate and process uploaded file
 */
function handleFile(file) {
    // Validate file type
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
        showNotification('Unsupported file format! Please use Excel or CSV files.', 'error');
        return;
    }
    
    // Check file size (16MB limit)
    if (file.size > 16 * 1024 * 1024) {
        showNotification('File too large! Maximum size is 16MB.', 'error');
        return;
    }
    
    uploadFile(file);
}

/**
 * Upload file to server
 */
function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    showProgress(true);
    updateProgress(10, 'Uploading file...');
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            uploadedData = data.data;
            currentSessionId = data.session_id;
            showFileSuccess(file.name, data.record_count);
            showDataPreview(data.preview);
            updateStats(data.stats);
            updateProgress(100, 'Upload complete!');
            setTimeout(() => showProgress(false), 1000);
        } else {
            showNotification(data.error, 'error');
            showProgress(false);
        }
    })
    .catch(error => {
        showNotification('Upload error: ' + error.message, 'error');
        showProgress(false);
    });
}

/**
 * Show/hide progress bar
 */
function showProgress(show) {
    const progressSection = document.getElementById('progressSection');
    progressSection.style.display = show ? 'block' : 'none';
}

/**
 * Update progress bar
 */
function updateProgress(percent, text) {
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    const progressText = document.getElementById('progressText');
    
    progressBar.style.width = percent + '%';
    progressPercent.textContent = percent + '%';
    progressText.textContent = text;
}

/**
 * Show successful file upload info
 */
function showFileSuccess(fileName, recordCount) {
    document.getElementById('fileName').textContent = fileName;
    document.getElementById('recordCount').textContent = recordCount;
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('actionButtons').style.display = 'block';
}

/**
 * Display data preview table
 */
function showDataPreview(preview) {
    const tbody = document.querySelector('#previewTable tbody');
    tbody.innerHTML = '';
    
    preview.forEach(row => {
        const tr = document.createElement('tr');
        const statusClass = getStatusClass(row.status);
        
        tr.innerHTML = `
            <td>${escapeHtml(row.name)}</td>
            <td><span class="instance-type-badge">${escapeHtml(row.type)}</span></td>
            <td class="${statusClass}">${escapeHtml(row.status)}</td>
        `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('dataPreview').style.display = 'block';
}

/**
 * Get CSS class for status
 */
function getStatusClass(status) {
    if (status.includes('✅')) return 'text-success';
    if (status.includes('⚠️')) return 'text-warning';
    return 'text-danger';
}

/**
 * Update statistics cards
 */
function updateStats(stats) {
    document.getElementById('totalServers').textContent = stats.total;
    document.getElementById('supportedInstances').textContent = stats.supported;
    document.getElementById('unsupportedInstances').textContent = stats.unsupported;
}

/**
 * Start calculation process
 */
function startCalculation() {
    if (!currentSessionId) {
        showNotification('Please upload a file first!', 'error');
        return;
    }
    
    const calcBtn = document.getElementById('calculateBtn');
    calcBtn.disabled = true;
    calcBtn.innerHTML = '<div class="spinner-aws"></div> Calculating...';
    calcBtn.classList.add('loading');
    
    fetch('/calculate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({session_id: currentSessionId})
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            pollCalculationStatus(currentSessionId);
        } else {
            showNotification(data.error, 'error');
            resetCalculateButton();
        }
    })
    .catch(error => {
        showNotification('Calculation start error: ' + error.message, 'error');
        resetCalculateButton();
    });
}

/**
 * Poll calculation status
 */
function pollCalculationStatus(sessionId) {
    const interval = setInterval(() => {
        fetch(`/status/${sessionId}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'completed') {
                clearInterval(interval);
                showResults(sessionId);
                resetCalculateButton();
                showNotification('Calculation completed successfully!', 'success');
            } else if (data.status === 'error') {
                clearInterval(interval);
                showNotification('Calculation error: ' + data.error, 'error');
                resetCalculateButton();
            } else if (data.status === 'processing') {
                updateProgress(data.progress || 50, 'Processing grouping calculation...');
            }
        })
        .catch(error => {
            clearInterval(interval);
            showNotification('Status check error: ' + error.message, 'error');
            resetCalculateButton();
        });
    }, 1000);
}

/**
 * Reset calculate button
 */
function resetCalculateButton() {
    const calcBtn = document.getElementById('calculateBtn');
    calcBtn.disabled = false;
    calcBtn.innerHTML = '<i class="fas fa-calculator me-2"></i>Start Grouping Calculation';
    calcBtn.classList.remove('loading');
}

/**
 * Show calculation results
 */
function showResults(sessionId) {
    fetch(`/results/${sessionId}`)
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayResults(data.results);
            updateCostStats(data.results.summary);
            document.getElementById('dedicatedHosts').textContent = data.results.total_hosts;
        } else {
            showNotification('Failed to load results: ' + data.error, 'error');
        }
    })
    .catch(error => {
        showNotification('Result loading error: ' + error.message, 'error');
    });
}

/**
 * Display calculation results
 */
function displayResults(results) {
    // Summary section
    const summaryHtml = `
        <div class="row g-4">
            <div class="col-md-3">
                <div class="cost-highlight">
                    <h4>${results.summary.total_servers}</h4>
                    <small>Total Servers</small>
                </div>
            </div>
            <div class="col-md-3">
                <div class="cost-highlight">
                    <h4>${results.total_hosts}</h4>
                    <small>Required Hosts</small>
                </div>
            </div>
            <div class="col-md-3">
                <div class="cost-highlight">
                    <h4>${results.summary.success_rate.toFixed(1)}%</h4>
                    <small>Success Rate</small>
                </div>
            </div>
            <div class="col-md-3">
                <div class="cost-highlight">
                    <h4>$${results.summary.monthly_cost.toLocaleString()}</h4>
                    <small>Monthly Cost</small>
                </div>
            </div>
        </div>
    `;
    document.getElementById('summarySection').innerHTML = summaryHtml;
    
    // Detailed results
    let detailedHtml = '<h5 class="mb-3"><i class="fas fa-server me-2"></i>Dedicated Host Details</h5>';
    
    results.host_allocations.forEach((host, index) => {
        const utilizationRate = ((host.used_cores / host.total_cores) * 100).toFixed(1);
        
        detailedHtml += `
            <div class="card host-card fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="card-header bg-primary text-white">
                    <div class="row align-items-center">
                        <div class="col">
                            <h6 class="mb-0">${escapeHtml(host.host_id)}</h6>
                            <small>${host.family.toUpperCase()} Family | ${host.sockets} Sockets | ${host.total_cores} Total Cores</small>
                        </div>
                        <div class="col-auto">
                            <span class="badge bg-light text-dark">${host.instances.length} Instances</span>
                            <span class="badge bg-warning text-dark">${host.used_cores}/${host.total_cores} Cores (${utilizationRate}%)</span>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4">
                            <h6>Core Distribution:</h6>
                            ${Object.entries(host.core_breakdown || {}).map(([size, cores]) => 
                                `<span class="instance-type-badge">${size}: ${host.utilization[size]} × ${(cores/host.utilization[size]).toFixed(1)} = ${cores} cores</span>`
                            ).join('<br>')}
                        </div>
                        <div class="col-md-8">
                            <h6>Servers:</h6>
                            <div class="row">
                                ${host.instances.map(instance => 
                                    `<div class="col-md-6 mb-1">
                                        <small><i class="fas fa-server me-1"></i>${escapeHtml(instance.name)} (${escapeHtml(instance.type)})</small>
                                    </div>`
                                ).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Unsupported instances
    if (results.unsupported_instances.length > 0) {
        detailedHtml += `
            <div class="card mt-3 border-warning">
                <div class="card-header bg-warning text-dark">
                    <h6 class="mb-0"><i class="fas fa-exclamation-triangle me-2"></i>Unsupported Instances</h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        ${results.unsupported_instances.map(instance => 
                            `<div class="col-md-6 mb-2">
                                <i class="fas fa-times text-danger me-1"></i>${escapeHtml(instance.name)} (${escapeHtml(instance.type)})
                            </div>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    document.getElementById('detailedResults').innerHTML = detailedHtml;
    document.getElementById('resultsSection').style.display = 'block';
}

/**
 * Update cost statistics
 */
function updateCostStats(summary) {
    document.getElementById('monthlyCost').textContent = '$' + summary.monthly_cost.toLocaleString();
    document.getElementById('yearlySavings').textContent = '$' + summary.reserved_savings.toLocaleString();
}

/**
 * Export results to Excel
 */
function exportResults() {
    if (!currentSessionId) {
        showNotification('No results found!', 'error');
        return;
    }
    
    window.open(`/export/${currentSessionId}`, '_blank');
}

/**
 * Export results to PDF
 */
function exportToPDF() {
    if (!currentSessionId) {
        showNotification('No results found!', 'error');
        return;
    }
    
    // Show loading
    showExportLoading('Creating PDF...');
    
    // Hide buttons temporarily for clean export
    const exportButtons = document.querySelector('.btn-group');
    const originalDisplay = exportButtons.style.display;
    exportButtons.style.display = 'none';
    
    // Small delay to ensure UI updates
    setTimeout(() => {
        html2canvas(document.querySelector('.main-container'), {
            scale: 1.5,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            width: 1400,
            height: document.querySelector('.main-container').offsetHeight
        }).then(canvas => {
            // Restore buttons
            exportButtons.style.display = originalDisplay;
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 295; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;
            
            // Add title page info
            pdf.setFontSize(20);
            pdf.setTextColor(46, 47, 62);
            pdf.text('AWS Dedicated Host Calculator', 20, 30);
            pdf.setFontSize(12);
            pdf.text('EC2 Instance Grouping Report', 20, 40);
            pdf.setFontSize(10);
            pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 50);
            
            // Add main content
            if (imgHeight > pageHeight - 60) {
                // Content is too tall, start on new page
                pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
                heightLeft -= pageHeight;
                
                // Add additional pages if needed
                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
            } else {
                // Content fits on first page
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 60, imgWidth, imgHeight);
            }
            
            // Save PDF
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            pdf.save(`AWS_Dedicated_Host_Report_${timestamp}.pdf`);
            
            hideExportLoading();
            showNotification('PDF created successfully!', 'success');
        }).catch(error => {
            exportButtons.style.display = originalDisplay;
            hideExportLoading();
            showNotification('PDF creation error: ' + error.message, 'error');
        });
    }, 100);
}

/**
 * Export results to PNG
 */
function exportToPNG() {
    if (!currentSessionId) {
        showNotification('No results found!', 'error');
        return;
    }
    
    // Show loading
    showExportLoading('Creating PNG...');
    
    // Hide buttons temporarily for clean export
    const exportButtons = document.querySelector('.btn-group');
    const originalDisplay = exportButtons.style.display;
    exportButtons.style.display = 'none';
    
    // Small delay to ensure UI updates
    setTimeout(() => {
        html2canvas(document.querySelector('.main-container'), {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            width: 1400,
            height: document.querySelector('.main-container').offsetHeight
        }).then(canvas => {
            // Restore buttons
            exportButtons.style.display = originalDisplay;
            
            // Create download link
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            link.download = `AWS_Dedicated_Host_Report_${timestamp}.png`;
            link.href = canvas.toDataURL('image/png');
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            hideExportLoading();
            showNotification('PNG created successfully!', 'success');
        }).catch(error => {
            exportButtons.style.display = originalDisplay;
            hideExportLoading();
            showNotification('PNG creation error: ' + error.message, 'error');
        });
    }, 100);
}

/**
 * Show export loading indicator
 */
function showExportLoading(message) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'exportLoading';
    loadingDiv.className = 'export-loading';
    loadingDiv.innerHTML = `
        <div class="spinner-aws mb-3"></div>
        <h5>${message}</h5>
        <p class="text-muted mb-0">This may take a few seconds...</p>
    `;
    document.body.appendChild(loadingDiv);
}

/**
 * Hide export loading indicator
 */
function hideExportLoading() {
    const loadingDiv = document.getElementById('exportLoading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

/**
 * Show notification message
 */
function showNotification(message, type) {
    const alertClass = type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info';
    const icon = type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle';
    
    const notification = document.createElement('div');
    notification.className = `alert alert-${alertClass} alert-dismissible fade show notification`;
    notification.innerHTML = `
        <i class="fas fa-${icon} me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.getElementById('notificationContainer').appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Format number with thousands separator
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Debounce function for performance
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
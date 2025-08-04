// Constants
const labelTextArea = document.getElementById('labelText');
const previewsContainer = document.getElementById('labelPreviews');
const responseElement = document.getElementById('response');
const printerSelect = document.getElementById('printerSelect');
const printerStatus = document.getElementById('printerStatus');
const discoveryStatus = document.getElementById('discoveryStatus');
const refreshButton = document.getElementById('refreshPrinters');
const API_ENDPOINT = '/previewLabels';
const PRINTERS_ENDPOINT = '/printers';
const DISCOVERY_ENDPOINT = '/printers/discover';
const DEBOUNCE_DELAY = 2000;

// Main initialization function
function init() {
  logResponse("initializing label bro");
  setupLabelTextAreaListener();
  loadPrinters();
  setupPrinterChangeListener();
}

// Set up event listener with debounce for textarea input
function setupLabelTextAreaListener() {
  let debounceTimeout;
  labelTextArea.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      const labelText = labelTextArea.value;
      previewLabels(labelText);
    }, DEBOUNCE_DELAY);
  });
}

// Fetch label previews from the server
async function fetchLabelPreviews(labelText) {
  logResponse("fetching label previews");
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: {
        text: labelText,
        shouldPrintFullLabel: document.getElementById('printFullLabel').checked,
        shouldPrintSmallLabel: document.getElementById('printSmallLabel').checked,
      } })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logResponse(`Error: ${error.message}`);
    return null;
  }
}

// Preview labels by updating the DOM
async function previewLabels(labelText) {
  const data = await fetchLabelPreviews(labelText);

  if (data && !data.error) {
    clearPreviews();
    updatePreviews(data, labelText);
  } else if (data && data.error) {
    handleError(new Error(data.error));
  }
}

// Clear previous label previews from the DOM
function clearPreviews() {
  previewsContainer.innerHTML = '';
}

// Update the DOM with new label previews
function updatePreviews(data, labelText) {
  const lines = labelText.split('\n');
  lines.forEach((line, index) => {
    if (line.trim()) {
      const fullLabel = data.full_labels[index] || '';
      const smallLabel = data.small_labels[index] || '';

      // if (!fullLabel || !smallLabel) {
      //   handleError(new Error(`Label data missing for line ${index + 1}`));
      //   return;
      // }

      const labelPair = createLabelPairElement(index, fullLabel, smallLabel);
      previewsContainer.appendChild(labelPair);
    }
  });
}

// Create a DOM element for a pair of label previews
function createLabelPairElement(index, fullLabel, smallLabel) {
  const labelPair = document.createElement('div');
  labelPair.className = 'label-pair';

  const lineHeader = document.createElement('h6');
  lineHeader.textContent = `Label ${index + 1}`;

  const fullLabelImg = document.createElement('img');
  fullLabelImg.src = fullLabel;
  fullLabelImg.alt = fullLabel ? 'Full Label Preview' : 'N/A';
  fullLabelImg.className = 'full-label';

  const smallLabelImg = document.createElement('img');
  smallLabelImg.src = smallLabel;
  smallLabelImg.alt = smallLabel ? 'Small Label Preview' : 'N/A';
  smallLabelImg.className = 'small-label';

  labelPair.appendChild(lineHeader);
  labelPair.appendChild(fullLabelImg);
  labelPair.appendChild(smallLabelImg);

  return labelPair;
}

// Handle and display errors
function handleError(error) {
  logResponse('Error: ' + error.message);
}

function logResponse(text) {
  const timestamp = new Date().toLocaleString();
  const responseContainer = document.getElementById('response');
  const responseDiv = document.createElement('div');
  responseDiv.textContent = `${timestamp}: ${text}`;
  responseContainer.prepend(responseDiv);
}


// Load available printers
async function loadPrinters() {
  try {
    const response = await fetch(PRINTERS_ENDPOINT);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load printers');
    }

    populatePrinterDropdown(data.printers);
  } catch (error) {
    logResponse(`Error loading printers: ${error.message}`);
    printerSelect.innerHTML = '<option value="">Error loading printers</option>';
  }
}

// Populate the printer dropdown
function populatePrinterDropdown(printers) {
  printerSelect.innerHTML = '';

  const printerCount = Object.keys(printers).length;
  if (printerCount === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No printers found - click Refresh to discover';
    option.selected = true;
    printerSelect.appendChild(option);
    updatePrinterStatus({});
    return;
  }

  let hasConnectedPrinter = false;
  for (const [printerId, printer] of Object.entries(printers)) {
    // Only show actually connected printers
    if (printer.is_connected) {
      const option = document.createElement('option');
      option.value = printerId;
      option.textContent = printer.display_name;

      if (!hasConnectedPrinter) {
        option.selected = true;
        hasConnectedPrinter = true;
      }

      printerSelect.appendChild(option);
    }
  }

  if (!hasConnectedPrinter) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No available printers - click Refresh';
    option.selected = true;
    printerSelect.appendChild(option);
  }

  updatePrinterStatus(printers);
}

// Update printer status display
function updatePrinterStatus(printers) {
  const selectedPrinterId = printerSelect.value;
  if (!selectedPrinterId || !printers[selectedPrinterId]) {
    printerStatus.innerHTML = '<span class="error">No printer selected</span>';
    return;
  }

  const printer = printers[selectedPrinterId];
  console.log(printer)
  const statusClass = printer.is_connected ? 'connected' : 'disconnected';
  const statusText = printer.is_connected ? 'Connected' : 'Disconnected';
  const displayId = printer.id;
  const mediaText = printer.media_info || 'No media info';

  printerStatus.innerHTML = `
    <span class="${statusClass}">${statusText}</span> | 
    <span class="media-info">Media: ${mediaText}</span>
    <span class="displayId">ID: ${displayId}</span>
  `;
}

// Set up printer change listener
function setupPrinterChangeListener() {
  printerSelect.addEventListener('change', async () => {
    const printers = await fetchPrinters();
    if (printers) {
      updatePrinterStatus(printers);
    }
  });
}

// Fetch current printer status
async function fetchPrinters() {
  try {
    const response = await fetch(PRINTERS_ENDPOINT);
    const data = await response.json();
    return response.ok ? data.printers : null;
  } catch (error) {
    logResponse(`Error fetching printers: ${error.message}`);
    return null;
  }
}

// Refresh printers with network discovery
async function refreshPrinters() {
  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.textContent = '🔄 Discovering...';
  }

  if (discoveryStatus) {
    discoveryStatus.textContent = 'Scanning network for printers...';
    discoveryStatus.className = 'discovery-status discovering';
  }

  logResponse('Starting printer discovery...');

  try {
    const response = await fetch(DISCOVERY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Discovery failed');
    }

    // Update the printer dropdown with discovered printers
    populatePrinterDropdown(data.printers);

    // Show discovery results
    const printerCount = Object.keys(data.printers).length;
    const connectedCount = Object.values(data.printers).filter(p => p.is_connected).length;

    if (discoveryStatus) {
      discoveryStatus.textContent = `Found ${printerCount} printers (${connectedCount} connected)`;
      discoveryStatus.className = 'discovery-status success';
    }

    // Show discovery methods
    const methods = data.discovery_methods;
    const methodStatus = [];
    if (methods.mdns) methodStatus.push('mDNS');
    if (methods.network_scan) methodStatus.push('Network Scan');
    if (methods.usb) methodStatus.push('USB');

    logResponse(`Discovery complete: ${printerCount} printers found using ${methodStatus.join(', ')}`);

  } catch (error) {
    logResponse(`Discovery error: ${error.message}`);

    if (discoveryStatus) {
      discoveryStatus.textContent = `Discovery failed: ${error.message}`;
      discoveryStatus.className = 'discovery-status error';
    }
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = '🔄 Refresh';
    }

    // Clear discovery status after a delay
    if (discoveryStatus) {
      setTimeout(() => {
        discoveryStatus.textContent = '';
        discoveryStatus.className = 'discovery-status';
      }, 5000);
    }
  }
}

function printLabels() {
  const labelText = document.getElementById('labelText').value;
  const shouldPrintFullLabel = document.getElementById('printFullLabel').checked;
  const shouldPrintSmallLabel = document.getElementById('printSmallLabel').checked;
  const selectedPrinterId = printerSelect.value;

  if (!selectedPrinterId) {
    logResponse('Error: No printer selected');
    return;
  }

  logResponse(`printing labels on ${selectedPrinterId}. print full: ${shouldPrintFullLabel}, print small: ${shouldPrintSmallLabel}`);

  document.getElementById('waiting').innerText = "Waiting for response..."

  fetch('/printLabels', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: {
        text: labelText,
        shouldPrintFullLabel: shouldPrintFullLabel,
        shouldPrintSmallLabel: shouldPrintSmallLabel,
        printer_id: selectedPrinterId
      }
    })
  })
    .then(response => response.json())
    .then(data => {
      document.getElementById('waiting').innerText = '';
      logResponse(`${JSON.stringify(data, null, 2)}`);
    })
    .catch(async (error) => {
        const response = await error.response.json();
        const data = response || {};
      document.getElementById('waiting').innerText = '!!! ERROR !!!';

      logResponse(`Error: ${error.message}`);
      if (data && data.details) {
          logResponse(`Details: ${data.details}`);
      }
    });
}

// Manual Connection Functions
async function testManualConnection() {
  const target = document.getElementById('manualTarget').value.trim();
  const statusDiv = document.getElementById('manualConnectionStatus');
  const resultsDiv = document.getElementById('manualConnectionResults');
  const button = document.getElementById('testConnection');

  if (!target) {
    showManualConnectionStatus('error', 'Please enter an IP address or subnet');
    return;
  }

  // Disable button and show testing status
  button.disabled = true;
  button.textContent = 'Testing...';
  showManualConnectionStatus('testing', `Testing connection to ${target}...`);
  resultsDiv.innerHTML = '';

  try {
    const response = await fetch('/printers/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ target: target })
    });

    const result = await response.json();

    if (response.ok) {
      handleManualConnectionResult(result);
    } else {
      showManualConnectionStatus('error', result.error || 'Connection test failed');
    }

  } catch (error) {
    showManualConnectionStatus('error', `Network error: ${error.message}`);
  } finally {
    // Re-enable button
    button.disabled = false;
    button.textContent = 'Test Connection';
  }
}

function showManualConnectionStatus(type, message) {
  const statusDiv = document.getElementById('manualConnectionStatus');
  statusDiv.className = `manual-connection-status ${type}`;
  statusDiv.textContent = message;
}

function handleManualConnectionResult(result) {
  const resultsDiv = document.getElementById('manualConnectionResults');

  if (result.success && result.printers_found.length > 0) {
    showManualConnectionStatus('success',
      `Found ${result.printers_found.length} Brother printer(s) at ${result.target}`);

    // Display printer details
    let resultsHtml = '';
    result.printers_found.forEach(printer => {
      const isValid = printer.media_loaded && printer.printer_ready;
      resultsHtml += `
        <div class="printer-result ${isValid ? 'valid' : 'invalid'}">
          <h4>${printer.model} at ${printer.ip}</h4>
          <div class="media-info">
            Model: ${printer.model}<br>
            ${printer.media_width ? `Media Width: ${printer.media_width}<br>` : ''}
            ${printer.media_type ? `Media Type: ${printer.media_type}<br>` : ''}
          </div>
          <div class="media-status ${printer.media_loaded ? 'loaded' : 'not-loaded'}">
            ${printer.media_loaded ? 
              `✓ Media loaded and ready` : 
              `⚠ No media detected or printer not ready`}
          </div>
          ${!isValid ? '<small>Note: Only printers with loaded media are considered valid connections</small>' : ''}
        </div>
      `;
    });
    resultsDiv.innerHTML = resultsHtml;

  } else {
    if (result.error) {
      showManualConnectionStatus('error', result.error);
    } else {
      showManualConnectionStatus('error',
        `No Brother printers found at ${result.target}`);
    }
    resultsDiv.innerHTML = '';
  }
}

// Allow Enter key to trigger test
document.getElementById('manualTarget').addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    testManualConnection();
  }
});

// AI-related functions removed for multiple printer support

init();

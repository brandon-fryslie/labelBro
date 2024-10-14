// Constants
const labelTextArea = document.getElementById('labelText');
const previewsContainer = document.getElementById('labelPreviews');
const responseElement = document.getElementById('response');
const API_ENDPOINT = '/previewLabels';
const DEBOUNCE_DELAY = 2000;

// Main initialization function
function init() {
  console.log("initializing all the junk")
  setupLabelTextAreaListener();
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
  console.log("fetching label previews")
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
    handleError(error);
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
  console.error('Error:', error.message);
  responseElement.innerText = 'Error: ' + error.message;
}


function printLabels() {
  const labelText = document.getElementById('labelText').value;
  const shouldPrintFullLabel = document.getElementById('printFullLabel').checked
  const shouldPrintSmallLabel = document.getElementById('printSmallLabel').checked

  console.log(`printing labels.  print full: ${shouldPrintFullLabel}, print small: ${shouldPrintSmallLabel}`)

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
      }
    })
  })
    .then(response => response.json())
    .then(data => {
      document.getElementById('waiting').innerText = '';

      const responseContainer = document.getElementById('response');

      // Get the current timestamp
      const timestamp = new Date().toLocaleString();

      // Create a new div element for the response message
      const responseDiv = document.createElement('div');
      responseDiv.textContent = `${timestamp}: ${JSON.stringify(data, null, 2)}`;

      // Prepend the new message to the container
      responseContainer.prepend(responseDiv);
    })
    .catch(error => {
      document.getElementById('waiting').innerText = '!!! ERROR !!!';

      const responseContainer = document.getElementById('response');

      // Get the current timestamp
      const timestamp = new Date().toLocaleString();

      // Create a new div element for the error message
      const errorDiv = document.createElement('div');
      errorDiv.textContent = `${timestamp}: Error: ${error}`;

      // Prepend the new message to the container
      responseContainer.prepend(errorDiv);
    });
}

// Initialize the script
init();

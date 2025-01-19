// Constants
const labelTextArea = document.getElementById('labelText');
const previewsContainer = document.getElementById('labelPreviews');
const responseElement = document.getElementById('response');
const API_ENDPOINT = '/previewLabels';
const DEBOUNCE_DELAY = 2000;

// Main initialization function
function init() {
  logResponse("initializing all the junk");
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


function printLabels() {
  const labelText = document.getElementById('labelText').value;
  const shouldPrintFullLabel = document.getElementById('printFullLabel').checked
  const shouldPrintSmallLabel = document.getElementById('printSmallLabel').checked

  logResponse(`printing labels.  print full: ${shouldPrintFullLabel}, print small: ${shouldPrintSmallLabel}`);

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

async function submitAIText() {
    const aiText = document.getElementById('aiText').value.trim();
    if (!aiText) {
        alert('Please enter a prompt before submitting.');
        return;
    }
    logResponse(`Submitting prompt to OpenAI...`);

    try {
        logResponse(`Awaiting response from OpenAI...`);
        const response = await fetch('/aiGenerate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: aiText })
        });

        const data = await response.json();

        if (!response.ok) {
            logResponse(`Error: ${data.error || 'Unknown error'}`);
            if (data.details) {
                logResponse(`Details: ${data.details}`);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (data.image) {
            updatePreviewWithGeneratedImage(data.image);
        }
        if (data.error) {
            logResponse(`Error: ${data.error}`);
        }
        if (data.details) {
            logResponse(`Details: ${data.details}`);
        }
        if (data.code) {
            const apiResponseLog = document.getElementById('apiResponseLog');
            const responseDiv = document.createElement('pre');
            responseDiv.className = 'language-python';
            const codeElement = document.createElement('code');
            codeElement.className = 'language-python';
            codeElement.textContent = data.code;
            responseDiv.appendChild(codeElement);
            apiResponseLog.prepend(responseDiv);

            // Highlight the code using Prism.js
            Prism.highlightElement(codeElement);

            generatedCode = data.code;
            logResponse(`AI Generated Code: ${data.code}`);
        }
    } catch (error) {
        const data = error.response ? await error.response.json() : {};
        logResponse(`Error: ${error.message}`);
        if (data && data.details) {
            logResponse(`Details: ${data.details}`);
        }
        if (data && data.response) {
            logResponse(`Response: ${data.response}`);
        }
    }
}

let generatedCode = '';

// Function to execute the generated code
async function executeGeneratedCode() {
    if (!generatedCode) {
        logResponse('No code to execute. Please generate code first.');
        return;
    }

    try {
        logResponse('Executing generated code...');
        const response = await fetch('/executeCode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: generatedCode })
        });

        const data = await response.json();

        if (!response.ok) {
            logResponse(`Error: ${data.error || 'Unknown error'}`);
            if (data.details) {
                logResponse(`Details: ${data.details}`);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (data.error) {
            logResponse(`Error: ${data.error}`);
        }
        if (data.details) {
            logResponse(`Details: ${data.details}`);
        }
        if (data.status) {
            logResponse(data.status);
        }
    } catch (error) {
        logResponse(`Execution error: ${error.message}`);
    }
}
function updatePreviewWithGeneratedImage(imageData) {
    const previewsContainer = document.getElementById('labelPreviews');
    const imgElement = document.createElement('img');
    imgElement.src = imageData;
    imgElement.alt = 'Generated Image Preview';
    previewsContainer.innerHTML = ''; // Clear previous previews
    previewsContainer.appendChild(imgElement);
}

init();

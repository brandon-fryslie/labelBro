// DOM utilities and element management

// Get DOM elements with type safety
export const elements = {
  labelTextArea: document.getElementById('labelText') as HTMLTextAreaElement,
  previewsContainer: document.getElementById('labelPreviews') as HTMLDivElement,
  responseElement: document.getElementById('response') as HTMLDivElement,
  printerSelect: document.getElementById('printerSelect') as HTMLSelectElement,
  printerStatus: document.getElementById('printerStatus') as HTMLDivElement,
  discoveryStatus: document.getElementById('discoveryStatus') as HTMLDivElement,
  refreshButton: document.getElementById('refreshPrinters') as HTMLButtonElement,
  waitingElement: document.getElementById('waiting') as HTMLDivElement,
  printFullLabel: document.getElementById('printFullLabel') as HTMLInputElement,
  printSmallLabel: document.getElementById('printSmallLabel') as HTMLInputElement,
  manualTarget: document.getElementById('manualTarget') as HTMLInputElement,
  manualConnectionStatus: document.getElementById('manualConnectionStatus') as HTMLDivElement,
  manualConnectionResults: document.getElementById('manualConnectionResults') as HTMLDivElement,
  testConnection: document.getElementById('testConnection') as HTMLButtonElement,
};

// Logging utility
export function logResponse(text: string): void {
  const timestamp = new Date().toLocaleString();
  const responseDiv = document.createElement('div');
  responseDiv.textContent = `${timestamp}: ${text}`;
  elements.responseElement.prepend(responseDiv);
}

// Create a DOM element for a pair of label previews
export function createLabelPairElement(index: number, fullLabel: string, smallLabel: string): HTMLDivElement {
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

// Clear previous label previews from the DOM
export function clearPreviews(): void {
  elements.previewsContainer.innerHTML = '';
}

// Handle and display errors
export function handleError(error: Error): void {
  logResponse('Error: ' + error.message);
}
// Label preview and printing logic
import type { LabelPreviewData } from '../types';
import { LabelBroAPI } from '../api';
import { elements, logResponse, handleError, createLabelPairElement, clearPreviews } from './dom';

const DEBOUNCE_DELAY = 2000;

export class LabelManager {
  private static debounceTimeout: ReturnType<typeof setTimeout>;

  // Set up event listener with debounce for textarea input
  static setupLabelTextAreaListener(): void {
    elements.labelTextArea.addEventListener('input', () => {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = setTimeout(() => {
        const labelText = elements.labelTextArea.value;
        this.previewLabels(labelText);
      }, DEBOUNCE_DELAY);
    });
  }

  // Preview labels by updating the DOM
  static async previewLabels(labelText: string): Promise<void> {
    logResponse("fetching label previews");
    
    const data = await LabelBroAPI.fetchLabelPreviews(labelText);

    if (data && !data.error) {
      clearPreviews();
      this.updatePreviews(data, labelText);
    } else if (data && data.error) {
      handleError(new Error(data.error));
    }
  }

  // Update the DOM with new label previews
  static updatePreviews(data: LabelPreviewData, labelText: string): void {
    const lines = labelText.split('\n');
    lines.forEach((line, index) => {
      if (line.trim()) {
        const fullLabel = data.full_labels[index] || '';
        const smallLabel = data.small_labels[index] || '';

        const labelPair = createLabelPairElement(index, fullLabel, smallLabel);
        elements.previewsContainer.appendChild(labelPair);
      }
    });
  }

  // Print labels
  static async printLabels(): Promise<void> {
    const labelText = elements.labelTextArea.value;
    const shouldPrintFullLabel = elements.printFullLabel.checked;
    const shouldPrintSmallLabel = elements.printSmallLabel.checked;
    const selectedPrinterId = elements.printerSelect.value;

    if (!selectedPrinterId) {
      logResponse('Error: No printer selected');
      return;
    }

    logResponse(`printing labels on ${selectedPrinterId}. print full: ${shouldPrintFullLabel}, print small: ${shouldPrintSmallLabel}`);

    elements.waitingElement.innerText = "Waiting for response...";

    try {
      const data = await LabelBroAPI.printLabels({
        data: {
          text: labelText,
          shouldPrintFullLabel,
          shouldPrintSmallLabel,
          printer_id: selectedPrinterId
        }
      });

      elements.waitingElement.innerText = '';
      logResponse(`${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      elements.waitingElement.innerText = '!!! ERROR !!!';
      logResponse(`Error: ${(error as Error).message}`);
    }
  }
}
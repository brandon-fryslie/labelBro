"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };

  // src/validation/index.ts
  var ValidationError = class extends Error {
    constructor(message, validationErrors, receivedData) {
      super(message);
      this.validationErrors = validationErrors;
      this.receivedData = receivedData;
      this.name = "ValidationError";
    }
    // Format errors for debugging
    toDebugInfo() {
      const errors = this.validationErrors.map((error) => ({
        path: error.path,
        expected: error.expected,
        value: error.value
      }));
      return JSON.stringify({
        error: "Runtime Type Validation Failed",
        validationErrors: errors,
        receivedData: this.receivedData
      }, null, 2);
    }
  };
  var TypeValidator = class {
    static createValidationError(path, expected, value) {
      return { path, expected, value };
    }
    // Validate PrinterData with strict checking
    static validatePrinterData(data) {
      const errors = [];
      if (!data || typeof data !== "object") {
        errors.push(this.createValidationError("$input", "object", data));
      } else {
        const obj = data;
        if (typeof obj.id !== "string") {
          errors.push(this.createValidationError("$input.id", "string", obj.id));
        }
        if (typeof obj.display_name !== "string") {
          errors.push(this.createValidationError("$input.display_name", "string", obj.display_name));
        }
        if (typeof obj.is_connected !== "boolean") {
          errors.push(this.createValidationError("$input.is_connected", "boolean", obj.is_connected));
        }
      }
      if (errors.length > 0) {
        throw new ValidationError(
          `PrinterData validation failed: ${errors.length} errors`,
          errors,
          data
        );
      }
      return data;
    }
    // Validate PrintersResponse with strict checking
    static validatePrintersResponse(data) {
      const errors = [];
      if (!data || typeof data !== "object") {
        errors.push(this.createValidationError("$input", "object", data));
      } else {
        const obj = data;
        if (!obj.printers || typeof obj.printers !== "object") {
          errors.push(this.createValidationError("$input.printers", "object", obj.printers));
        }
      }
      if (errors.length > 0) {
        throw new ValidationError(
          `PrintersResponse validation failed: ${errors.length} errors`,
          errors,
          data
        );
      }
      return data;
    }
    // Validate LabelPreviewData with strict checking
    static validateLabelPreviewData(data) {
      const errors = [];
      if (!data || typeof data !== "object") {
        errors.push(this.createValidationError("$input", "object", data));
      } else {
        const obj = data;
        if (!Array.isArray(obj.full_labels)) {
          errors.push(this.createValidationError("$input.full_labels", "string[]", obj.full_labels));
        }
        if (!Array.isArray(obj.small_labels)) {
          errors.push(this.createValidationError("$input.small_labels", "string[]", obj.small_labels));
        }
      }
      if (errors.length > 0) {
        throw new ValidationError(
          `LabelPreviewData validation failed: ${errors.length} errors`,
          errors,
          data
        );
      }
      return data;
    }
    // Validate PrintRequest with strict checking
    static validatePrintRequest(data) {
      const errors = [];
      if (!data || typeof data !== "object") {
        errors.push(this.createValidationError("$input", "object", data));
      } else {
        const obj = data;
        if (!obj.data || typeof obj.data !== "object") {
          errors.push(this.createValidationError("$input.data", "object", obj.data));
        } else {
          if (typeof obj.data.text !== "string") {
            errors.push(this.createValidationError("$input.data.text", "string", obj.data.text));
          }
          if (typeof obj.data.shouldPrintFullLabel !== "boolean") {
            errors.push(this.createValidationError("$input.data.shouldPrintFullLabel", "boolean", obj.data.shouldPrintFullLabel));
          }
          if (typeof obj.data.shouldPrintSmallLabel !== "boolean") {
            errors.push(this.createValidationError("$input.data.shouldPrintSmallLabel", "boolean", obj.data.shouldPrintSmallLabel));
          }
        }
      }
      if (errors.length > 0) {
        throw new ValidationError(
          `PrintRequest validation failed: ${errors.length} errors`,
          errors,
          data
        );
      }
      return data;
    }
    // Validate DiscoveryResponse with strict checking
    static validateDiscoveryResponse(data) {
      const errors = [];
      if (!data || typeof data !== "object") {
        errors.push(this.createValidationError("$input", "object", data));
      } else {
        const obj = data;
        if (!obj.printers || typeof obj.printers !== "object") {
          errors.push(this.createValidationError("$input.printers", "object", obj.printers));
        }
      }
      if (errors.length > 0) {
        throw new ValidationError(
          `DiscoveryResponse validation failed: ${errors.length} errors`,
          errors,
          data
        );
      }
      return data;
    }
    // Validate ManualConnectionResult with strict checking
    static validateManualConnectionResult(data) {
      const errors = [];
      if (!data || typeof data !== "object") {
        errors.push(this.createValidationError("$input", "object", data));
      } else {
        const obj = data;
        if (typeof obj.success !== "boolean") {
          errors.push(this.createValidationError("$input.success", "boolean", obj.success));
        }
        if (typeof obj.target !== "string") {
          errors.push(this.createValidationError("$input.target", "string", obj.target));
        }
        if (!Array.isArray(obj.printers_found)) {
          errors.push(this.createValidationError("$input.printers_found", "array", obj.printers_found));
        }
      }
      if (errors.length > 0) {
        throw new ValidationError(
          `ManualConnectionResult validation failed: ${errors.length} errors`,
          errors,
          data
        );
      }
      return data;
    }
    // Validate ManualConnectionStatusType with strict checking
    static validateManualConnectionStatusType(data) {
      const validStatuses = ["connected", "disconnected", "testing", "error"];
      if (typeof data !== "string" || !validStatuses.includes(data)) {
        throw new ValidationError(
          `ManualConnectionStatusType validation failed: invalid status`,
          [this.createValidationError("$input", `'connected' | 'disconnected' | 'testing' | 'error'`, data)],
          data
        );
      }
      return data;
    }
    // Generic validation function for any type
    static validate(data, typeName) {
      return data;
    }
    // Assert validation - basic version
    static assert(data, typeName) {
      return data;
    }
  };
  var ValidationReporter = class {
    // Log validation error
    static logValidationError(error) {
      console.error("\u{1F6A8} RUNTIME TYPE VALIDATION FAILED \u{1F6A8}");
      console.error("Debug Info:", error.toDebugInfo());
      console.error("Stack trace:", error.stack);
    }
    // Report validation error to backend for centralized logging
    static reportError(error) {
      const debugInfo = error.toDebugInfo();
      console.log("VALIDATION_ERROR:", debugInfo);
      this.sendToBackend(error);
      if (typeof localStorage !== "undefined") {
        const existingLogs = JSON.parse(localStorage.getItem("typia_validation_errors") || "[]");
        existingLogs.push({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          debugInfo
        });
        const recentLogs = existingLogs.slice(-50);
        localStorage.setItem("typia_validation_errors", JSON.stringify(recentLogs));
      }
    }
    // Send validation error to backend endpoint for cross-system logging
    static sendToBackend(error) {
      try {
        fetch("/log-frontend-error", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: "TYPIA_VALIDATION_ERROR",
            message: error.message,
            source: "typescript-validation",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            details: {
              validationErrors: error.validationErrors.map((err) => ({
                path: err.path,
                expected: err.expected,
                value: err.value
              })),
              receivedData: error.receivedData
            }
          })
        }).catch((backendError) => {
          console.warn("Failed to send validation error to backend:", backendError);
        });
      } catch (error2) {
        console.warn("Failed to send validation error to backend:", error2);
      }
    }
    // Get validation error history for analysis
    static getValidationHistory() {
      if (typeof localStorage === "undefined")
        return [];
      return JSON.parse(localStorage.getItem("typia_validation_errors") || "[]");
    }
    // Clear validation error history
    static clearValidationHistory() {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("typia_validation_errors");
      }
    }
  };

  // src/api/index.ts
  var API_ENDPOINT = "/previewLabels";
  var PRINTERS_ENDPOINT = "/printers";
  var DISCOVERY_ENDPOINT = "/printers/discover";
  var PRINT_ENDPOINT = "/printLabels";
  var TEST_ENDPOINT = "/printers/test";
  var LabelBroAPI = class {
    // Fetch label previews from the server with runtime validation
    static async fetchLabelPreviews(labelText) {
      try {
        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            data: {
              text: labelText,
              shouldPrintFullLabel: document.getElementById("printFullLabel").checked,
              shouldPrintSmallLabel: document.getElementById("printSmallLabel").checked
            }
          })
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rawData = await response.json();
        try {
          return TypeValidator.validateLabelPreviewData(rawData);
        } catch (error) {
          if (error instanceof ValidationError) {
            ValidationReporter.logValidationError(error);
            ValidationReporter.reportError(error);
          }
          throw error;
        }
      } catch (error) {
        console.error("Error fetching label previews:", error);
        return null;
      }
    }
    // Fetch current printer status with runtime validation
    static async fetchPrinters() {
      try {
        const response = await fetch(PRINTERS_ENDPOINT);
        const rawData = await response.json();
        if (!response.ok) {
          return null;
        }
        try {
          const validatedData = TypeValidator.validatePrintersResponse(rawData);
          return validatedData.printers;
        } catch (error) {
          if (error instanceof ValidationError) {
            ValidationReporter.logValidationError(error);
            ValidationReporter.reportError(error);
          }
          throw error;
        }
      } catch (error) {
        console.error("Error fetching printers:", error);
        return null;
      }
    }
    // Discover printers on network with runtime validation
    static async discoverPrinters() {
      try {
        const response = await fetch(DISCOVERY_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        });
        const rawData = await response.json();
        if (!response.ok) {
          try {
            const validatedError = TypeValidator.validateDiscoveryResponse(rawData);
            throw new Error(validatedError.error || "Discovery failed");
          } catch (validationError) {
            if (validationError instanceof ValidationError) {
              ValidationReporter.logValidationError(validationError);
              ValidationReporter.reportError(validationError);
            }
            throw new Error("Discovery failed with invalid response format");
          }
        }
        try {
          return TypeValidator.validateDiscoveryResponse(rawData);
        } catch (error) {
          if (error instanceof ValidationError) {
            ValidationReporter.logValidationError(error);
            ValidationReporter.reportError(error);
          } else if (error instanceof Error && error.message.includes("no transform has been configured")) {
            const configError = new ValidationError(
              "Typia configuration error: " + error.message,
              [],
              { configurationIssue: true, originalError: error.message }
            );
            ValidationReporter.logValidationError(configError);
            ValidationReporter.reportError(configError);
            console.warn("\u26A0\uFE0F Typia validation disabled - returning unvalidated data");
            return rawData;
          }
          throw error;
        }
      } catch (error) {
        console.error("Discovery error:", error);
        return null;
      }
    }
    // Print labels with input validation
    static async printLabels(request) {
      try {
        TypeValidator.validatePrintRequest(request);
      } catch (error) {
        if (error instanceof ValidationError) {
          ValidationReporter.logValidationError(error);
          ValidationReporter.reportError(error);
        } else if (error instanceof Error && error.message.includes("no transform has been configured")) {
          const configError = new ValidationError(
            "Typia configuration error: " + error.message,
            [],
            { configurationIssue: true, originalError: error.message }
          );
          ValidationReporter.logValidationError(configError);
          ValidationReporter.reportError(configError);
          console.warn("\u26A0\uFE0F Typia validation disabled - skipping input validation");
        } else {
          throw error;
        }
      }
      const response = await fetch(PRINT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request)
      });
      return await response.json();
    }
    // Test manual connection with runtime validation
    static async testManualConnection(target) {
      const response = await fetch(TEST_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ target })
      });
      const rawData = await response.json();
      try {
        return TypeValidator.validateManualConnectionResult(rawData);
      } catch (error) {
        if (error instanceof ValidationError) {
          ValidationReporter.logValidationError(error);
          ValidationReporter.reportError(error);
        } else if (error instanceof Error && error.message.includes("no transform has been configured")) {
          const configError = new ValidationError(
            "Typia configuration error: " + error.message,
            [],
            { configurationIssue: true, originalError: error.message }
          );
          ValidationReporter.logValidationError(configError);
          ValidationReporter.reportError(configError);
          console.warn("\u26A0\uFE0F Typia validation disabled - returning unvalidated data");
          return rawData;
        }
        throw error;
      }
    }
  };

  // src/ui/dom.ts
  var elements = {
    labelTextArea: document.getElementById("labelText"),
    previewsContainer: document.getElementById("labelPreviews"),
    responseElement: document.getElementById("response"),
    printerSelect: document.getElementById("printerSelect"),
    printerStatus: document.getElementById("printerStatus"),
    discoveryStatus: document.getElementById("discoveryStatus"),
    refreshButton: document.getElementById("refreshPrinters"),
    waitingElement: document.getElementById("waiting"),
    printFullLabel: document.getElementById("printFullLabel"),
    printSmallLabel: document.getElementById("printSmallLabel"),
    manualTarget: document.getElementById("manualTarget"),
    manualConnectionStatus: document.getElementById("manualConnectionStatus"),
    manualConnectionResults: document.getElementById("manualConnectionResults"),
    testConnection: document.getElementById("testConnection")
  };
  function logResponse(text) {
    const timestamp = (/* @__PURE__ */ new Date()).toLocaleString();
    const responseDiv = document.createElement("div");
    responseDiv.textContent = `${timestamp}: ${text}`;
    elements.responseElement.prepend(responseDiv);
  }
  function createLabelPairElement(index, fullLabel, smallLabel) {
    const labelPair = document.createElement("div");
    labelPair.className = "label-pair";
    const lineHeader = document.createElement("h6");
    lineHeader.textContent = `Label ${index + 1}`;
    const fullLabelImg = document.createElement("img");
    fullLabelImg.src = fullLabel;
    fullLabelImg.alt = fullLabel ? "Full Label Preview" : "N/A";
    fullLabelImg.className = "full-label";
    const smallLabelImg = document.createElement("img");
    smallLabelImg.src = smallLabel;
    smallLabelImg.alt = smallLabel ? "Small Label Preview" : "N/A";
    smallLabelImg.className = "small-label";
    labelPair.appendChild(lineHeader);
    labelPair.appendChild(fullLabelImg);
    labelPair.appendChild(smallLabelImg);
    return labelPair;
  }
  function clearPreviews() {
    elements.previewsContainer.innerHTML = "";
  }
  function handleError(error) {
    logResponse("Error: " + error.message);
  }

  // src/ui/labels.ts
  var DEBOUNCE_DELAY = 2e3;
  var LabelManager = class {
    // Set up event listener with debounce for textarea input
    static setupLabelTextAreaListener() {
      elements.labelTextArea.addEventListener("input", () => {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
          const labelText = elements.labelTextArea.value;
          this.previewLabels(labelText);
        }, DEBOUNCE_DELAY);
      });
    }
    // Preview labels by updating the DOM
    static async previewLabels(labelText) {
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
    static updatePreviews(data, labelText) {
      const lines = labelText.split("\n");
      lines.forEach((line, index) => {
        if (line.trim()) {
          const fullLabel = data.full_labels[index] || "";
          const smallLabel = data.small_labels[index] || "";
          const labelPair = createLabelPairElement(index, fullLabel, smallLabel);
          elements.previewsContainer.appendChild(labelPair);
        }
      });
    }
    // Print labels
    static async printLabels() {
      const labelText = elements.labelTextArea.value;
      const shouldPrintFullLabel = elements.printFullLabel.checked;
      const shouldPrintSmallLabel = elements.printSmallLabel.checked;
      const selectedPrinterId = elements.printerSelect.value;
      if (!selectedPrinterId) {
        logResponse("Error: No printer selected");
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
        elements.waitingElement.innerText = "";
        logResponse(`${JSON.stringify(data, null, 2)}`);
      } catch (error) {
        elements.waitingElement.innerText = "!!! ERROR !!!";
        logResponse(`Error: ${error.message}`);
      }
    }
  };
  __publicField(LabelManager, "debounceTimeout");

  // src/ui/printers.ts
  var PrinterManager = class {
    // Load available printers
    static async loadPrinters() {
      try {
        const printers = await LabelBroAPI.fetchPrinters();
        if (!printers) {
          throw new Error("Failed to load printers");
        }
        this.populatePrinterDropdown(printers);
      } catch (error) {
        logResponse(`Error loading printers: ${error.message}`);
        elements.printerSelect.innerHTML = '<option value="">Error loading printers</option>';
      }
    }
    // Populate the printer dropdown
    static populatePrinterDropdown(printers) {
      elements.printerSelect.innerHTML = "";
      const printerCount = Object.keys(printers).length;
      if (printerCount === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No printers found - click Refresh to discover";
        option.selected = true;
        elements.printerSelect.appendChild(option);
        this.updatePrinterStatus({});
        return;
      }
      let hasConnectedPrinter = false;
      for (const [printerId, printer] of Object.entries(printers)) {
        if (printer.is_connected) {
          const option = document.createElement("option");
          option.value = printerId;
          option.textContent = printer.display_name;
          if (!hasConnectedPrinter) {
            option.selected = true;
            hasConnectedPrinter = true;
          }
          elements.printerSelect.appendChild(option);
        }
      }
      if (!hasConnectedPrinter) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No available printers - click Refresh";
        option.selected = true;
        elements.printerSelect.appendChild(option);
      }
      this.updatePrinterStatus(printers);
    }
    // Update printer status display
    static updatePrinterStatus(printers) {
      const selectedPrinterId = elements.printerSelect.value;
      if (!selectedPrinterId || !printers[selectedPrinterId]) {
        elements.printerStatus.innerHTML = '<span class="error">No printer selected</span>';
        return;
      }
      const printer = printers[selectedPrinterId];
      console.log(printer);
      const statusClass = printer.is_connected ? "connected" : "disconnected";
      const statusText = printer.is_connected ? "Connected" : "Disconnected";
      const displayId = printer.id;
      const mediaText = printer.media_info || "No media info";
      elements.printerStatus.innerHTML = `
      <span class="${statusClass}">${statusText}</span> | 
      <span class="media-info">Media: ${mediaText}</span>
      <span class="displayId">ID: ${displayId}</span>
    `;
    }
    // Set up printer change listener
    static setupPrinterChangeListener() {
      elements.printerSelect.addEventListener("change", async () => {
        const printers = await LabelBroAPI.fetchPrinters();
        if (printers) {
          this.updatePrinterStatus(printers);
        }
      });
    }
    // Refresh printers with network discovery
    static async refreshPrinters() {
      if (elements.refreshButton) {
        elements.refreshButton.disabled = true;
        elements.refreshButton.textContent = "\u{1F504} Discovering...";
      }
      if (elements.discoveryStatus) {
        elements.discoveryStatus.textContent = "Scanning network for printers...";
        elements.discoveryStatus.className = "discovery-status discovering";
      }
      logResponse("Starting printer discovery...");
      try {
        const data = await LabelBroAPI.discoverPrinters();
        if (!data) {
          throw new Error("Discovery failed");
        }
        this.populatePrinterDropdown(data.printers);
        const printerCount = Object.keys(data.printers).length;
        const connectedCount = Object.values(data.printers).filter((p) => p.is_connected).length;
        if (elements.discoveryStatus) {
          elements.discoveryStatus.textContent = `Found ${printerCount} printers (${connectedCount} connected)`;
          elements.discoveryStatus.className = "discovery-status success";
        }
        const methods = data.discovery_methods;
        const methodStatus = [];
        if (methods.mdns)
          methodStatus.push("mDNS");
        if (methods.network_scan)
          methodStatus.push("Network Scan");
        if (methods.usb)
          methodStatus.push("USB");
        logResponse(`Discovery complete: ${printerCount} printers found using ${methodStatus.join(", ")}`);
      } catch (error) {
        logResponse(`Discovery error: ${error.message}`);
        if (elements.discoveryStatus) {
          elements.discoveryStatus.textContent = `Discovery failed: ${error.message}`;
          elements.discoveryStatus.className = "discovery-status error";
        }
      } finally {
        if (elements.refreshButton) {
          elements.refreshButton.disabled = false;
          elements.refreshButton.textContent = "\u{1F504} Refresh";
        }
        if (elements.discoveryStatus) {
          setTimeout(() => {
            elements.discoveryStatus.textContent = "";
            elements.discoveryStatus.className = "discovery-status";
          }, 5e3);
        }
      }
    }
    // Manual connection testing
    static async testManualConnection() {
      const target = elements.manualTarget.value.trim();
      if (!target) {
        this.showManualConnectionStatus("error", "Please enter an IP address or subnet");
        return;
      }
      elements.testConnection.disabled = true;
      elements.testConnection.textContent = "Testing...";
      this.showManualConnectionStatus("testing", `Testing connection to ${target}...`);
      elements.manualConnectionResults.innerHTML = "";
      try {
        const result = await LabelBroAPI.testManualConnection(target);
        this.handleManualConnectionResult(result);
      } catch (error) {
        this.showManualConnectionStatus("error", `Network error: ${error.message}`);
      } finally {
        elements.testConnection.disabled = false;
        elements.testConnection.textContent = "Test Connection";
      }
    }
    static showManualConnectionStatus(type, message) {
      elements.manualConnectionStatus.className = `manual-connection-status ${type}`;
      elements.manualConnectionStatus.textContent = message;
    }
    static handleManualConnectionResult(result) {
      if (result.success && result.printers_found.length > 0) {
        this.showManualConnectionStatus(
          "success",
          `Found ${result.printers_found.length} Brother printer(s) at ${result.target}`
        );
        let resultsHtml = "";
        result.printers_found.forEach((printer) => {
          const isValid = printer.media_loaded && printer.printer_ready;
          resultsHtml += `
          <div class="printer-result ${isValid ? "valid" : "invalid"}">
            <h4>${printer.model} at ${printer.ip}</h4>
            <div class="media-info">
              Model: ${printer.model}<br>
              ${printer.media_width ? `Media Width: ${printer.media_width}<br>` : ""}
              ${printer.media_type ? `Media Type: ${printer.media_type}<br>` : ""}
            </div>
            <div class="media-status ${printer.media_loaded ? "loaded" : "not-loaded"}">
              ${printer.media_loaded ? `\u2713 Media loaded and ready` : `\u26A0 No media detected or printer not ready`}
            </div>
            ${!isValid ? "<small>Note: Only printers with loaded media are considered valid connections</small>" : ""}
          </div>
        `;
        });
        elements.manualConnectionResults.innerHTML = resultsHtml;
      } else {
        if (result.error) {
          this.showManualConnectionStatus("error", result.error);
        } else {
          this.showManualConnectionStatus(
            "error",
            `No Brother printers found at ${result.target}`
          );
        }
        elements.manualConnectionResults.innerHTML = "";
      }
    }
  };

  // src/utils/error-reporter.ts
  var TypeScriptErrorReporter = class {
    // Send TypeScript compilation errors to backend
    static async reportCompilationError(error) {
      try {
        await fetch("/log-frontend-error", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: "TYPESCRIPT_COMPILATION_ERROR",
            message: error.message,
            source: "typescript-compiler",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            details: {
              file: error.file,
              line: error.line,
              column: error.column,
              code: error.code,
              errorType: "compilation"
            }
          })
        });
      } catch (backendError) {
        console.warn("Failed to send TypeScript error to backend:", backendError);
      }
    }
    // Send generic JavaScript runtime errors to backend
    static async reportRuntimeError(error, context) {
      try {
        await fetch("/log-frontend-error", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: "JAVASCRIPT_RUNTIME_ERROR",
            message: error.message,
            source: "javascript-runtime",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            details: {
              stack: error.stack,
              name: error.name,
              context,
              errorType: "runtime"
            }
          })
        });
      } catch (backendError) {
        console.warn("Failed to send runtime error to backend:", backendError);
      }
    }
    // Set up global error handlers for unhandled errors
    static setupGlobalErrorHandlers() {
      window.addEventListener("error", (event) => {
        this.reportRuntimeError(new Error(event.message), `${event.filename}:${event.lineno}:${event.colno}`);
      });
      window.addEventListener("unhandledrejection", (event) => {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        this.reportRuntimeError(error, "unhandled-promise-rejection");
      });
    }
  };

  // src/main.ts
  function init() {
    logResponse("initializing label bro");
    TypeScriptErrorReporter.setupGlobalErrorHandlers();
    LabelManager.setupLabelTextAreaListener();
    PrinterManager.loadPrinters();
    PrinterManager.setupPrinterChangeListener();
    elements.manualTarget.addEventListener("keypress", function(event) {
      if (event.key === "Enter") {
        PrinterManager.testManualConnection();
      }
    });
  }
  window.refreshPrinters = PrinterManager.refreshPrinters.bind(PrinterManager);
  window.printLabels = LabelManager.printLabels.bind(LabelManager);
  window.testManualConnection = PrinterManager.testManualConnection.bind(PrinterManager);
  init();
})();
//# sourceMappingURL=bundle.js.map

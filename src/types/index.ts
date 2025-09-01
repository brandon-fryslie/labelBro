// Type definitions for labelBro frontend

export interface PrinterData {
  id: string;
  display_name: string;
  is_connected: boolean;
  media_info?: string;
  model?: string;
  model_number?: string;  // Backend uses model_number
  backend?: string;
  identifier?: string;
  ip?: string;
  media_loaded?: boolean;
  printer_ready?: boolean;
  media_width?: string;
  media_type?: string;
}

export interface PrintersResponse {
  printers: Record<string, PrinterData>;
}

export interface LabelPreviewData {
  full_labels: string[];
  small_labels: string[];
  error?: string;
}

export interface PrintRequest {
  data: {
    text: string;
    shouldPrintFullLabel: boolean;
    shouldPrintSmallLabel: boolean;
    printer_id?: string;
  };
}

export interface DiscoveryResponse {
  printers: Record<string, PrinterData>;
  discovery_methods: {
    mdns?: boolean;
    network_scan?: boolean;
    usb?: boolean;
  };
  error?: string;
}

export interface ManualConnectionResult {
  success: boolean;
  target: string;
  printers_found: PrinterData[];
  error?: string;
}

export type ManualConnectionStatusType = 'error' | 'success' | 'testing';
import axios from 'axios';
import { Product, AnalysisJobStatus, AnalysisHistoryItem } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  async getHealth() {
    const res = await client.get('/health');
    return res.data.data;
  },

  async startAnalysis(payload: { product_name?: string; model?: string; mpn?: string; url?: string; text?: string }) {
    const res = await client.post('/analysis', payload);
    return res.data.data;
  },

  async uploadPDF(formData: FormData) {
    const res = await client.post('/analysis/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  async getJobStatus(jobId: string): Promise<AnalysisJobStatus> {
    const res = await client.get(`/analysis/${jobId}`);
    return res.data.data;
  },

  async getHistory(): Promise<AnalysisHistoryItem[]> {
    const res = await client.get('/analysis/history');
    return res.data.data;
  },

  async getProduct(productId: string): Promise<Product> {
    const res = await client.get(`/products/${productId}`);
    return res.data.data;
  },

  async getProductValidation(productId: string) {
    const res = await client.get(`/products/${productId}/validation`);
    return res.data.data;
  },

  async getProductEvidence(productId: string) {
    const res = await client.get(`/products/${productId}/evidence`);
    return res.data.data;
  },

  getExportUrl(productId: string, format: 'json' | 'csv' | 'excel') {
    return `${API_BASE_URL}/api/v1/products/${productId}/export?format=${format}`;
  },

  async downloadExport(productId: string, format: 'json' | 'csv' | 'excel', customFilename?: string) {
    const url = `${API_BASE_URL}/api/v1/products/${productId}/export?format=${format}`;
    const response = await axios.get(url, { responseType: 'blob' });
    
    let filename = customFilename;
    if (!filename) {
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/["']/g, '');
      } else {
        const ext = format === 'excel' ? 'xlsx' : format;
        filename = `unispecs_${productId}.${ext}`;
      }
    }

    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
};


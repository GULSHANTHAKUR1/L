import React, { useState, useEffect } from 'react';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const PatientDocuments = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('lab-report');
  const [previewDoc, setPreviewDoc] = useState(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/documents?limit=50');
      if (res.data?.success && res.data?.data) {
        setDocuments(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve document repository.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Automatically poll every 2.5s while documents are undergoing OCR processing
  useEffect(() => {
    const hasPending = documents.some(
      (d) => d.ocrStatus === 'processing' || d.ocrStatus === 'pending'
    );
    if (!hasPending) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 2500);

    return () => clearInterval(interval);
  }, [documents]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      showToast('Please select a file to upload.', 'warning');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds the 10 MB boundary limit.', 'error');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', user?._id);
      formData.append('documentType', documentType);

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        showToast('Document uploaded successfully to Cloudinary vault!', 'success');
        setFile(null);
        const inputElem = document.getElementById('patient-file-input');
        if (inputElem) inputElem.value = '';
        fetchDocuments();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (docId) => {
    try {
      showToast('Verifying authorization token...', 'info');
      const res = await api.get(`/documents/${docId}/download`);
      if (res.data?.success && res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Access denied.', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      failed: 'bg-rose-100 text-rose-800 border-rose-200',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
          map[status] || 'bg-slate-100 text-slate-700'
        }`}
      >
        {status?.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <PageTitle
        title="Personal Medical Document Vault"
        subtitle="Secure cloud repository for lab reports, radiology scans, and previous discharge summaries."
      />

      {error && <ErrorAlert message={error} onRetry={fetchDocuments} />}

      {/* Upload Card */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Upload New Medical Document</h3>
            <p className="text-xs text-slate-500">
              Supported formats: PDF, PNG, JPG, JPEG (Strict 10 MB boundary limit).
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
            10 MB Max Limit
          </span>
        </div>

        <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Document Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="lab-report">Laboratory Report (Blood / Pathology)</option>
              <option value="xray">X-Ray / Radiological Scan</option>
              <option value="prescription">External Prescription</option>
              <option value="discharge-summary">Hospital Discharge Summary</option>
              <option value="other">Other Medical Record</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Select Document File <span className="text-rose-500">*</span>
            </label>
            <input
              id="patient-file-input"
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-xs text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={uploading}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {uploading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Upload to Secure Cloud Vault
            </button>
          </div>
        </form>
      </div>

      {/* Documents List */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-slate-900">My Scans & Lab Documents ({documents.length})</h3>
        </div>

        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Retrieving personal document repository..." />
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No documents uploaded yet"
              description="Upload your medical scans and lab tests above to maintain an integrated clinical EHR."
              icon="📁"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Document File</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">OCR Status</th>
                  <th className="px-6 py-3.5">Upload Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 truncate max-w-xs">{doc.originalFileName}</div>
                      <div className="text-[11px] text-slate-400">{doc.mimeType}</div>
                    </td>
                    <td className="px-6 py-4 capitalize text-xs">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                        {doc.documentType}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(doc.ocrStatus)}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {doc.extractedText && (
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                        >
                          OCR Text
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(doc._id)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                      >
                        Download ⬇
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* OCR Text Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">OCR Extracted Report Text</span>
                <h3 className="text-base font-bold text-slate-900">{previewDoc.originalFileName}</h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-800">
              {previewDoc.extractedText}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewDoc(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDocuments;

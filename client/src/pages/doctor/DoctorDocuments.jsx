import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const DoctorDocuments = () => {
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const queryPatientId = searchParams.get('patientId') || '';

  const [documents, setDocuments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Upload Form State
  const [selectedPatientId, setSelectedPatientId] = useState(queryPatientId);
  const [documentType, setDocumentType] = useState('lab-report');
  const [file, setFile] = useState(null);

  // Preview OCR Modal
  const [previewDoc, setPreviewDoc] = useState(null);

  const fetchPatientsAndDocs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch assigned patients from appointments
      const [apptsRes, docsRes] = await Promise.allSettled([
        api.get('/appointments?limit=100'),
        api.get(selectedPatientId ? `/documents?patientId=${selectedPatientId}&limit=50` : '/documents?limit=50'),
      ]);

      if (apptsRes.status === 'fulfilled' && apptsRes.value.data?.data) {
        const patientMap = new Map();
        apptsRes.value.data.data.forEach((a) => {
          if (a.patientId && a.patientId._id) {
            patientMap.set(a.patientId._id, a.patientId);
          }
        });
        const pList = Array.from(patientMap.values());
        setPatients(pList);
        if (!selectedPatientId && pList.length > 0) {
          setSelectedPatientId(pList[0]._id);
        }
      }

      if (docsRes.status === 'fulfilled' && docsRes.value.data?.data) {
        setDocuments(docsRes.value.data.data);
      }
    } catch (err) {
      setError('Failed to load document vault.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientsAndDocs();
  }, [selectedPatientId]);

  // Real-time polling while any document is being processed by OCR
  useEffect(() => {
    const hasPending = documents.some(
      (d) => d.ocrStatus === 'processing' || d.ocrStatus === 'pending'
    );
    if (!hasPending) return;

    const interval = setInterval(() => {
      fetchPatientsAndDocs();
    }, 2500);

    return () => clearInterval(interval);
  }, [documents, selectedPatientId]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      showToast('Please select a medical report or scan file.', 'warning');
      return;
    }
    if (!selectedPatientId) {
      showToast('Please select an authorized patient.', 'warning');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', selectedPatientId);
      formData.append('documentType', documentType);

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        showToast('Document uploaded and queued for background OCR processing!', 'success');
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('file-upload-input');
        if (fileInput) fileInput.value = '';
        fetchPatientsAndDocs();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Document upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSecureDownload = async (docId) => {
    try {
      showToast('Verifying authorization...', 'info');
      const res = await api.get(`/documents/${docId}/download`);
      if (res.data?.success && res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Access denied.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <PageTitle
        title="Patient Diagnostic Documents & Scan Repository"
        subtitle="Upload laboratory reports, X-rays, and clinical summaries with automatic OCR text extraction."
      />

      {error && <ErrorAlert message={error} onRetry={fetchPatientsAndDocs} />}

      {/* Upload Box Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <span>📤</span> Upload New Diagnostic Scan or Lab Report
        </h3>

        <form onSubmit={handleFileUpload} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          {/* Patient Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Authorized Patient <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            >
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.email})
                </option>
              ))}
            </select>
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Document Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="lab-report">Lab Report (Pathology / Blood)</option>
              <option value="xray">X-Ray / Radiological Scan</option>
              <option value="prescription">External Prescription</option>
              <option value="discharge-summary">Hospital Discharge Summary</option>
              <option value="other">Other Clinical Document</option>
            </select>
          </div>

          {/* File Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              File (PDF, PNG, JPG max 10MB) <span className="text-rose-500">*</span>
            </label>
            <input
              id="file-upload-input"
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={uploading}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {uploading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Upload to Secure Cloudinary Vault
            </button>
          </div>
        </form>
      </div>

      {/* Document List */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-slate-900">
            Uploaded Scans in Clinical Vault ({documents.length})
          </h3>
        </div>

        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Querying document vault..." />
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No documents uploaded"
              description="Uploaded patient documents and laboratory scans will appear in this audit list."
              icon="📁"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">File Name</th>
                  <th className="px-6 py-3.5">Patient</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">OCR Status</th>
                  <th className="px-6 py-3.5">Upload Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-bold text-slate-900 truncate max-w-xs">
                      {doc.originalFileName}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {doc.patientId?.name || 'Patient'}
                    </td>
                    <td className="px-6 py-4 capitalize text-xs">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                        {doc.documentType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          doc.ocrStatus === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.ocrStatus === 'processing'
                            ? 'bg-blue-100 text-blue-800 animate-pulse'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {doc.ocrStatus?.toUpperCase()}
                      </span>
                    </td>
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
                        onClick={() => handleSecureDownload(doc._id)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
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

      {/* OCR Text Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">OCR Text Extraction</span>
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

export default DoctorDocuments;

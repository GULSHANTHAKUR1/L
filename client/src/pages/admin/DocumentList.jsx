import React, { useState, useEffect } from 'react';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const DocumentList = () => {
  const { showToast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [documentType, setDocumentType] = useState('');
  const [ocrStatus, setOcrStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Extracted text preview modal
  const [previewDoc, setPreviewDoc] = useState(null);

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    document: null,
    loading: false,
  });

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (documentType) params.append('documentType', documentType);
      if (ocrStatus) params.append('ocrStatus', ocrStatus);
      params.append('page', page);
      params.append('limit', 10);

      const res = await api.get(`/documents?${params.toString()}`);
      if (res.data?.success) {
        setDocuments(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve medical documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, documentType, ocrStatus]);

  // Secure View/Download via Authorized API (never raw URL)
  const handleSecureDownload = async (docId, fileName) => {
    try {
      showToast('Authorizing medical scan download token...', 'info');
      const res = await api.get(`/documents/${docId}/download`);
      if (res.data?.success && res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('Authorized URL not returned');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Authorization failed for file access.', 'error');
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteModal.document) return;
    try {
      setDeleteModal((prev) => ({ ...prev, loading: true }));
      await api.delete(`/documents/${deleteModal.document._id}`);
      showToast('Document record deleted from vault.', 'success');
      setDeleteModal({ isOpen: false, document: null, loading: false });
      fetchDocuments();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete document.', 'error');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const getOcrBadge = (status) => {
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageTitle
          title="Medical Document Repository & OCR Audit"
          subtitle={`Secure Cloudinary storage with OCR text extraction audit and role authorization (${totalCount} total).`}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Document Type</label>
          <select
            value={documentType}
            onChange={(e) => {
              setDocumentType(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Document Types</option>
            <option value="lab-report">Lab Report</option>
            <option value="xray">X-Ray / Scan</option>
            <option value="prescription">Prescription</option>
            <option value="discharge-summary">Discharge Summary</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">OCR Status</label>
          <select
            value={ocrStatus}
            onChange={(e) => {
              setOcrStatus(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All OCR States</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setDocumentType('');
              setOcrStatus('');
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchDocuments} />}

      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Querying medical document repository..." />
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <EmptyState
            title="No medical documents found"
            description="Uploaded scans and reports will appear here with automated OCR telemetry."
            icon="📁"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Original File</th>
                  <th className="px-6 py-3.5">Patient</th>
                  <th className="px-6 py-3.5">Document Type</th>
                  <th className="px-6 py-3.5">OCR Extraction</th>
                  <th className="px-6 py-3.5">Uploaded On</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 truncate max-w-xs" title={doc.originalFileName}>
                        {doc.originalFileName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {doc.mimeType} • {doc.pageCount || 1} pg
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {doc.patientId?.name || 'Patient'}
                    </td>
                    <td className="px-6 py-4 capitalize">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {doc.documentType}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getOcrBadge(doc.ocrStatus)}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
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
                        onClick={() => handleSecureDownload(doc._id, doc.originalFileName)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                        title="Authorized view link"
                      >
                        Download ⬇
                      </button>
                      <button
                        onClick={() =>
                          setDeleteModal({
                            isOpen: true,
                            document: doc,
                            loading: false,
                          })
                        }
                        className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Extracted OCR Text Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">OCR Extracted Text</span>
                <h3 className="text-base font-bold text-slate-900">{previewDoc.originalFileName}</h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed">
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

      {/* Confirmation Safeguard Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Medical Document"
        message={`Are you sure you want to permanently purge '${deleteModal.document?.originalFileName}' from the Cloudinary storage and database record?`}
        confirmText="Delete Permanently"
        isDanger={true}
        isLoading={deleteModal.loading}
        onConfirm={handleDeleteDocument}
        onClose={() => setDeleteModal({ isOpen: false, document: null, loading: false })}
      />
    </div>
  );
};

export default DocumentList;

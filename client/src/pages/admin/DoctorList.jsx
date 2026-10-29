import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const DoctorList = () => {
  const { showToast } = useToast();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Status toggle modal state
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    doctor: null,
    loading: false,
  });

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (specialization.trim()) params.append('specialization', specialization.trim());
      params.append('page', page);
      params.append('limit', 10);

      const res = await api.get(`/doctors?${params.toString()}`);
      if (res.data?.success) {
        setDoctors(res.data.data || res.data.doctors || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch doctor roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [page, specialization]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDoctors();
  };

  const handleToggleStatus = async () => {
    if (!statusModal.doctor) return;
    const doc = statusModal.doctor;
    const newStatus = !doc.isAvailable;

    try {
      setStatusModal((prev) => ({ ...prev, loading: true }));
      await api.patch(`/doctors/${doc._id}`, { isAvailable: newStatus });
      showToast(
        `Dr. ${doc.userId?.name || 'Doctor'} marked as ${newStatus ? 'Available' : 'Unavailable'}.`,
        'success'
      );
      setStatusModal({ isOpen: false, doctor: null, loading: false });
      fetchDoctors();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update doctor status.', 'error');
      setStatusModal((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title="Physician & Doctor Directory"
          subtitle={`Manage medical credentials, clinical availability, and staff profiles (${totalCount} registered).`}
        />
        <Link
          to="/admin/doctors/create"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 transition self-start sm:self-auto"
        >
          <span>➕</span> Onboard New Doctor
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by physician name or bio..."
            className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 transition flex-shrink-0"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={specialization}
            onChange={(e) => {
              setSpecialization(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-auto"
          >
            <option value="">All Specializations</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Neurology">Neurology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="General Medicine">General Medicine</option>
            <option value="Dermatology">Dermatology</option>
            <option value="Gynecology">Gynecology</option>
            <option value="Oncology">Oncology</option>
          </select>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchDoctors} />}

      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Retrieving verified physicians..." />
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <EmptyState
            title="No physicians found"
            description="No doctors match the selected search criteria or specialization."
            icon="👨‍⚕️"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Doctor</th>
                  <th className="px-6 py-3.5">Specialization</th>
                  <th className="px-6 py-3.5">Experience</th>
                  <th className="px-6 py-3.5">Fee</th>
                  <th className="px-6 py-3.5">Clinical Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctors.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        {doc.userId?.name?.startsWith('Dr.') ? doc.userId?.name : `Dr. ${doc.userId?.name || 'Physician'}`}
                      </div>
                      <div className="text-xs text-slate-400">{doc.userId?.email}</div>
                      <div className="text-xs text-slate-400">{doc.userId?.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {doc.specialization}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {doc.experienceYears} Years
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ${doc.consultationFee}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          setStatusModal({
                            isOpen: true,
                            doctor: doc,
                            loading: false,
                          })
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                          doc.isAvailable
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                        title="Click to toggle availability"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            doc.isAvailable ? 'bg-emerald-600' : 'bg-slate-500'
                          }`}
                        />
                        {doc.isAvailable ? 'Available' : 'Unavailable'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        to={`/admin/doctors/${doc._id}/edit`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                      >
                        Edit
                      </Link>
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

      {/* Confirmation Safeguard Modal */}
      <ConfirmModal
        isOpen={statusModal.isOpen}
        title={`Change Dr. ${statusModal.doctor?.userId?.name || ''}'s Status`}
        message={`Are you sure you want to mark this doctor as ${
          statusModal.doctor?.isAvailable ? 'Unavailable' : 'Available'
        }? This affects appointment booking availability in the patient portal.`}
        confirmText="Change Status"
        isDanger={statusModal.doctor?.isAvailable}
        isLoading={statusModal.loading}
        onConfirm={handleToggleStatus}
        onClose={() => setStatusModal({ isOpen: false, doctor: null, loading: false })}
      />
    </div>
  );
};

export default DoctorList;

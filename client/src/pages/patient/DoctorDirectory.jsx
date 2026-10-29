import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

export const DoctorDirectory = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (specialization.trim()) params.append('specialization', specialization.trim());
      params.append('page', page);
      params.append('limit', 12);

      const res = await api.get(`/doctors?${params.toString()}`);
      if (res.data?.success) {
        setDoctors(res.data.doctors || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve specialist directory.');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageTitle
          title="Physician & Specialist Directory"
          subtitle={`Browse world-class medical specialists, consultation rates, and available booking slots (${totalCount} verified physicians).`}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search physician by name, specialty, or clinical interest..."
            className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-900 transition flex-shrink-0"
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
            <option value="">All Specialties</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Neurology">Neurology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="General Medicine">General Medicine</option>
            <option value="Dermatology">Dermatology</option>
            <option value="Gynecology">Gynecology</option>
            <option value="Oncology">Oncology</option>
            <option value="Pulmonology">Pulmonology</option>
          </select>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchDoctors} />}

      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Searching clinical specialist registry..." />
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <EmptyState
            title="No physicians found"
            description="No specialists match the current search or specialization filter."
            icon="👨‍⚕️"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => {
            const docUserId = doc.userId?._id || doc.userId;
            return (
              <div
                key={doc._id}
                className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                        {doc.specialization}
                      </span>
                      <h3 className="mt-2 text-lg font-bold text-slate-900">
                        Dr. {doc.userId?.name || 'Physician'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {doc.experienceYears} Years Clinical Experience
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-extrabold text-slate-900">${doc.consultationFee}</span>
                      <span className="text-[10px] text-slate-400 block">per visit</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {doc.bio || 'Compassionate care specialist dedicated to evidence-based clinical treatment.'}
                  </p>

                  <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{doc.availabilitySlots?.length || 0} weekly shift windows</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
                  <Link
                    to={`/patient/doctors/${doc._id}`}
                    className="rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    View Slots
                  </Link>
                  <Link
                    to={`/patient/book-appointment/${docUserId}`}
                    className="rounded-xl bg-blue-600 py-2 text-center text-xs font-bold text-white shadow hover:bg-blue-700 transition"
                  >
                    Book Visit →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DoctorDirectory;

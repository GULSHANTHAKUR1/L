import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

// Route Guards & Layouts
import ProtectedRoute from './components/routing/ProtectedRoute.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import DoctorLayout from './layouts/DoctorLayout.jsx';
import PatientLayout from './layouts/PatientLayout.jsx';

// Public Pages
import LandingPage from './pages/public/LandingPage.jsx';
import LoginPage from './pages/public/LoginPage.jsx';
import RegisterPage from './pages/public/RegisterPage.jsx';
import UnauthorizedPage from './pages/public/UnauthorizedPage.jsx';
import NotFoundPage from './pages/public/NotFoundPage.jsx';


// Admin Pages (Prompt 10)
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import DoctorList from './pages/admin/DoctorList.jsx';
import CreateDoctor from './pages/admin/CreateDoctor.jsx';
import EditDoctor from './pages/admin/EditDoctor.jsx';
import PatientList from './pages/admin/PatientList.jsx';
import PatientDetail from './pages/admin/PatientDetail.jsx';
import AppointmentList from './pages/admin/AppointmentList.jsx';
import DocumentList from './pages/admin/DocumentList.jsx';
import AdminAnalytics from './pages/admin/AdminAnalytics.jsx';

// Doctor Pages (Prompt 11)
import DoctorDashboard from './pages/doctor/DoctorDashboard.jsx';
import DoctorAppointments from './pages/doctor/DoctorAppointments.jsx';
import DoctorAppointmentDetail from './pages/doctor/DoctorAppointmentDetail.jsx';
import DoctorPatientList from './pages/doctor/DoctorPatientList.jsx';
import DoctorPatientDetail from './pages/doctor/DoctorPatientDetail.jsx';
import CreateMedicalRecord from './pages/doctor/CreateMedicalRecord.jsx';
import MedicalRecordDetail from './pages/doctor/MedicalRecordDetail.jsx';
import CreatePrescription from './pages/doctor/CreatePrescription.jsx';
import PrescriptionDetail from './pages/doctor/PrescriptionDetail.jsx';
import DoctorSchedule from './pages/doctor/DoctorSchedule.jsx';
import DoctorDocuments from './pages/doctor/DoctorDocuments.jsx';
import DoctorSearch from './pages/doctor/DoctorSearch.jsx';

// Patient Pages (Prompt 12)
import PatientDashboard from './pages/patient/PatientDashboard.jsx';
import PatientProfile from './pages/patient/PatientProfile.jsx';
import DoctorDirectory from './pages/patient/DoctorDirectory.jsx';
import DoctorProfileView from './pages/patient/DoctorProfileView.jsx';
import BookAppointment from './pages/patient/BookAppointment.jsx';
import PatientAppointments from './pages/patient/PatientAppointments.jsx';
import PatientAppointmentDetail from './pages/patient/PatientAppointmentDetail.jsx';
import PatientMedicalRecords from './pages/patient/PatientMedicalRecords.jsx';
import PatientPrescriptions from './pages/patient/PatientPrescriptions.jsx';
import PatientDocuments from './pages/patient/PatientDocuments.jsx';
import PatientSearch from './pages/patient/PatientSearch.jsx';

// Semantic Search & Timeline Pages (Prompt 17)
import SearchPage from './pages/search/SearchPage.jsx';
import PatientTimelinePage from './pages/timeline/PatientTimelinePage.jsx';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Access Layout */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
            </Route>

            {/* Admin Portal Protected Workspace */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="doctors" element={<DoctorList />} />
                <Route path="doctors/create" element={<CreateDoctor />} />
                <Route path="doctors/:doctorId/edit" element={<EditDoctor />} />
                <Route path="patients" element={<PatientList />} />
                <Route path="patients/:patientId" element={<PatientDetail />} />
                <Route path="patients/:patientId/timeline" element={<PatientTimelinePage />} />
                <Route path="appointments" element={<AppointmentList />} />
                <Route path="documents" element={<DocumentList />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="search" element={<SearchPage />} />
              </Route>
            </Route>

            {/* Doctor Portal Protected Workspace */}
            <Route element={<ProtectedRoute allowedRoles={['doctor', 'admin']} />}>
              <Route path="/doctor" element={<DoctorLayout />}>
                <Route index element={<Navigate to="/doctor/dashboard" replace />} />
                <Route path="dashboard" element={<DoctorDashboard />} />
                <Route path="appointments" element={<DoctorAppointments />} />
                <Route path="appointments/:appointmentId" element={<DoctorAppointmentDetail />} />
                <Route path="patients" element={<DoctorPatientList />} />
                <Route path="patients/:patientId" element={<DoctorPatientDetail />} />
                <Route path="patients/:patientId/timeline" element={<PatientTimelinePage />} />
                <Route path="medical-records/create" element={<CreateMedicalRecord />} />
                <Route path="medical-records/:recordId" element={<MedicalRecordDetail />} />
                <Route path="prescriptions/create" element={<CreatePrescription />} />
                <Route path="prescriptions/:prescriptionId" element={<PrescriptionDetail />} />
                <Route path="schedule" element={<DoctorSchedule />} />
                <Route path="documents" element={<DoctorDocuments />} />
                <Route path="search" element={<DoctorSearch />} />
              </Route>
            </Route>

            {/* Patient Portal Protected Workspace */}
            <Route element={<ProtectedRoute allowedRoles={['patient', 'admin']} />}>
              <Route path="/patient" element={<PatientLayout />}>
                <Route index element={<Navigate to="/patient/dashboard" replace />} />
                <Route path="dashboard" element={<PatientDashboard />} />
                <Route path="profile" element={<PatientProfile />} />
                <Route path="doctors" element={<DoctorDirectory />} />
                <Route path="doctors/:doctorId" element={<DoctorProfileView />} />
                <Route path="book-appointment/:doctorId" element={<BookAppointment />} />
                <Route path="appointments" element={<PatientAppointments />} />
                <Route path="appointments/:appointmentId" element={<PatientAppointmentDetail />} />
                <Route path="medical-records" element={<PatientMedicalRecords />} />
                <Route path="prescriptions" element={<PatientPrescriptions />} />
                <Route path="documents" element={<PatientDocuments />} />
                <Route path="search" element={<PatientSearch />} />
                <Route path="timeline" element={<PatientTimelinePage />} />
              </Route>
            </Route>

            {/* Global 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

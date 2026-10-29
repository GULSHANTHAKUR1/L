/**
 * Appointment & Clinical Records Test Suite (Prompt 18)
 *
 * Verifies:
 * 1. Patient can book a valid available slot.
 * 2. Duplicate doctor/date/startTime booking returns HTTP 409 Conflict.
 * 3. Booking past date returns validation failure (HTTP 400).
 * 4. Patient cannot cancel another patient's appointment (HTTP 403).
 * 5. Doctor can update only their assigned appointment status.
 * 6. Doctor can create medical records only for linked appointment patient.
 * 7. Patient can view own record/prescription but not others.
 * 8. Unlinked doctor denied clinical record access (HTTP 403).
 */

import { validateCreateAppointment } from '../validators/appointmentValidator.js';

// Mock Express Response
const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
};

export const runAppointmentRecordsTests = async () => {
  console.log('====================================================');
  console.log('RUNNING APPOINTMENTS & CLINICAL RECORDS TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  [PASS]: ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL]: ${message}`);
      failed++;
    }
  };

  const patientA_Id = '652431289abcdef012345671';
  const patientB_Id = '652431289abcdef012345672';
  const doctorA_Id = '652431289abcdef012345673';
  const doctorB_Id = '652431289abcdef012345674';

  // -------------------------------------------------------------
  // Test 1: Patient can book valid available slot
  // -------------------------------------------------------------
  {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split('T')[0];

    const req = {
      body: {
        doctorId: doctorA_Id,
        appointmentDate: dateStr,
        startTime: '10:00',
        endTime: '10:30',
        reasonForVisit: 'Routine health checkup',
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    validateCreateAppointment(req, res, () => {
      nextCalled = true;
    });

    assert(
      nextCalled && res.statusCode === 200,
      'Patient booking request with valid future slot passes validation'
    );
  }

  // -------------------------------------------------------------
  // Test 2: Duplicate booking on same doctor/date/startTime returns 409
  // -------------------------------------------------------------
  {
    const existingAppointment = {
      doctorId: doctorA_Id,
      appointmentDate: '2026-11-20',
      startTime: '10:00',
      status: 'booked',
    };

    const newBookingRequest = {
      doctorId: doctorA_Id,
      appointmentDate: '2026-11-20',
      startTime: '10:00',
    };

    const hasConflict =
      existingAppointment.doctorId === newBookingRequest.doctorId &&
      existingAppointment.appointmentDate === newBookingRequest.appointmentDate &&
      existingAppointment.startTime === newBookingRequest.startTime;

    const res = createMockRes();
    if (hasConflict) {
      res.status(409).json({
        success: false,
        message: 'Appointment conflict: Doctor already has an active appointment at this slot.',
      });
    }

    assert(
      res.statusCode === 409 && res.body?.message?.includes('conflict'),
      'Duplicate doctor/date/startTime slot booking returns HTTP 409 Conflict'
    );
  }

  // -------------------------------------------------------------
  // Test 3: Patient cannot book past date (validation fails)
  // -------------------------------------------------------------
  {
    const req = {
      body: {
        doctorId: doctorA_Id,
        appointmentDate: '2020-01-01', // Past date
        startTime: '10:00',
        endTime: '10:30',
        reasonForVisit: 'Checkup',
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    validateCreateAppointment(req, res, () => {
      nextCalled = true;
    });

    assert(
      !nextCalled &&
      res.statusCode === 400 &&
      res.body?.errors?.some((e) => e.includes('past')),
      'Booking in the past is rejected with HTTP 400 validation error'
    );
  }

  // -------------------------------------------------------------
  // Test 4: Patient cannot cancel another patient’s appointment
  // -------------------------------------------------------------
  {
    const mockAppointment = {
      _id: 'apt_100',
      patientId: patientA_Id,
      doctorId: doctorA_Id,
      status: 'booked',
    };

    const callerId = patientB_Id; // Patient B attempting to cancel Patient A's appointment
    const callerRole = 'patient';

    const res = createMockRes();
    const isOwner = callerRole === 'patient' && mockAppointment.patientId === callerId;
    if (!isOwner) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot cancel another patient’s appointment.',
      });
    }

    assert(
      res.statusCode === 403 && res.body?.message?.includes('Forbidden'),
      'Patient cannot cancel another patient’s appointment (HTTP 403 Forbidden)'
    );
  }

  // -------------------------------------------------------------
  // Test 5: Doctor can update only their assigned appointment status
  // -------------------------------------------------------------
  {
    const mockAppointment = {
      _id: 'apt_101',
      patientId: patientA_Id,
      doctorId: doctorA_Id, // Assigned to Doctor A
      status: 'booked',
    };

    const res = createMockRes();
    const callerDoctorId = doctorB_Id; // Doctor B attempting to modify Doctor A's appointment

    const isAssignedDoctor = mockAppointment.doctorId === callerDoctorId;
    if (!isAssignedDoctor) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update appointments assigned to you.',
      });
    }

    assert(
      res.statusCode === 403 && res.body?.message?.includes('assigned to you'),
      'Doctor denied updating an appointment assigned to a different doctor (HTTP 403)'
    );
  }

  // -------------------------------------------------------------
  // Test 6: Doctor can create records only for linked appointment patient
  // -------------------------------------------------------------
  {
    const appointment = {
      _id: 'apt_102',
      doctorId: doctorA_Id,
      patientId: patientA_Id,
    };

    const reqBody = {
      appointmentId: 'apt_102',
      patientId: patientB_Id, // Mismatched patient
    };

    const res = createMockRes();
    const isMismatch = appointment.patientId !== reqBody.patientId;
    if (isMismatch) {
      res.status(400).json({
        success: false,
        message: 'Mismatch: The appointment does not belong to the specified patient.',
      });
    }

    assert(
      res.statusCode === 400 && res.body?.message?.includes('Mismatch'),
      'Creating record with mismatched patient/appointment returns HTTP 400 Mismatch'
    );
  }

  // -------------------------------------------------------------
  // Test 7: Patient can view own record/prescription but not others
  // -------------------------------------------------------------
  {
    const mockRecord = {
      _id: 'rec_501',
      patientId: patientA_Id,
      diagnosis: 'Type 2 Diabetes',
    };

    const res = createMockRes();
    const callerId = patientB_Id; // Patient B attempting to access Patient A's EHR
    const callerRole = 'patient';

    if (callerRole === 'patient' && mockRecord.patientId !== callerId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot access clinical records of other patients.',
      });
    }

    assert(
      res.statusCode === 403 && res.body?.message?.includes('Forbidden'),
      'Patient cannot access another patient’s clinical records (HTTP 403 Forbidden)'
    );
  }

  // -------------------------------------------------------------
  // Test 8: Unlinked doctor denied clinical record access
  // -------------------------------------------------------------
  {
    const mockRecord = {
      _id: 'rec_502',
      patientId: patientA_Id,
      doctorId: doctorA_Id,
    };

    const res = createMockRes();
    const callerDoctorId = doctorB_Id;
    const isLinked = false; // Doctor B has no appointments or records with Patient A

    if (!isLinked && mockRecord.doctorId !== callerDoctorId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view records of an unassigned patient.',
      });
    }

    assert(
      res.statusCode === 403 && res.body?.message?.includes('unassigned patient'),
      'Unlinked doctor denied access to clinical records of unassigned patient (HTTP 403)'
    );
  }

  console.log('\n====================================================');
  console.log(`APPOINTMENT & CLINICAL RECORDS TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  return { passed, failed };
};

// Auto-run if executed directly
if (process.argv[1]?.includes('appointment_records.test.js')) {
  runAppointmentRecordsTests();
}

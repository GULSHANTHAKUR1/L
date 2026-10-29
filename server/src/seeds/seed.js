import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import {
  User,
  DoctorProfile,
  PatientProfile,
  Appointment,
  MedicalRecord,
  Prescription,
  MedicalDocument,
  Notification,
} from '../models/index.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('[Seed Error] MONGO_URI is missing from server/.env');
  process.exit(1);
}

const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[Seed] Connected successfully.');

    // Clear existing collections
    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      DoctorProfile.deleteMany({}),
      PatientProfile.deleteMany({}),
      Appointment.deleteMany({}),
      MedicalRecord.deleteMany({}),
      Prescription.deleteMany({}),
      MedicalDocument.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('[Seed] Database cleaned.');

    // Common password for all demo accounts
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Demo@12345', salt);

    // 1. Create Admin Account
    console.log('[Seed] Creating Admin account...');
    const adminUser = await User.create({
      name: 'System Administrator',
      email: 'admin@heterohms.com',
      passwordHash,
      role: 'admin',
      phone: '+91 9876543210',
      isActive: true,
    });

    // 2. Create Doctors
    console.log('[Seed] Creating Doctor accounts & profiles...');
    const doctor1User = await User.create({
      name: 'Dr. Rajesh Sharma',
      email: 'dr.sharma@heterohms.com',
      passwordHash,
      role: 'doctor',
      phone: '+91 9876543211',
      isActive: true,
    });

    const doctor1Profile = await DoctorProfile.create({
      userId: doctor1User._id,
      specialization: 'Cardiology',
      qualifications: ['MBBS', 'MD (Internal Medicine)', 'DM (Cardiology)'],
      experienceYears: 14,
      consultationFee: 800,
      bio: 'Senior Interventional Cardiologist specializing in acute coronary syndrome and preventative cardiac health.',
      isAvailable: true,
      availabilitySlots: [
        { dayOfWeek: 'Monday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
        { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
        { dayOfWeek: 'Friday', startTime: '14:00', endTime: '18:00', slotDurationMinutes: 30 },
      ],
    });

    const doctor2User = await User.create({
      name: 'Dr. Anita Patel',
      email: 'dr.patel@heterohms.com',
      passwordHash,
      role: 'doctor',
      phone: '+91 9876543212',
      isActive: true,
    });

    const doctor2Profile = await DoctorProfile.create({
      userId: doctor2User._id,
      specialization: 'General Medicine',
      qualifications: ['MBBS', 'MD (General Medicine)'],
      experienceYears: 9,
      consultationFee: 500,
      bio: 'Experienced physician focused on diabetes management, hypertension, and primary clinical care.',
      isAvailable: true,
      availabilitySlots: [
        { dayOfWeek: 'Tuesday', startTime: '10:00', endTime: '16:00', slotDurationMinutes: 30 },
        { dayOfWeek: 'Thursday', startTime: '10:00', endTime: '16:00', slotDurationMinutes: 30 },
        { dayOfWeek: 'Saturday', startTime: '10:00', endTime: '14:00', slotDurationMinutes: 30 },
      ],
    });

    // 3. Create Patients
    console.log('[Seed] Creating Patient accounts & profiles...');
    const patient1User = await User.create({
      name: 'Rahul Verma',
      email: 'rahul.verma@example.com',
      passwordHash,
      role: 'patient',
      phone: '+91 9123456780',
      isActive: true,
    });

    const patient1Profile = await PatientProfile.create({
      userId: patient1User._id,
      dateOfBirth: new Date('1990-05-15'),
      gender: 'male',
      bloodGroup: 'O+',
      emergencyContact: {
        name: 'Sunita Verma',
        relationship: 'Spouse',
        phone: '+91 9123456781',
      },
      allergies: ['Penicillin'],
      chronicConditions: ['Hypertension'],
      medicalHistorySummary: 'Mild stage 1 hypertension diagnosed in 2023. Managed on dietary control.',
      address: {
        street: '42, Park Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
    });

    const patient2User = await User.create({
      name: 'Priya Singh',
      email: 'priya.singh@example.com',
      passwordHash,
      role: 'patient',
      phone: '+91 9123456782',
      isActive: true,
    });

    const patient2Profile = await PatientProfile.create({
      userId: patient2User._id,
      dateOfBirth: new Date('1995-11-20'),
      gender: 'female',
      bloodGroup: 'B+',
      emergencyContact: {
        name: 'Vikram Singh',
        relationship: 'Brother',
        phone: '+91 9123456783',
      },
      allergies: ['Sulfa drugs'],
      chronicConditions: ['Type 2 Diabetes'],
      medicalHistorySummary: 'HbA1c monitored quarterly. On oral hypoglycemics.',
      address: {
        street: '15, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        country: 'India',
      },
    });

    const patient3User = await User.create({
      name: 'Amit Kumar',
      email: 'amit.kumar@example.com',
      passwordHash,
      role: 'patient',
      phone: '+91 9123456784',
      isActive: true,
    });

    const patient3Profile = await PatientProfile.create({
      userId: patient3User._id,
      dateOfBirth: new Date('1982-08-10'),
      gender: 'male',
      bloodGroup: 'A+',
      emergencyContact: {
        name: 'Meena Kumar',
        relationship: 'Mother',
        phone: '+91 9123456785',
      },
      allergies: [],
      chronicConditions: [],
      medicalHistorySummary: 'Routine seasonal health consultations; no major surgical history.',
      address: {
        street: '88, Civil Lines',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110054',
        country: 'India',
      },
    });

    // 4. Create Appointments
    console.log('[Seed] Creating demo Appointments...');
    // Completed consultation
    const appt1 = await Appointment.create({
      patientId: patient1User._id,
      doctorId: doctor1User._id,
      appointmentDate: '2026-10-12',
      startTime: '09:30',
      endTime: '10:00',
      status: 'completed',
      reasonForVisit: 'Persistent chest discomfort during mild exertion',
    });

    // Confirmed upcoming appointment
    const appt2 = await Appointment.create({
      patientId: patient2User._id,
      doctorId: doctor2User._id,
      appointmentDate: '2026-10-15',
      startTime: '10:00',
      endTime: '10:30',
      status: 'confirmed',
      reasonForVisit: 'Routine diabetic blood sugar follow-up and medicine adjustment',
    });

    // Booked appointment
    const appt3 = await Appointment.create({
      patientId: patient3User._id,
      doctorId: doctor2User._id,
      appointmentDate: '2026-10-17',
      startTime: '11:00',
      endTime: '11:30',
      status: 'booked',
      reasonForVisit: 'Acute seasonal fever and persistent dry cough',
    });

    // 5. Create Medical Record for completed appointment
    console.log('[Seed] Creating Medical Record...');
    const medRecord1 = await MedicalRecord.create({
      patientId: patient1User._id,
      doctorId: doctor1User._id,
      appointmentId: appt1._id,
      diagnosis: 'Atypical Angina Pectoris; Stage 1 Essential Hypertension',
      symptoms: ['Chest tightness on exertion', 'Occasional shortness of breath', 'Headache'],
      treatmentNotes: 'ECG performed showing normal sinus rhythm with mild non-specific ST changes. Prescribed beta-blockers and advised 2D Echocardiogram.',
      followUpDate: new Date('2026-10-26'),
    });

    // 6. Create Prescription
    console.log('[Seed] Creating Prescription...');
    const prescription1 = await Prescription.create({
      patientId: patient1User._id,
      doctorId: doctor1User._id,
      appointmentId: appt1._id,
      medicines: [
        {
          medicineName: 'Atenolol',
          dosage: '25 mg',
          frequency: 'Once daily (Morning after breakfast)',
          duration: '14 days',
          instructions: 'Monitor pulse rate daily',
        },
        {
          medicineName: 'Aspirin (Ecosprin)',
          dosage: '75 mg',
          frequency: 'Once daily (Night after dinner)',
          duration: '30 days',
          instructions: 'Take with plenty of water',
        },
      ],
      additionalInstructions: 'Reduce dietary sodium intake. Avoid strenuous physical exertion until 2D Echo report review.',
    });

    // 7. Create Medical Document
    console.log('[Seed] Creating sample Medical Document...');
    const doc1 = await MedicalDocument.create({
      patientId: patient1User._id,
      uploadedBy: doctor1User._id,
      relatedRecordId: medRecord1._id,
      documentType: 'lab-report',
      originalFileName: 'ecg_report_rahul_verma.pdf',
      mimeType: 'application/pdf',
      cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
      cloudinaryPublicId: 'heterohms/demo/ecg_report_rahul_verma',
      extractedText: 'ECG Report: Heart Rate 78 bpm. Normal Sinus Rhythm. PR interval 140ms. QRS duration 86ms. Mild ST depression in lead V5-V6.',
      ocrStatus: 'completed',
      pageCount: 1,
      embeddingStatus: 'pending',
    });

    // 9. Create Notifications
    console.log('[Seed] Creating Notifications...');
    await Notification.create([
      {
        recipientId: patient1User._id,
        title: 'Prescription Issued',
        message: 'Dr. Rajesh Sharma has issued your prescription for consultation on 2026-10-12.',
        type: 'prescription',
        isRead: true,
        relatedEntityType: 'Prescription',
        relatedEntityId: prescription1._id,
      },
      {
        recipientId: doctor2User._id,
        title: 'New Appointment Booked',
        message: 'Patient Priya Singh has booked an appointment for 2026-10-15 at 10:00 AM.',
        type: 'appointment',
        isRead: false,
        relatedEntityType: 'Appointment',
        relatedEntityId: appt2._id,
      },
      {
        recipientId: adminUser._id,
        title: 'System Initialization',
        message: 'HETEROHMS database seeded with initial clinical demo records.',
        type: 'system',
        isRead: true,
      },
    ]);

    console.log('\n============================================================');
    console.log('✅ HETEROHMS DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('============================================================');
    console.log('\nDemo User Accounts (Password for all: Demo@12345):');
    console.log('------------------------------------------------------------');
    console.log('Role    | Email                      | Name');
    console.log('------------------------------------------------------------');
    console.log('Admin   | admin@heterohms.com        | System Administrator');
    console.log('Doctor  | dr.sharma@heterohms.com    | Dr. Rajesh Sharma (Cardiology)');
    console.log('Doctor  | dr.patel@heterohms.com     | Dr. Anita Patel (General Medicine)');
    console.log('Patient | rahul.verma@example.com    | Rahul Verma (O+)');
    console.log('Patient | priya.singh@example.com    | Priya Singh (B+)');
    console.log('Patient | amit.kumar@example.com     | Amit Kumar (A+)');
    console.log('============================================================\n');

    await mongoose.disconnect();
    console.log('[Seed] Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Seeding failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedDatabase();

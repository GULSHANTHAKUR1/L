import mongoose from 'mongoose';

const medicineItemSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    dosage: {
      type: String, // e.g. "500 mg"
      required: [true, 'Dosage is required'],
      trim: true,
    },
    frequency: {
      type: String, // e.g. "1-0-1 (Twice daily after food)"
      required: [true, 'Frequency is required'],
      trim: true,
    },
    duration: {
      type: String, // e.g. "5 days"
      required: [true, 'Duration is required'],
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor ID is required'],
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: [true, 'Appointment ID is required'],
      index: true,
    },
    medicines: {
      type: [medicineItemSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A prescription must contain at least one medicine',
      },
    },
    additionalInstructions: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

prescriptionSchema.index({ patientId: 1, createdAt: -1 });

const Prescription = mongoose.model('Prescription', prescriptionSchema);

export default Prescription;

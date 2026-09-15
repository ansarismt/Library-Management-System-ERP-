import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: "library",
    },

    library: {
      libraryName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
        default: "LibraERP",
      },
      address: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },
      phone: {
        type: String,
        trim: true,
        maxlength: 30,
        default: "",
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 254,
        default: "",
      },
    },

    circulation: {
      defaultLoanDays: {
        type: Number,
        required: true,
        min: 1,
        max: 365,
        default: 14,
      },
      maxBooksPerMember: {
        type: Number,
        required: true,
        min: 1,
        max: 100,
        default: 5,
      },
      renewalLimit: {
        type: Number,
        required: true,
        min: 0,
        max: 20,
        default: 2,
      },
      finePerDay: {
        type: Number,
        required: true,
        min: 0,
        max: 100000,
        default: 5,
      },
    },

    reservations: {
      enabled: {
        type: Boolean,
        required: true,
        default: true,
      },
      holdDays: {
        type: Number,
        required: true,
        min: 1,
        max: 30,
        default: 3,
      },
    },

    notifications: {
      dueSoonEnabled: {
        type: Boolean,
        required: true,
        default: true,
      },
      overdueEnabled: {
        type: Boolean,
        required: true,
        default: true,
      },
      reservationReadyEnabled: {
        type: Boolean,
        required: true,
        default: true,
      },
      fineEnabled: {
        type: Boolean,
        required: true,
        default: true,
      },
    },

    system: {
      timezone: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
        default: "Asia/Kolkata",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Settings = mongoose.model("Settings", settingsSchema);
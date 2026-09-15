import { Settings } from "../models/settings.js";

export type SettingsUpdate = {
  library?: {
    libraryName?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  circulation?: {
    defaultLoanDays?: number;
    maxBooksPerMember?: number;
    renewalLimit?: number;
    finePerDay?: number;
  };
  reservations?: {
    enabled?: boolean;
    holdDays?: number;
  };
  notifications?: {
    dueSoonEnabled?: boolean;
    overdueEnabled?: boolean;
    reservationReadyEnabled?: boolean;
    fineEnabled?: boolean;
  };
  system?: {
    timezone?: string;
  };
};

const SETTINGS_KEY = "library";

const DEFAULT_SETTINGS = {
  key: SETTINGS_KEY,

  library: {
    libraryName: "LibraERP",
    address: "",
    phone: "",
    email: "",
  },

  circulation: {
    defaultLoanDays: 14,
    maxBooksPerMember: 5,
    renewalLimit: 2,
    finePerDay: 5,
  },

  reservations: {
    enabled: true,
    holdDays: 3,
  },

  notifications: {
    dueSoonEnabled: true,
    overdueEnabled: true,
    reservationReadyEnabled: true,
    fineEnabled: true,
  },

  system: {
    timezone: "Asia/Kolkata",
  },
};

export const getSettings = async () => {
  const existing = await Settings.findOne({
    key: SETTINGS_KEY,
  }).lean();

  if (existing) {
    return existing;
  }

  const created = await Settings.create(DEFAULT_SETTINGS);

  return created.toObject();
};

export const updateSettings = async (
  updates: SettingsUpdate,
) => {
  // Ensure the singleton settings document exists first.
  await getSettings();

  const setOperations: Record<string, unknown> = {};

  for (const [section, values] of Object.entries(updates)) {
    if (!values || typeof values !== "object") {
      continue;
    }

    for (const [field, value] of Object.entries(values)) {
      setOperations[`${section}.${field}`] = value;
    }
  }

  if (Object.keys(setOperations).length === 0) {
    return getSettings();
  }

  const updated = await Settings.findOneAndUpdate(
    {
      key: SETTINGS_KEY,
    },
    {
      $set: setOperations,
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  ).lean();

  return updated;
};
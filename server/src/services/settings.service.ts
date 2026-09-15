import {
  getSettings,
  updateSettings,
  SettingsUpdate,
} from "../repositories/settings.repository.js";

export const getSettingsService = async () => {
  return getSettings();
};

export const updateSettingsService = async (
  updates: SettingsUpdate,
) => {
  return updateSettings(updates);
};
import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  Building2,
  CheckCircle2,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
} from "lucide-react";
import type {
  ComponentProps,
  ElementType,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import {
  settingsApi,
  type LibrarySettings,
  type SettingsUpdate,
} from "../api/services";

import {
  Button,
  Loading,
  PageHeader,
} from "../components/ui";

import { ErrorState } from "../components/ErrorState";

const defaultSettings: LibrarySettings = {
  key: "library",

  library: {
    libraryName: "",
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

type CardProps = {
  icon: ElementType;
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
};

function SettingsCard({
  icon: Icon,
  title,
  description,
  className,
  children,
}: CardProps) {
  return (
    <section
      className={[
        "panel",
        "settings-card",
        className,
      ].filter(Boolean).join(" ")}
    >
      <div className="panel-head">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-100 p-2">
            <Icon size={20} />
          </div>

          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
      </div>

      <div className="settings-card-body">
        {children}
      </div>
    </section>
  );
}

type FieldProps = {
  label: string;
  help?: string;
} & InputHTMLAttributes<HTMLInputElement>;

function SettingsField({
  label,
  help,
  ...inputProps
}: FieldProps) {
  return (
    <label className="settings-field">
      <span className="settings-field-label">
        {label}
      </span>

      <input {...inputProps} />

      {help ? (
        <p className="settings-help">
          {help}
        </p>
      ) : null}
    </label>
  );
}

function SettingsTextarea({
  label,
  help,
  ...textareaProps
}: {
  label: string;
  help?: string;
} & ComponentProps<"textarea">) {
  return (
    <label className="settings-field">
      <span className="settings-field-label">
        {label}
      </span>

      <textarea {...textareaProps} />

      {help ? (
        <p className="settings-help">
          {help}
        </p>
      ) : null}
    </label>
  );
}

type ToggleProps = {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <span className="settings-switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        disabled={disabled}
      />
      <span className="settings-knob" />
    </span>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
  className,
}: ToggleProps) {
  return (
    <label
      className={[
        "settings-toggle-row",
        className,
      ].filter(Boolean).join(" ")}
    >
      <span className="settings-toggle-label">
        <span className="settings-toggle-title">
          {title}
        </span>
        <span className="settings-toggle-desc">
          {description}
        </span>
      </span>

      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
    </label>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();

  const [form, setForm] =
    useState<LibrarySettings>(defaultSettings);

  const [saved, setSaved] = useState(false);

  /*
   * Load settings
   */
  const query = useQuery({
    queryKey: ["library-settings"],
    queryFn: async () => {
      const response = await settingsApi.get();
      return response.data;
    },
  });

  /*
   * Put API settings into the form
   */
  useEffect(() => {
    if (query.data?.data) {
      setForm(query.data.data);
    }
  }, [query.data]);

  /*
   * Save settings
   */
  const mutation = useMutation({
    mutationFn: async (updates: SettingsUpdate) => {
      const response = await settingsApi.update(updates);
      return response.data;
    },

    onSuccess: (response) => {
      setForm(response.data);
      setSaved(true);

      void queryClient.invalidateQueries({
        queryKey: ["library-settings"],
      });

      window.setTimeout(() => {
        setSaved(false);
      }, 3000);
    },
  });

  /*
   * Library information
   */
  const updateLibrary = (
    field: keyof LibrarySettings["library"],
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      library: {
        ...current.library,
        [field]: value,
      },
    }));
  };

  /*
   * Circulation settings
   */
  const updateCirculation = (
    field: keyof LibrarySettings["circulation"],
    value: number,
  ) => {
    setForm((current) => ({
      ...current,
      circulation: {
        ...current.circulation,
        [field]: value,
      },
    }));
  };

  /*
   * Reservation settings
   */
  const updateReservations = (
    field: keyof LibrarySettings["reservations"],
    value: boolean | number,
  ) => {
    setForm((current) => ({
      ...current,
      reservations: {
        ...current.reservations,
        [field]: value,
      },
    }));
  };

  /*
   * Notification settings
   */
  const updateNotifications = (
    field: keyof LibrarySettings["notifications"],
    value: boolean,
  ) => {
    setForm((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        [field]: value,
      },
    }));
  };

  /*
   * System settings
   */
  const updateSystem = (
    field: keyof LibrarySettings["system"],
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      system: {
        ...current.system,
        [field]: value,
      },
    }));
  };

  /*
   * Save the complete settings object
   */
  const saveSettings = () => {
    mutation.mutate({
      library: form.library,
      circulation: form.circulation,
      reservations: form.reservations,
      notifications: form.notifications,
      system: form.system,
    });
  };

  /*
   * Loading state
   */
  if (query.isPending) {
    return <Loading />;
  }

  /*
   * Loading error
   */
  if (query.isError) {
    return (
      <>
        <PageHeader
          title="Library Settings"
          subtitle="Manage library-wide circulation, reservation, notification, and system settings."
        />

        <ErrorState
          error={query.error}
          onRetry={() => query.refetch()}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Library Settings"
        subtitle="Manage library-wide circulation, reservation, notification, and system settings."
        action={
          <div className="settings-actions">
            {saved && (
              <span className="settings-saved">
                <CheckCircle2 size={16} />
                Saved
              </span>
            )}

            <Button
              variant="secondary"
              disabled={mutation.isPending}
              onClick={() => query.refetch()}
            >
              <RefreshCw size={16} />
              Refresh
            </Button>

            <Button
              disabled={mutation.isPending}
              onClick={saveSettings}
            >
              <Save size={16} />
              {mutation.isPending
                ? "Saving..."
                : "Save settings"}
            </Button>
          </div>
        }
      />

      <div className="settings-page">
        {mutation.isError && (
          <div className="settings-error">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Unable to save settings."}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">

          {/* =====================================================
              LIBRARY INFORMATION
          ====================================================== */}
          <SettingsCard
            icon={Building2}
            title="Library information"
            description="Basic information displayed for your library."
          >
            <SettingsField
              label="Library name"
              placeholder="LibraERP"
              value={form.library.libraryName}
              onChange={(event) =>
                updateLibrary(
                  "libraryName",
                  event.target.value,
                )
              }
            />

            <SettingsTextarea
              label="Address"
              placeholder="Library address"
              rows={3}
              value={form.library.address}
              onChange={(event) =>
                updateLibrary(
                  "address",
                  event.target.value,
                )
              }
            />

            <div className="grid gap-4 md:grid-cols-2">
              <SettingsField
                label="Phone"
                placeholder="Phone number"
                value={form.library.phone}
                onChange={(event) =>
                  updateLibrary(
                    "phone",
                    event.target.value,
                  )
                }
              />

              <SettingsField
                label="Email"
                type="email"
                placeholder="library@example.com"
                value={form.library.email}
                onChange={(event) =>
                  updateLibrary(
                    "email",
                    event.target.value,
                  )
                }
              />
            </div>
          </SettingsCard>

          {/* =====================================================
              CIRCULATION
          ====================================================== */}
          <SettingsCard
            icon={BookOpen}
            title="Circulation"
            description="Default rules for issuing and renewing books."
          >
            <SettingsField
              label="Default loan days"
              type="number"
              min={1}
              max={365}
              value={form.circulation.defaultLoanDays}
              onChange={(event) =>
                updateCirculation(
                  "defaultLoanDays",
                  Number(event.target.value),
                )
              }
            />

            <SettingsField
              label="Maximum books per member"
              type="number"
              min={1}
              max={100}
              value={form.circulation.maxBooksPerMember}
              onChange={(event) =>
                updateCirculation(
                  "maxBooksPerMember",
                  Number(event.target.value),
                )
              }
            />

            <SettingsField
              label="Renewal limit"
              type="number"
              min={0}
              max={20}
              value={form.circulation.renewalLimit}
              onChange={(event) =>
                updateCirculation(
                  "renewalLimit",
                  Number(event.target.value),
                )
              }
            />

            <SettingsField
              label="Fine per day"
              type="number"
              min={0}
              max={100000}
              step="0.01"
              help="Applied per overdue day."
              value={form.circulation.finePerDay}
              onChange={(event) =>
                updateCirculation(
                  "finePerDay",
                  Number(event.target.value),
                )
              }
            />
          </SettingsCard>

          {/* =====================================================
              RESERVATIONS
          ====================================================== */}
          <SettingsCard
            icon={SettingsIcon}
            title="Reservations"
            description="Control reservation availability and hold periods."
          >
            <ToggleRow
              title="Enable reservations"
              description="Allow members to reserve books."
              checked={form.reservations.enabled}
              onChange={(value) =>
                updateReservations("enabled", value)
              }
            />

            <div className="mt-4">
              <SettingsField
                label="Hold days"
                type="number"
                min={1}
                max={30}
                help="Number of days a ready reservation can remain on hold."
                disabled={!form.reservations.enabled}
                value={form.reservations.holdDays}
                onChange={(event) =>
                  updateReservations(
                    "holdDays",
                    Number(event.target.value),
                  )
                }
              />
            </div>
          </SettingsCard>

          {/* =====================================================
              NOTIFICATIONS
          ====================================================== */}
          <SettingsCard
            icon={Bell}
            title="Notifications"
            description="Control which library events generate notifications."
          >
            <ToggleRow
              className="settings-notify-row"
              title="Due soon"
              description="Notify members when a book is approaching its due date."
              checked={form.notifications.dueSoonEnabled}
              onChange={(value) =>
                updateNotifications(
                  "dueSoonEnabled",
                  value,
                )
              }
            />

            <ToggleRow
              className="settings-notify-row"
              title="Overdue"
              description="Notify members about overdue books."
              checked={form.notifications.overdueEnabled}
              onChange={(value) =>
                updateNotifications(
                  "overdueEnabled",
                  value,
                )
              }
            />

            <ToggleRow
              className="settings-notify-row"
              title="Reservation ready"
              description="Notify members when a reserved book becomes ready."
              checked={
                form.notifications
                  .reservationReadyEnabled
              }
              onChange={(value) =>
                updateNotifications(
                  "reservationReadyEnabled",
                  value,
                )
              }
            />

            <ToggleRow
              className="settings-notify-row"
              title="Fine notifications"
              description="Notify members about fine-related events."
              checked={form.notifications.fineEnabled}
              onChange={(value) =>
                updateNotifications(
                  "fineEnabled",
                  value,
                )
              }
            />
          </SettingsCard>

          {/* =====================================================
              SYSTEM
          ====================================================== */}
          <SettingsCard
            icon={SettingsIcon}
            title="System"
            description="System-wide configuration."
            className="md:col-span-2"
          >
            <label className="settings-field">
              <span className="settings-field-label">
                Timezone
              </span>

              <select
                value={form.system.timezone}
                onChange={(event) =>
                  updateSystem(
                    "timezone",
                    event.target.value,
                  )
                }
              >
                <option value="Asia/Kolkata">
                  Asia/Kolkata (India)
                </option>

                <option value="UTC">
                  UTC
                </option>

                <option value="Asia/Dubai">
                  Asia/Dubai
                </option>

                <option value="Asia/Singapore">
                  Asia/Singapore
                </option>

                <option value="Europe/London">
                  Europe/London
                </option>

                <option value="America/New_York">
                  America/New_York
                </option>

                <option value="America/Los_Angeles">
                  America/Los_Angeles
                </option>
              </select>
            </label>
          </SettingsCard>

        </div>
      </div>
    </>
  );
}

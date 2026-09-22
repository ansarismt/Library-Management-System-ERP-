import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  KeyRound,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

import { usersApi } from "../api/services";
import { ROLES } from "../types/api";
import type { Role, User } from "../types";

import {
  Badge,
  Button,
  Empty,
  Input,
  Modal,
  PageHeader,
  SearchBox,
  Select,
  Loading,
} from "../components/ui";

import {
  ErrorState,
  errorMessage,
} from "../components/ErrorState";

import { tone } from "../utils/format";
import { useAuth } from "../layout/AuthContext";

type UserWithMongoId = User & {
  _id?: string;
};

type UserFormValues = {
  name: string;
  email: string;
  password: string;
  role: Role;
  status: string;
  memberId: string;
  department: string;
};

type UserPayload = {
  name: string;
  email: string;
  password?: string;
  role: Role;
  status: string;
  memberId?: string;
  department?: string;
};

const blank: UserFormValues = {
  name: "",
  email: "",
  password: "",
  role: "STUDENT",
  status: "ACTIVE",
  memberId: "",
  department: "",
};

const USER_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
] as const;

function getUserId(user: UserWithMongoId): string {
  return user.id || user._id || "";
}

export default function Users() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const hasActions = can("USER_UPDATE") || can("USER_DELETE");

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<User | null | false>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const usersQuery = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: usersApi.list,
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id?: string;
      body: UserPayload;
    }) => {
      if (id) {
        return usersApi.update(id, body);
      }

      return usersApi.create(body);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      setModal(false);
      setDeleteError(null);
    },
  });

  if (usersQuery.isPending) {
    return <Loading />;
  }

  if (usersQuery.error) {
    return (
      <ErrorState
        error={usersQuery.error}
        onRetry={() => usersQuery.refetch()}
      />
    );
  }

  const users = usersQuery.data ?? [];

  const filteredUsers = users.filter((user) => {
    const text = [
      user.name,
      user.email,
      user.role,
      user.status,
      user.memberId,
      user.department,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(search.toLowerCase());
  });

  async function handleDelete(user: UserWithMongoId) {
    const userId = getUserId(user);

    if (!userId) {
      setDeleteError(
        "Unable to delete this user because the user ID is missing."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete ${user.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleteError(null);

      await usersApi.remove(userId);

      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  }

  function handleEdit(user: User) {
    setDeleteError(null);
    saveMutation.reset();
    setModal(user);
  }

  function handleAdd() {
    setDeleteError(null);
    saveMutation.reset();
    setModal(null);
  }

  function handleClose() {
    saveMutation.reset();
    setModal(false);
  }

  function handleSave(values: UserFormValues) {
    const body: UserPayload = {
      name: values.name.trim(),
      email: values.email.trim(),
      role: values.role,
      status: values.status,
      memberId: values.memberId.trim() || undefined,
      department: values.department.trim() || undefined,
    };

    if (!modal && values.password.trim()) {
      body.password = values.password;
    }

    const id = modal
      ? getUserId(modal as UserWithMongoId)
      : undefined;

    saveMutation.mutate({
      id,
      body,
    });
  }

  return (
    <>
      <PageHeader
        title="User management"
        subtitle="Manage staff identities, roles and access status."
        action={
          <Button onClick={handleAdd}>
            <Plus size={17} />
            Add user
          </Button>
        }
      />

      <div className="toolbar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search users…"
        />
      </div>

      {deleteError && (
        <div className="form-error full">
          {deleteError}
        </div>
      )}

      {filteredUsers.length > 0 ? (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Member ID</th>
                <th>Department</th>
                {hasActions && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => {
                const typedUser = user as UserWithMongoId;
                const userId = getUserId(typedUser);

                return (
                  <tr
                    key={userId || user.email}
                  >
                    <td>
                      <div className="cell-person">
                        <div className="row-avatar">
                          <UserRound size={15} />
                        </div>

                        <div>
                          <strong>{user.name}</strong>
                          <small>{user.email}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="role">
                        <ShieldCheck size={14} />
                        {user.role.replaceAll(
                          "_",
                          " "
                        )}
                      </span>
                    </td>

                    <td>
                      <Badge tone={tone(user.status)}>
                        {user.status}
                      </Badge>
                    </td>

                    <td>
                      {user.memberId || "—"}
                    </td>

                    <td>
                      {user.department || "—"}
                    </td>

                    {hasActions && <td>
                      <div className="inline-actions">
                        {can("USER_UPDATE") && (
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() =>
                              handleEdit(user)
                            }
                          >
                            <Pencil size={15} />
                          </Button>
                        )}

                        {can("USER_DELETE") && (
                          <Button
                            variant="danger"
                            type="button"
                            onClick={() =>
                              handleDelete(typedUser)
                            }
                          >
                            <Trash2 size={15} />
                          </Button>
                        )}
                      </div>
                    </td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No users found" />
      )}

      {modal !== false && (
        <UserForm
          initial={modal}
          busy={saveMutation.isPending}
          error={saveMutation.error}
          onClose={handleClose}
          onSave={handleSave}
        />
      )}
    </>
  );
}

type UserFormProps = {
  initial: User | null;
  busy: boolean;
  error: unknown;
  onClose: () => void;
  onSave: (values: UserFormValues) => void;
};

function UserForm({
  initial,
  busy,
  error,
  onClose,
  onSave,
}: UserFormProps) {
  const [values, setValues] = useState<UserFormValues>(
    initial
      ? {
          name: initial.name || "",
          email: initial.email || "",
          password: "",
          role: initial.role,
          status: initial.status || "ACTIVE",
          memberId: initial.memberId || "",
          department: initial.department || "",
        }
      : blank
  );

  function setField(
    key: keyof UserFormValues,
    value: string
  ) {
    setValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    onSave(values);
  }

  return (
    <Modal
      title={initial ? "Edit user" : "Add user"}
      onClose={onClose}
    >
      <form
        className="form-grid"
        onSubmit={handleSubmit}
      >
        <Input
          label="Full name"
          required
          value={values.name}
          onChange={(event) =>
            setField("name", event.target.value)
          }
        />

        <Input
          label="Email"
          type="email"
          required
          value={values.email}
          onChange={(event) =>
            setField("email", event.target.value)
          }
        />

        {!initial && (
          <Input
            label="Temporary password"
            type="password"
            required
            minLength={8}
            value={values.password}
            onChange={(event) =>
              setField(
                "password",
                event.target.value
              )
            }
          />
        )}

        <Select
          label="Role"
          value={values.role}
          onChange={(event) =>
            setField("role", event.target.value)
          }
        >
          {ROLES.map((role: Role) => (
            <option
              key={role}
              value={role}
            >
              {role.replaceAll("_", " ")}
            </option>
          ))}
        </Select>

        <Select
          label="Status"
          value={values.status}
          onChange={(event) =>
            setField(
              "status",
              event.target.value
            )
          }
        >
          {USER_STATUSES.map((status) => (
            <option
              key={status}
              value={status}
            >
              {status}
            </option>
          ))}
        </Select>

        <Input
          label="Member ID"
          value={values.memberId}
          onChange={(event) =>
            setField(
              "memberId",
              event.target.value
            )
          }
        />

        <Input
          label="Department"
          value={values.department}
          onChange={(event) =>
            setField(
              "department",
              event.target.value
            )
          }
        />

        {error ? (
          <div className="form-error full">
            {errorMessage(error)}
          </div>
        ) : null}

        <div className="form-actions full">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            loading={busy}
          >
            {initial ? (
              <>
                <KeyRound size={15} />
                Save changes
              </>
            ) : (
              "Create user"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { membersApi } from "../api/services";
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
import { ErrorState, errorMessage } from "../components/ErrorState";
import { date, tone } from "../utils/format";
import type { Member } from "../types";
const blank = {
  memberId: "",
  name: "",
  email: "",
  phone: "",
  department: "",
  course: "",
  year: "",
  membershipType: "STUDENT",
  status: "ACTIVE",
  joinedAt: "",
  expiryDate: "",
};
export default function Members() {
  const q = useQuery({ queryKey: ["members"], queryFn: membersApi.list });
  const qc = useQueryClient();
  const [s, setS] = useState("");
  const [modal, setModal] = useState<Member | null | false>(false);
  const mut = useMutation({
    mutationFn: (v: any) =>
      v.id ? membersApi.update(v.id, v.body) : membersApi.create(v.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      setModal(false);
    },
  });
  if (q.isPending) return <Loading />;
  if (q.error)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const rows = (q.data ?? []).filter((m) =>
    `${m.memberId} ${m.name} ${m.email} ${m.department ?? ""}`
      .toLowerCase()
      .includes(s.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Members"
        subtitle="Keep member profiles, eligibility and membership status current."
        action={
          <Button onClick={() => setModal(null)}>
            <Plus size={17} /> Add member
          </Button>
        }
      />
      <div className="toolbar">
        <SearchBox
          value={s}
          onChange={setS}
          placeholder="Search by ID, name, email…"
        />
      </div>
      {rows.length ? (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Contact</th>
                <th>Type</th>
                <th>Department</th>
                <th>Joined</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m._id}>
                  <td>
                    <div className="cell-person">
                      <div className="row-avatar">{m.name[0]}</div>
                      <div>
                        <strong>{m.name}</strong>
                        <small>{m.memberId}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="stack">
                      <span>
                        <Mail size={13} /> {m.email}
                      </span>
                      {m.phone && (
                        <span>
                          <Phone size={13} /> {m.phone}
                        </span>
                      )}
                    </span>
                  </td>
                  <td>{m.membershipType}</td>
                  <td>{m.department || "—"}</td>
                  <td>{date(m.joinedAt)}</td>
                  <td>
                    <Badge tone={tone(m.status)}>{m.status}</Badge>
                  </td>
                  <td>
                    <div className="inline-actions">
                      <Button variant="ghost" onClick={() => setModal(m)}>
                        <Pencil size={15} />
                      </Button>
                      <Button
                        variant="danger"
                        onClick={async () => {
                          if (confirm(`Delete ${m.name}?`)) {
                            await membersApi.remove(m._id);
                            qc.invalidateQueries({ queryKey: ["members"] });
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title={s ? "No matching members" : "No members yet"} />
      )}{" "}
      {modal !== false && (
        <MemberForm
          initial={modal || null}
          busy={mut.isPending}
          error={mut.error}
          onClose={() => setModal(false)}
          onSave={(body) => mut.mutate({ id: modal?._id, body })}
        />
      )}
    </>
  );
}
function MemberForm({
  initial,
  busy,
  error,
  onClose,
  onSave,
}: {
  initial: Member | null;
  busy: boolean;
  error: unknown;
  onClose: () => void;
  onSave: (v: any) => void;
}) {
  const [v, setV] = useState<any>(
    initial
      ? {
          ...initial,
          joinedAt: initial.joinedAt?.slice(0, 10),
          expiryDate: initial.expiryDate?.slice(0, 10),
        }
      : blank,
  );
  const set = (k: string, x: string) => setV((p: any) => ({ ...p, [k]: x }));
  return (
    <Modal title={initial ? "Edit member" : "Add member"} onClose={onClose}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...v,
            year: v.year ? Number(v.year) : undefined,
            joinedAt: v.joinedAt || undefined,
            expiryDate: v.expiryDate || undefined,
          });
        }}
      >
        <Input
          label="Member ID"
          required
          disabled={!!initial}
          value={v.memberId}
          onChange={(e) => set("memberId", e.target.value)}
        />
        <Input
          label="Full name"
          required
          value={v.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          required
          value={v.email}
          onChange={(e) => set("email", e.target.value)}
        />
        <Input
          label="Phone"
          value={v.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
        <Input
          label="Department"
          value={v.department}
          onChange={(e) => set("department", e.target.value)}
        />
        <Input
          label="Course"
          value={v.course}
          onChange={(e) => set("course", e.target.value)}
        />
        <Input
          label="Year"
          type="number"
          min="1"
          max="10"
          value={v.year}
          onChange={(e) => set("year", e.target.value)}
        />
        <Select
          label="Membership type"
          value={v.membershipType}
          onChange={(e) => set("membershipType", e.target.value)}
        >
          {["STUDENT", "FACULTY", "STAFF", "GUEST"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
        <Select
          label="Status"
          value={v.status}
          onChange={(e) => set("status", e.target.value)}
        >
          {["ACTIVE", "SUSPENDED", "EXPIRED", "INACTIVE"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
        <Input
          label="Joined at"
          type="date"
          value={v.joinedAt}
          onChange={(e) => set("joinedAt", e.target.value)}
        />
        <Input
          label="Expiry date"
          type="date"
          value={v.expiryDate}
          onChange={(e) => set("expiryDate", e.target.value)}
        />
        {error ? (
  <div className="form-error full">
    {errorMessage(error)}
  </div>
) : null}
        <div className="form-actions full">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy}>Save member</Button>
        </div>
      </form>
    </Modal>
  );
}

import { useState, useEffect } from "react";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  CalendarClock,
  Check,
  Edit,
  Plus,
  RefreshCw,
} from "lucide-react";
import { booksApi, copiesApi, issuesApi, membersApi } from "../api/services";
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
import { date, dateTime, idOf, nameOf, titleOf, tone } from "../utils/format";
import { useAuth } from "../layout/AuthContext";
import { useMemberId } from "../hooks/useMemberId";
import type { Book, BookCopy, Issue, Member } from "../types";

export default function Circulation() {
  const qc = useQueryClient();
  const { user, can } = useAuth();
  const memberId = useMemberId();
  const isPersonalUser = ["STUDENT", "FACULTY", "MEMBER"].includes(user?.role ?? "");
  const isStaff = can("BOOK_ISSUE");
  const [tab, setTab] = useState<"active" | "history">("active");
  const [s, setS] = useState("");
  const [issueModal, setIssueModal] = useState(false);
  const [action, setAction] = useState<{
    kind: "return" | "renew";
    issue: Issue;
  } | null>(null);
  const [editDueDate, setEditDueDate] = useState<Issue | null>(null);

  // Staff users see all issues; personal users see only their own loans
  const issuesQueryOptions = {
    queryKey: ["issues", isPersonalUser ? memberId : "all"],
    queryFn: () => isPersonalUser ? issuesApi.byMember(memberId!) : issuesApi.list(),
    enabled: !isPersonalUser || Boolean(memberId),
  };

  const membersQueryOptions = {
    queryKey: ["members"],
    queryFn: membersApi.list,
    enabled: !isPersonalUser,
  };

  const qs = useQueries({
    queries: [
      issuesQueryOptions,
      membersQueryOptions,
      { queryKey: ["books"], queryFn: booksApi.list },
      { queryKey: ["copies"], queryFn: copiesApi.list },
    ],
  });
  if (qs.some((q) => q.isPending)) return <Loading />;
  if (qs.some((q) => q.error))
    return <ErrorState error={qs.find((q) => q.error)?.error} />;
  const [issues, members, books, copies] = qs.map((q) => q.data as any[]) as [
    Issue[],
    Member[],
    Book[],
    BookCopy[],
  ];
  const rows = issues
    .filter((x) =>
      tab === "active" ? x.status === "ISSUED" : x.status !== "ISSUED",
    )
    .filter((x) =>
      `${titleOf(x.bookId)} ${nameOf(x.memberId)} ${date(x.dueAt)}`
        .toLowerCase()
        .includes(s.toLowerCase()),
    );
  return (
    <>
      <PageHeader
        title="Circulation"
        subtitle="Issue, return and renew books while keeping inventory synchronized."
        action={
          isStaff && (
            <Button onClick={() => setIssueModal(true)}>
              <Plus size={17} /> Issue book
            </Button>
          )
        }
      />
      <div className="tabs">
        <button
          className={tab === "active" ? "active" : ""}
          onClick={() => setTab("active")}
        >
          <ArrowLeftRight size={16} /> Active loans{" "}
          <b>{issues.filter((x) => x.status === "ISSUED").length}</b>
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          <CalendarClock size={16} /> History{" "}
          <b>{issues.filter((x) => x.status !== "ISSUED").length}</b>
        </button>
      </div>
      <div className="toolbar">
        <SearchBox
          value={s}
          onChange={setS}
          placeholder="Search books or members…"
        />
      </div>
      {rows.length ? (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Book</th>
                <th>Member</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Renewals</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => {
                const late =
                  x.status === "ISSUED" && new Date(x.dueAt) < new Date();
                return (
                  <tr key={x._id}>
                    <td>
                      <strong>{titleOf(x.bookId)}</strong>
                      <small className="table-sub">
                        {typeof x.bookCopyId === "string"
                          ? x.bookCopyId
                          : x.bookCopyId?.accessionNumber}
                      </small>
                    </td>
                    <td>{nameOf(x.memberId)}</td>
                    <td>{date(x.issuedAt)}</td>
                    <td className={late ? "late" : ""}>{date(x.dueAt)}</td>
                    <td>{x.renewalCount}</td>
                    <td>
                      <Badge tone={late ? "danger" : tone(x.status)}>
                        {late ? "OVERDUE" : x.status}
                      </Badge>
                    </td>
                    <td>
                      {x.status === "ISSUED" && isStaff && (
                        <div className="inline-actions">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              setAction({ kind: "return", issue: x })
                            }
                          >
                            <Check size={14} /> Return
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              setAction({ kind: "renew", issue: x })
                            }
                          >
                            <RefreshCw size={14} /> Renew
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setEditDueDate(x)}
                          >
                            <Edit size={14} /> Edit Due Date
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title={s ? "No matching loans" : "No circulation records"} />
      )}{" "}
      {issueModal && (
        <IssueForm
          books={books}
          copies={copies}
          members={members}
          issuedBy={user!.id}
          onClose={() => setIssueModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["issues"] });
            qc.invalidateQueries({ queryKey: ["copies"] });
            qc.invalidateQueries({ queryKey: ["books"] });
            setIssueModal(false);
          }}
        />
      )}
      {action && (
        <LoanAction
          kind={action.kind}
          issue={action.issue}
          userId={user!.id}
          onClose={() => setAction(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["issues"] });
            qc.invalidateQueries({ queryKey: ["copies"] });
            qc.invalidateQueries({ queryKey: ["books"] });
            setAction(null);
          }}
        />
      )}
      {editDueDate && (
        <EditDueDateModal
          issue={editDueDate}
          onClose={() => setEditDueDate(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["issues"] });
            setEditDueDate(null);
          }}
        />
      )}
    </>
  );
}
function IssueForm({
  books,
  copies,
  members,
  issuedBy,
  onClose,
  onSaved,
}: {
  books: Book[];
  copies: BookCopy[];
  members: Member[];
  issuedBy: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState({
    bookId: "",
    bookCopyId: "",
    memberId: "",
    dueAt: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const available = copies.filter(
    (c) =>
      c.status === "AVAILABLE" &&
      (v.bookId ? idOf(c.bookId) === v.bookId : true),
  );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await issuesApi.create({
        ...v,
        issuedBy,
        dueAt: new Date(v.dueAt).toISOString(),
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Issue a book" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <Select
          label="Book"
          required
          value={v.bookId}
          onChange={(e) =>
            setV((p) => ({ ...p, bookId: e.target.value, bookCopyId: "" }))
          }
        >
          <option value="">Select title…</option>
          {books
            .filter((b) => b.availableCopies > 0 && b.status === "ACTIVE")
            .map((b) => (
              <option key={b._id} value={b._id}>
                {b.title} · {b.isbn}
              </option>
            ))}
        </Select>
        <Select
          label="Physical copy"
          required
          value={v.bookCopyId}
          onChange={(e) => setV((p) => ({ ...p, bookCopyId: e.target.value }))}
        >
          <option value="">Select copy…</option>
          {available.map((c) => (
            <option key={c._id} value={c._id}>
              {c.accessionNumber}
              {c.barcode ? ` · ${c.barcode}` : ""}
            </option>
          ))}
        </Select>
        <Select
          label="Member"
          required
          value={v.memberId}
          onChange={(e) => setV((p) => ({ ...p, memberId: e.target.value }))}
        >
          <option value="">Select member…</option>
          {members
            .filter((m) => m.status === "ACTIVE")
            .map((m) => (
              <option key={m._id} value={m._id}>
                {m.name} · {m.memberId}
              </option>
            ))}
        </Select>
        <Input
          label="Due date"
          required
          type="datetime-local"
          value={v.dueAt}
          onChange={(e) => setV((p) => ({ ...p, dueAt: e.target.value }))}
        />
        <Input
          label="Notes"
          value={v.notes}
          onChange={(e) => setV((p) => ({ ...p, notes: e.target.value }))}
        />
        {error && <div className="form-error full">{error}</div>}
        <div className="form-actions full">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy}>Issue book</Button>
        </div>
      </form>
    </Modal>
  );
}
function LoanAction({
  kind,
  issue,
  userId,
  onClose,
  onSaved,
}: {
  kind: "return" | "renew";
  issue: Issue;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [days, setDays] = useState("14");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={kind === "return" ? "Return book" : "Renew book"}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            if (kind === "return")
              await issuesApi.return(issue._id, { returnedBy: userId, notes });
            else
              await issuesApi.renew(issue._id, {
                additionalDays: Number(days),
              });
            onSaved();
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="confirm-card">
          <strong>{titleOf(issue.bookId)}</strong>
          <span>
            {nameOf(issue.memberId)} · current due {dateTime(issue.dueAt)}
          </span>
        </div>
        {kind === "renew" ? (
          <Input
            label="Additional days"
            type="number"
            min="1"
            required
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        ) : (
          <Input
            label="Return notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        )}{" "}
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy}>
            {kind === "return" ? "Confirm return" : "Renew loan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function EditDueDateModal({
  issue,
  onClose,
  onSaved,
}: {
  issue: Issue;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Initialize date and time from issue.dueAt
  useEffect(() => {
    if (issue.dueAt) {
      const date = new Date(issue.dueAt);
      // Format date as YYYY-MM-DD for datetime-local input
      const dateStr = date.toISOString().slice(0, 16);
      setDueDate(dateStr.slice(0, 10));
      setDueTime(dateStr.slice(11, 16));
    }
  }, [issue]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (!dueDate || !dueTime) {
        setError("Due date and time are required");
        return;
      }

      const dueAt = new Date(`${dueDate}T${dueTime}:00`);

      if (isNaN(dueAt.getTime())) {
        setError("Invalid date or time");
        return;
      }

      // Allow past dates for administrative editing
      // The backend will validate if needed

      await issuesApi.update(issue._id, { dueAt: dueAt.toISOString() });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit Due Date & Time" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <div className="full">
          <label className="settings-field">
            <span className="settings-field-label">Due date</span>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
        </div>
        <div className="full">
          <label className="settings-field">
            <span className="settings-field-label">Due time</span>
            <input
              type="time"
              required
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </label>
        </div>
        {error && <div className="form-error full">{error}</div>}
        <div className="form-actions full">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} type="submit">
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

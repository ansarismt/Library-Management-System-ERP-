import { useState } from "react";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  CalendarClock,
  Check,
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
import type { Book, BookCopy, Issue, Member } from "../types";
export default function Circulation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<"active" | "history">("active");
  const [s, setS] = useState("");
  const [issueModal, setIssueModal] = useState(false);
  const [action, setAction] = useState<{
    kind: "return" | "renew";
    issue: Issue;
  } | null>(null);
  const qs = useQueries({
    queries: [
      { queryKey: ["issues"], queryFn: issuesApi.list },
      { queryKey: ["members"], queryFn: membersApi.list },
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
          <Button onClick={() => setIssueModal(true)}>
            <Plus size={17} /> Issue book
          </Button>
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
                      {x.status === "ISSUED" && (
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

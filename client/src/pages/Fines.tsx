import { useState } from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  CircleDollarSign,
  CreditCard,
  Receipt,
  RotateCcw,
} from "lucide-react";

import { finesApi, issuesApi } from "../api/services";

import {
  Badge,
  Button,
  Empty,
  Input,
  Modal,
  PageHeader,
  Select,
  SearchBox,
} from "../components/ui";

import {
  errorMessage,
} from "../components/ErrorState";

import {
  nameOf,
  money,
  date,
  tone,
  titleOf,
} from "../utils/format";

import { useAuth } from "../layout/AuthContext";
import { useMemberId } from "../hooks/useMemberId";
import type { Fine } from "../types";
export default function Fines() {
  const { user, can } = useAuth();
  const memberId = useMemberId();
  const isPersonalUser = ["STUDENT", "FACULTY", "MEMBER"].includes(user?.role ?? "");
  const q = useQuery({ queryKey: ["fines"], queryFn: finesApi.list });
  const iq = useQuery({ queryKey: ["issues"], queryFn: issuesApi.list });
  const [s, setS] = useState("");
  const [pay, setPay] = useState<Fine | null>(null);
  const [waive, setWaive] = useState<Fine | null>(null);
  const [calc, setCalc] = useState(false);
  const qc = useQueryClient();

const allRows = (q.data ?? []) as Fine[];
  const rows = isPersonalUser
    ? allRows.filter((f) => f.memberId === memberId)
    : allRows;

  const filteredRows = rows.filter((f: Fine) =>
    `${nameOf(f.memberId)} ${titleOf(f.bookId)} ${f.status}`
      .toLowerCase()
      .includes(s.toLowerCase())
  );

  const outstanding = rows
    .filter(
      (f: Fine) => f.status === "UNPAID" || f.status === "PARTIAL"
    )
    .reduce(
      (n: number, f: Fine) => n + f.amount - f.paidAmount,
      0
    );
  const paid = rows.reduce(
    (n: number, f: Fine) => n + f.paidAmount,
    0
  );
  return (
    <>
      <PageHeader
        title="Fines & payments"
        subtitle="Calculate overdue charges, record payments and manage waivers."
      />
      <div className="stat-grid three">
        <div className="stat-card">
          <div className="stat-top">
            <span>Outstanding</span>
            <div className="stat-icon">
              <CircleDollarSign size={18} />
            </div>
          </div>
          <strong>{money(outstanding)}</strong>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>Collected</span>
            <div className="stat-icon">
              <Receipt size={18} />
            </div>
          </div>
          <strong>{money(paid)}</strong>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>Fine records</span>
            <div className="stat-icon">
              <CreditCard size={18} />
            </div>
          </div>
          <strong>{filteredRows.length}</strong>
        </div>
      </div>
      <div className="toolbar">
        <SearchBox
          value={s}
          onChange={setS}
          placeholder="Search member, book or status…"
        />
        {can("FINE_CREATE") && (
          <Button variant="secondary" onClick={() => setCalc(true)}>
            <RotateCcw size={16} /> Calculate from overdue loan
          </Button>
        )}
      </div>
      {filteredRows.length ? (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Book</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Overdue</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((f) => (
                <tr key={f._id}>
                  <td>
                    <strong>{nameOf(f.memberId)}</strong>
                  </td>
                  <td>{titleOf(f.bookId)}</td>
                  <td>{money(f.amount)}</td>
                  <td>{money(f.paidAmount)}</td>
                  <td>{f.daysOverdue} days</td>
                  <td>
                    <Badge tone={tone(f.status)}>{f.status}</Badge>
                  </td>
                  <td>
                    <div className="inline-actions">
                      {can("FINE_UPDATE") &&
  (f.status === "UNPAID" || f.status === "PARTIAL") && (
    <Button variant="secondary" onClick={() => setPay(f)}>
      Pay
    </Button>
  )}
                     {can("FINE_WAIVE") &&
  f.status !== "PAID" &&
  f.status !== "WAIVED" && (
    <Button variant="ghost" onClick={() => setWaive(f)}>
      Waive
    </Button>
  )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="No fines found"
          text="Fines appear here after an overdue issue is calculated."
        />
      )}
      {pay && (
        <PaymentForm
          fine={pay}
          userId={user!.id}
          onClose={() => setPay(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["fines"] });
            setPay(null);
          }}
        />
      )}
      {waive && (
        <WaiveForm
          fine={waive}
          userId={user!.id}
          onClose={() => setWaive(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["fines"] });
            setWaive(null);
          }}
        />
      )}
      {calc && (
        <CalculateForm
          issues={iq.data ?? []}
          onClose={() => setCalc(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["fines"] });
            setCalc(false);
          }}
        />
      )}
    </>
  );
}
function PaymentForm({
  fine,
  userId,
  onClose,
  onSaved,
}: {
  fine: Fine;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(String(fine.amount - fine.paidAmount));
  const [method, setMethod] = useState("CASH");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Record payment" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await finesApi.pay(fine._id, {
              amount: Number(amount),
              paymentMethod: method,
              paidBy: userId,
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
          <strong>{nameOf(fine.memberId)}</strong>
          <span>Remaining balance: {money(fine.amount - fine.paidAmount)}</span>
        </div>
        <Input
          label="Payment amount"
          type="number"
          step="0.01"
          min="0.01"
          max={fine.amount - fine.paidAmount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Select
          label="Payment method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          {["CASH", "CARD", "UPI", "BANK_TRANSFER", "ONLINE"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy}>Record payment</Button>
        </div>
      </form>
    </Modal>
  );
}
function WaiveForm({
  fine,
  userId,
  onClose,
  onSaved,
}: {
  fine: Fine;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Waive fine" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await finesApi.waive(fine._id, { waivedBy: userId, reason });
            onSaved();
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="confirm-card">
          <strong>{money(fine.amount - fine.paidAmount)} outstanding</strong>
          <span>
            Waiving is an operational decision and should include a reason.
          </span>
        </div>
        <Input
          label="Reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. approved by library administrator"
        />
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy}>Waive fine</Button>
        </div>
      </form>
    </Modal>
  );
}
function CalculateForm({
  issues,
  onClose,
  onSaved,
}: {
  issues: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [issueId, setIssueId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const overdue = issues.filter(
    (x) => x.status === "ISSUED" && new Date(x.dueAt) < new Date(),
  );
  return (
    <Modal title="Calculate overdue fine" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await finesApi.calculate(issueId);
            onSaved();
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Select
          label="Overdue issue"
          required
          value={issueId}
          onChange={(e) => setIssueId(e.target.value)}
        >
          <option value="">Select loan…</option>
          {overdue.map((x) => (
            <option key={x._id} value={x._id}>
              {titleOf(x.bookId)} · {nameOf(x.memberId)} · due {date(x.dueAt)}
            </option>
          ))}
        </Select>
        {!overdue.length && (
          <p className="muted">There are no currently overdue issued loans.</p>
        )}
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} disabled={!overdue.length}>
            Calculate fine
          </Button>
        </div>
      </form>
    </Modal>
  );
}

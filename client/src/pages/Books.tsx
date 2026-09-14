import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarPlus,
  Copy,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import {
  booksApi,
  copiesApi,
  reservationsApi,
} from "../api/services";

import {
  Badge,
  Button,
  Empty,
  Input,
  Loading,
  Modal,
  PageHeader,
  SearchBox,
  Select,
  Textarea,
} from "../components/ui";

import { ErrorState, errorMessage } from "../components/ErrorState";
import { tone, titleOf } from "../utils/format";
import { useAuth } from "../layout/AuthContext";

import type { Book, BookCopy } from "../types";

const emptyBook = {
  isbn: "",
  title: "",
  authors: "",
  publisher: "",
  publicationYear: "",
  edition: "",
  category: "",
  language: "English",
  description: "",
  coverImage: "",
  totalCopies: "",
  status: "ACTIVE",
};

const emptyCopy = {
  bookId: "",
  accessionNumber: "",
  barcode: "",
  location: "",
  status: "AVAILABLE",
  condition: "GOOD",
  acquiredAt: "",
  price: "",
  notes: "",
};

export default function Books() {
  const { user, can } = useAuth();

  const canBookCreate = can("BOOK_CREATE");
  const canBookUpdate = can("BOOK_UPDATE");
  const canBookDelete = can("BOOK_DELETE");

  const canCopyRead = can("BOOK_COPY_READ");
  const canCopyCreate = can("BOOK_COPY_CREATE");
  const canCopyUpdate = can("BOOK_COPY_UPDATE");

  const canReserve = can("RESERVATION_CREATE");
  const canReadReservations = can("RESERVATION_READ");

  const isStudent = user?.role === "STUDENT";

  const [tab, setTab] = useState<"books" | "copies">("books");
  const [search, setSearch] = useState("");

  const [bookModal, setBookModal] = useState<Book | null | false>(false);
  const [copyModal, setCopyModal] = useState<BookCopy | null | false>(false);

  const qc = useQueryClient();

  /*
   * Catalogue
   */
  const bq = useQuery({
    queryKey: ["books"],
    queryFn: booksApi.list,
  });

  /*
   * Physical copies are only loaded when the
   * authenticated user has permission to read them.
   *
   * Students normally do not have BOOK_COPY_READ.
   */
  const cq = useQuery({
    queryKey: ["copies"],
    queryFn: copiesApi.list,
    enabled: canCopyRead,
  });

  /*
   * Student's own reservations.
   *
   * The backend expects the MongoDB Member _id,
   * which is supplied by user.memberId.
   */
  const rq = useQuery({
    queryKey: ["my-reservations", user?.memberId],
    queryFn: () => {
      if (!user?.memberId) {
        throw new Error(
          "Your account is not linked to a library member.",
        );
      }

      return reservationsApi.byMember(user.memberId);
    },
    enabled:
      isStudent &&
      canReadReservations &&
      Boolean(user?.memberId),
  });

  /*
   * Create reservation.
   */
  const rm = useMutation({
    mutationFn: (bookId: string) => {
      if (!user?.memberId) {
        throw new Error(
          "Your account is not linked to a library member.",
        );
      }

      return reservationsApi.create({
        bookId,
        memberId: user.memberId,
      });
    },

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["my-reservations", user?.memberId],
      });

      qc.invalidateQueries({
        queryKey: ["books"],
      });
    },
  });

  /*
   * Book management.
   */
  const bm = useMutation({
    mutationFn: (v: { id?: string; body: any }) =>
      v.id
        ? booksApi.update(v.id, v.body)
        : booksApi.create(v.body),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["books"],
      });

      setBookModal(false);
    },
  });

  /*
   * Physical-copy management.
   */
  const cm = useMutation({
    mutationFn: (v: { id?: string; body: any }) =>
      v.id
        ? copiesApi.update(v.id, v.body)
        : copiesApi.create(v.body),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["copies"],
      });

      qc.invalidateQueries({
        queryKey: ["books"],
      });

      setCopyModal(false);
    },
  });

  const books = bq.data ?? [];
  const copies = cq.data ?? [];
  const reservations = rq.data ?? [];

  /*
   * Search filtering.
   */
  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();

    if (tab === "books") {
      return books.filter((x) =>
        `${x.title} ${x.isbn} ${x.authors.join(" ")} ${
          x.category ?? ""
        }`
          .toLowerCase()
          .includes(s),
      );
    }

    return copies.filter((x) =>
      `${x.accessionNumber} ${x.barcode ?? ""} ${titleOf(
        x.bookId,
      )}`
        .toLowerCase()
        .includes(s),
    );
  }, [tab, books, copies, search]);

  /*
   * Physical copies tab can only be shown when the
   * current user has BOOK_COPY_READ.
   */
  const showingCopies =
    tab === "copies" && canCopyRead;

  /*
   * If a student has no member linkage, don't silently
   * let reservation UI fail later.
   */
  const reservationAccountError =
    isStudent &&
    canReserve &&
    canReadReservations &&
    !user?.memberId;

  if (
    bq.isPending ||
    (canCopyRead && cq.isPending) ||
    (isStudent && canReadReservations && rq.isPending)
  ) {
    return <Loading />;
  }

  if (bq.error) {
    return (
      <ErrorState
        error={bq.error}
        onRetry={() => bq.refetch()}
      />
    );
  }

  if (canCopyRead && cq.error) {
    return (
      <ErrorState
        error={cq.error}
        onRetry={() => cq.refetch()}
      />
    );
  }

  if (isStudent && canReadReservations && rq.error) {
    return (
      <ErrorState
        error={rq.error}
        onRetry={() => rq.refetch()}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Books & copies"
        subtitle={
          isStudent
            ? "Browse the library catalogue and reserve unavailable books."
            : "Manage catalogue records and physical inventory."
        }
        action={
          tab === "books" && canBookCreate ? (
            <Button onClick={() => setBookModal(null)}>
              <Plus size={17} />
              Add book
            </Button>
          ) : showingCopies && canCopyCreate ? (
            <Button onClick={() => setCopyModal(null)}>
              <Plus size={17} />
              Add copy
            </Button>
          ) : null
        }
      />

      {reservationAccountError && (
        <div className="form-error" style={{ marginBottom: 16 }}>
          Your student account is not linked to a library member,
          so reservations cannot be created.
        </div>
      )}

      <div className="tabs">
        <button
          className={tab === "books" ? "active" : ""}
          onClick={() => {
            setTab("books");
            setSearch("");
          }}
        >
          <BookOpen size={16} />
          Titles
          <b>{books.length}</b>
        </button>

        {canCopyRead && (
          <button
            className={tab === "copies" ? "active" : ""}
            onClick={() => {
              setTab("copies");
              setSearch("");
            }}
          >
            <Copy size={16} />
            Physical copies
            <b>{copies.length}</b>
          </button>
        )}
      </div>

      <div className="toolbar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder={
            showingCopies
              ? "Search copies..."
              : "Search books..."
          }
        />
      </div>

      {filtered.length === 0 ? (
        <Empty
          title={search ? "No matches" : "No records"}
          text={
            search
              ? "Try a different search."
              : "Create your first record to get started."
          }
        />
      ) : !showingCopies ? (
        <div className="card-grid">
          {(filtered as Book[]).map((book) => {
            /*
             * Find an active reservation belonging to this
             * student's book.
             *
             * WAITING and READY are considered active.
             */
            const existingReservation =
              reservations.find((reservation) => {
                const reservationBookId =
                  typeof reservation.bookId === "string"
                    ? reservation.bookId
                    : reservation.bookId._id;

                return (
                  reservationBookId === book._id &&
                  ["WAITING", "READY"].includes(
                    reservation.status,
                  )
                );
              });

            const isUnavailable =
              book.availableCopies === 0;

            const showReserveButton =
              isStudent &&
              canReserve &&
              canReadReservations &&
              Boolean(user?.memberId) &&
              isUnavailable &&
              !existingReservation;

            return (
              <div
                className="book-card"
                key={book._id}
              >
                <div className="book-cover">
                  {book.coverImage ? (
                    <img
                      src={book.coverImage}
                      alt=""
                    />
                  ) : (
                    <BookOpen size={32} />
                  )}
                </div>

                <div className="book-body">
                  <div className="book-top">
                    <Badge tone={tone(book.status)}>
                      {book.status}
                    </Badge>

                    <span>{book.isbn}</span>
                  </div>

                  <h3>{book.title}</h3>

                  <p>{book.authors.join(", ")}</p>

                  <div className="book-meta">
                    <span>
                      {book.category ||
                        "Uncategorized"}
                    </span>

                    <strong>
                      {book.availableCopies}/
                      {book.totalCopies} available
                    </strong>
                  </div>

                  {rm.error && rm.variables === book._id ? (
                    <div
                      className="form-error"
                      style={{ marginTop: 10 }}
                    >
                      {errorMessage(rm.error)}
                    </div>
                  ) : null}

                  {(canBookUpdate ||
                    canCopyCreate ||
                    canBookDelete ||
                    showReserveButton ||
                    existingReservation) && (
                    <div className="card-actions">
                      {showReserveButton && (
                        <Button
                          loading={rm.isPending}
                          onClick={() =>
                            rm.mutate(book._id)
                          }
                        >
                          <CalendarPlus size={15} />
                          Reserve
                        </Button>
                      )}

                      {existingReservation && (
                        <Button
                          variant="secondary"
                          disabled
                        >
                          <CalendarPlus size={15} />

                          {existingReservation.status ===
                          "READY"
                            ? "Ready for pickup"
                            : "Reserved"}
                        </Button>
                      )}

                      {canBookUpdate && (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setBookModal(book)
                          }
                        >
                          <Pencil size={15} />
                          Edit
                        </Button>
                      )}

                      {canCopyCreate && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setCopyModal({
                              ...emptyCopy,
                              bookId: book._id,
                            } as unknown as BookCopy);
                          }}
                        >
                          <Plus size={15} />
                          Copy
                        </Button>
                      )}

                      {canBookDelete && (
                        <Button
                          variant="danger"
                          onClick={async () => {
                            if (
                              confirm(
                                `Delete ${book.title}?`,
                              )
                            ) {
                              await booksApi.remove(
                                book._id,
                              );

                              qc.invalidateQueries({
                                queryKey: ["books"],
                              });
                            }
                          }}
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Accession</th>
                <th>Book</th>
                <th>Location</th>
                <th>Condition</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {(filtered as BookCopy[]).map((c) => (
                <tr key={c._id}>
                  <td>
                    <strong>
                      {c.accessionNumber}
                    </strong>

                    <small className="table-sub">
                      {c.barcode ||
                        "No barcode"}
                    </small>
                  </td>

                  <td>{titleOf(c.bookId)}</td>

                  <td>
                    {c.location || "—"}
                  </td>

                  <td>{c.condition}</td>

                  <td>
                    <Badge tone={tone(c.status)}>
                      {c.status}
                    </Badge>
                  </td>

                  <td>
                    {canCopyUpdate && (
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setCopyModal(c)
                        }
                      >
                        <Pencil size={15} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bookModal !== false && (
        <BookForm
          initial={bookModal || null}
          busy={bm.isPending}
          error={bm.error}
          onClose={() => setBookModal(false)}
          onSave={(body) =>
            bm.mutate({
              id: bookModal?._id,
              body,
            })
          }
        />
      )}

      {copyModal !== false && (
        <CopyForm
          initial={copyModal || null}
          books={books}
          busy={cm.isPending}
          error={cm.error}
          onClose={() => setCopyModal(false)}
          onSave={(body) =>
            cm.mutate({
              id: copyModal?._id,
              body,
            })
          }
        />
      )}
    </>
  );
}

function BookForm({
  initial,
  busy,
  error,
  onClose,
  onSave,
}: {
  initial: Book | null;
  busy: boolean;
  error: unknown;
  onClose: () => void;
  onSave: (v: any) => void;
}) {
  const [v, setV] = useState<any>(
    initial
      ? {
          ...initial,
          authors: initial.authors.join(","),
        }
      : emptyBook,
  );

  const set = (k: string, x: string) =>
    setV((p: any) => ({
      ...p,
      [k]: x,
    }));

  return (
    <Modal
      title={
        initial ? "Edit book" : "Add book"
      }
      onClose={onClose}
    >
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();

          onSave({
            ...v,

            authors: v.authors
              .split(",")
              .map((x: string) => x.trim())
              .filter(Boolean),

            publicationYear:
              v.publicationYear
                ? Number(v.publicationYear)
                : undefined,

            totalCopies: Number(v.totalCopies),
          });
        }}
      >
        <Input
          label="ISBN"
          required
          value={v.isbn}
          onChange={(e) =>
            set("isbn", e.target.value)
          }
        />

        <Input
          label="Title"
          required
          value={v.title}
          onChange={(e) =>
            set("title", e.target.value)
          }
        />

        <Input
          label="Authors (comma separated)"
          required
          value={v.authors}
          onChange={(e) =>
            set("authors", e.target.value)
          }
        />

        <Input
          label="Publisher"
          value={v.publisher}
          onChange={(e) =>
            set("publisher", e.target.value)
          }
        />

        <Input
          label="Publication year"
          type="number"
          value={v.publicationYear}
          onChange={(e) =>
            set(
              "publicationYear",
              e.target.value,
            )
          }
        />

        <Input
          label="Edition"
          value={v.edition}
          onChange={(e) =>
            set("edition", e.target.value)
          }
        />

        <Input
          label="Category"
          value={v.category}
          onChange={(e) =>
            set("category", e.target.value)
          }
        />

        <Input
          label="Language"
          value={v.language}
          onChange={(e) =>
            set("language", e.target.value)
          }
        />

        <Input
          label="Total copies"
          type="number"
          min="0"
          required
          value={v.totalCopies}
          onChange={(e) =>
            set(
              "totalCopies",
              e.target.value,
            )
          }
        />

        <Select
          label="Status"
          value={v.status}
          onChange={(e) =>
            set("status", e.target.value)
          }
        >
          <option>ACTIVE</option>
          <option>INACTIVE</option>
          <option>ARCHIVED</option>
        </Select>

        <Input
          label="Cover image URL"
          value={v.coverImage}
          onChange={(e) =>
            set(
              "coverImage",
              e.target.value,
            )
          }
        />

        <Textarea
          label="Description"
          className="full"
          value={v.description}
          onChange={(e) =>
            set(
              "description",
              e.target.value,
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

          <Button loading={busy}>
            Save book
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CopyForm({
  initial,
  books,
  busy,
  error,
  onClose,
  onSave,
}: {
  initial: BookCopy | null;
  books: Book[];
  busy: boolean;
  error: unknown;
  onClose: () => void;
  onSave: (v: any) => void;
}) {
  const [v, setV] = useState<any>(
    initial
      ? {
          ...initial,

          bookId:
            typeof initial.bookId === "string"
              ? initial.bookId
              : initial.bookId._id,
        }
      : emptyCopy,
  );

  const set = (k: string, x: string) =>
    setV((p: any) => ({
      ...p,
      [k]: x,
    }));

  return (
    <Modal
      title={
        initial
          ? "Edit physical copy"
          : "Add physical copy"
      }
      onClose={onClose}
    >
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();

          onSave({
            ...v,

            price: v.price
              ? Number(v.price)
              : undefined,

            acquiredAt:
              v.acquiredAt || undefined,
          });
        }}
      >
        {!initial && (
          <Select
            label="Book"
            required
            value={v.bookId}
            onChange={(e) =>
              set(
                "bookId",
                e.target.value,
              )
            }
          >
            <option value="">
              Select book…
            </option>

            {books.map((b) => (
              <option
                key={b._id}
                value={b._id}
              >
                {b.title} · {b.isbn}
              </option>
            ))}
          </Select>
        )}

        <Input
          label="Accession number"
          required
          disabled={!!initial}
          value={v.accessionNumber}
          onChange={(e) =>
            set(
              "accessionNumber",
              e.target.value,
            )
          }
        />

        <Input
          label="Barcode"
          value={v.barcode}
          onChange={(e) =>
            set(
              "barcode",
              e.target.value,
            )
          }
        />

        <Input
          label="Location"
          value={v.location}
          onChange={(e) =>
            set(
              "location",
              e.target.value,
            )
          }
        />

        <Select
          label="Status"
          value={v.status}
          onChange={(e) =>
            set(
              "status",
              e.target.value,
            )
          }
        >
          {[
            "AVAILABLE",
            "ISSUED",
            "RESERVED",
            "LOST",
            "DAMAGED",
            "MAINTENANCE",
          ].map((x) => (
            <option key={x}>
              {x}
            </option>
          ))}
        </Select>

        <Select
          label="Condition"
          value={v.condition}
          onChange={(e) =>
            set(
              "condition",
              e.target.value,
            )
          }
        >
          {[
            "NEW",
            "GOOD",
            "FAIR",
            "POOR",
          ].map((x) => (
            <option key={x}>
              {x}
            </option>
          ))}
        </Select>

        <Input
          label="Acquired at"
          type="date"
          value={
            v.acquiredAt?.slice?.(0, 10) ||
            v.acquiredAt
          }
          onChange={(e) =>
            set(
              "acquiredAt",
              e.target.value,
            )
          }
        />

        <Input
          label="Price"
          type="number"
          min="0"
          step="0.01"
          value={v.price}
          onChange={(e) =>
            set(
              "price",
              e.target.value,
            )
          }
        />

        <Textarea
          label="Notes"
          className="full"
          value={v.notes}
          onChange={(e) =>
            set(
              "notes",
              e.target.value,
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

          <Button loading={busy}>
            Save copy
          </Button>
        </div>
      </form>
    </Modal>
  );
}
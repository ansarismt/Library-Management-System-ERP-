export const idOf = (x: unknown): string =>
  typeof x === "string" ? x : ((x as { _id?: string })?._id ?? "");
export const nameOf = (x: unknown, fallback = "—") =>
  typeof x === "string" ? x : ((x as { name?: string })?.name ?? fallback);
export const titleOf = (x: unknown) =>
  typeof x === "string" ? x : ((x as { title?: string })?.title ?? "—");
export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);
export const date = (v?: string) =>
  v
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
        new Date(v),
      )
    : "—";
export const dateTime = (v?: string) =>
  v
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(v))
    : "—";
export const tone = (status: string) =>
  status === "ACTIVE" ||
  status === "AVAILABLE" ||
  status === "PAID" ||
  status === "RETURNED"
    ? "success"
    : status === "OVERDUE" ||
        status === "UNPAID" ||
        status === "SUSPENDED" ||
        status === "DAMAGED" ||
        status === "LOST"
      ? "danger"
      : status === "ISSUED" || status === "PARTIAL"
        ? "warning"
        : "neutral";

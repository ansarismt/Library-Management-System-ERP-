import { AlertCircle } from "lucide-react";
import { Button } from "./ui";

type ErrorStateProps = {
  error: unknown;
  onRetry?: () => void;
};

export function errorMessage(error: unknown): string {
  // Axios-style error: prefer the backend-provided message over the
  // generic HTTP status text (e.g. "Request failed with status code 400").
  const response = (error as { response?: unknown })?.response;
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    (response as { data?: unknown }).data &&
    typeof (response as { data: unknown }).data === "object" &&
    "message" in (response as { data: { message?: unknown } }).data &&
    typeof (response as { data: { message?: unknown } }).data.message === "string" &&
    (response as { data: { message: string } }).data.message.length > 0
  ) {
    return (response as { data: { message: string } }).data.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Something went wrong";
}
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="error-state">
      <AlertCircle size={20} />

      <div>
        <strong>Something went wrong</strong>
        <p>{errorMessage(error)}</p>
      </div>

      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
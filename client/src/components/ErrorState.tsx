import { AlertCircle } from "lucide-react";
import { Button } from "./ui";

type ErrorStateProps = {
  error: unknown;
  onRetry?: () => void;
};

export function errorMessage(error: unknown): string {
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
    typeof error.message === "string"
  ) {
    return error.message;
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
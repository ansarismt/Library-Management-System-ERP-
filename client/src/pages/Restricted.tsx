import { ShieldAlert } from "lucide-react";
export default function Restricted({ title }: { title: string }) {
  return (
    <div className="denied page-denied">
      <ShieldAlert size={44} />
      <h2>{title}</h2>
      <p>
        The current backend revision does not expose an API for this module yet,
        so the frontend intentionally does not fabricate one.
      </p>
    </div>
  );
}

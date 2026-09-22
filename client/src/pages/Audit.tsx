import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { auditApi } from "../api/services";
import { Button, Loading, PageHeader } from "../components/ui";
import { Badge } from "../components/ui";

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const actionLabel = (action: string) =>
  action
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function Audit() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: [
      "audit-logs",
      {
        page,
        search,
        resourceType,
        success,
      },
    ],
    queryFn: () =>
      auditApi.list({
        page,
        limit: 20,
        search: search || undefined,
        resourceType: resourceType || undefined,
        success: success
          ? (success as "true" | "false")
          : undefined,
        sort: "createdAt",
        order: "desc",
      }),
  });

  if (query.isPending) {
    return <Loading />;
  }

  if (query.isError) {
    return (
      <>
        <PageHeader
          title="Audit & Settings"
          subtitle="Review security and system activity recorded by the library system."
        />

        <section className="panel empty">
          <AlertCircle size={28} />
          <h2>Unable to load audit logs</h2>
          <p>
            The audit endpoint could not be reached or your account does
            not have permission to view the logs.
          </p>

          <Button
            variant="secondary"
            onClick={() => query.refetch()}
          >
            <RefreshCw size={16} />
            Try again
          </Button>
        </section>
      </>
    );
  }

  const apiResponse = query.data;
  const logs = apiResponse.data;
  const pagination = apiResponse.pagination;

  const applySearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setResourceType("");
    setSuccess("");
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Audit & Settings"
        subtitle="Review security and system activity recorded by the library system."
        action={
          <Button
            variant="secondary"
            onClick={() => query.refetch()}
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
        }
      />

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Audit logs</h2>
            <p>
              {pagination.total} recorded event
              {pagination.total === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="filters">
          <div className="search-box">
            <Search size={17} />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  applySearch();
                }
              }}
              placeholder="Search audit logs..."
            />
          </div>

          <select
            value={resourceType}
            onChange={(event) => {
              setResourceType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All resources</option>
            <option value="AUTH">Auth</option>
            <option value="USER">User</option>
            <option value="BOOK">Book</option>
            <option value="BOOK_COPY">Book Copy</option>
            <option value="MEMBER">Member</option>
            <option value="ISSUE">Issue</option>
            <option value="FINE">Fine</option>
            <option value="RESERVATION">Reservation</option>
          </select>

          <select
            value={success}
            onChange={(event) => {
              setSuccess(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All results</option>
            <option value="true">Successful</option>
            <option value="false">Failed</option>
          </select>

          <Button variant="secondary" onClick={applySearch}>
            <Search size={16} />
            Search
          </Button>

          {(search || resourceType || success) && (
            <Button variant="secondary" onClick={clearFilters}>
              <XCircle size={16} />
              Clear
            </Button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="panel empty">
            <AlertCircle size={28} />
            <h2>No audit logs found</h2>
            <p>
              No audit events match the current filters.
            </p>
          </div>
        ) : (
          <>
            <div className="table-wrap audit-table-wrap">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Description</th>
                    <th>Result</th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td className="audit-date">
                        <span className="nowrap">
                          {formatDate(log.createdAt)}
                        </span>
                      </td>

                      <td className="audit-actor">
                        {log.actorUserId ? (
                          <div>
                            <strong>{log.actorUserId.name}</strong>
                            <small>
                              {log.actorUserId.email}
                            </small>
                          </div>
                        ) : (
                          <span>System</span>
                        )}
                      </td>

                      <td className="audit-action">
                        <strong>
                          {actionLabel(log.action)}
                        </strong>
                      </td>

                      <td className="audit-resource">
                        <span>{log.resourceType}</span>
                        {log.resourceId && (
                          <small>{log.resourceId}</small>
                        )}
                      </td>

                      <td className="audit-description" title={log.description}>
                        {log.description}
                      </td>

                      <td>
                        {log.success ? (
                          <Badge tone="success">
                            <CheckCircle2 size={12} />
                            Success
                          </Badge>
                        ) : (
                          <Badge tone="danger">
                            <XCircle size={12} />
                            Failed
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="pagination">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>

                <span>
                  Page {pagination.page} of{" "}
                  {pagination.totalPages}
                </span>

                <Button
                  variant="secondary"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
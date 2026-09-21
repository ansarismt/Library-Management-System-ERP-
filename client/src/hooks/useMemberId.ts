import { useMemo } from "react";
import { useAuth } from "../layout/AuthContext";

/**
 * Hook to get the current user's library member ID.
 * Returns the memberId from the authenticated user context.
 * Returns null if the user is not authenticated or has no linked library member.
 */
export function useMemberId(): string | null {
  const { user } = useAuth();

  return useMemo(() => user?.memberId ?? null, [user?.memberId]);
}

/**
 * Hook to check if the current user has a linked library member account.
 */
export function useHasMember(): boolean {
  const memberId = useMemberId();
  return Boolean(memberId);
}

/**
 * Hook to get the current user's role.
 */
export function useUserRole(): string | null {
  const { user } = useAuth();
  return useMemo(() => user?.role ?? null, [user?.role]);
}

/**
 * Hook to check if the current user has a specific role.
 */
export function useHasRole(targetRole: string): boolean {
  const role = useUserRole();
  return role === targetRole;
}

/**
 * Hook to check if the current user is a personal library member
 * (student, faculty, or member role) vs staff/admin.
 */
export function useIsPersonalUser(): boolean {
  const role = useUserRole();
  return ["STUDENT", "FACULTY", "MEMBER"].includes(role ?? "");
}

/**
 * Hook to check if the current user is a staff/admin user.
 */
export function useIsStaff(): boolean {
  const role = useUserRole();
  return ["LIBRARIAN", "ASSISTANT_LIBRARIAN", "LIBRARY_ADMIN", "SUPER_ADMIN"].includes(role ?? "");
}
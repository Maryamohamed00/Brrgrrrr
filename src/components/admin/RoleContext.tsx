"use client";

import { createContext, useContext } from "react";

export type DashboardRole = "ADMIN" | "VIEWER";

const RoleContext = createContext<DashboardRole>("VIEWER");

export function RoleProvider({
  role,
  children,
}: {
  role: DashboardRole;
  children: React.ReactNode;
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

/** Returns true if the current dashboard user can create/edit/delete/refund. */
export function useCanEdit() {
  return useContext(RoleContext) === "ADMIN";
}

export function useDashboardRole() {
  return useContext(RoleContext);
}

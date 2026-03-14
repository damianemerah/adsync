"use client";

import { createContext, useContext, ReactNode } from "react";

interface ActiveOrgContextType {
  activeOrgId: string | null;
}

const ActiveOrgContext = createContext<ActiveOrgContextType | undefined>(
  undefined,
);

export function ActiveOrgProvider({
  children,
  activeOrgId,
}: {
  children: ReactNode;
  activeOrgId: string | null;
}) {
  return (
    <ActiveOrgContext.Provider value={{ activeOrgId }}>
      {children}
    </ActiveOrgContext.Provider>
  );
}

export function useActiveOrgContext() {
  const context = useContext(ActiveOrgContext);
  if (context === undefined) {
    throw new Error(
      "useActiveOrgContext must be used within an ActiveOrgProvider",
    );
  }
  return context;
}

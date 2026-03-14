"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Default to open
  const [isOpen, setIsOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem("adsync-sidebar-state");
    if (stored) {
      setIsOpen(JSON.parse(stored));
    }
  }, []);

  const toggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    localStorage.setItem("adsync-sidebar-state", JSON.stringify(newState));
  };

  const close = () => {
    setIsOpen(false);
    localStorage.setItem("adsync-sidebar-state", JSON.stringify(false));
  };

  const open = () => {
    setIsOpen(true);
    localStorage.setItem("adsync-sidebar-state", JSON.stringify(true));
  };

  // Prevent hydration mismatch by rendering null or default state until mounted
  // However, for layout shift prevention, usually better to default to one state.
  // We'll stick with default true.

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close, open }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

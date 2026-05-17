"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface SidebarContextType {
  /** Desktop expand/collapse state (sidebar width). */
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
  /** Mobile off-canvas drawer state (below lg). */
  mobileOpen: boolean;
  toggleMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("adsync-sidebar-state");
    if (stored) {
      setIsOpen(JSON.parse(stored));
    }
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

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

  const toggleMobile = () => setMobileOpen((v) => !v);
  const closeMobile = () => setMobileOpen(false);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        toggle,
        close,
        open,
        mobileOpen,
        toggleMobile,
        closeMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

const NOOP_SIDEBAR: SidebarContextType = {
  isOpen: false,
  toggle: () => {},
  close: () => {},
  open: () => {},
  mobileOpen: false,
  toggleMobile: () => {},
  closeMobile: () => {},
};

export function useSidebar() {
  return useContext(SidebarContext) ?? NOOP_SIDEBAR;
}

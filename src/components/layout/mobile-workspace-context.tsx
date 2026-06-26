"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { MobileWorkspaceDrawer } from "@/components/layout/mobile-workspace-drawer";

interface MobileWorkspaceUser {
  name?: string | null;
  email?: string | null;
  isAdmin?: boolean;
}

interface MobileWorkspaceContextValue {
  open: boolean;
  openWorkspace: () => void;
  closeWorkspace: () => void;
  toggleWorkspace: () => void;
}

const MobileWorkspaceContext = createContext<MobileWorkspaceContextValue | null>(null);

export function MobileWorkspaceProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: MobileWorkspaceUser;
}) {
  const [open, setOpen] = useState(false);

  const openWorkspace = useCallback(() => setOpen(true), []);
  const closeWorkspace = useCallback(() => setOpen(false), []);
  const toggleWorkspace = useCallback(() => setOpen((value) => !value), []);

  const value = useMemo(
    () => ({ open, openWorkspace, closeWorkspace, toggleWorkspace }),
    [open, openWorkspace, closeWorkspace, toggleWorkspace]
  );

  return (
    <MobileWorkspaceContext.Provider value={value}>
      <MobileWorkspaceDrawer open={open} onClose={closeWorkspace} user={user} />
      {children}
    </MobileWorkspaceContext.Provider>
  );
}

export function useMobileWorkspace() {
  const ctx = useContext(MobileWorkspaceContext);
  if (!ctx) {
    throw new Error("useMobileWorkspace must be used within MobileWorkspaceProvider");
  }
  return ctx;
}

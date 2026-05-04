"use client";

import { createContext, useContext } from "react";

const AdminAppSurfaceContext = createContext(false);

export function AdminAppSurfaceProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return (
    <AdminAppSurfaceContext.Provider value={value}>
      {children}
    </AdminAppSurfaceContext.Provider>
  );
}

export function useAdminAppSurface() {
  return useContext(AdminAppSurfaceContext);
}

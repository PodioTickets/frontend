"use client";

import { createContext, useContext } from "react";

const OrganizerAppSurfaceContext = createContext(false);

export function OrganizerAppSurfaceProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return (
    <OrganizerAppSurfaceContext.Provider value={value}>
      {children}
    </OrganizerAppSurfaceContext.Provider>
  );
}

export function useOrganizerAppSurface() {
  return useContext(OrganizerAppSurfaceContext);
}

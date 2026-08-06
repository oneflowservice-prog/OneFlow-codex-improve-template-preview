"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { ReactNode } from "react";

export default function CodeViewerLayout({
  children,
  isShowing,
  onClose,
}: {
  children: ReactNode;
  isShowing: boolean;
  onClose: () => void;
}) {
  const isMobile = useMediaQuery("(max-width: 1023px)");

  return (
    <>
      {isMobile ? (
        <Drawer open={isShowing} onClose={onClose}>
          <DrawerContent>
            <VisuallyHidden.Root>
              <DrawerTitle>Code</DrawerTitle>
              <DrawerDescription>Description</DrawerDescription>
            </VisuallyHidden.Root>

            <div className="theme-scrollbar flex h-[90vh] flex-col overflow-y-auto">
              {children}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <div
          className={`${isShowing ? "min-w-0 flex-1" : "w-0"} hidden h-full overflow-hidden transition-all duration-300 lg:flex lg:flex-col`}
        >
          {children}
        </div>
      )}
    </>
  );
}

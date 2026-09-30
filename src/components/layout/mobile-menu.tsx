"use client";

import { useRef, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

type Props = {
  openLabel: string;
  closeLabel: string;
  title: string;
  header: ReactNode;
  children: ReactNode;
};

// Hamburger + slide-in drawer (from the start side: left in English, right in
// Arabic). Native <dialog> gives focus trapping and Escape-to-close.
export function MobileMenu({
  openLabel,
  closeLabel,
  title,
  header,
  children,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={openLabel}
        aria-haspopup="dialog"
        className="flex size-9 items-center justify-center rounded-full transition-colors hover:text-gold-dark lg:hidden"
      >
        <Menu className="size-5.5" strokeWidth={1.5} />
      </button>

      <dialog
        ref={dialogRef}
        aria-label={title}
        // Close on a backdrop click (target is the dialog itself) or when a
        // link inside is followed.
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target === event.currentTarget || target.closest("a")) close();
        }}
        className="fixed inset-y-0 start-0 end-auto m-0 h-dvh max-h-none w-[85vw] max-w-sm bg-background p-0 text-foreground backdrop:bg-foreground/25 open:animate-drawer-in backdrop:animate-fade-in rtl:open:animate-drawer-in-rtl motion-reduce:animate-none"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line ps-5 pe-2">
            {header}
            <button
              type="button"
              onClick={close}
              aria-label={closeLabel}
              className="flex size-10 items-center justify-center rounded-full transition-colors hover:text-gold-dark"
            >
              <X className="size-6" strokeWidth={1.5} />
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}

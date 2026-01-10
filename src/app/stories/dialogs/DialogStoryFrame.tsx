import type { ReactNode } from "react";

import { PrimaryButton } from "../../components/PrimaryButton";

export function DialogStoryFrame({
  open,
  setOpen,
  reopenLabel = "開く",
  children,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  reopenLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="p-6">
      <div className="pb-4">
        <PrimaryButton
          type="button"
          className="px-3 py-2 text-sm"
          onClick={() => setOpen(true)}
          disabled={open}
        >
          {reopenLabel}
        </PrimaryButton>
      </div>
      {children}
    </div>
  );
}

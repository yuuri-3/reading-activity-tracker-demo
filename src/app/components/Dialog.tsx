import * as React from "react";

import {
  Dialog as BaseDialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { cn } from "./ui/utils";

import { PrimaryButton, type PrimaryButtonProps } from "./PrimaryButton";
import { DialogFormPattern } from "./DialogFormPattern";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** Figma: nested instance (trigger) */
  trigger?: React.ReactElement;

  /** Figma: title */
  title: React.ReactNode;
  /** Figma: description */
  description?: React.ReactNode;

  /** Figma: switchable FormPattern type */
  formPatternType?: "RegistBook" | "AddRecord";

  /** Figma: nested instance (DialogFormPattern slot) */
  children: React.ReactNode;

  /** Figma: footer left button label */
  cancelLabel?: React.ReactNode;
  /** Figma: footer right button label */
  confirmLabel?: React.ReactNode;

  /** Footer actions */
  onCancel?: () => void;
  onConfirm?: () => void;

  /** Submit wiring (when confirm button submits a form) */
  confirmButtonType?: "button" | "submit";
  confirmForm?: string;

  /** Behavior */
  disableEscapeClose?: boolean;
  disableOutsideClose?: boolean;

  /** Styling hooks */
  contentClassName?: string;

  /** Keep header visible while scrolling inside the dialog */
  stickyHeader?: boolean;

  /** Make the dialog occupy the full viewport on mobile */
  fullScreenOnMobile?: boolean;

  cancelButtonProps?: Omit<
    PrimaryButtonProps,
    "children" | "type" | "onClick" | "form"
  >;
  confirmButtonProps?: Omit<
    PrimaryButtonProps,
    "children" | "type" | "onClick" | "form"
  >;
};

export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  formPatternType = "RegistBook",
  children,
  cancelLabel = "キャンセル",
  confirmLabel = "登録",
  onCancel,
  onConfirm,
  confirmButtonType = "button",
  confirmForm,
  disableEscapeClose,
  disableOutsideClose,
  contentClassName,
  stickyHeader = false,
  fullScreenOnMobile = false,
  cancelButtonProps,
  confirmButtonProps,
}: DialogProps) {
  return (
    <BaseDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent
        hideClose
        mobileFullScreen={fullScreenOnMobile}
        className={cn(
          "sm:max-w-[360px]",
          stickyHeader && "sm:p-0 sm:gap-0",
          contentClassName
        )}
        onOpenAutoFocus={
          formPatternType === "AddRecord"
            ? (e) => {
                // Prevent focusing the first input on open.
                // On some devices/browsers, focusing a datetime-local input
                // immediately opens the native date/time picker.
                e.preventDefault();
              }
            : undefined
        }
        onEscapeKeyDown={
          disableEscapeClose ? (e) => e.preventDefault() : undefined
        }
        onInteractOutside={
          disableOutsideClose ? (e) => e.preventDefault() : undefined
        }
      >
        <div className={cn("flex flex-col", stickyHeader ? "gap-0" : "gap-5")}>
          <DialogHeader
            className={cn(
              "items-center text-center",
              stickyHeader &&
                "sticky top-0 z-10 w-full bg-[var(--background-solid)] pb-5 sm:px-6 sm:pt-6"
            )}
          >
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <DialogFormPattern
            type={formPatternType}
            className={cn(stickyHeader && "sm:px-6")}
          >
            {children}
          </DialogFormPattern>
        </div>

        <div
          className={cn(
            "sticky bottom-0 left-0 right-0 z-10 flex gap-4 bg-[var(--background-solid)] pb-[max(env(safe-area-inset-bottom),4px)]",
            stickyHeader && "sm:px-6 sm:pt-5 sm:pb-6"
          )}
        >
          <PrimaryButton
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm"
            {...cancelButtonProps}
          >
            {cancelLabel}
          </PrimaryButton>
          <PrimaryButton
            type={confirmButtonType}
            form={confirmForm}
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-sm"
            {...confirmButtonProps}
          >
            {confirmLabel}
          </PrimaryButton>
        </div>
      </DialogContent>
    </BaseDialog>
  );
}

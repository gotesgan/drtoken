"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogPanel,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the open state should change */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description / body text */
  description: string;
  /** Label for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /**
   * Button variant for the confirm action.
   * Maps to the Button component's `variant` prop.
   * Use `"destructive"` for dangerous actions, `"default"` for neutral ones.
   * @default "destructive"
   */
  confirmVariant?: "default" | "destructive";
  /** Called when the user clicks confirm */
  onConfirm: () => void;
  /** Show a loading spinner on the confirm button */
  isLoading?: boolean;
}

/**
 * A reusable confirmation dialog powered by COSS AlertDialog.
 *
 * Usage:
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Skip Patient"
 *   description="Are you sure you want to skip Token #5 (John)?"
 *   confirmLabel="Skip Patient"
 *   confirmVariant="destructive"
 *   onConfirm={() => handleSkip()}
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "destructive",
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogPanel className="flex justify-end gap-2">
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={confirmVariant}
            onClick={onConfirm}
            loading={isLoading}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogPanel>
      </AlertDialogContent>
    </AlertDialog>
  );
}

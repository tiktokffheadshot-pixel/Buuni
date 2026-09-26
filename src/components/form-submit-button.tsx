"use client";

import { type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  children: ReactNode;
  pendingLabel: string;
  className: string;
  disabled?: boolean;
};

export function FormSubmitButton({ children, pendingLabel, className, disabled = false }: Props) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={className}
      aria-disabled={isDisabled}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
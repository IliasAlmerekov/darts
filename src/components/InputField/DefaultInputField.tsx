import "./DefaultInputField.css";
import React, { useEffect, useRef } from "react";

type Props = {
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>, name: string) => void;
  autoFocus?: boolean;
};

function DefaultInputField({
  onKeyDown,
  name,
  value,
  placeholder,
  onChange,
  autoFocus,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  return (
    <input
      ref={inputRef}
      onKeyDown={(e) => onKeyDown?.(e, name)}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      className="copylarge defaultInputField"
    />
  );
}
export default DefaultInputField;

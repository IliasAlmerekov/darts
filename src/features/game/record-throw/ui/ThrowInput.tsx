import { useState } from "react";
import type { ThrowRequest } from "@/shared/types";

interface ThrowInputProps {
  onSubmit: (data: ThrowRequest) => Promise<void>;
  disabled?: boolean;
}

export function ThrowInput({ onSubmit, disabled }: ThrowInputProps) {
  const [value, setValue] = useState<number | "">("");
  const [isDouble, setIsDouble] = useState(false);
  const [isTriple, setIsTriple] = useState(false);
  const [isBust, setIsBust] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (value === "") return;
    await onSubmit({
      playerId: 0, // caller should override
      value: Number(value),
      isDouble,
      isTriple,
      isBust,
    });
    setValue("");
    setIsDouble(false);
    setIsTriple(false);
    setIsBust(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        min={0}
        max={180}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value === "" ? "" : Number(e.target.value))}
      />
      <label>
        <input
          type="checkbox"
          checked={isDouble}
          disabled={disabled}
          onChange={(e) => setIsDouble(e.target.checked)}
        />
        Double
      </label>
      <label>
        <input
          type="checkbox"
          checked={isTriple}
          disabled={disabled}
          onChange={(e) => setIsTriple(e.target.checked)}
        />
        Triple
      </label>
      <label>
        <input
          type="checkbox"
          checked={isBust}
          disabled={disabled}
          onChange={(e) => setIsBust(e.target.checked)}
        />
        Bust
      </label>
      <button type="submit" disabled={disabled}>
        Submit throw
      </button>
    </form>
  );
}

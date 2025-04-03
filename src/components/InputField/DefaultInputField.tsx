import "./DefaultInputField.css";
import React from "react";

type Props = {
  placeholder: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (
    name: string
  ) => (e: React.KeyboardEvent<HTMLInputElement>) => void;
  name: string;
};

function DefaultInputField({ ...props }: Props) {
  return (
    <input
      onKeyDown={props.onKeyDown(props.name)}
      autoFocus
      value={props.value}
      placeholder={props.placeholder}
      onChange={props.onChange}
      className="copylarge defaultInputField"
    />
  );
}
export default DefaultInputField;

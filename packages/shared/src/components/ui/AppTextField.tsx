import React, { useState, useEffect, useRef } from "react";
import { TextField } from "@mui/material";
import type { TextFieldProps, SxProps, Theme } from "@mui/material";

export type AppTextFieldProps = TextFieldProps & {
  rounded?: boolean; // If they want full pill shape somewhere
  debounceMs?: number;
  onDebounceChange?: (value: string) => void;
};

const AppTextField: React.FC<AppTextFieldProps> = ({
  sx,
  rounded = false,
  debounceMs,
  onDebounceChange,
  value,
  onChange,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(value ?? "");
  const timerRef = useRef<any>(null);
  const isTyping = useRef(false);

  useEffect(() => {
    if (debounceMs !== undefined && !isTyping.current) {
      setLocalValue(value ?? "");
    }
  }, [value, debounceMs]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newVal = e.target.value;

    // Auto-capitalize first letter synchronously while typing
    if (newVal.length > 0) {
      const firstChar = newVal.charAt(0);
      if (firstChar !== firstChar.toUpperCase()) {
        newVal = firstChar.toUpperCase() + newVal.slice(1);
      }
    }

    if (debounceMs !== undefined && onDebounceChange) {
      isTyping.current = true;
      setLocalValue(newVal);

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        isTyping.current = false;
        onDebounceChange(newVal);
      }, debounceMs);
    } else if (onChange) {
      // Uncontrolled mode or immediate mode
      setLocalValue(newVal);
      const newEvent = {
        ...e,
        target: { ...e.target, value: newVal, name: e.target.name },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(newEvent);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isTyping.current = false;
    if (debounceMs !== undefined && onDebounceChange) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        onDebounceChange(localValue as string);
      }
    }
    if (props.onBlur) props.onBlur(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && debounceMs !== undefined && onDebounceChange) {
      if (timerRef.current) clearTimeout(timerRef.current);
      onDebounceChange(localValue as string);
    }
    if (props.onKeyDown) props.onKeyDown(e);
  };

  const baseSx: SxProps<Theme> = {
    "& .MuiOutlinedInput-root": {
      borderRadius: rounded ? 9999 : "8px",
      ...(props.multiline ? {} : { height: 40 }),
      fontSize: 13,
      bgcolor: "#fff",
      "& fieldset": { borderColor: "#bfc9c4" },
      "&:hover fieldset": { borderColor: "#2e7d32" },
      "&.Mui-focused fieldset": { borderColor: "#2e7d32" },
    },
    "& .MuiFormLabel-asterisk": {
      color: "#dc2626",
    },
  };

  const finalSx = [baseSx, ...(Array.isArray(sx) ? sx : [sx])];

  if (debounceMs !== undefined) {
    return (
      <TextField
        size="small"
        sx={finalSx}
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        {...props}
      />
    );
  }

  return (
    <TextField
      size="small"
      sx={finalSx}
      value={value !== undefined ? (value ?? "") : localValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      {...props}
    />
  );
};

export default AppTextField;

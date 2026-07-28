import React, { useState, useEffect, useRef } from "react";
import { Autocomplete, TextField } from "@mui/material";
import type { AutocompleteProps, TextFieldProps } from "@mui/material";

export type AppAutocompleteProps<
  T,
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined
> = Omit<AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>, "renderInput"> & {
  debounceMs?: number;
  onDebounceInputChange?: (value: string) => void;
  renderInputProps?: TextFieldProps;
};

export default function AppAutocomplete<
  T,
  Multiple extends boolean | undefined = undefined,
  DisableClearable extends boolean | undefined = undefined,
  FreeSolo extends boolean | undefined = undefined
>({
  debounceMs,
  onDebounceInputChange,
  onInputChange,
  inputValue: propInputValue,
  renderInputProps,
  ...props
}: AppAutocompleteProps<T, Multiple, DisableClearable, FreeSolo>) {
  const [localInputValue, setLocalInputValue] = useState(propInputValue ?? "");
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (propInputValue !== undefined) {
      setLocalInputValue(propInputValue);
    }
  }, [propInputValue]);

  const handleInputChange = (
    event: React.SyntheticEvent,
    value: string,
    reason: string
  ) => {
    setLocalInputValue(value);

    if (debounceMs !== undefined && onDebounceInputChange) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onDebounceInputChange(value);
      }, debounceMs);
    }

    if (onInputChange) {
      onInputChange(event, value, reason);
    }
  };

  return (
    <Autocomplete
      inputValue={localInputValue}
      onInputChange={handleInputChange}
      renderInput={(params) => <TextField {...params} {...renderInputProps} />}
      {...(props as any)}
    />
  );
}

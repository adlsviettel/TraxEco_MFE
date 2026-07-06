import { createTheme, type ThemeOptions } from "@mui/material/styles";

// ─── Luxury Design Tokens ───
const tokens = {
  // Emerald / Pine - A very sophisticated, muted green for a premium eco feel
  primary: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#15803d", // Deep Emerald
    600: "#166534",
    700: "#14532d",
    800: "#064e3b",
    900: "#022c22",
  },
  // Slate / Charcoal - High-end tech feel instead of flat black
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  dark: {
    bg: "#0a0a0b",
    surface: "#121214",
    card: "#18181b",
    border: "rgba(255,255,255,0.06)",
    hover: "rgba(255,255,255,0.03)",
  },
  // Ultra-soft luxury shadows (Apple/Stripe style)
  shadow: {
    xs: "0 1px 2px rgba(0,0,0,0.03)",
    sm: "0 2px 8px -2px rgba(15, 23, 42, 0.05), 0 1px 4px -1px rgba(15, 23, 42, 0.03)",
    md: "0 12px 24px -6px rgba(15, 23, 42, 0.08), 0 4px 12px -4px rgba(15, 23, 42, 0.05)",
    lg: "0 24px 48px -12px rgba(15, 23, 42, 0.12), 0 12px 24px -8px rgba(15, 23, 42, 0.06)",
    xl: "0 32px 64px -12px rgba(15, 23, 42, 0.16), 0 16px 32px -8px rgba(15, 23, 42, 0.08)",
    glow: "0 0 30px rgba(21, 128, 61, 0.15)",
  },
};

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily:
      '"Outfit", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: {
      fontSize: "2.5rem",
      fontWeight: 700,
      letterSpacing: "-0.03em",
      lineHeight: 1.15,
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 600,
      letterSpacing: "-0.02em",
      lineHeight: 1.2,
    },
    h3: {
      fontSize: "1.5rem",
      fontWeight: 600,
      letterSpacing: "-0.015em",
      lineHeight: 1.3,
    },
    h4: {
      fontSize: "1.25rem",
      fontWeight: 600,
      letterSpacing: "-0.01em",
      lineHeight: 1.35,
    },
    h5: {
      fontSize: "1.125rem",
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: "-0.01em",
    },
    h6: {
      fontSize: "1rem",
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: "0.01em",
    },
    subtitle1: {
      fontSize: "0.95rem",
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: "0.01em",
    },
    subtitle2: {
      fontSize: "0.85rem",
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    },
    body1: { fontSize: "0.9375rem", lineHeight: 1.6, fontWeight: 400 },
    body2: { fontSize: "0.8125rem", lineHeight: 1.6, fontWeight: 400 },
    caption: { fontSize: "0.75rem", lineHeight: 1.5, letterSpacing: "0.03em" },
    button: {
      textTransform: "none" as const,
      fontWeight: 500,
      letterSpacing: "0.02em",
    },
  },
  shape: {
    borderRadius: 12,
  },
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 400,
      enteringScreen: 250,
      leavingScreen: 200,
    },
    easing: {
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      easeOut: "cubic-bezier(0.1, 0.9, 0.2, 1)", // Snappier easeOut
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        ::selection { background: rgba(21, 128, 61, 0.2); }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
      `,
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 20px",
          fontSize: "0.875rem",
          fontWeight: 500,
          transition: "all 0.25s cubic-bezier(0.1, 0.9, 0.2, 1)",
          "&:active": { transform: "scale(0.97)" },
        },
        containedPrimary: {
          background: tokens.primary[600],
          color: "#fff",
          boxShadow: "0 4px 12px rgba(21, 128, 61, 0.2)",
          "&:hover": {
            background: tokens.primary[700],
            boxShadow: "0 6px 16px rgba(21, 128, 61, 0.3)",
            transform: "translateY(-1px)",
          },
        },
        outlined: {
          borderWidth: "1px",
          borderColor: tokens.slate[200],
          color: tokens.slate[700],
          "&:hover": {
            borderWidth: "1px",
            borderColor: tokens.slate[400],
            backgroundColor: "#ffffff",
          },
        },
        sizeLarge: { padding: "12px 28px", fontSize: "1rem", borderRadius: 10 },
        sizeSmall: {
          padding: "6px 14px",
          fontSize: "0.8125rem",
          borderRadius: 6,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: tokens.shadow.md,
          border: "1px solid rgba(255,255,255,0.4)",
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          transition: "all 0.3s cubic-bezier(0.1, 0.9, 0.2, 1)",
          "&:hover": { boxShadow: tokens.shadow.lg },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 20 },
        elevation1: { boxShadow: tokens.shadow.sm },
        elevation2: { boxShadow: tokens.shadow.md },
        elevation3: { boxShadow: tokens.shadow.lg },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 12,
            backgroundColor: "#ffffff",
            transition: "all 0.25s ease",
            "& fieldset": {
              borderColor: tokens.slate[300],
              borderWidth: "1px",
              transition: "all 0.25s ease",
            },
            "&:hover fieldset": {
              borderColor: tokens.slate[400],
            },
            "&:hover": {
              backgroundColor: "#fff",
            },
            "&.Mui-focused fieldset": {
              borderColor: tokens.primary[500],
              borderWidth: "1px",
            },
            "&.Mui-focused": {
              backgroundColor: "#fff",
              boxShadow: "0 0 0 3px rgba(21, 128, 61, 0.1)",
            },
          },
          "& .MuiInputLabel-root": {
            color: tokens.slate[500],
            "&.Mui-focused": {
              color: tokens.primary[600],
            },
          },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: tokens.shadow.lg,
          border: "1px solid rgba(0,0,0,0.05)",
        },
        listbox: {
          padding: "8px",
          "& .MuiAutocomplete-option": {
            borderRadius: 8,
            padding: "8px 12px",
            margin: "2px 0",
            fontSize: "0.9rem",
            transition: "background-color 0.2s",
            '&[aria-selected="true"]': {
              backgroundColor: tokens.primary[50],
              color: tokens.primary[700],
              fontWeight: 500,
            },
            '&[aria-selected="true"].Mui-focused': {
              backgroundColor: tokens.primary[100],
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: "0.8125rem",
          borderRadius: 6,
          transition: "all 0.2s ease",
        },
        filled: {
          backgroundColor: tokens.slate[100],
          color: tokens.slate[700],
          border: "1px solid transparent",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          boxShadow: tokens.shadow.xl,
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(20px)",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 500,
        },
      },
    },
    MuiDateCalendar: {
      defaultProps: {
        dayOfWeekFormatter: (date: any) => {
          const lang = window.localStorage.getItem('i18nextLng') || 'vi';
          if (lang.startsWith('vi')) {
            return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
          }
          return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][date.getDay()];
        }
      }
    },
  },
};
export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: "light",
    primary: { main: "#2e7d32" },
    secondary: { main: tokens.slate[500] },
    background: { default: tokens.slate[50], paper: "#ffffff" },
  },
});
export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: "dark",
    primary: { main: tokens.primary[400] },
    secondary: { main: tokens.slate[400] },
    background: { default: tokens.dark.bg, paper: tokens.dark.surface },
  },
});

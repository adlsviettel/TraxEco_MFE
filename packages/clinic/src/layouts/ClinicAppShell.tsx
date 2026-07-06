import React, { ReactNode, useMemo, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  Divider,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useMediaQuery,
} from "@mui/material";
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { authService, HeaderActions } from "@traxeco/shared";

export interface NavItem {
  text: string;
  label?: string;
  icon: ReactNode;
  path: string;
  pageCode: string;
}

export interface PageDef {
  path: string;
  component: ReactNode;
}

export interface AppShellProps {
  appTitle: string;
  appTitleShort?: string;
  appLogo?: ReactNode;
  accentColor?: string;
  drawerWidth?: number;
  navItems: NavItem[];
  pages: PageDef[];
  storageKey: string;
  headerExtra?: ReactNode;
  versionString?: string;
  fallbackPath?: string;
  rootPath?: string;
  onSettingsClick?: () => void;
  settingsText?: string;
}

export default function ClinicAppShell({
  appTitle,
  appTitleShort,
  appLogo,
  accentColor = "#2e7d32",
  drawerWidth = 240,
  navItems,
  pages,
  storageKey,
  headerExtra,
  versionString,
  fallbackPath,
  rootPath,
  onSettingsClick,
  settingsText,
}: AppShellProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? saved === "true" : true;
  });

  const toggleDrawer = () => {
    setOpen((prev) => {
      const nextState = !prev;
      localStorage.setItem(storageKey, String(nextState));
      return nextState;
    });
  };

  const filteredMenuItems = useMemo(() => {
    return navItems.filter((item) => authService.hasPageAccess(item.pageCode));
  }, [navItems]);

  const activeIndex = filteredMenuItems.findIndex(
    (item) =>
      location.pathname === item.path ||
      location.pathname.startsWith(item.path + "/"),
  );

  const currentPath = location.pathname;
  const isDispenseRoute = false;

  useEffect(() => {
    const isRoot = rootPath
      ? currentPath === rootPath || currentPath === rootPath + "/"
      : false;

    if (isRoot) {
      if (filteredMenuItems.length > 0) {
        navigate(filteredMenuItems[0].path, { replace: true });
      } else if (fallbackPath) {
        navigate(fallbackPath, { replace: true });
      }
    }
  }, [currentPath, filteredMenuItems, navigate, rootPath, fallbackPath]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        width: "100%",
        height: "100vh",
        backgroundColor: isMobile ? "#f6f9fc" : undefined,
        overflow: isMobile ? "auto" : "hidden",
      }}
    >
      <CssBaseline />

      {/* ─── APP BAR (responsive) ─── */}
      {!isDispenseRoute && (isMobile ? (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            backgroundColor: "#ffffff",
            borderBottom: `1px solid #e6ebf1`,
            color: "#0a2540",
          }}
        >
          <Toolbar
            sx={{
              minHeight: "calc(52px + env(safe-area-inset-top)) !important",
              pt: "env(safe-area-inset-top)",
              px: 2,
            }}
          >
            {appLogo ? (
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: 1.5,
                  mr: 1.5,
                  backgroundColor: "#43a047",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {appLogo}
              </Box>
            ) : null}
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 800, color: "#0a2540", lineHeight: 1.2 }}
              >
                {appTitleShort || appTitle}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{ fontWeight: 600, color: "#425466", lineHeight: 1.1 }}
              >
                {activeIndex >= 0
                  ? filteredMenuItems[activeIndex].label ||
                    filteredMenuItems[activeIndex].text
                  : ""}
              </Typography>
            </Box>
            {headerExtra}
            <HeaderActions homePath="/" />
          </Toolbar>
        </AppBar>
      ) : (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            backgroundColor: "#ffffff",
            borderBottom: `1px solid #e6ebf1`,
            color: "#0a2540",
            transition: theme.transitions.create(["width", "margin"], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            ...(open && {
              marginLeft: drawerWidth,
              width: `calc(100% - ${drawerWidth}px)`,
              transition: theme.transitions.create(["width", "margin"], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }),
          }}
        >
          <Toolbar
            sx={{
              minHeight: "calc(64px + env(safe-area-inset-top)) !important",
              pt: "env(safe-area-inset-top)",
            }}
          >
            <IconButton
              onClick={toggleDrawer}
              edge="start"
              sx={{
                marginRight: 1,
                color: "#425466",
                ...(open && { display: "none" }),
              }}
            >
              <MenuIcon />
            </IconButton>
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                overflow: "hidden",
              }}
            >
              <Typography
                variant="h6"
                noWrap
                sx={{ fontWeight: 800, color: "#0a2540" }}
              >
                {appTitle}
              </Typography>
              <Typography variant="h6" sx={{ color: "#e6ebf1" }}>
                |
              </Typography>
              <Typography
                variant="subtitle1"
                noWrap
                sx={{ fontWeight: 600, color: "#425466", mt: "2px" }}
              >
                {activeIndex >= 0
                  ? filteredMenuItems[activeIndex].label ||
                    filteredMenuItems[activeIndex].text
                  : ""}
              </Typography>
            </Box>
            {headerExtra}
            <HeaderActions homePath="/" />
          </Toolbar>
        </AppBar>
      ))}

      {/* ─── DESKTOP SIDEBAR (hidden on mobile) ─── */}
      {!isDispenseRoute && !isMobile && (
        <Drawer
          variant="permanent"
          open={open}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            whiteSpace: "nowrap",
            boxSizing: "border-box",
            ...(open && {
              width: drawerWidth,
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              "& .MuiDrawer-paper": {
                width: drawerWidth,
                overflowX: "hidden",
                backgroundColor: "#ffffff",
                color: "#425466",
                borderRight: "1px solid #e6ebf1",
                transition: theme.transitions.create("width", {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
              },
            }),
            ...(!open && {
              width: `calc(${theme.spacing(7)} + 1px)`,
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
              "& .MuiDrawer-paper": {
                width: `calc(${theme.spacing(7)} + 1px)`,
                overflowX: "hidden",
                backgroundColor: "#ffffff",
                color: "#425466",
                borderRight: "1px solid #e6ebf1",
                transition: theme.transitions.create("width", {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.leavingScreen,
                }),
              },
            }),
          }}
        >
          <Toolbar
            sx={{
              minHeight: "calc(64px + env(safe-area-inset-top)) !important",
              pt: "env(safe-area-inset-top)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              px: [1],
            }}
          >
            <Typography
              variant="h6"
              sx={{
                flexGrow: 1,
                ml: 1.5,
                fontWeight: 800,
                opacity: open ? 1 : 0,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                transition: "opacity 0.3s",
              }}
            >
              {appLogo ? (
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1.5,
                    backgroundColor: "#43a047",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {appLogo}
                </Box>
              ) : null}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  lineHeight: 1.15,
                }}
              >
                <Box
                  component="span"
                  sx={{ fontSize: "1rem", fontWeight: 700, color: "#0a2540" }}
                >
                  {appTitleShort || appTitle}
                </Box>
              </Box>
            </Typography>
            <IconButton
              onClick={toggleDrawer}
              sx={{ color: "#8898aa", "&:hover": { color: "#0a2540" } }}
            >
              <ChevronLeftIcon />
            </IconButton>
          </Toolbar>
          <Box sx={{ px: 2, pb: 1 }}>
            <Divider sx={{ borderColor: "#e6ebf1" }} />
          </Box>
          <List sx={{ px: 1.5, pt: 1 }}>
            {filteredMenuItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + "/");
              return (
                <ListItem
                  key={item.text}
                  disablePadding
                  sx={{ display: "block", mb: 0.5 }}
                >
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    selected={isActive}
                    sx={{
                      minHeight: 40,
                      justifyContent: open ? "initial" : "center",
                      px: open ? 2 : 1,
                      borderRadius: 1.5,
                      position: "relative",
                      color: isActive ? "#2e7d32" : "#425466",
                      backgroundColor: isActive
                        ? "rgba(46,125,50,0.08)"
                        : "transparent",
                      "&:hover": {
                        backgroundColor: isActive
                          ? "rgba(46,125,50,0.12)"
                          : "rgba(0,0,0,0.04)",
                        color: isActive ? "#2e7d32" : "#0a2540",
                      },
                      "&.Mui-selected": {
                        backgroundColor: "rgba(46,125,50,0.08)",
                        color: "#2e7d32",
                        "&:hover": {
                          backgroundColor: "rgba(46,125,50,0.12)",
                        },
                      },
                    }}
                  >
                    {isActive && (
                      <Box
                        sx={{
                          position: "absolute",
                          left: 0,
                          top: "10%",
                          bottom: "10%",
                          width: 3,
                          backgroundColor: "#2e7d32",
                          borderRadius: "0 4px 4px 0",
                        }}
                      />
                    )}
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 1.5 : "auto",
                        justifyContent: "center",
                        color: isActive ? "#2e7d32" : "inherit",
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      sx={{
                        opacity: open ? 1 : 0,
                        "& .MuiTypography-root": {
                          fontWeight: isActive ? 600 : 500,
                          fontSize: "0.875rem",
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          {onSettingsClick && (
            <Box sx={{ mt: "auto", px: 1.5 }}>
              <ListItem disablePadding sx={{ display: "block", mb: 0 }}>
                <ListItemButton
                  onClick={onSettingsClick}
                  sx={{
                    minHeight: 40,
                    justifyContent: open ? "initial" : "center",
                    px: open ? 2 : 1,
                    borderRadius: 1.5,
                    color: "#425466",
                    "&:hover": {
                      backgroundColor: "rgba(0,0,0,0.04)",
                      color: "#0a2540",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 1.5 : "auto",
                      justifyContent: "center",
                      color: "inherit",
                    }}
                  >
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={settingsText || t("nav.settings", "Settings")}
                    sx={{
                      opacity: open ? 1 : 0,
                      "& .MuiTypography-root": {
                        fontWeight: 500,
                        fontSize: "0.875rem",
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </Box>
          )}
          {versionString && (
            <Box
              sx={{
                mt: onSettingsClick ? 0 : "auto",
                pb: 2,
                pt: 2,
                textAlign: "center",
                opacity: open ? 1 : 0,
                transition: "opacity 0.2s",
                overflow: "hidden",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "#8898aa",
                  fontWeight: 500,
                  fontSize: "0.7rem",
                  display: "block",
                  whiteSpace: "nowrap",
                }}
              >
                {versionString}
              </Typography>
            </Box>
          )}
        </Drawer>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: isDispenseRoute ? 0 : 1,
          pt: 0,
          backgroundColor: "#f6f9fc",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: isDispenseRoute ? "hidden" : "auto",
          height: "100%",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {!isDispenseRoute && (isMobile ? (
          <Toolbar
            sx={{
              minHeight: "calc(52px + env(safe-area-inset-top)) !important",
              p: 0,
              m: 0,
              mb: 1,
            }}
          />
        ) : (
          <Toolbar
            sx={{
              minHeight: "calc(64px + env(safe-area-inset-top)) !important",
              p: 0,
              m: 0,
              mb: 1,
            }}
          />
        ))}
        <Box
          sx={{
            width: "100%",
            flexGrow: 1,
            minHeight: 0,
            position: "relative",
          }}
        >
          {pages.map(({ path, component }) => {
            const isActive =
              currentPath === path || currentPath.startsWith(path + "/");
            return (
              <div
                key={path}
                style={{
                  display: isActive ? "flex" : "none",
                  flexDirection: "column",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              >
                {component}
              </div>
            );
          })}
        </Box>
      </Box>

      {/* ─── MOBILE BOTTOM NAV (hidden on desktop) ─── */}
      {isMobile && (
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            borderTop: "1px solid #e6ebf1",
          }}
        >
          <BottomNavigation
            value={activeIndex >= 0 ? activeIndex : 0}
            onChange={(_, newValue) =>
              navigate(filteredMenuItems[newValue].path)
            }
            showLabels
            sx={{
              height: 64,
              backgroundColor: "#ffffff",
              "& .MuiBottomNavigationAction-root": {
                minWidth: 0,
                py: 1,
                color: "#8898aa",
                "&.Mui-selected": { color: "#43a047" },
              },
              "& .MuiBottomNavigationAction-label": {
                fontSize: "0.65rem",
                fontWeight: 500,
                "&.Mui-selected": { fontSize: "0.67rem", fontWeight: 600 },
              },
            }}
          >
            {filteredMenuItems.map((item) => (
              <BottomNavigationAction
                key={item.path}
                label={item.text}
                icon={item.icon}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}

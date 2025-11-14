import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  MantineProvider,
  createTheme,
  Button,
  Card,
  Tabs,
  ActionIcon,
  Badge,
  Input,
  Paper,
  Modal,
  Accordion,
  type MantineTheme,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { configureClient } from "@ephemera/shared";

// Import Mantine styles
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

const brandColor = "#ff9b00" as const;
const brandPalette = Array.from({ length: 10 }, () => brandColor) as [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];
const redPalette = Array.from({ length: 10 }, () => "#ff0000") as [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

const getBrandShade = (theme: MantineTheme, index: number) =>
  theme.colors.brand?.[index] ?? brandPalette[index];

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Configure the API client
configureClient({
  baseUrl: "/api",
});

// Create a new router instance
const router = createRouter({
  routeTree,
  defaultPreloadStaleTime: 0,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Create theme with primary color and brand styling
const theme = createTheme({
  primaryColor: "brand",
  colors: {
    brand: brandPalette,
    red: redPalette,
  },
  fontFamily: '"Fira Code", monospace',
  fontFamilyMonospace: '"Fira Code", monospace',
  headings: {
    fontFamily: '"Fira Code", monospace',
  },
  defaultRadius: "md",
  components: {
    Button: Button.extend({
      defaultProps: {
        color: "brand",
        variant: "filled",
      },
      styles: (theme) => ({
        root: {
          backgroundColor: getBrandShade(theme, 5),
          borderColor: getBrandShade(theme, 5),
          color: theme.white,
          fontFamily: '"Fira Code", monospace',
          "&:hover": {
            backgroundColor: getBrandShade(theme, 5),
            borderColor: getBrandShade(theme, 5),
          },
        },
      }),
    }),
    Card: Card.extend({
      styles: () => ({
        root: {
          backgroundColor: "#000000",
          borderColor: "#ff9b00",
        },
      }),
    }),
    Tabs: Tabs.extend({
      styles: (theme) => ({
        tab: {
          borderRadius: theme.radius.md,
          color: getBrandShade(theme, 5),
          borderColor: getBrandShade(theme, 5),
          "&[data-active]": {
            backgroundColor: getBrandShade(theme, 5),
            color: "#000000",
          },
        },
        list: {
          borderColor: getBrandShade(theme, 5),
        },
        panel: {
          backgroundColor: "#000000",
          color: getBrandShade(theme, 5),
        },
      }),
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: {
        variant: "subtle",
        color: "brand",
      },
      styles: (theme) => ({
        root: {
          color: getBrandShade(theme, 5),
          "&:hover": {
            backgroundColor: "transparent",
            color: getBrandShade(theme, 5),
          },
        },
      }),
    }),
    Badge: Badge.extend({
      styles: (theme, params) => ({
        root: {
          borderColor:
            params.variant === "outline"
              ? params.color === "red"
                ? theme.colors.red[5]
                : getBrandShade(theme, 5)
              : undefined,
          color:
            params.variant === "outline"
              ? params.color === "red"
                ? theme.colors.red[5]
                : getBrandShade(theme, 5)
              : undefined,
        },
      }),
    }),
    Input: Input.extend({
      styles: () => ({
        input: {
          backgroundColor: "#000000",
          borderColor: "#ff9b00",
          color: "#ff9b00",
          fontFamily: '"Fira Code", monospace',
          "::placeholder": {
            color: "#ff9b00",
            opacity: 0.6,
          },
        },
        section: {
          color: "#ff9b00",
        },
      }),
    }),
    Paper: Paper.extend({
      styles: () => ({
        root: {
          backgroundColor: "#000000",
          borderColor: "#ff9b00",
        },
      }),
    }),
    Modal: Modal.extend({
      styles: () => ({
        content: {
          backgroundColor: "#000000",
          border: "1px solid #ff9b00",
        },
        header: {
          backgroundColor: "#000000",
          borderBottom: "1px solid #ff9b00",
        },
        title: {
          color: "#ff9b00",
        },
      }),
    }),
    Accordion: Accordion.extend({
      styles: () => ({
        item: {
          backgroundColor: "#000000",
          border: "1px solid #ff9b00",
        },
        control: {
          color: "#ff9b00",
        },
        content: {
          color: "#ff9b00",
        },
      }),
    }),
  },
});

// CSS Variables Resolver - override base colors for the dark theme
const cssVariablesResolver = () => ({
  variables: {
    "--mantine-color-body": "#000000",
    "--mantine-color-text": "#ff9b00",
    "--mantine-color-dimmed": "#ff9b00",
    "--mantine-color-border": "#ff9b00",
    "--mantine-color-error": "#ff0000",
  },
  light: {},
  dark: {
    "--mantine-color-body": "#000000",
    "--mantine-color-text": "#ff9b00",
    "--mantine-color-dimmed": "#ff9b00",
    "--mantine-color-border": "#ff9b00",
    "--mantine-color-error": "#ff0000",
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={theme}
        defaultColorScheme="dark"
        cssVariablesResolver={cssVariablesResolver}
      >
        <Notifications position="top-right" />
        <RouterProvider router={router} />
        <ReactQueryDevtools initialIsOpen={false} />
      </MantineProvider>
    </QueryClientProvider>
  </StrictMode>,
);

import {
  createRootRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Title,
  ActionIcon,
  Badge,
  Stack,
  Tabs,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconSearch,
  IconDownload,
  IconSettings,
  IconBookmark,
  IconBook,
  IconExternalLink,
} from "@tabler/icons-react";
import { useMemo } from "react";
import { useQueue } from "../hooks/useQueue";
import { useRequests, useRequestStats } from "../hooks/useRequests";
import { useAppSettings } from "../hooks/useSettings";
import { VersionFooter } from "../components/VersionFooter";

const mobileTabRoutes = [
  { value: "/search", label: "Search", icon: IconSearch },
  { value: "/queue", label: "Queue", icon: IconDownload },
  { value: "/requests", label: "Requests", icon: IconBookmark },
] as const;

type MobileTabValue = (typeof mobileTabRoutes)[number]["value"];

function RootComponent() {
  const [opened, { toggle }] = useDisclosure();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("dark", {
    getInitialValueInEffect: true,
  });
  const navigate = useNavigate();
  const routerState = useRouterState();
  const isMobile = useMediaQuery("(max-width: 48em)");

  // Establish SSE connections at root level (stays alive throughout session)
  const { data: queue } = useQueue({ notifyOnComplete: true, enableSSE: true });
  useRequests(undefined, { enableSSE: true }); // Enable SSE for requests at root level

  // Fetch request stats for badge (will be updated via SSE)
  const { data: requestStats } = useRequestStats();

  // Fetch app settings for library link
  const { data: settings } = useAppSettings();

  // Calculate queue badge counts
  const queueingCount = queue ? Object.keys(queue.queued).length : 0;
  const downloadingCount = queue ? Object.keys(queue.downloading).length : 0;
  const delayedCount = queue ? Object.keys(queue.delayed).length : 0;
  const totalActiveCount = queueingCount + downloadingCount + delayedCount;

  // Get active requests count for badge
  const activeCount = requestStats?.active || 0;

  const activeTab = useMemo<MobileTabValue>(() => {
    const path = routerState.location.pathname;
    if (path.startsWith("/queue")) {
      return "/queue";
    }
    if (path.startsWith("/requests")) {
      return "/requests";
    }
    return "/search";
  }, [routerState.location.pathname]);

  const handleMobileTabChange = (value: string | null) => {
    if (!value) return;
    navigate({ to: value as MobileTabValue });
  };

  const renderTabLabel = (label: string, count: number) => (
    <Group gap={4} wrap="nowrap" align="center">
      <span>{label}</span>
      {count > 0 && (
        <Badge size="xs" color="brand" variant="filled" c="#000000">
          {count}
        </Badge>
      )}
    </Group>
  );

  return (
    <AppShell
      header={{ height: isMobile ? 110 : 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={() => ({
        header: {
          backgroundColor: "#050505",
          borderBottom: "1px solid #ff9b00",
        },
        navbar: {
          backgroundColor: "#050505",
          borderRight: "1px solid #ff9b00",
        },
        main: {
          backgroundColor: "#000000",
          color: "#ff9b00",
        },
      })}
    >
      <AppShell.Header>
        <Stack h="100%" justify="center" px="md" gap="xs" py="sm">
          <Group justify="space-between">
            <Group>
              <Burger
                opened={opened}
                onClick={toggle}
                hiddenFrom="sm"
                size="sm"
              />
              <Title order={3}>Ephemera</Title>
            </Group>
            <Group gap="xs">
              {settings?.libraryUrl &&
                (settings.libraryLinkLocation === "header" ||
                  settings.libraryLinkLocation === "both") && (
                  <ActionIcon
                    component="a"
                    href={settings.libraryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="subtle"
                    aria-label="Library"
                  >
                    <IconBook size={20} />
                  </ActionIcon>
                )}
              <ActionIcon
                variant="subtle"
                onClick={toggleColorScheme}
                aria-label="Toggle color scheme"
              >
                {computedColorScheme === "light" ? (
                  <IconMoon size={20} />
                ) : (
                  <IconSun size={20} />
                )}
              </ActionIcon>
            </Group>
          </Group>
          {isMobile && (
            <Tabs
              value={activeTab}
              onChange={handleMobileTabChange}
              keepMounted={false}
              variant="outline"
              radius="md"
            >
              <Tabs.List grow>
                {mobileTabRoutes.map(({ value, label, icon: Icon }) => {
                  const count =
                    value === "/queue"
                      ? totalActiveCount
                      : value === "/requests"
                        ? activeCount
                        : 0;
                  return (
                    <Tabs.Tab
                      key={value}
                      value={value}
                      leftSection={<Icon size={16} />}
                    >
                      {renderTabLabel(label, count)}
                    </Tabs.Tab>
                  );
                })}
              </Tabs.List>
            </Tabs>
          )}
        </Stack>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack h="100%" gap={0} style={{ overflow: "hidden" }}>
          <NavLink
            component={Link}
            to="/search"
            label="Search"
            leftSection={<IconSearch size={20} />}
            onClick={() => toggle()}
          />
          <NavLink
            component={Link}
            to="/queue"
            label="Queue"
            leftSection={<IconDownload size={20} />}
            rightSection={
              totalActiveCount > 0 ? (
                <Badge
                  size="sm"
                  variant="filled"
                  color="brand"
                  c="#000000"
                  circle={totalActiveCount < 10}
                >
                  {totalActiveCount}
                </Badge>
              ) : null
            }
            onClick={() => toggle()}
          />
          <NavLink
            component={Link}
            to="/requests"
            label="Requests"
            leftSection={<IconBookmark size={20} />}
            rightSection={
              activeCount > 0 ? (
                <Badge
                  size="sm"
                  variant="filled"
                  color="brand"
                  c="#000000"
                  circle={activeCount < 10}
                >
                  {activeCount}
                </Badge>
              ) : null
            }
            onClick={() => toggle()}
          />
          {settings?.libraryUrl &&
            (settings.libraryLinkLocation === "sidebar" ||
              settings.libraryLinkLocation === "both") && (
              <NavLink
                component="a"
                href={settings.libraryUrl}
                target="_blank"
                rel="noopener noreferrer"
                label="Library"
                leftSection={<IconBook size={20} />}
                rightSection={<IconExternalLink size={16} />}
              />
            )}
          <NavLink
            component={Link}
            to="/settings"
            label="Settings"
            leftSection={<IconSettings size={20} />}
            onClick={() => toggle()}
            style={{ marginTop: "auto", marginBottom: 0 }}
          />
          <VersionFooter />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <TanStackRouterDevtools position="bottom-right" />
    </AppShell>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});

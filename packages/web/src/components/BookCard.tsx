import {
  Card,
  Image,
  Text,
  Badge,
  Button,
  Group,
  Stack,
  AspectRatio,
  Box,
} from "@mantine/core";
import {
  IconDownload,
  IconCheck,
  IconClock,
  IconAlertCircle,
} from "@tabler/icons-react";
import type { Book } from "@ephemera/shared";
import { useQueueDownload } from "../hooks/useDownload";
import { useBookStatus } from "../hooks/useBookStatus";
import { memo } from "react";
import { useMediaQuery } from "@mantine/hooks";

interface BookCardProps {
  book: Book;
}

interface LiveCountdownBadgeProps {
  md5: string;
  status: string | null | undefined;
  progress?: number;
}

// Separate component for the live countdown badge that re-renders every second
const LiveCountdownBadge = memo(
  ({ md5, status, progress }: LiveCountdownBadgeProps) => {
    const { remainingCountdown } = useBookStatus(md5);

    if (
      status === "queued" &&
      remainingCountdown !== null &&
      remainingCountdown !== undefined
    ) {
      return (
        <Badge
          size="sm"
          variant="outline"
          color="brand"
          leftSection={<IconClock size={12} />}
        >
          {`Waiting ${remainingCountdown}s`}
        </Badge>
      );
    }

    if (status === "downloading" && progress !== undefined) {
      return (
        <Badge
          size="sm"
          variant="outline"
          color="brand"
          leftSection={<IconDownload size={12} />}
        >
          {`Downloading ${Math.round(progress)}%`}
        </Badge>
      );
    }

    return null;
  },
);

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "Unknown";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${mb.toFixed(1)} MB`;
};

const getDownloadStatusBadge = (
  status: string | null | undefined,
  _progress?: number,
  _remainingCountdown?: number | null,
) => {
  if (!status) return null;

  switch (status) {
    case "available":
      return (
        <Badge
          size="sm"
          variant="filled"
          color="brand"
          leftSection={<IconCheck size={12} />}
        >
          Downloaded
        </Badge>
      );
    case "queued":
      return (
        <Badge
          size="sm"
          variant="outline"
          color="brand"
          leftSection={<IconClock size={12} />}
        >
          Queued
        </Badge>
      );
    case "downloading":
      // Handled separately by LiveCountdownBadge to avoid re-rendering entire card
      return null;
    case "delayed":
      return (
        <Badge
          size="sm"
          variant="outline"
          color="brand"
          leftSection={<IconClock size={12} />}
        >
          Delayed
        </Badge>
      );
    case "error":
      return (
        <Badge
          size="sm"
          variant="filled"
          color="red"
          leftSection={<IconAlertCircle size={12} />}
        >
          Error
        </Badge>
      );
    default:
      return null;
  }
};

export const BookCard = ({ book }: BookCardProps) => {
  const queueDownload = useQueueDownload();

  // Get live status from queue (reactive to SSE updates)
  const {
    status,
    progress,
    isAvailable,
    isQueued,
    isDownloading,
    isDelayed,
    isError,
    remainingCountdown,
  } = useBookStatus(book.md5, book.downloadStatus);

  const handleDownload = () => {
    queueDownload.mutate({
      md5: book.md5,
      title: book.title,
    });
  };

  const isInQueue = isQueued || isDownloading || isDelayed;
  const isMobile = useMediaQuery("(max-width: 48em)");
  const coverWidth = isMobile ? 56 : 72;

  return (
    <Card
      shadow="sm"
      padding="md"
      radius="md"
      withBorder
      style={{ display: "flex", backgroundColor: "#000000" }}
    >
      <Group
        align="flex-start"
        gap="md"
        wrap="nowrap"
        w="100%"
        style={{ alignItems: "stretch" }}
      >
        <Box style={{ flexShrink: 0 }}>
          <AspectRatio ratio={2 / 3} w={coverWidth}>
            <Image
              src={
                book.coverUrl ||
                "https://placehold.co/144x216/000000/ff9b00?text=No+Cover"
              }
              alt={book.title}
              fallbackSrc="https://placehold.co/144x216/000000/ff9b00?text=No+Cover"
              fit="cover"
              radius="sm"
            />
          </AspectRatio>
        </Box>

        <Stack gap="xs" style={{ flex: 1 }}>
          <div>
            <Text fw={600} lineClamp={2} size="sm">
              {book.title}
            </Text>

            {book.authors && book.authors.length > 0 && (
              <Text size="xs" c="var(--mantine-color-dimmed)" lineClamp={1}>
                {book.authors.join(", ")}
              </Text>
            )}

            <Group gap={6} mt="xs" wrap="wrap">
              {book.format && (
                <Badge size="sm" variant="outline" color="brand">
                  {book.format}
                </Badge>
              )}
              {book.size && (
                <Badge size="sm" variant="outline" color="brand">
                  {formatFileSize(book.size)}
                </Badge>
              )}
              {book.year && (
                <Badge size="sm" variant="outline" color="brand">
                  {book.year}
                </Badge>
              )}
              {book.language && (
                <Badge size="sm" variant="outline" color="brand">
                  {book.language.toUpperCase()}
                </Badge>
              )}
              {status === "queued" || status === "downloading" ? (
                <LiveCountdownBadge
                  md5={book.md5}
                  status={status}
                  progress={progress}
                />
              ) : (
                getDownloadStatusBadge(status, progress, remainingCountdown)
              )}
            </Group>
          </div>

          <Button
            mt="auto"
            leftSection={<IconDownload size={16} />}
            onClick={handleDownload}
            loading={queueDownload.isPending}
            disabled={queueDownload.isPending || isAvailable || isInQueue}
            variant="filled"
            color={isError ? "red" : "brand"}
            style={{ alignSelf: "flex-start" }}
          >
            {isAvailable
              ? "Already Downloaded"
              : isDownloading
                ? `Downloading ${
                    progress !== undefined ? `${Math.round(progress)}%` : "..."
                  }`
                : isQueued
                  ? "In Queue"
                  : isDelayed
                    ? "Delayed"
                    : isError
                      ? "Retry Download"
                      : "Download"}
          </Button>
        </Stack>
      </Group>
    </Card>
  );
};

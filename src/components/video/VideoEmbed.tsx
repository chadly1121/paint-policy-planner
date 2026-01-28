import { useMemo } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Play } from "lucide-react";

interface VideoEmbedProps {
  url: string;
  title?: string;
}

/**
 * Extracts video ID and provider from YouTube or Vimeo URLs
 */
function parseVideoUrl(url: string): { provider: "youtube" | "vimeo" | null; videoId: string | null } {
  if (!url) return { provider: null, videoId: null };

  // YouTube patterns
  // - youtube.com/watch?v=VIDEO_ID
  // - youtu.be/VIDEO_ID
  // - youtube.com/embed/VIDEO_ID
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      return { provider: "youtube", videoId: match[1] };
    }
  }

  // Vimeo patterns
  // - vimeo.com/VIDEO_ID
  // - player.vimeo.com/video/VIDEO_ID
  const vimeoPatterns = [
    /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/,
  ];

  for (const pattern of vimeoPatterns) {
    const match = url.match(pattern);
    if (match) {
      return { provider: "vimeo", videoId: match[1] };
    }
  }

  return { provider: null, videoId: null };
}

const VideoEmbed = ({ url, title = "Video" }: VideoEmbedProps) => {
  const { provider, videoId } = useMemo(() => parseVideoUrl(url), [url]);

  if (!provider || !videoId) {
    return (
      <div className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
        <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Invalid video URL. Please use a YouTube or Vimeo link.</p>
        <p className="text-xs mt-1 opacity-75">{url}</p>
      </div>
    );
  }

  const embedUrl =
    provider === "youtube"
      ? `https://www.youtube.com/embed/${videoId}?rel=0`
      : `https://player.vimeo.com/video/${videoId}`;

  return (
    <div className="mb-4">
      <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-lg bg-muted">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </AspectRatio>
    </div>
  );
};

export default VideoEmbed;

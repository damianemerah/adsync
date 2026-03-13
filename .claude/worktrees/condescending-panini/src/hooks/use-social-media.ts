"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

export interface SocialPost {
  id: string;
  platform: "instagram" | "tiktok";
  thumbnail: string;
  media_url: string;
  caption: string;
  likes: number;
  comments: number;
  postedAt: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  permalink: string;
}

export function useSocialMedia() {
  return useInfiniteQuery({
    queryKey: ["social-media", "instagram"],
    queryFn: async ({ pageParam }) => {
      // Pass pageParam as the cursor (it's null for the first page)
      const url = pageParam
        ? `/api/media/instagram?cursor=${pageParam}`
        : `/api/media/instagram`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor, // Meta returns this for the next fetch
  });
}

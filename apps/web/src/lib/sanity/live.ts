import { draftMode } from "next/headers";
import { defineLive } from "next-sanity";

import { client } from "./client";
import { token } from "./token";

/**
 * Published pages refresh on this interval. defineLive stores fetches with
 * revalidate: false and only busts them from sync tags, which the weekly ESPN
 * writes do not match for aggregated standings or prerendered /team/{abbrev}
 * routes. Time-based revalidation picks those up without a redeploy.
 */
export const PUBLISHED_REVALIDATE_SECONDS = 60;

const { sanityFetch: sanityFetchLive, SanityLive } = defineLive({
  client,
  // Optional for published content. Required for showing draft content when the
  // Sanity Presentation Tool is used or to enable Vercel Toolbar Edit Mode.
  serverToken: token,
  // Required for stand-alone live previews. The token is only shared to the
  // browser if it is a valid Next.js Draft Mode session.
  browserToken: token,
});

export { SanityLive };

type SanityFetchOptions = Parameters<typeof sanityFetchLive>[0];

export const sanityFetch: typeof sanityFetchLive = async (options) => {
  if ((await draftMode()).isEnabled) {
    return sanityFetchLive(options);
  }

  const params = options.params ? await options.params : {};
  const data = await client.fetch(options.query, params, {
    stega: options.stega ?? false,
    useCdn: true,
    cacheMode: "noStale",
    // Distinct from the next-loader request tag so this does not reuse data
    // cached forever under the old published fetches.
    tag: "warriors.published",
    next: { revalidate: PUBLISHED_REVALIDATE_SECONDS },
  });

  return { data, sourceMap: null, tags: [] } as Awaited<
    ReturnType<typeof sanityFetchLive<SanityFetchOptions["query"]>>
  >;
};

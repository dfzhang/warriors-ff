import { sanityFetch } from "@/lib/sanity/live";
import {
  queryAllTimeTeamRecords,
  queryHomePageData,
  queryLeagueChampions,
} from "@/lib/sanity/query";
import { getSEOMetadata } from "@/lib/seo";

import {
  HomePageContent,
  type ChampionRecord,
  type TeamRecord,
} from "@/components/home-page-content";

async function fetchHomePageData(stega = true) {
  return await sanityFetch({
    query: queryHomePageData,
    stega,
  });
}

export async function generateMetadata() {
  const { data: homePageData } = await fetchHomePageData(false);
  return getSEOMetadata(
    homePageData
      ? {
          title: homePageData?.title ?? homePageData?.seoTitle ?? "",
          description:
            homePageData?.description ?? homePageData?.seoDescription ?? "",
          slug: homePageData?.slug,
          contentId: homePageData?._id,
          contentType: homePageData?._type,
        }
      : {
          title: "Warriors Fantasy Football",
          description:
            "All-time standings, reigning champion, and Hall of Champions for the Warriors fantasy football league.",
          slug: "/",
        },
  );
}

export default async function Page() {
  const [{ data: champions }, { data: teams }] = await Promise.all([
    sanityFetch({ query: queryLeagueChampions }),
    sanityFetch({ query: queryAllTimeTeamRecords }),
  ]);

  return (
    <HomePageContent
      champions={(champions ?? []) as ChampionRecord[]}
      teams={(teams ?? []) as TeamRecord[]}
    />
  );
}

import { sanityFetch } from "@/lib/sanity/live";
import {
  queryDraftYears,
  queryGlobalSeoSettings,
  queryNavbarData,
} from "@/lib/sanity/query";
import type {
  QueryGlobalSeoSettingsResult,
  QueryNavbarDataResult,
} from "@/lib/sanity/sanity.types";

import { Logo } from "./logo";
import { NavbarClient, NavbarSkeletonResponsive } from "./navbar-client";

export async function NavbarServer() {
  const [navbarData, settingsData, draftYears] = await Promise.all([
    sanityFetch({ query: queryNavbarData }),
    sanityFetch({ query: queryGlobalSeoSettings }),
    sanityFetch({ query: queryDraftYears }),
  ]);

  // Add Drafts column with links to each year
  const years = Array.isArray(draftYears.data)
    ? draftYears.data
        .filter((year): year is number => typeof year === "number")
        .sort((a, b) => b - a)
    : [];

  const draftsColumn = {
    _key: "drafts-column",
    type: "column" as const,
    title: "Drafts",
    links: years.map((year) => ({
      _key: `draft-${year}`,
      name: year.toString(),
      description: `${year} Draft History`,
      icon: null,
      href: `/draft/${year}`,
      openInNewTab: false,
    })),
  };

  const leagueColumn = {
    _key: "league-column",
    type: "column" as const,
    title: "League",
    links: [
      {
        _key: "league-rules",
        name: "Rules",
        description: "Roster, keeper, and trade rules",
        icon: null,
        href: "/rules",
        openInNewTab: false,
      },
      {
        _key: "league-keepers",
        name: "Keeper tracker",
        description: "Keeper history and next-season eligibility",
        icon: null,
        href: "/keepers",
        openInNewTab: false,
      },
    ],
  };

  // Add the drafts column to the navbar data
  const navbarDataWithDrafts: QueryNavbarDataResult = {
    _id: navbarData.data?._id || "navbar",
    columns: [...(navbarData.data?.columns || []), leagueColumn, draftsColumn],
    buttons: navbarData.data?.buttons || [],
  };

  return (
    <Navbar
      navbarData={navbarDataWithDrafts}
      settingsData={settingsData.data}
    />
  );
}

export function Navbar({
  navbarData,
  settingsData,
}: {
  navbarData: QueryNavbarDataResult;
  settingsData: QueryGlobalSeoSettingsResult;
}) {
  const { siteTitle: settingsSiteTitle, logo } = settingsData ?? {};
  return (
    <header className="py-3 md:border-b">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-[auto_1fr] items-center gap-4">
          {logo && <Logo alt={settingsSiteTitle} priority image={logo} />}
          <NavbarClient navbarData={navbarData} settingsData={settingsData} />
        </div>
      </div>
    </header>
  );
}

export function NavbarSkeleton() {
  return (
    <header className="h-[75px] py-4 md:border-b">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-[auto_1fr] items-center gap-4">
          <div className="h-[40px] w-[170px] rounded animate-pulse bg-muted" />
          <NavbarSkeletonResponsive />
        </div>
      </div>
    </header>
  );
}

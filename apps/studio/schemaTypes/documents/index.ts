import { draftPick } from "./draft-pick";
import { footer } from "./footer";
import { homePage } from "./home-page";
import { league } from "./league";
import { matchup } from "./matchup";
import { navbar } from "./navbar";
import { owner } from "./owner";
import { page } from "./page";
import { player } from "./player";
import { season } from "./season";
import { settings } from "./settings";
import { team } from "./team";
import { teamSeason } from "./team-season";

export const singletons = [homePage, settings, footer, navbar];

export const documents = [
  page,
  // Fantasy Football League documents
  league,
  season,
  team,
  owner,
  player,
  matchup,
  draftPick,
  teamSeason,
  ...singletons,
];

import { Swords } from "lucide-react";
import { defineField, defineType } from "sanity";

export const matchup = defineType({
  name: "matchup",
  title: "Matchup",
  type: "document",
  icon: Swords,
  description: "A head-to-head matchup between two teams",
  fields: [
    defineField({
      name: "season",
      title: "Season",
      type: "reference",
      to: [{ type: "season" }],
      description: "The season this matchup belongs to",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "week",
      title: "Week",
      type: "number",
      description: "The week number of this matchup",
    }),
    defineField({
      name: "homeTeam",
      title: "Home Team",
      type: "reference",
      to: [{ type: "team" }],
      description: "The home team",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "awayTeam",
      title: "Away Team",
      type: "reference",
      to: [{ type: "team" }],
      description: "The away team",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "homeScore",
      title: "Home Team Score",
      type: "number",
      description: "Points scored by the home team",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "awayScore",
      title: "Away Team Score",
      type: "number",
      description: "Points scored by the away team",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "winner",
      title: "Winner",
      type: "string",
      description: "Which team won (home, away, or tie)",
      options: {
        list: [
          { title: "Home", value: "home" },
          { title: "Away", value: "away" },
          { title: "Tie", value: "tie" },
        ],
      },
    }),
    defineField({
      name: "isPlayoff",
      title: "Is Playoff",
      type: "boolean",
      description: "Whether this is a playoff matchup",
      initialValue: false,
    }),
    defineField({
      name: "matchupPeriodId",
      title: "Matchup Period ID",
      type: "number",
      description: "The matchup period identifier (if applicable)",
    }),
  ],
  preview: {
    select: {
      homeTeam: "homeTeam.teamName",
      awayTeam: "awayTeam.teamName",
      homeScore: "homeScore",
      awayScore: "awayScore",
      week: "week",
      season: "season.year",
      isPlayoff: "isPlayoff",
    },
    prepare: ({ homeTeam, awayTeam, homeScore, awayScore, week, season, isPlayoff }) => {
      const scoreText =
        homeScore !== undefined && awayScore !== undefined
          ? `${homeScore} - ${awayScore}`
          : "TBD";
      const playoffText = isPlayoff ? " (Playoff)" : "";
      const weekText = week ? `Week ${week}` : "Unknown Week";

      return {
        title: `${homeTeam || "Home"} vs ${awayTeam || "Away"}`,
        subtitle: `${scoreText} | ${weekText}${playoffText} | ${season || "Unknown"} Season`,
      };
    },
  },
});


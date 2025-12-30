import { BarChart3 } from "lucide-react";
import { defineArrayMember, defineField, defineType } from "sanity";

export const teamSeason = defineType({
  name: "teamSeason",
  title: "Team Season",
  type: "document",
  icon: BarChart3,
  description: "A team's performance in a specific season",
  fields: [
    defineField({
      name: "season",
      title: "Season",
      type: "reference",
      to: [{ type: "season" }],
      description: "The season this record belongs to",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "team",
      title: "Team",
      type: "reference",
      to: [{ type: "team" }],
      description: "The team",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "teamNameThisYear",
      title: "Team Name This Year",
      type: "string",
      description: "The team name for this specific season (may differ from the base team name)",
    }),
    defineField({
      name: "wins",
      title: "Wins",
      type: "number",
      description: "Number of wins",
      validation: (Rule) => Rule.required().integer().min(0),
    }),
    defineField({
      name: "losses",
      title: "Losses",
      type: "number",
      description: "Number of losses",
      validation: (Rule) => Rule.required().integer().min(0),
    }),
    defineField({
      name: "ties",
      title: "Ties",
      type: "number",
      description: "Number of ties",
      validation: (Rule) => Rule.integer().min(0),
      initialValue: 0,
    }),
    defineField({
      name: "champion",
      title: "Champion",
      type: "boolean",
      description: "Whether this team won the championship this season",
      initialValue: false,
    }),
    defineField({
      name: "pointsFor",
      title: "Points For",
      type: "number",
      description: "Total points scored",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "pointsAgainst",
      title: "Points Against",
      type: "number",
      description: "Total points allowed",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "standing",
      title: "Regular Season Standing",
      type: "number",
      description: "Final standing in regular season",
      validation: (Rule) => Rule.integer().min(1),
    }),
    defineField({
      name: "finalStanding",
      title: "Final Standing",
      type: "number",
      description: "Final standing including playoffs",
      validation: (Rule) => Rule.integer().min(1),
    }),
    defineField({
      name: "waiverRank",
      title: "Waiver Rank",
      type: "number",
      description: "Waiver wire priority rank",
      validation: (Rule) => Rule.integer().min(1),
    }),
    defineField({
      name: "acquisitions",
      title: "Acquisitions",
      type: "number",
      description: "Number of player acquisitions",
      validation: (Rule) => Rule.integer().min(0),
    }),
    defineField({
      name: "drops",
      title: "Drops",
      type: "number",
      description: "Number of player drops",
      validation: (Rule) => Rule.integer().min(0),
    }),
    defineField({
      name: "trades",
      title: "Trades",
      type: "number",
      description: "Number of trades made",
      validation: (Rule) => Rule.integer().min(0),
    }),
    defineField({
      name: "weeklyScores",
      title: "Weekly Scores",
      type: "array",
      description: "Scores for each week",
      of: [
        defineArrayMember({
          type: "number",
        }),
      ],
    }),
    defineField({
      name: "weeklyOutcomes",
      title: "Weekly Outcomes",
      type: "array",
      description: "Win/Loss/Tie for each week",
      of: [
        defineArrayMember({
          type: "string",
          options: {
            list: [
              { title: "Win", value: "W" },
              { title: "Loss", value: "L" },
              { title: "Tie", value: "T" },
            ],
          },
        }),
      ],
    }),
    defineField({
      name: "roster",
      title: "Roster",
      type: "array",
      description: "Players on the team roster",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "player" }],
        }),
      ],
    }),
  ],
  preview: {
    select: {
      team: "team.teamName",
      season: "season.year",
      wins: "wins",
      losses: "losses",
      standing: "standing",
    },
    prepare: ({ team, season, wins, losses, standing }) => {
      const record = `${wins || 0}-${losses || 0}`;
      return {
        title: `${team || "Unknown Team"}`,
        subtitle: `${season || "Unknown"} Season | ${record} | Standing: ${standing || "N/A"}`,
      };
    },
  },
});


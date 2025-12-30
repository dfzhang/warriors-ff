import { Calendar } from "lucide-react";
import { defineArrayMember, defineField, defineType } from "sanity";

export const season = defineType({
  name: "season",
  title: "Season",
  type: "document",
  icon: Calendar,
  description: "A single season/year of fantasy football",
  fields: [
    defineField({
      name: "league",
      title: "League",
      type: "reference",
      to: [{ type: "league" }],
      description: "The league this season belongs to",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "year",
      title: "Year",
      type: "number",
      description: "The year of this season",
      validation: (Rule) => Rule.required().integer().min(2000).max(2100),
    }),
    defineField({
      name: "currentWeek",
      title: "Current Week",
      type: "number",
      description: "The current week of the season",
      validation: (Rule) => Rule.integer().min(1).max(18),
    }),
    defineField({
      name: "finalScoringPeriod",
      title: "Final Scoring Period",
      type: "number",
      description: "The final week of scoring for this season",
      validation: (Rule) => Rule.integer().min(1).max(18),
    }),
    defineField({
      name: "settings",
      title: "Season Settings",
      type: "object",
      description: "League settings for this season",
      fields: [
        defineField({
          name: "name",
          title: "League Name",
          type: "string",
        }),
        defineField({
          name: "scoringType",
          title: "Scoring Type",
          type: "string",
          description: "The type of scoring system (e.g., H2H_POINTS)",
        }),
        defineField({
          name: "numTeams",
          title: "Number of Teams",
          type: "number",
          description: "Total number of teams in the league",
          validation: (Rule) => Rule.integer().min(2),
        }),
      ],
    }),
    defineField({
      name: "teams",
      title: "Teams",
      type: "array",
      description: "Teams participating in this season",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "team" }],
        }),
      ],
    }),
  ],
  preview: {
    select: {
      year: "year",
      leagueName: "league.name",
      numTeams: "settings.numTeams",
    },
    prepare: ({ year, leagueName, numTeams }) => {
      return {
        title: `${year || "Unknown"} Season`,
        subtitle: `${leagueName || "Unknown League"} | ${numTeams || 0} teams`,
      };
    },
  },
});


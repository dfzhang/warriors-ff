import { Trophy } from "lucide-react";
import { defineField, defineType } from "sanity";

export const league = defineType({
  name: "league",
  title: "League",
  type: "document",
  icon: Trophy,
  description: "Fantasy football league information",
  fields: [
    defineField({
      name: "leagueId",
      title: "League ID",
      type: "number",
      description: "The unique identifier for this league",
      validation: (Rule) => Rule.required().integer(),
    }),
    defineField({
      name: "sport",
      title: "Sport",
      type: "string",
      description: "The sport type (e.g., 'football')",
      initialValue: "football",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "name",
      title: "League Name",
      type: "string",
      description: "The display name of the league",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "fetchedAt",
      title: "Last Fetched",
      type: "datetime",
      description: "When the league data was last updated",
    }),
  ],
  preview: {
    select: {
      name: "name",
      leagueId: "leagueId",
      sport: "sport",
    },
    prepare: ({ name, leagueId, sport }) => {
      return {
        title: name || "Untitled League",
        subtitle: `ID: ${leagueId} | ${sport || "football"}`,
      };
    },
  },
});


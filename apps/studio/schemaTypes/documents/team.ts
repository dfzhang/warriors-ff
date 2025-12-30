import { Users } from "lucide-react";
import { defineArrayMember, defineField, defineType } from "sanity";

export const team = defineType({
  name: "team",
  title: "Team",
  type: "document",
  icon: Users,
  description: "Fantasy football team",
  fields: [
    defineField({
      name: "teamId",
      title: "Team ID",
      type: "number",
      description: "The unique identifier for this team (from platform)",
      validation: (Rule) => Rule.required().integer(),
    }),
    defineField({
      name: "teamName",
      title: "Team Name",
      type: "string",
      description: "The name of the team",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "teamAbbrev",
      title: "Team Abbreviation",
      type: "string",
      description: "Short abbreviation for the team name",
    }),
    defineField({
      name: "owners",
      title: "Owners",
      type: "array",
      description: "The owners of this team",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "owner" }],
        }),
      ],
      validation: (Rule) => Rule.min(1).error("A team must have at least one owner"),
    }),
    defineField({
      name: "divisionId",
      title: "Division ID",
      type: "number",
      description: "The division this team belongs to",
    }),
    defineField({
      name: "divisionName",
      title: "Division Name",
      type: "string",
      description: "The name of the division",
    }),
  ],
  preview: {
    select: {
      teamName: "teamName",
      teamAbbrev: "teamAbbrev",
      teamId: "teamId",
      owner: "owners.0.displayName",
    },
    prepare: ({ teamName, teamAbbrev, teamId, owner }) => {
      const subtitle = [
        teamAbbrev && `(${teamAbbrev})`,
        owner && `Owner: ${owner}`,
        `ID: ${teamId}`,
      ]
        .filter(Boolean)
        .join(" | ");

      return {
        title: teamName || "Unnamed Team",
        subtitle,
      };
    },
  },
});


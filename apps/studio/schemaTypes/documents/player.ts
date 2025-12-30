import { UserCircle } from "lucide-react";
import { defineArrayMember, defineField, defineType } from "sanity";

export const player = defineType({
  name: "player",
  title: "Player",
  type: "document",
  icon: UserCircle,
  description: "Fantasy football player",
  fields: [
    defineField({
      name: "playerId",
      title: "Player ID",
      type: "number",
      description: "The unique identifier for this player (from platform)",
      validation: (Rule) => Rule.required().integer(),
    }),
    defineField({
      name: "playerName",
      title: "Player Name",
      type: "string",
      description: "The full name of the player",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "position",
      title: "Position",
      type: "string",
      description: "Primary position (QB, RB, WR, TE, K, D/ST)",
      validation: (Rule) => Rule.required(),
      options: {
        list: [
          { title: "Quarterback", value: "QB" },
          { title: "Running Back", value: "RB" },
          { title: "Wide Receiver", value: "WR" },
          { title: "Tight End", value: "TE" },
          { title: "Kicker", value: "K" },
          { title: "Defense/Special Teams", value: "D/ST" },
        ],
      },
    }),
    defineField({
      name: "eligiblePositions",
      title: "Eligible Positions",
      type: "array",
      description: "All positions this player is eligible to play",
      of: [
        defineArrayMember({
          type: "string",
        }),
      ],
    }),
  ],
  preview: {
    select: {
      playerName: "playerName",
      position: "position",
      playerId: "playerId",
    },
    prepare: ({ playerName, position, playerId }) => {
      return {
        title: playerName || "Unnamed Player",
        subtitle: `${position || "N/A"} | ID: ${playerId}`,
      };
    },
  },
});


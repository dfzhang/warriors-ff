import { ClipboardList } from "lucide-react";
import { defineField, defineType } from "sanity";

export const draftPick = defineType({
  name: "draftPick",
  title: "Draft Pick",
  type: "document",
  icon: ClipboardList,
  description: "A single pick in a fantasy football draft",
  fields: [
    defineField({
      name: "season",
      title: "Season",
      type: "reference",
      to: [{ type: "season" }],
      description: "The season this draft pick belongs to",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "round",
      title: "Round",
      type: "number",
      description: "The round number of this pick",
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({
      name: "roundPick",
      title: "Round Pick",
      type: "number",
      description: "The pick number within this round",
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({
      name: "team",
      title: "Team",
      type: "reference",
      to: [{ type: "team" }],
      description: "The team that made this pick",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "player",
      title: "Player",
      type: "reference",
      to: [{ type: "player" }],
      description: "The player that was drafted",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "bidAmount",
      title: "Bid Amount",
      type: "number",
      description: "The bid amount (for auction drafts)",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "keeper",
      title: "Keeper",
      type: "boolean",
      description: "Whether this player was kept from a previous season",
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      player: "player.playerName",
      team: "team.teamName",
      round: "round",
      roundPick: "roundPick",
      season: "season.year",
      keeper: "keeper",
    },
    prepare: ({ player, team, round, roundPick, season, keeper }) => {
      const pickText = `Round ${round || "?"}, Pick ${roundPick || "?"}`;
      const keeperText = keeper ? " (Keeper)" : "";

      return {
        title: `${player || "Unknown Player"}`,
        subtitle: `${team || "Unknown Team"} | ${pickText}${keeperText} | ${season || "Unknown"} Season`,
      };
    },
  },
});


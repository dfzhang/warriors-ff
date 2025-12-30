import { User } from "lucide-react";
import { defineField, defineType } from "sanity";

export const owner = defineType({
  name: "owner",
  title: "Owner",
  type: "document",
  icon: User,
  description: "Fantasy football team owner",
  fields: [
    defineField({
      name: "ownerId",
      title: "Owner ID",
      type: "string",
      description: "The unique identifier for this owner (from platform)",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "displayName",
      title: "Display Name",
      type: "string",
      description: "The name displayed for this owner",
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      displayName: "displayName",
      ownerId: "ownerId",
    },
    prepare: ({ displayName, ownerId }) => {
      return {
        title: displayName || "Unnamed Owner",
        subtitle: `ID: ${ownerId}`,
      };
    },
  },
});


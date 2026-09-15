import {defineBlueprint, defineRobotToken, defineScheduledFunction} from "@sanity/blueprints";

const projectId = process.env.SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || "jrievnac";

export default defineBlueprint({
  values: {
    projectId,
  },
  resources: [
    defineRobotToken({
      name: "espn-sync-robot",
      label: "ESPN weekly score sync",
      memberships: [
        {
          resourceType: "project",
          resourceId: "$.values.projectId",
          roleNames: ["editor"],
        },
      ],
    }),
    defineScheduledFunction({
      name: "sync-espn-week",
      displayName: "Sync ESPN week scores",
      timeout: 90,
      memory: 1,
      timezone: "America/New_York",
      event: {
        minute: "0",
        hour: "9",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "2",
      },
      robotToken: "$.resources.espn-sync-robot.token",
    }),
  ],
});

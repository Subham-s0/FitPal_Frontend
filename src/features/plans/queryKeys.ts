/**
 * Centralized query keys for the plans feature.
 * 
 * Key structure:
 * - plans.all: Root key for all plan queries
 * - plans.list: All available plans
 */
export const plansQueryKeys = {
  // Root key
  all: ["plans"] as const,

  // Plans list (all available plans for selection/browsing)
  list: () => [...plansQueryKeys.all, "list"] as const,

  /** SUPERADMIN: all plans including inactive */
  adminList: () => [...plansQueryKeys.all, "admin"] as const,
};

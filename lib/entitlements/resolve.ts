export type ReportEntitlement = "lifetime" | "points" | "subscription" | "none";

type EntitlementClient = {
  from(table: string): unknown;
};

// Placeholder until the entitlement order is implemented.
export async function resolveReportEntitlement(
  client: EntitlementClient,
  userId: string,
  reportId: string,
): Promise<ReportEntitlement> {
  void client;
  void userId;
  void reportId;
  return "none";
}

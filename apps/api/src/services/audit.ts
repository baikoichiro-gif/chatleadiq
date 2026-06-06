import { prisma } from "../lib/prisma.js";
import { stringifyJsonField } from "../lib/jsonField.js";

export async function auditLog(action: string, entityType: string, entityId: number, metadata: unknown = {}) {
  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      metadataJson: stringifyJsonField(metadata)
    }
  });
}

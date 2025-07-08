import type { Types } from 'mongoose'
import { AuditLog } from './audit.model'

export async function logAudit(
  resourceType: string,
  resourceId: Types.ObjectId | string,
  action: 'create' | 'update' | 'delete',
  userId: Types.ObjectId | string,
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  changes?: Record<string, any>,
  ip?: string,
  userAgent?: string
) {
  await AuditLog.create({
    resourceType,
    resourceId,
    action,
    timestamp: new Date(),
    userId,
    changes,
    ip,
    userAgent,
  })
}

import { Schema, model, models, Types } from 'mongoose'

export interface IAuditLog {
  resourceType: string // ex: 'Client', 'Supplier', 'Order'
  resourceId: Types.ObjectId // id-ul documentului audit-at
  action: 'create' | 'update' | 'delete'
  timestamp: Date
  userId: Types.ObjectId // cine a făcut operația
  ip?: string // adresa IP a clientului (opțional)
  userAgent?: string // User-Agent header (browser / client)
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  changes?: Record<string, any> // payload-ul modificărilor
}

const AuditSchema = new Schema<IAuditLog>(
  {
    resourceType: { type: String, required: true },
    resourceId: { type: Schema.Types.ObjectId, required: true, index: true },
    action: {
      type: String,
      enum: ['create', 'update', 'delete'],
      required: true,
    },
    timestamp: { type: Date, required: true, default: () => new Date() },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ip: { type: String }, // ex: '192.168.0.1'
    userAgent: { type: String }, // ex: 'Mozilla/5.0 (Windows NT 10.0; …)'
    changes: { type: Schema.Types.Mixed },
  },
  { versionKey: false }
)

export const AuditLog =
  models.AuditLog || model<IAuditLog>('AuditLog', AuditSchema)

//   await logAudit(
//     'Client',
//     clientId,
//     'update',
//     userId,
//     { before, after },
//     request.headers.get('x-forwarded-for') || request.ip,
//     request.headers.get('user-agent') || 'unknown'
//   )

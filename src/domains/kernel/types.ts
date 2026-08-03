// ============================================================================
// ResoFlex™ Enterprise OS — Domain Kernel: shared contracts
// ----------------------------------------------------------------------------
// Every business domain exposes the same seven surfaces. These types are the
// contract; they add no runtime behavior and change nothing that exists today.
// ============================================================================

export type DomainId =
  | "identity"
  | "customerIntelligence"
  | "commerce"
  | "orders"
  | "finance"
  | "subscriptions"
  | "chatb2k"
  | "health"
  | "marketing"
  | "experience"
  | "notifications"
  | "knowledge"
  | "compliance"
  | "integrations"
  | "operations"
  | "media";

/** Coarse-grained capability string, e.g. `commerce:write`. */
export type Permission = `${DomainId}:${"read" | "write" | "admin"}`;

export type DomainStatus = "live" | "partial" | "planned";

export interface DomainModule {
  key: string;
  label: string;
  status: DomainStatus;
  /** Existing files/tables this module already builds on, when any. */
  reuses?: string[];
}

export interface DomainDescriptor {
  id: DomainId;
  name: string;
  summary: string;
  status: DomainStatus;
  modules: DomainModule[];
  permissions: Permission[];
  /** Admin surface route, when one exists. */
  adminRoute?: string;
  /** Domain events this domain publishes. */
  publishes: string[];
  /** Domain events this domain reacts to. */
  subscribes: string[];
}

// ---------------------------------------------------------------------------
// Repository / service contracts
// ---------------------------------------------------------------------------

export interface ListQuery {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
}

export interface Repository<T, TId = string> {
  findById(id: TId): Promise<T | null>;
  list(query?: ListQuery): Promise<T[]>;
}

export interface WritableRepository<T, TId = string, TInput = Partial<T>>
  extends Repository<T, TId> {
  create(input: TInput): Promise<T>;
  update(id: TId, input: TInput): Promise<T>;
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(error: string, code?: string): ServiceResult<T> {
  return { ok: false, error, ...(code ? { code } : {}) };
}

import type { AppRole, Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type TableName = keyof Tables;
type TableRow<T extends TableName> = Tables[T]["Row"];

export interface AuthUser {
  id: string;
  email: string;
  phone: string;
  user_metadata: {
    full_name?: string;
    role?: AppRole;
  };
}

export interface AuthSession {
  user: AuthUser;
}

type AuthChangeEvent = "SIGNED_IN" | "SIGNED_OUT" | "SIGNED_UP";

interface StoredAuthUser {
  id: string;
  email: string;
  password: string;
  phone: string;
  full_name: string;
  role: AppRole;
}

interface AppState {
  sessionUserId: string | null;
  authUsers: StoredAuthUser[];
  tables: {
    [K in TableName]: TableRow<K>[];
  };
}

interface QueryResponse<T> {
  data: T;
  error: Error | null;
  count?: number | null;
}

const STORAGE_KEY = "artisancrm.local-data.v1";
const listeners = new Set<(event: AuthChangeEvent, session: AuthSession | null) => void>();

let memoryState: AppState = createSeedState();

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  const random =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function mergeMissingById<T extends { id: string }>(rows: T[], seedRows: T[]): T[] {
  const ids = new Set(rows.map((row) => row.id));
  return [...rows, ...seedRows.filter((row) => !ids.has(row.id))];
}

function normalizeProfiles(rows: TableRow<"profiles">[]): TableRow<"profiles">[] {
  return rows.map((row) => ({
    ...row,
    notify_email: row.notify_email ?? true,
    notify_sms: row.notify_sms ?? true,
  }));
}

function normalizeAuthUsers(
  rows: Partial<StoredAuthUser>[],
  profiles: TableRow<"profiles">[],
): StoredAuthUser[] {
  return rows
    .filter((row): row is Partial<StoredAuthUser> & { id: string } => Boolean(row.id))
    .map((row) => {
      const profile = profiles.find((candidate) => candidate.id === row.id);
      const phone = row.phone || profile?.phone || "";
      return {
        id: row.id,
        email: row.email || `${normalizePhone(phone).replace(/^\+/, "")}@phone.artisancrm.local`,
        password: row.password || "",
        phone: normalizePhone(phone),
        full_name: row.full_name || profile?.full_name || "New User",
        role: row.role ?? "customer",
      };
    });
}

function normalizeState(state: Partial<AppState>): AppState {
  const seed = createSeedState();

  const normalized = {
    sessionUserId: state.sessionUserId ?? seed.sessionUserId,
    authUsers: Array.isArray(state.authUsers) ? [] : seed.authUsers,
    tables: {
      profiles: Array.isArray(state.tables?.profiles)
        ? normalizeProfiles(state.tables.profiles)
        : seed.tables.profiles,
      user_roles: Array.isArray(state.tables?.user_roles)
        ? state.tables.user_roles
        : seed.tables.user_roles,
      service_categories: Array.isArray(state.tables?.service_categories)
        ? state.tables.service_categories
        : seed.tables.service_categories,
      customers: Array.isArray(state.tables?.customers)
        ? state.tables.customers
        : seed.tables.customers,
      service_records: Array.isArray(state.tables?.service_records)
        ? state.tables.service_records
        : seed.tables.service_records,
      appointments: Array.isArray(state.tables?.appointments)
        ? state.tables.appointments
        : seed.tables.appointments,
      feedback: Array.isArray(state.tables?.feedback)
        ? state.tables.feedback
        : seed.tables.feedback,
      quotes: Array.isArray(state.tables?.quotes) ? state.tables.quotes : seed.tables.quotes,
      work_requests: Array.isArray(state.tables?.work_requests)
        ? state.tables.work_requests
        : seed.tables.work_requests,
    },
  };

  return {
    ...normalized,
    authUsers: mergeMissingById(
      Array.isArray(state.authUsers)
        ? normalizeAuthUsers(state.authUsers, normalized.tables.profiles)
        : normalized.authUsers,
      seed.authUsers,
    ),
    tables: {
      profiles: mergeMissingById(normalized.tables.profiles, seed.tables.profiles),
      user_roles: mergeMissingById(normalized.tables.user_roles, seed.tables.user_roles),
      service_categories: mergeMissingById(
        normalized.tables.service_categories,
        seed.tables.service_categories,
      ),
      customers: mergeMissingById(normalized.tables.customers, seed.tables.customers),
      service_records: mergeMissingById(
        normalized.tables.service_records,
        seed.tables.service_records,
      ),
      appointments: mergeMissingById(normalized.tables.appointments, seed.tables.appointments),
      feedback: mergeMissingById(normalized.tables.feedback, seed.tables.feedback),
      quotes: mergeMissingById(normalized.tables.quotes, seed.tables.quotes),
      work_requests: mergeMissingById(normalized.tables.work_requests, seed.tables.work_requests),
    },
  };
}

function hasWindow() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readState(): AppState {
  if (!hasWindow()) {
    return clone(memoryState);
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const seed = createSeedState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    memoryState = seed;
    return clone(seed);
  }

  try {
    const parsed = normalizeState(JSON.parse(saved) as Partial<AppState>);
    memoryState = parsed;
    if (JSON.stringify(parsed) !== saved) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    return clone(parsed);
  } catch {
    const seed = createSeedState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    memoryState = seed;
    return clone(seed);
  }
}

function saveState(state: AppState) {
  memoryState = clone(state);
  if (hasWindow()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

function mutateState<T>(updater: (state: AppState) => T): T {
  const state = readState();
  const result = updater(state);
  saveState(state);
  return result;
}

function createAuthUser(user: StoredAuthUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    user_metadata: {
      full_name: user.full_name,
      role: user.role,
    },
  };
}

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "");
}

function assertLocalOtp(otpcode: string) {
  if (otpcode.trim() !== "12345") {
    throw new Error("Invalid OTP code. Use 12345 in local demo mode.");
  }
}

function getStoredUserById(state: AppState, id: string | null) {
  if (!id) return null;
  return state.authUsers.find((user) => user.id === id) ?? null;
}

function getSessionFromState(state: AppState): AuthSession | null {
  const user = getStoredUserById(state, state.sessionUserId);
  return user ? { user: createAuthUser(user) } : null;
}

function emitAuthChange(event: AuthChangeEvent) {
  const session = getSessionFromState(readState());
  listeners.forEach((listener) => listener(event, session));
}

function createSeedState(): AppState {
  const createdAt = nowIso();
  const adminId = "user-admin";
  const artisanId = "user-artisan";
  const accraArtisanId = "user-artisan-accra";
  const temaArtisanId = "user-artisan-tema";
  const customerId = "user-customer";
  const appointmentId = "appointment-seed-1";
  const customerRecordId = "customer-seed-1";
  const categoryElectricalId = "category-electrical";
  const categoryPlumbingId = "category-plumbing";
  const categoryCarpentryId = "category-carpentry";
  const quoteId = "quote-seed-1";
  const requestId = "request-seed-1";

  return {
    sessionUserId: null,
    authUsers: [
      {
        id: adminId,
        email: "admin@artisancrm.local",
        password: "password123",
        phone: "+233200000000",
        full_name: "Admin User",
        role: "admin",
      },
      {
        id: artisanId,
        email: "artisan@artisancrm.local",
        password: "password123",
        phone: "+233241234567",
        full_name: "Kojo Mensah",
        role: "artisan",
      },
      {
        id: accraArtisanId,
        email: "plumber@artisancrm.local",
        password: "password123",
        phone: "+233242223311",
        full_name: "Esi Boateng",
        role: "artisan",
      },
      {
        id: temaArtisanId,
        email: "carpenter@artisancrm.local",
        password: "password123",
        phone: "+233274441188",
        full_name: "Yaw Tetteh",
        role: "artisan",
      },
      {
        id: customerId,
        email: "customer@artisancrm.local",
        password: "password123",
        phone: "+233559876543",
        full_name: "Ama Owusu",
        role: "customer",
      },
    ],
    tables: {
      profiles: [
        {
          id: adminId,
          full_name: "Admin User",
          phone: "+233 20 000 0000",
          location: "Accra",
          specialization: null,
          bio: "Platform administrator",
          avatar_url: null,
          notify_email: true,
          notify_sms: true,
          is_active: true,
          created_at: createdAt,
          updated_at: createdAt,
        },
        {
          id: artisanId,
          full_name: "Kojo Mensah",
          phone: "+233 24 123 4567",
          location: "Kumasi",
          specialization: "Electrical",
          bio: "Residential and small business electrical repairs.",
          avatar_url: null,
          notify_email: true,
          notify_sms: true,
          is_active: true,
          created_at: createdAt,
          updated_at: createdAt,
        },
        {
          id: accraArtisanId,
          full_name: "Esi Boateng",
          phone: "+233 24 222 3311",
          location: "Madina, Accra",
          specialization: "Plumbing",
          bio: "Leak repairs, bathroom fittings, and routine plumbing maintenance.",
          avatar_url: null,
          notify_email: true,
          notify_sms: true,
          is_active: true,
          created_at: createdAt,
          updated_at: createdAt,
        },
        {
          id: temaArtisanId,
          full_name: "Yaw Tetteh",
          phone: "+233 27 444 1188",
          location: "Tema",
          specialization: "Carpentry",
          bio: "Custom shelves, door repairs, and furniture assembly.",
          avatar_url: null,
          notify_email: true,
          notify_sms: true,
          is_active: true,
          created_at: createdAt,
          updated_at: createdAt,
        },
        {
          id: customerId,
          full_name: "Ama Owusu",
          phone: "+233 55 987 6543",
          location: "Accra",
          specialization: null,
          bio: null,
          avatar_url: null,
          notify_email: true,
          notify_sms: true,
          is_active: true,
          created_at: createdAt,
          updated_at: createdAt,
        },
      ],
      user_roles: [
        { id: "role-admin", user_id: adminId, role: "admin" },
        { id: "role-artisan", user_id: artisanId, role: "artisan" },
        { id: "role-artisan-accra", user_id: accraArtisanId, role: "artisan" },
        { id: "role-artisan-tema", user_id: temaArtisanId, role: "artisan" },
        { id: "role-customer", user_id: customerId, role: "customer" },
      ],
      service_categories: [
        {
          id: categoryElectricalId,
          name: "Electrical",
          description: "Wiring, sockets and repairs",
          icon: "bolt",
          created_at: createdAt,
        },
        {
          id: categoryPlumbingId,
          name: "Plumbing",
          description: "Leaks, fittings and pipe work",
          icon: "droplets",
          created_at: createdAt,
        },
        {
          id: categoryCarpentryId,
          name: "Carpentry",
          description: "Furniture and wood repairs",
          icon: "hammer",
          created_at: createdAt,
        },
      ],
      customers: [
        {
          id: customerRecordId,
          artisan_id: artisanId,
          name: "Ama Owusu",
          email: "customer@artisancrm.local",
          phone: "+233 55 987 6543",
          address: "East Legon, Accra",
          notes: "Prefers morning visits",
          created_at: createdAt,
          updated_at: createdAt,
        },
      ],
      service_records: [
        {
          id: "service-seed-1",
          artisan_id: artisanId,
          customer_id: customerRecordId,
          category_id: categoryElectricalId,
          description: "Ceiling fan installation",
          cost: 350,
          status: "completed",
          service_date: "2026-04-10",
          created_at: createdAt,
        },
      ],
      appointments: [
        {
          id: appointmentId,
          artisan_id: artisanId,
          customer_id: customerRecordId,
          customer_user_id: customerId,
          category_id: categoryElectricalId,
          title: "Fix bedroom light switch",
          description: "Switch sparks occasionally",
          scheduled_date: "2026-04-18",
          scheduled_time: "10:00",
          status: "confirmed",
          created_at: createdAt,
          updated_at: createdAt,
        },
      ],
      feedback: [
        {
          id: "feedback-seed-1",
          artisan_id: artisanId,
          customer_user_id: customerId,
          appointment_id: appointmentId,
          rating: 5,
          comment: "Quick response and neat work.",
          created_at: createdAt,
        },
      ],
      quotes: [
        {
          id: quoteId,
          artisan_id: artisanId,
          customer_id: customerRecordId,
          customer_user_id: customerId,
          title: "Kitchen rewiring estimate",
          description: "Replace damaged socket points and install protective breakers.",
          amount: 850,
          deposit_amount: 200,
          status: "awaiting_response",
          requested_changes: null,
          valid_until: "2026-05-15",
          created_at: createdAt,
          updated_at: createdAt,
        },
      ],
      work_requests: [
        {
          id: requestId,
          artisan_id: artisanId,
          customer_user_id: customerId,
          title: "Outdoor security light installation",
          description: "Need two motion sensor lights installed at the compound entrance.",
          preferred_date: "2026-04-22",
          status: "new",
          response_note: null,
          created_at: createdAt,
          updated_at: createdAt,
        },
      ],
    },
  };
}

function buildInsertedRow<T extends TableName>(table: T, input: Partial<TableRow<T>>): TableRow<T> {
  const timestamp = nowIso();

  switch (table) {
    case "profiles":
      return {
        id: (input.id as string) ?? createId("profile"),
        full_name: (input.full_name as string) ?? "New User",
        phone: (input.phone as string | null) ?? null,
        location: (input.location as string | null) ?? null,
        specialization: (input.specialization as string | null) ?? null,
        bio: (input.bio as string | null) ?? null,
        avatar_url: (input.avatar_url as string | null) ?? null,
        notify_email: (input.notify_email as boolean | undefined) ?? true,
        notify_sms: (input.notify_sms as boolean | undefined) ?? true,
        is_active: (input.is_active as boolean | undefined) ?? true,
        created_at: (input.created_at as string | undefined) ?? timestamp,
        updated_at: timestamp,
      } as TableRow<T>;
    case "user_roles":
      return {
        id: (input.id as string) ?? createId("role"),
        user_id: input.user_id as string,
        role: input.role as AppRole,
      } as TableRow<T>;
    case "service_categories":
      return {
        id: (input.id as string) ?? createId("category"),
        name: input.name as string,
        description: (input.description as string | null) ?? null,
        icon: (input.icon as string | null) ?? null,
        created_at: (input.created_at as string | undefined) ?? timestamp,
      } as TableRow<T>;
    case "customers":
      return {
        id: (input.id as string) ?? createId("customer"),
        artisan_id: input.artisan_id as string,
        name: input.name as string,
        email: (input.email as string | null) ?? null,
        phone: (input.phone as string | null) ?? null,
        address: (input.address as string | null) ?? null,
        notes: (input.notes as string | null) ?? null,
        created_at: (input.created_at as string | undefined) ?? timestamp,
        updated_at: timestamp,
      } as TableRow<T>;
    case "service_records":
      return {
        id: (input.id as string) ?? createId("service"),
        artisan_id: input.artisan_id as string,
        customer_id: input.customer_id as string,
        category_id: (input.category_id as string | null) ?? null,
        description: input.description as string,
        cost: (input.cost as number | null) ?? null,
        status: (input.status as string | undefined) ?? "pending",
        service_date: input.service_date as string,
        created_at: (input.created_at as string | undefined) ?? timestamp,
      } as TableRow<T>;
    case "appointments":
      return {
        id: (input.id as string) ?? createId("appointment"),
        artisan_id: input.artisan_id as string,
        customer_id: (input.customer_id as string | null) ?? null,
        customer_user_id: (input.customer_user_id as string | null) ?? null,
        category_id: (input.category_id as string | null) ?? null,
        title: input.title as string,
        description: (input.description as string | null) ?? null,
        scheduled_date: input.scheduled_date as string,
        scheduled_time: input.scheduled_time as string,
        status: (input.status as TableRow<"appointments">["status"] | undefined) ?? "pending",
        created_at: (input.created_at as string | undefined) ?? timestamp,
        updated_at: timestamp,
      } as TableRow<T>;
    case "feedback":
      return {
        id: (input.id as string) ?? createId("feedback"),
        artisan_id: input.artisan_id as string,
        customer_user_id: input.customer_user_id as string,
        appointment_id: (input.appointment_id as string | null) ?? null,
        rating: input.rating as number,
        comment: (input.comment as string | null) ?? null,
        created_at: (input.created_at as string | undefined) ?? timestamp,
      } as TableRow<T>;
    case "quotes":
      return {
        id: (input.id as string) ?? createId("quote"),
        artisan_id: input.artisan_id as string,
        customer_id: (input.customer_id as string | null) ?? null,
        customer_user_id: (input.customer_user_id as string | null) ?? null,
        title: input.title as string,
        description: (input.description as string | null) ?? null,
        amount: Number(input.amount ?? 0),
        deposit_amount: (input.deposit_amount as number | null) ?? null,
        status: (input.status as TableRow<"quotes">["status"] | undefined) ?? "draft",
        requested_changes: (input.requested_changes as string | null) ?? null,
        valid_until: (input.valid_until as string | null) ?? null,
        created_at: (input.created_at as string | undefined) ?? timestamp,
        updated_at: timestamp,
      } as TableRow<T>;
    case "work_requests":
      return {
        id: (input.id as string) ?? createId("request"),
        artisan_id: (input.artisan_id as string | null) ?? null,
        customer_user_id: input.customer_user_id as string,
        title: input.title as string,
        description: input.description as string,
        preferred_date: (input.preferred_date as string | null) ?? null,
        status: (input.status as TableRow<"work_requests">["status"] | undefined) ?? "new",
        response_note: (input.response_note as string | null) ?? null,
        created_at: (input.created_at as string | undefined) ?? timestamp,
        updated_at: timestamp,
      } as TableRow<T>;
    default:
      throw new Error(`Unsupported table: ${String(table)}`);
  }
}

type Filter<T extends TableName> = (row: TableRow<T>) => boolean;

class SelectQueryBuilder<T extends TableName> implements PromiseLike<QueryResponse<TableRow<T>[]>> {
  private filters: Filter<T>[] = [];
  private orderConfig: { column: keyof TableRow<T> & string; ascending: boolean } | null = null;
  private limitCount: number | null = null;

  constructor(
    private table: T,
    private countMode: "exact" | undefined,
  ) {}

  eq<K extends keyof TableRow<T>>(column: K, value: TableRow<T>[K]) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  in<K extends keyof TableRow<T>>(column: K, values: TableRow<T>[K][]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  order(column: keyof TableRow<T> & string, options?: { ascending?: boolean }) {
    this.orderConfig = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  async single(): Promise<QueryResponse<TableRow<T> | null>> {
    const result = await this.execute();
    return {
      data: result.data[0] ?? null,
      error: result.error,
      count: result.count ?? null,
    };
  }

  then<TResult1 = QueryResponse<TableRow<T>[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResponse<TableRow<T>[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResponse<TableRow<T>[]>> {
    const state = readState();
    let rows = clone(state.tables[this.table]) as TableRow<T>[];

    rows = rows.filter((row) => this.filters.every((filter) => filter(row)));
    const count = this.countMode === "exact" ? rows.length : null;

    if (this.orderConfig) {
      const { column, ascending } = this.orderConfig;
      rows.sort((left, right) => {
        const a = left[column];
        const b = right[column];
        if (a === b) return 0;
        if (a == null) return ascending ? -1 : 1;
        if (b == null) return ascending ? 1 : -1;
        return (a > b ? 1 : -1) * (ascending ? 1 : -1);
      });
    }

    if (this.limitCount != null) {
      rows = rows.slice(0, this.limitCount);
    }

    return { data: rows, error: null, count };
  }
}

class MutationQueryBuilder<T extends TableName> implements PromiseLike<
  QueryResponse<TableRow<T>[]>
> {
  private filters: Filter<T>[] = [];

  constructor(
    private table: T,
    private action: "update" | "delete",
    private payload?: Partial<TableRow<T>>,
  ) {}

  eq<K extends keyof TableRow<T>>(column: K, value: TableRow<T>[K]) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  in<K extends keyof TableRow<T>>(column: K, values: TableRow<T>[K][]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  then<TResult1 = QueryResponse<TableRow<T>[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResponse<TableRow<T>[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResponse<TableRow<T>[]>> {
    return mutateState((state) => {
      const tableRows = state.tables[this.table] as TableRow<T>[];
      const matches = (row: TableRow<T>) => this.filters.every((filter) => filter(row));

      if (this.action === "delete") {
        const removed = tableRows.filter(matches);
        state.tables[this.table] = tableRows.filter((row) => !matches(row)) as Tables[T]["Row"][];
        return { data: clone(removed), error: null };
      }

      const updated = tableRows.map((row) => {
        if (!matches(row)) return row;

        const nextRow = {
          ...row,
          ...this.payload,
        } as TableRow<T>;

        if ("updated_at" in nextRow) {
          (nextRow as TableRow<T> & { updated_at: string }).updated_at = nowIso();
        }

        return nextRow;
      });

      state.tables[this.table] = updated as Tables[T]["Row"][];
      const changedRows = updated.filter(matches);
      return { data: clone(changedRows), error: null };
    });
  }
}

class TableClient<T extends TableName> {
  constructor(private table: T) {}

  select(_columns = "*", options?: { count?: "exact" }) {
    return new SelectQueryBuilder(this.table, options?.count);
  }

  async insert(
    payload: Partial<TableRow<T>> | Array<Partial<TableRow<T>>>,
  ): Promise<QueryResponse<TableRow<T>[]>> {
    return mutateState((state) => {
      const inputs = Array.isArray(payload) ? payload : [payload];
      const inserted = inputs.map((item) => buildInsertedRow(this.table, item));
      state.tables[this.table].push(...(inserted as Tables[T]["Row"][]));
      return { data: clone(inserted), error: null };
    });
  }

  update(payload: Partial<TableRow<T>>) {
    return new MutationQueryBuilder(this.table, "update", payload);
  }

  delete() {
    return new MutationQueryBuilder(this.table, "delete");
  }
}

export const db = {
  auth: {
    async getSession(): Promise<{ data: { session: AuthSession | null } }> {
      return { data: { session: getSessionFromState(readState()) } };
    },

    onAuthStateChange(callback: (event: AuthChangeEvent, session: AuthSession | null) => void) {
      listeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              listeners.delete(callback);
            },
          },
        },
      };
    },

    async requestOtp({
      phone,
      purpose,
    }: {
      phone: string;
      purpose: "login" | "signup";
    }): Promise<{ error: Error | null; data: { devOtp: string } | null }> {
      const normalizedPhone = normalizePhone(phone);

      try {
        if (!normalizedPhone) throw new Error("Phone number is required.");

        const state = readState();
        const existing = state.authUsers.find((candidate) => candidate.phone === normalizedPhone);

        if (purpose === "login" && !existing) {
          throw new Error("No account found for this phone number.");
        }

        if (purpose === "signup" && existing) {
          throw new Error("An account with this phone number already exists.");
        }

        return { data: { devOtp: "12345" }, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    async signUpWithOtp({
      phone,
      otpcode,
      email,
      options,
    }: {
      phone: string;
      otpcode: string;
      email?: string;
      options?: { data?: { full_name?: string; role?: AppRole } };
    }): Promise<{ data: { user: AuthUser | null }; error: Error | null }> {
      const normalizedPhone = normalizePhone(phone);
      const normalizedEmail = email?.trim().toLowerCase() || "";

      try {
        assertLocalOtp(otpcode);

        const user = mutateState((state) => {
          const existing = state.authUsers.find(
            (candidate) => candidate.phone === normalizedPhone,
          );
          if (existing) {
            throw new Error("An account with this phone number already exists.");
          }

          if (
            normalizedEmail &&
            state.authUsers.some((candidate) => candidate.email.toLowerCase() === normalizedEmail)
          ) {
            throw new Error("An account with this email already exists.");
          }

          const newUser: StoredAuthUser = {
            id: createId("user"),
            email: normalizedEmail || `${normalizedPhone.replace(/^\+/, "")}@phone.artisancrm.local`,
            password: "",
            phone: normalizedPhone,
            full_name: options?.data?.full_name?.trim() || "New User",
            role: options?.data?.role ?? "customer",
          };

          state.authUsers.push(newUser);
          state.tables.profiles.push(
            buildInsertedRow("profiles", {
              id: newUser.id,
              full_name: newUser.full_name,
              phone: newUser.phone,
              notify_email: true,
              notify_sms: true,
              is_active: true,
            }),
          );
          state.tables.user_roles.push(
            buildInsertedRow("user_roles", {
              user_id: newUser.id,
              role: newUser.role,
            }),
          );
          state.sessionUserId = newUser.id;
          return newUser;
        });

        emitAuthChange("SIGNED_UP");
        return { data: { user: createAuthUser(user) }, error: null };
      } catch (error) {
        return { data: { user: null }, error: error as Error };
      }
    },

    async signInWithOtp({
      phone,
      otpcode,
    }: {
      phone: string;
      otpcode: string;
    }): Promise<{ error: Error | null }> {
      const normalizedPhone = normalizePhone(phone);

      try {
        assertLocalOtp(otpcode);

        mutateState((state) => {
          const user = state.authUsers.find(
            (candidate) => candidate.phone === normalizedPhone,
          );
          if (!user) {
            throw new Error("Invalid phone number or OTP code.");
          }

          const profile = state.tables.profiles.find((candidate) => candidate.id === user.id);
          if (profile && !profile.is_active) {
            throw new Error("This account has been deactivated.");
          }

          state.sessionUserId = user.id;
        });

        emitAuthChange("SIGNED_IN");
        return { error: null };
      } catch (error) {
        return { error: error as Error };
      }
    },

    async signOut(): Promise<{ error: null }> {
      mutateState((state) => {
        state.sessionUserId = null;
      });
      emitAuthChange("SIGNED_OUT");
      return { error: null };
    },
  },

  from<T extends TableName>(table: T) {
    return new TableClient(table);
  },
};

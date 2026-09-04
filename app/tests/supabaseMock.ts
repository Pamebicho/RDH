import { vi } from "vitest";

export interface RecordedCall {
  table: string;
  op: "select" | "upsert" | "insert" | "update" | "delete" | "eq" | "is" | "order" | "single";
  args: unknown[];
}

export interface SupabaseMockOptions {
  /** Error a devolver para llamadas a esta tabla (todas las operaciones), si se define. */
  errorsByTable?: Record<string, { message: string }>;
}

/**
 * Mock mínimo del query builder de supabase-js: cada método encadenable devuelve el mismo
 * objeto (thenable), así que tanto `await supabase.from(t).update(x).eq(...)` como
 * `await supabase.from(t).upsert(x)` funcionan igual que con el cliente real.
 */
export function createSupabaseMock(options: SupabaseMockOptions = {}) {
  const calls: RecordedCall[] = [];

  function builder(table: string) {
    const error = options.errorsByTable?.[table] ?? null;
    const record = (op: RecordedCall["op"], args: unknown[]) => calls.push({ table, op, args });

    const chain: Record<string, unknown> = {
      select: vi.fn((...args: unknown[]) => {
        record("select", args);
        return chain;
      }),
      upsert: vi.fn((...args: unknown[]) => {
        record("upsert", args);
        return Promise.resolve({ data: args[0], error });
      }),
      insert: vi.fn((...args: unknown[]) => {
        record("insert", args);
        return { ...chain, then: (resolve: (v: unknown) => unknown) => resolve({ data: args[0], error }) };
      }),
      update: vi.fn((...args: unknown[]) => {
        record("update", args);
        return chain;
      }),
      delete: vi.fn((...args: unknown[]) => {
        record("delete", args);
        return chain;
      }),
      eq: vi.fn((...args: unknown[]) => {
        record("eq", args);
        return chain;
      }),
      is: vi.fn((...args: unknown[]) => {
        record("is", args);
        return chain;
      }),
      order: vi.fn((...args: unknown[]) => {
        record("order", args);
        return chain;
      }),
      single: vi.fn((...args: unknown[]) => {
        record("single", args);
        return Promise.resolve({ data: {}, error });
      }),
      then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error }),
    };

    return chain;
  }

  return {
    from: vi.fn(builder),
    calls,
  };
}

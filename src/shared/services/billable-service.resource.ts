import { getSessionStore, openmrsFetch, restBaseUrl, useSession } from '@openmrs/esm-framework';

/**
 * Single source of truth for the `billing/billableService` endpoint.
 *
 * The backend now scopes the catalog per facility via `&locationUuid=`, so every
 * caller must go through {@link buildBillableServiceUrl} — an unscoped request
 * returns the catalog of every facility on the server.
 */

/**
 * Default representation. `location:(uuid,name)` is included so callers can tell
 * which facility a service belongs to without a second request.
 */
export const BILLABLE_SERVICE_REPRESENTATION =
  'custom:(location:(uuid,name),uuid,name,shortName,serviceStatus,serviceCategory,concept:(uuid,display,name:(name)),serviceType:(display,uuid),servicePrices:(uuid,name,price,paymentMode:(uuid,name)))';

/** Leaner representation for the service pickers (order/bill, switch intervention, preauth). */
export const BILLABLE_SERVICE_PICKER_REPRESENTATION =
  'custom:(location:(uuid,name),uuid,name,shortName,serviceStatus,serviceType:(uuid,display),servicePrices:(uuid,name,price,paymentMode),concept:(uuid))';

export type BillableServiceUrlOptions = {
  /** Representation. Defaults to {@link BILLABLE_SERVICE_REPRESENTATION}. */
  v?: string;
  /**
   * Facility to scope the catalog to. Falsy means "don't filter" — pass the
   * session location unless you deliberately want the server-wide catalog.
   */
  locationUuid?: string | null;
  limit?: number;
  startIndex?: number;
};

/**
 * Builds a `billableService` URL. Query params are concatenated rather than run
 * through `URLSearchParams` so the `custom:(...)` representation stays unescaped,
 * matching the rest of the OpenMRS REST calls in this app.
 */
export function buildBillableServiceUrl({
  v = BILLABLE_SERVICE_REPRESENTATION,
  locationUuid,
  limit,
  startIndex,
}: BillableServiceUrlOptions = {}): string {
  let url = `${restBaseUrl}/billing/billableService?v=${v}`;
  if (locationUuid) {
    url += `&locationUuid=${locationUuid}`;
  }
  if (limit != null) {
    url += `&limit=${limit}`;
  }
  if (startIndex != null) {
    url += `&startIndex=${startIndex}`;
  }
  return url;
}

/** How long a non-React caller waits for the session before giving up on scoping. */
const SESSION_LOAD_TIMEOUT_MS = 10_000;

/**
 * Session location uuid for non-React callers. Components should read it from
 * `useSession()` instead — see {@link useBillableServiceLocationUuid}.
 *
 * Reads the session store directly rather than using the framework's
 * `getSessionLocation()`, which unsubscribes synchronously and therefore never
 * resolves when the session hasn't loaded yet. Resolves `undefined` — leaving
 * the catalog unfiltered — if the session never loads, so a picker degrades to
 * the old behaviour instead of staying empty forever.
 */
export async function getSessionLocationUuid(): Promise<string | undefined> {
  const store = getSessionStore();
  const initial = store.getState();
  if (initial.loaded) {
    return initial.session?.sessionLocation?.uuid;
  }

  return new Promise<string | undefined>((resolve) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;

    const finish = (uuid: string | undefined) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      unsubscribe?.();
      resolve(uuid);
    };

    const timer = setTimeout(() => finish(undefined), SESSION_LOAD_TIMEOUT_MS);

    unsubscribe = store.subscribe((state) => {
      if (state.loaded) {
        finish(state.session?.sessionLocation?.uuid);
      }
    });

    // In case the listener fired synchronously, before `unsubscribe` was assigned.
    if (settled) {
      unsubscribe?.();
    }
  });
}

/**
 * Session location uuid for hooks. `useSession()` suspends until the session is
 * loaded, so an `undefined` result means the user genuinely has no session
 * location — in which case the catalog is left unfiltered, as it was before.
 */
export function useBillableServiceLocationUuid(): string | undefined {
  const { sessionLocation } = useSession();
  return sessionLocation?.uuid;
}

/** Fetches one page of billable services. */
export async function fetchBillableServicePage<T = any>(options: BillableServiceUrlOptions = {}): Promise<T[]> {
  const resp = await openmrsFetch<{ results: T[] }>(buildBillableServiceUrl(options));
  return resp?.data?.results ?? [];
}

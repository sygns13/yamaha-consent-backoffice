import { useQuery } from "@tanstack/react-query";
import type { Me } from "../lib/api";
import { fetchSession, ME_QUERY_KEY } from "./session";

const FIVE_MINUTES = 5 * 60_000;

/** `["me"]` sobre `GET /auth/me` (sección 8.3): `staleTime` 5 min y nueva consulta al volver el foco. */
export function useSession() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: ({ client }) => fetchSession(client),
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: true,
  });
}

/** Usuario actual. Solo dentro de `RequireAuth`, que garantiza que hay sesión. */
export function useMe(): Me {
  const { data } = useSession();
  if (data?.status !== "authenticated") throw new Error("useMe() solo se usa dentro de RequireAuth.");
  return data.me;
}

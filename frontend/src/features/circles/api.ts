import { computed } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { createJsonHeaders, $api } from "@/lib/api/client";
import { parseWithSchema, selectableCircleSchema } from "@/lib/api/schema";
import { fetchSessionBootstrap } from "@/features/session/api";
import { useSessionStore } from "@/features/session/store";

export type SelectableCircle = {
  id: string;
  name: string;
  groupName: string;
  participationTypeName: string;
};

export async function fetchSelectableCircles() {
  return $api.queryData(
    "get",
    "/circles",
    {
      headers: createJsonHeaders(),
    },
    parseSelectableCircles,
    {
      errorMessage: "Failed to fetch circles",
    },
  );
}

export async function selectCurrentCircle(circleId: string, csrfToken: string) {
  await $api.noContentMutation(
    "put",
    "/circles/current",
    {
      headers: createJsonHeaders(csrfToken),
      body: { circleId },
    },
    {
      errorMessage: "Failed to set current circle",
    },
  );
}

export function useSelectableCirclesQuery() {
  const sessionStore = useSessionStore();

  return $api.useQueryData(
    "get",
    "/circles",
    {
      headers: createJsonHeaders(),
    },
    parseSelectableCircles,
    {
      queryKey: ["circles", "selectable"],
      enabled: computed(() => sessionStore.isAuthenticated),
      retry: false,
    },
    {
      errorMessage: "Failed to fetch circles",
    },
  );
}

export function useSelectCurrentCircleMutation() {
  const queryClient = useQueryClient();
  const sessionStore = useSessionStore();

  return useMutation({
    mutationFn: async (circleId: string) =>
      $api.noContentMutation(
        "put",
        "/circles/current",
        {
          headers: createJsonHeaders(sessionStore.csrfToken),
          body: { circleId },
        },
        {
          errorMessage: "Failed to set current circle",
        },
      ),
    onSuccess: async () => {
      const session = await fetchSessionBootstrap();
      sessionStore.hydrate(session);
      queryClient.setQueryData(["session", "bootstrap"], session);
    },
  });
}

function parseSelectableCircles(value: unknown): SelectableCircle[] {
  return parseWithSchema(selectableCircleSchema.array(), value, "circles");
}

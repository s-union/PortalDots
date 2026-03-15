import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { createJsonHeaders, $api } from "@/lib/api/client";
import { parsePaginatedResult, type PaginatedResult } from "@/lib/api/pagination";
import { parseWithSchema, staffActivityLogSchema } from "@/lib/api/schema";

export type StaffActivityLog = {
    id: string;
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    circleId: string;
    summary: string;
    createdAt: string;
};

type StaffActivityLogPagination = {
    page: number;
    pageSize: number;
};

export async function fetchStaffActivityLogs(pagination: StaffActivityLogPagination) {
    return $api.queryData(
        "get",
        "/staff/activity-logs",
        {
            headers: createJsonHeaders(),
            params: {
                query: {
                    page: pagination.page,
                    pageSize: pagination.pageSize,
                },
            },
        },
        (value) => parsePaginatedResult(value, parseStaffActivityLog, "staff activity logs"),
        {
            errorMessage: "Failed to fetch staff activity logs",
        },
    );
}

export function useStaffActivityLogsQuery(
    enabled: MaybeRefOrGetter<boolean>,
    pagination: MaybeRefOrGetter<StaffActivityLogPagination>,
) {
    return $api.useQueryData(
        "get",
        "/staff/activity-logs",
        () => ({
            headers: createJsonHeaders(),
            params: {
                query: {
                    page: toValue(pagination).page,
                    pageSize: toValue(pagination).pageSize,
                },
            },
        }),
        (value) => parsePaginatedResult(value, parseStaffActivityLog, "staff activity logs"),
        {
            queryKey: computed(() => ["staff", "activity-logs", toValue(pagination)]),
            enabled: computed(() => toValue(enabled)),
            retry: false,
        },
        {
            errorMessage: "Failed to fetch staff activity logs",
        },
    );
}

function parseStaffActivityLog(value: unknown): StaffActivityLog {
    return parseWithSchema(staffActivityLogSchema, value, "staff activity log");
}

export type StaffActivityLogPage = PaginatedResult<StaffActivityLog>;

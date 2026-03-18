import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

const routeState = vi.hoisted(() => ({
    params: {
        documentId: "doc id/01",
    },
}));

vi.mock("vue-router", async () => {
    const actual = await vi.importActual<typeof import("vue-router")>("vue-router");
    return {
        ...actual,
        useRoute: () => routeState,
    };
});

vi.mock("@/lib/api/client", async () => {
    const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
    return {
        ...actual,
        buildApiUrl: (path: string) => `https://api.test${path}`,
    };
});

import PublicDocumentRedirectPage from "./[documentId].vue";

describe("PublicDocumentRedirectPage", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("redirects to the public document download endpoint", () => {
        const replaceSpy = vi.fn();
        vi.stubGlobal("location", {
            ...window.location,
            replace: replaceSpy,
        });

        routeState.params.documentId = "doc id/01";
        mount(PublicDocumentRedirectPage);

        expect(replaceSpy).toHaveBeenCalledWith("https://api.test/public/documents/doc%20id%2F01");
    });

    it("does not redirect when document id is empty", () => {
        const replaceSpy = vi.fn();
        vi.stubGlobal("location", {
            ...window.location,
            replace: replaceSpy,
        });

        routeState.params.documentId = "   ";
        const wrapper = mount(PublicDocumentRedirectPage);

        expect(replaceSpy).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain("配布資料を開いています...");
    });
});

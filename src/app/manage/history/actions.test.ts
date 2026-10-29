import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { restoreRevision } from "./actions";
import { HISTORY_AREAS } from "@/lib/manage-history";

const { auth, getClient, client, patch, invalidate, tag } = vi.hoisted(() => {
    const patch = { ifRevisionId: vi.fn(), set: vi.fn(), unset: vi.fn(), commit: vi.fn() };
    const client = { request: vi.fn(), getDocument: vi.fn(), patch: vi.fn(), createOrReplace: vi.fn() };
    return { auth: vi.fn(), getClient: vi.fn(), client, patch, invalidate: vi.fn(), tag: vi.fn() };
});
afterEach(() => vi.restoreAllMocks());
vi.mock("@/lib/manage-auth", () => ({ requireAuth: auth }));
vi.mock("@/sanity/lib/writeClient", () => ({ getWriteClient: getClient }));
vi.mock("next/cache", () => ({ revalidatePath: invalidate, updateTag: tag }));
const time = "2026-10-20T12:00:00Z";
const old = { _id: "crew-1", _type: "crew", _rev: "old-rev", _createdAt: time, _updatedAt: time, name: "옛 이름", slug: { current: "old-slug" }, trashed: false, order: 1 };
const current = { ...old, _rev: "current-rev", name: "현재 이름", slug: { current: "new-slug" }, trashed: true, order: 9, addedLater: "지워질 항목" };

beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    auth.mockResolvedValue(undefined);
    getClient.mockReturnValue(client);
    client.request.mockResolvedValue({ documents: [old] });
    client.getDocument.mockResolvedValue(current);
    client.patch.mockReturnValue(patch);
    for (const method of [patch.ifRevisionId, patch.set, patch.unset]) method.mockReturnValue(patch);
    patch.commit.mockResolvedValue({ ...old, _rev: "restored-rev" });
});

describe("이력 복원 서버 액션의 안전성", () => {
    it("인증 실패 시 저장소에 접근하지 않는다", async () => {
        auth.mockRejectedValue(new Error("인증이 필요해요. 다시 로그인해 주세요."));
        const result = await restoreRevision("crew", "crew-1", time, current._rev);
        expect(result.ok).toBe(false);
        expect(getClient).not.toHaveBeenCalled();
    });
    it.each(["__proto__", "constructor", "toString", "unknown"])("잘못된 영역 %s는 쓰기 클라이언트를 만들지 않는다", async (area) => {
        expect((await restoreRevision(area, "crew-1", time, current._rev)).ok).toBe(false);
        expect(getClient).not.toHaveBeenCalled();
    });
    it.each(["drafts.crew-1", "versions.release.crew-1", "../crew-1", "bad/id", "%", ""])("관리 범위 밖의 문서 ID %s는 거부한다", async (id) => {
        expect((await restoreRevision("crew", id, time, current._rev)).ok).toBe(false);
        expect(getClient).not.toHaveBeenCalled();
    });
    it("고정 설정 문서의 다른 ID는 거부한다", async () => {
        expect((await restoreRevision("contact", "another-settings", time, current._rev)).ok).toBe(false);
        expect(getClient).not.toHaveBeenCalled();
    });
    it.each(["", "not-a-time"])("잘못된 시점 %s는 저장소에 접근하지 않는다", async (invalidTime) => {
        expect((await restoreRevision("crew", "crew-1", invalidTime, current._rev)).ok).toBe(false);
        expect(getClient).not.toHaveBeenCalled();
    });
    it("확인한 현재 버전이 없으면 복원하지 않는다", async () => {
        expect((await restoreRevision("crew", "crew-1", time, "")).ok).toBe(false);
        expect(getClient).not.toHaveBeenCalled();
    });
    it.each([
        { name: "다른 문서", snapshot: { ...old, _id: "crew-2" } },
        { name: "다른 종류", snapshot: { ...old, _type: "work" } },
        { name: "내용 없음", snapshot: null },
    ])("과거 스냅샷이 $name이면 쓰지 않는다", async ({ snapshot }) => {
        client.request.mockResolvedValue({ documents: snapshot ? [snapshot] : [] });
        expect((await restoreRevision("crew", "crew-1", time, current._rev)).ok).toBe(false);
        expect(client.patch).not.toHaveBeenCalled();
        expect(client.createOrReplace).not.toHaveBeenCalled();
    });
    it.each([
        { name: "영구 삭제됨", doc: undefined },
        { name: "다른 종류", doc: { ...current, _type: "work" } },
        { name: "다른 ID", doc: { ...current, _id: "crew-2" } },
        { name: "확인 뒤 수정됨", doc: { ...current, _rev: "changed-rev" } },
    ])("현재 문서가 $name이면 덮어쓰거나 재생성하지 않는다", async ({ doc }) => {
        client.getDocument.mockResolvedValue(doc);
        expect((await restoreRevision("crew", "crew-1", time, current._rev)).ok).toBe(false);
        expect(client.patch).not.toHaveBeenCalled();
        expect(client.createOrReplace).not.toHaveBeenCalled();
    });
    it("내용만 조건부 패치하고 휴지통·순서를 유지하며 새로 추가된 필드는 제거한다", async () => {
        expect(await restoreRevision("crew", "crew-1", time, current._rev)).toEqual({ ok: true });
        expect(client.patch).toHaveBeenCalledWith("crew-1");
        expect(patch.ifRevisionId).toHaveBeenCalledWith(current._rev);
        expect(patch.set).toHaveBeenCalledWith(expect.objectContaining({ name: "옛 이름", trashed: true, order: 9 }));
        const values = patch.set.mock.calls[0][0];
        for (const field of ["_id", "_type", "_rev", "_createdAt", "_updatedAt"]) expect(values).not.toHaveProperty(field);
        expect(patch.unset).toHaveBeenCalledWith(["addedLater"]);
        expect(client.createOrReplace).not.toHaveBeenCalled();
        expect(invalidate).toHaveBeenCalledWith("/crew/old-slug");
        expect(invalidate).toHaveBeenCalledWith("/crew/new-slug");
    });
    it("최종 저장 직전 버전 충돌은 재확인하도록 안내하고 성공 처리를 하지 않는다", async () => {
        patch.commit.mockRejectedValue({ statusCode: 409 });
        const result = await restoreRevision("crew", "crew-1", time, current._rev);
        expect(result).toMatchObject({ ok: false, error: expect.stringContaining("바뀌었어요") });
        expect(tag).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalled();
    });
    it.each(Object.entries(HISTORY_AREAS))("%s 영역은 자기 종류·고정 ID와 갱신 경로를 사용한다", async (area, cfg) => {
        const id = cfg.fixedId ?? "doc-1";
        const snapshot = { ...old, _id: id, _type: cfg.type };
        client.request.mockResolvedValue({ documents: [snapshot] });
        client.getDocument.mockResolvedValue({ ...snapshot, _rev: "current-rev" });
        expect(await restoreRevision(area, id, time, "current-rev")).toEqual({ ok: true });
        expect(client.patch).toHaveBeenCalledWith(id);
        expect(tag).toHaveBeenCalledWith(cfg.tag);
        expect(invalidate).toHaveBeenCalledWith(cfg.back(id));
        if (area === "crew" || area === "works") expect(invalidate).toHaveBeenCalledWith("/sitemap.xml");
        if (cfg.paths.includes("/")) expect(invalidate).toHaveBeenCalledWith("/", "layout");
    });
    it("외부 API 오류의 원문을 운영자 화면에 그대로 노출하지 않는다", async () => {
        client.request.mockRejectedValue(new Error("private upstream details"));
        const result = await restoreRevision("crew", "crew-1", time, current._rev);
        expect(result.ok).toBe(false);
        expect(JSON.stringify(result)).not.toContain("private upstream details");
        expect(client.patch).not.toHaveBeenCalled();
    });
    it.each([
        { documents: { 0: old } }, { documents: [old, { ...old, _rev: "another-rev" }] },
        { documents: [{ ...old, _rev: " " }] }, { documents: "PRIVATE_UPSTREAM_RESPONSE" },
    ])("잘못된 스냅샷 응답 #%#로는 복원 쓰기를 시작하지 않는다", async (response) => {
        client.request.mockResolvedValue(response);
        const result = await restoreRevision("crew", "crew-1", time, current._rev);
        expect(result.ok).toBe(false); expect(JSON.stringify(result)).not.toContain("PRIVATE_UPSTREAM_RESPONSE");
        expect(client.patch).not.toHaveBeenCalled(); expect(tag).not.toHaveBeenCalled(); expect(invalidate).not.toHaveBeenCalled();
    });
});

describe("이력 복원 후 공개·관리 캐시 연결", () => {
    const areas = [
        { area: "instructors", type: "instructor", tagName: "instructor", id: "doc-1", paths: [["/class"], ["/manage/instructors"], ["/manage/instructors/doc-1"], ["/manage/history/instructors/doc-1"]] },
        { area: "crew", type: "crew", tagName: "crew", id: "doc-1", paths: [["/crew"], ["/manage/crew"], ["/sitemap.xml"], ["/manage/crew/doc-1"], ["/manage/history/crew/doc-1"], ["/crew/old%2540name"], ["/crew/new%40name"]] },
        { area: "works", type: "work", tagName: "work", id: "doc-1", paths: [["/works"], ["/manage/works"], ["/sitemap.xml"], ["/manage/works/doc-1"], ["/manage/history/works/doc-1"], ["/works/old%2540name"], ["/works/new%40name"]] },
        { area: "studio", type: "studioSpace", tagName: "studioSpace", id: "doc-1", paths: [["/studio"], ["/manage/studio"], ["/manage/studio/doc-1"], ["/manage/history/studio/doc-1"]] },
        { area: "studio-info", type: "studioInfo", tagName: "studioInfo", id: "studioInfo", paths: [["/studio"], ["/manage/studio/info"], ["/manage/history/studio-info/studioInfo"]] },
        { area: "contact", type: "siteSettings", tagName: "siteSettings", id: "siteSettings", paths: [["/", "layout"], ["/manage/contact"], ["/manage/history/contact/siteSettings"]] },
    ];
    it.each(areas)("$area는 필요한 모든 경로와 변경 전·후 slug를 갱신한다", async ({ area, type, tagName, id, paths }) => {
        const snapshot = { _id: id, _type: type, _rev: "old-rev", name: "과거", slug: { current: "old%40name" } };
        client.request.mockResolvedValue({ documents: [snapshot] });
        client.getDocument.mockResolvedValue({ ...snapshot, _rev: "current-rev", slug: { current: "new@name" } });
        expect(await restoreRevision(area, id, time, "current-rev")).toEqual({ ok: true });
        expect(tag).toHaveBeenCalledExactlyOnceWith(tagName);
        expect(invalidate.mock.calls).toHaveLength(paths.length);
        expect(invalidate.mock.calls).toEqual(expect.arrayContaining(paths));
    });
    it.each(areas)("$area의 복원 저장 실패는 캐시 갱신으로 성공 처리하지 않는다", async ({ area, type, id }) => {
        const snapshot = { _id: id, _type: type, _rev: "current-rev", name: "내용" };
        client.request.mockResolvedValue({ documents: [snapshot] });
        client.getDocument.mockResolvedValue(snapshot);
        patch.commit.mockRejectedValue({ statusCode: 409 });
        expect((await restoreRevision(area, id, time, "current-rev")).ok).toBe(false);
        expect(patch.commit).toHaveBeenCalledTimes(1);
        expect(tag).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalled();
    });
    it("복원 커밋이 끝나기 전에 전체 레이아웃 캐시를 풀지 않는다", async () => {
        const snapshot = { _id: "siteSettings", _type: "siteSettings", _rev: "current-rev", phone: "02-0000-0000" };
        client.request.mockResolvedValue({ documents: [snapshot] });
        client.getDocument.mockResolvedValue(snapshot);
        let started!: () => void;
        let finish!: () => void;
        const committing = new Promise<void>((resolve) => { started = resolve; });
        patch.commit.mockImplementation(() => { started(); return new Promise<void>((resolve) => { finish = resolve; }); });
        const pending = restoreRevision("contact", "siteSettings", time, "current-rev");
        await committing;
        expect(tag).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalled();
        finish();
        expect(await pending).toEqual({ ok: true });
        expect(tag).toHaveBeenCalledExactlyOnceWith("siteSettings");
        expect(invalidate).toHaveBeenCalledWith("/", "layout");
    });
});

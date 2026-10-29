/** Sanity 공개 문서의 ID 형식. 초안·릴리스 문서는 /admin에서 관리한다. */
export function isManagedDocumentId(id: string): boolean {
    return typeof id === "string" && /^[a-z0-9_][a-z0-9_.-]{0,127}$/i.test(id)
        && !id.includes("..") && !id.startsWith("drafts.") && !id.startsWith("versions.");
}

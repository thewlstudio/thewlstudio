/**
 * Sanity 데이터셋 백업(data.ndjson)이 쓸 만한지 확인하는 순수 로직.
 * 파일 읽기는 scripts/verify-backup.ts가 한다. (절차: docs/BACKUP_RESTORE.md)
 */

export type BackupSummary = {
    total: number;
    byType: Record<string, number>;
    /** 줄 번호(1부터)와 이유 — JSON이 아니거나 _id/_type이 없는 줄 */
    badLines: { line: number; reason: string }[];
};

export function summarizeNdjson(text: string): BackupSummary {
    const byType: Record<string, number> = {};
    const badLines: BackupSummary["badLines"] = [];
    let total = 0;
    text.split("\n").forEach((raw, index) => {
        const line = raw.trim();
        if (!line) return;
        let doc: unknown;
        try { doc = JSON.parse(line); } catch { badLines.push({ line: index + 1, reason: "JSON이 아니에요" }); return; }
        if (typeof doc !== "object" || doc === null || Array.isArray(doc)) { badLines.push({ line: index + 1, reason: "문서 객체가 아니에요" }); return; }
        const { _id, _type } = doc as { _id?: unknown; _type?: unknown };
        if (typeof _id !== "string" || typeof _type !== "string") { badLines.push({ line: index + 1, reason: "_id 또는 _type이 없어요" }); return; }
        total++;
        byType[_type] = (byType[_type] ?? 0) + 1;
    });
    return { total, byType, badLines };
}

export type BackupCheck = { ok: boolean; problems: string[] };

/** 기본 기준: 문서가 있고, 깨진 줄이 없고, 사이트 설정 문서가 들어 있다(시드된 사이트의 필수 문서). */
export function checkBackup(summary: BackupSummary, options: { requireTypes?: string[]; minTotal?: number } = {}): BackupCheck {
    const { requireTypes = ["siteSettings"], minTotal = 1 } = options;
    const problems: string[] = [];
    if (summary.total < minTotal) problems.push(`문서가 ${summary.total}개뿐이에요(최소 ${minTotal}개). 빈 백업일 수 있어요.`);
    if (summary.badLines.length > 0) problems.push(`읽을 수 없는 줄이 ${summary.badLines.length}개 있어요(첫 줄: ${summary.badLines[0].line}번, ${summary.badLines[0].reason}).`);
    for (const type of requireTypes) if (!summary.byType[type]) problems.push(`${type} 문서가 없어요.`);
    return { ok: problems.length === 0, problems };
}

/** 사람이 읽는 한 줄 요약 — "문서 53개 (crew 3, instructor 7, …)" */
export function formatSummary(summary: BackupSummary): string {
    const parts = Object.entries(summary.byType).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([type, n]) => `${type} ${n}`);
    return `문서 ${summary.total}개${parts.length ? ` (${parts.join(", ")})` : ""}`;
}

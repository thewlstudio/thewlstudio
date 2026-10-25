/**
 * 화면별 안내(투어) 내용. 대상은 화면 요소의 data-tour="이름" 속성으로 찾고,
 * 화면에 없거나 숨겨진 대상은 그 단계를 건너뛴다. 본문의 **강조**는 굵게 표시된다.
 * 규칙: 단계는 최대 6개, 제목 한 줄 + 설명 두 문장 이내, 해요체.
 */
export type TourStep = { target: string; title: string; body: string };
export type TourDef = { id: string; steps: TourStep[] };

const AREAS: Record<string, { noun: string; reorder: boolean }> = {
    crew: { noun: "크루", reorder: true },
    instructors: { noun: "강사", reorder: true },
    works: { noun: "작업물", reorder: false },
    studio: { noun: "공간", reorder: true },
};

const sel = (name: string) => `[data-tour="${name}"]`;

function listTour(area: string): TourDef {
    const { noun, reorder } = AREAS[area];
    const steps: TourStep[] = [
        { target: sel("list-new"), title: `새 ${noun} 만들기`, body: "눌러서 새로 만들어요. **빨간 별(*)** 칸만 채우면 시작할 수 있어요." },
        { target: sel("list-tools"), title: "찾기·걸러 보기", body: `이름으로 **찾고**, 공개·비공개로 **걸러 볼** 수 있어요.${reorder ? " 찾는 중에는 순서를 바꿀 수 없어요." : ""}` },
        {
            target: sel("list-row"),
            title: "눌러서 수정하기",
            body: `줄을 누르면 **수정 화면**이 열려요. 오른쪽 글씨로 **마지막 수정**을 알 수 있어요.${reorder ? "" : " 목록은 발매일 최신순으로 자동 정렬돼요."}`,
        },
    ];
    if (reorder) steps.push({ target: sel("list-reorder"), title: "순서 바꾸기", body: "**▲▼** 버튼으로, 마우스라면 **끌어서도** 바꿔요. 홈페이지 순서가 바로 바뀌어요." });
    steps.push({ target: sel("list-trash"), title: "삭제한 항목", body: "삭제하면 **휴지통**으로 가고, 여기서 **언제든 복원**할 수 있어요." });
    return { id: `list-${area}`, steps };
}

function formTour(area: string): TourDef {
    const steps: TourStep[] = [
        { target: sel("form-preview"), title: "미리보기", body: "입력하면 **홈페이지에 나올 모습**이 바로 바뀌어요. 저장하기 전에 확인해 보세요." },
        { target: sel("form-first"), title: "먼저 기본 정보", body: "**빨간 별(*)** 칸은 꼭 채워야 해요. 칸 아래 설명과 제목 옆 **?** 를 눌러 보세요." },
        { target: sel("form-photo"), title: "사진", body: "**사진 고르기** 다음 **사진 자르기**로 비율을 맞춰요. 큰 사진은 자동으로 줄여서 올라가요." },
    ];
    if (area === "works") steps.push({ target: sel("works-blocks"), title: "상세 페이지 내용", body: "**블록**을 추가해 설명·크레딧·이미지를 쌓아요. 접었다 펼 수 있고 ▲▼로 순서를 바꿔요." });
    steps.push(
        { target: sel("form-save-bar"), title: "저장하기", body: "**저장하기**를 눌러야 홈페이지에 반영돼요. **Ctrl+S**(맥은 ⌘+S)도 돼요. 마음이 바뀌면 **변경 버리기**를 누르세요." },
        { target: sel("form-updated"), title: "변경 이력", body: "실수했나요? **변경 이력**에서 이전 상태로 되돌릴 수 있어요." },
        { target: sel("form-danger"), title: "삭제와 비공개", body: "삭제는 **휴지통**으로 가서 되돌릴 수 있어요. 잠깐 숨기려면 공개 상태를 **비공개**로 바꾸세요." },
    );
    return { id: `form-${area}`, steps };
}

const HUB: TourDef = {
    id: "hub",
    steps: [
        { target: sel("hub-checklist"), title: "처음 설정", body: "여기 **다섯 가지**를 해 보면 사용법을 금방 익혀요. 하나씩 하면 **자동으로 체크**돼요." },
        { target: sel("hub-cards"), title: "고칠 항목 고르기", body: "강사·Crew·Works·Studio·Contact 중 **고칠 항목**을 눌러요. 오른쪽 숫자는 지금 **등록된 개수**예요." },
        { target: sel("hub-view-site"), title: "홈페이지에서 확인하기", body: "고친 결과는 여기서 바로 확인해요. **저장하기 전에는** 홈페이지가 바뀌지 않아요." },
        { target: sel("hub-recent"), title: "최근 수정", body: "방금 고친 항목으로 **바로 돌아가요**." },
        { target: sel("nav-help"), title: "막히면 여기서", body: "**사용 안내**에 질문별 답이 있어요. 각 화면 위의 **이 화면 안내**를 누르면 지금 보는 안내를 다시 볼 수 있어요." },
    ],
};

const CONTACT: TourDef = {
    id: "contact",
    steps: [
        { target: sel("contact-loc"), title: "위치·연락처", body: "Contact 페이지에 나와요. 전화번호를 누르면 방문자 휴대폰에서 **바로 전화**가 걸려요." },
        { target: sel("contact-map"), title: "지도", body: "**주소만** 적으면 지도가 만들어져요. 지도 공유 코드는 넣지 마세요." },
        { target: sel("contact-links"), title: "링크", body: "헤더의 인스타그램, 예약·멤버십 버튼, 블로그 링크로 쓰여요. 주소창의 주소를 **복사해서 붙여넣으면** 돼요." },
        { target: sel("contact-intro"), title: "홈페이지 소개 문구", body: "홈페이지 첫 화면 아래 소개 영역이에요. **Enter 한 번**은 줄바꿈, **두 번**은 문단 나누기예요." },
        { target: sel("form-save-bar"), title: "저장하기", body: "**저장하기**를 누르면 홈페이지에 **바로 반영**돼요." },
    ],
};

const STUDIO_INFO: TourDef = {
    id: "studio-info",
    steps: [
        { target: sel("info-services"), title: "서비스", body: "페이지 위쪽의 검은 카드예요. 카드는 **접었다 펼 수** 있어요." },
        { target: sel("info-equipment"), title: "장비", body: "묶음 제목과 장비 이름을 적어요. 제목에서 **Enter**로 줄을 나눌 수 있어요." },
        { target: sel("info-membership"), title: "멤버십", body: "회원권 카드와 안내 문구예요. 금액 뒤에는 **'원'이 자동으로** 붙어요." },
        { target: sel("form-save-bar"), title: "저장하기", body: "**저장하기**를 누르면 홈페이지에 **바로 반영**돼요." },
    ],
};

const HISTORY: TourDef = {
    id: "history",
    steps: [{ target: sel("history-list"), title: "저장 기록", body: "저장할 때마다 한 줄씩 쌓여요. 줄을 누르면 **무엇이 바뀌었는지** 보이고, **그 시점으로 되돌릴** 수 있어요." }],
};

/** 지금 주소에 맞는 안내. 없으면 null */
export function tourForPath(pathname: string): TourDef | null {
    const p = pathname.replace(/\/+$/, "");
    if (p === "/manage") return HUB;
    if (p === "/manage/contact") return CONTACT;
    if (p === "/manage/studio/info") return STUDIO_INFO;
    if (p.startsWith("/manage/history/")) return HISTORY;
    const m = p.match(/^\/manage\/(crew|instructors|works|studio)(?:\/([^/]+))?$/);
    if (m) return m[2] ? formTour(m[1]) : listTour(m[1]);
    return null;
}

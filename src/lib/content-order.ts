/** 수동 순서를 쓰는 공개 화면·관리 목록·서버 이동이 같은 동률 규칙을 사용한다. */
export const CONTENT_ORDER = "coalesce(order, 0) asc, _id asc";
export const STUDIO_CONTENT_ORDER = `select(kind == "lobby" => 1, 0) asc, ${CONTENT_ORDER}`;

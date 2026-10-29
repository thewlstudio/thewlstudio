import { toPayload as workPayload, toState as workState } from "@/lib/work-blocks";
import { toPayload as crewPayload, toState as crewState } from "@/lib/crew-sections";

/** 정상 저장 fixture를 실제 편집 모델의 완전한 제출 형식으로 만든다. 오류 주입 테스트에는 사용하지 않는다. */
export const workPayloadFixture = (raw: unknown) => workPayload(workState(raw));
export const crewPayloadFixture = (raw: unknown) => crewPayload(crewState(raw));

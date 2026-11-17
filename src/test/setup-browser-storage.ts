import { afterAll } from "vitest";

// Node의 Web Storage가 jsdom의 브라우저 저장소를 가리지 않도록 한다.
// Node 환경 테스트와 실제 서버·브라우저 코드는 변경하지 않는다.
const browser = (globalThis as typeof globalThis & {
    jsdom?: { window: Pick<Window, "localStorage" | "sessionStorage"> };
}).jsdom?.window;

if (browser) {
    const originals = new Map<string, PropertyDescriptor | undefined>();
    for (const name of ["localStorage", "sessionStorage"] as const) {
        originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
        Object.defineProperty(globalThis, name, {
            configurable: true,
            get: () => browser[name],
        });
    }

    afterAll(() => {
        for (const [name, descriptor] of originals) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else Reflect.deleteProperty(globalThis, name);
        }
    });
}

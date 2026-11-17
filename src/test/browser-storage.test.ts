// @vitest-environment jsdom
import { expect, it } from "vitest";

it.each(["localStorage", "sessionStorage"] as const)("%s는 Node 공용 저장소가 아닌 현재 jsdom의 저장소다", (name) => {
    const browser = (globalThis as typeof globalThis & {
        jsdom: { window: Pick<Window, "localStorage" | "sessionStorage"> };
    }).jsdom.window;
    const storage = globalThis[name];
    expect(storage).toBe(browser[name]);
    expect(storage).toBeInstanceOf(Storage);

    const key = "wls_node26_storage_test";
    try {
        storage.setItem(key, "browser");
        expect(browser[name].getItem(key)).toBe("browser");
        storage.removeItem(key);
        expect(browser[name].getItem(key)).toBeNull();
    } finally {
        storage.removeItem(key);
    }
});

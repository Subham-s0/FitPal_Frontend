import { parseEventBlock } from "@/features/notifications/use-notification-stream";

describe("notification stream parser (FE-NOTIFY-02)", () => {
  it("uses message as default event and joins multiline data", () => {
    const parsed = parseEventBlock("data: first line\ndata: second line");

    expect(parsed.event).toBe("message");
    expect(parsed.data).toBe("first line\nsecond line");
  });

  it("parses explicit event names and ignores comment lines", () => {
    const parsed = parseEventBlock(": keepalive\nevent: notification\ndata: {\"id\":1}");

    expect(parsed.event).toBe("notification");
    expect(parsed.data).toBe("{\"id\":1}");
  });

  it("returns empty data when no data payload exists", () => {
    const parsed = parseEventBlock("event: ping");

    expect(parsed.event).toBe("ping");
    expect(parsed.data).toBe("");
  });
});

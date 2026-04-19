import { resolveDocumentTitle } from "@/app/router";

describe("router title resolution (FE-AUTH-01, FE-MEMBER-03, FE-DISC-01)", () => {
  it("returns correct titles for protected and callback routes", () => {
    expect(resolveDocumentTitle("/admin/dashboard")).toBe("FitPal | Admin Dashboard");
    expect(resolveDocumentTitle("/checkin")).toBe("FitPal | Check-Ins");
    expect(resolveDocumentTitle("/check-ins")).toBe("FitPal | Check-Ins");
    expect(resolveDocumentTitle("/payments/esewa/success/123")).toBe("FitPal | Payments");
    expect(resolveDocumentTitle("/payments/khalti/return/abc")).toBe("FitPal | Payments");
    expect(resolveDocumentTitle("/workout-session/1")).toBe("FitPal | Workout Session");
  });

  it("handles gym routes and unknown routes safely", () => {
    expect(resolveDocumentTitle("/gym/99")).toBe("FitPal | Gym");
    expect(resolveDocumentTitle("/unknown-page")).toBe("FitPal");
  });
});

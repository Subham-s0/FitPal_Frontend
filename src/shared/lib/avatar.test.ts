import {
  buildUiAvatarUrl,
  getDisplayNameFromEmail,
  getRoleFallbackName,
  resolveAvatarUrl,
  resolveDisplayName,
} from "@/shared/lib/avatar";

describe("avatar helpers", () => {
  it("derives display names from email and role fallbacks", () => {
    expect(getRoleFallbackName("GYM")).toBe("Gym Owner");
    expect(getDisplayNameFromEmail("john_doe@example.com", "USER")).toBe("John Doe");
    expect(getDisplayNameFromEmail("", "ADMIN")).toBe("Admin");
  });

  it("prefers explicit display names before email fallbacks", () => {
    expect(resolveDisplayName({ displayName: "FitPal Coach", email: "coach@example.com" })).toBe(
      "FitPal Coach",
    );
  });

  it("reuses uploaded avatars before generating ui-avatars fallbacks", () => {
    expect(
      resolveAvatarUrl({
        primaryUrl: " https://cdn.example.com/avatar.png ",
        displayName: "Member",
      }),
    ).toBe("https://cdn.example.com/avatar.png");

    expect(
      resolveAvatarUrl({
        displayName: "Member",
        background: "111827",
      }),
    ).toBe(buildUiAvatarUrl("Member", { background: "111827" }));
  });
});

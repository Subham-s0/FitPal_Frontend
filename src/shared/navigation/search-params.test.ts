import {
  readEnumSearchParam,
  readOptionalEnumSearchParam,
  writeSearchParam,
} from "@/shared/navigation/search-params";

describe("search-params", () => {
  it("reads only allowed enum values", () => {
    expect(
      readEnumSearchParam("?tab=membership", "tab", ["profile", "membership", "goals"] as const, "profile"),
    ).toBe("membership");

    expect(
      readEnumSearchParam("?tab=unknown", "tab", ["profile", "membership", "goals"] as const, "profile"),
    ).toBe("profile");

    expect(
      readOptionalEnumSearchParam("?tab=security", "tab", ["overview", "security"] as const),
    ).toBe("security");

    expect(
      readOptionalEnumSearchParam("?tab=payments", "tab", ["overview", "security"] as const),
    ).toBeNull();
  });

  it("writes and removes search params without disturbing others", () => {
    expect(writeSearchParam("?tab=profile&page=2", "tab", "goals")).toBe("?tab=goals&page=2");
    expect(writeSearchParam("?tab=profile&page=2", "tab", null)).toBe("?page=2");
    expect(writeSearchParam("", "tab", "overview")).toBe("?tab=overview");
  });
});

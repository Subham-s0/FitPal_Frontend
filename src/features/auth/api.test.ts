import { adminLoginApi, loginApi, registerGymApi, registerUserApi } from "@/features/auth/api";
import { postApiData } from "@/shared/api/client";

vi.mock("@/shared/api/client", () => ({
  postApiData: vi.fn(),
}));

describe("auth api payload mapping (FE-AUTH-03)", () => {
  const postApiDataMock = vi.mocked(postApiData);

  beforeEach(() => {
    postApiDataMock.mockReset();
    postApiDataMock.mockResolvedValue({} as never);
  });

  it("targets the correct login endpoints", async () => {
    await loginApi({ email: "member@fitpal.com", password: "password123" });
    await adminLoginApi({ email: "admin@fitpal.com", password: "password123" });

    expect(postApiDataMock).toHaveBeenNthCalledWith(1, "/auth/login", {
      email: "member@fitpal.com",
      password: "password123",
    });
    expect(postApiDataMock).toHaveBeenNthCalledWith(2, "/auth/admin/login", {
      email: "admin@fitpal.com",
      password: "password123",
    });
  });

  it("strips confirmPassword before register requests", async () => {
    await registerUserApi({
      email: "user@fitpal.com",
      password: "password123",
      confirmPassword: "password123",
      userName: "member-one",
    });

    await registerGymApi({
      email: "gym@fitpal.com",
      password: "password123",
      confirmPassword: "password123",
      gymName: "FitPal Gym",
    });

    expect(postApiDataMock).toHaveBeenNthCalledWith(1, "/auth/register/user", {
      email: "user@fitpal.com",
      password: "password123",
      userName: "member-one",
    });
    expect(postApiDataMock).toHaveBeenNthCalledWith(2, "/auth/register/gym", {
      email: "gym@fitpal.com",
      password: "password123",
      gymName: "FitPal Gym",
    });
  });
});

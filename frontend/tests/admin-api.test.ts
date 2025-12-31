import { fetchBranches } from "@/lib/admin-api";
import fetchMock from "jest-fetch-mock";

describe("Admin API", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("should fetch branches with the correct URL", async () => {
    const token = "test-token";
    const mockBranches = [{ id: "1", name: "Branch 1" }];
    fetchMock.mockResponseOnce(JSON.stringify({ data: mockBranches }));

    await fetchBranches(token);

    expect(fetchMock.mock.calls.length).toEqual(1);
    expect(fetchMock.mock.calls[0][0]).toEqual("http://localhost:5000/admin/branches");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: (...args) => fetchMock(...args),
}));

const { __test__ } = await import("../../open-sse/services/qoderModels.js");

const credentials = {
  provider: "qoder",
  accessToken: "dt-test-token",
  providerSpecificData: {
    userId: "test-user",
    machineId: "test-machine",
  },
};

function response(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("Qoder live model catalog", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("requests Encode=1 and parses the official assistant scene", async () => {
    fetchMock.mockResolvedValue(response({
      assistant: [
        {
          key: "qmodel_38max",
          display_name: "Qwen3.8-Max",
          enable: true,
          max_input_tokens: 180000,
          max_output_tokens: 32768,
          is_reasoning: true,
        },
        {
          key: "hidden-model",
          display_name: "Hidden Model",
          enable: false,
        },
      ],
    }));

    const catalog = await __test__.fetchQoderCatalogRaw(credentials);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api3.qoder.sh/algo/api/v2/model/list?Encode=1",
    );
    expect(catalog.models).toEqual([
      {
        id: "qmodel_38max",
        name: "Qwen3.8-Max",
        contextLength: 180000,
        isVL: false,
        isReasoning: true,
        maxOutputTokens: 32768,
        description: "",
      },
    ]);
    expect(catalog.rawConfigs.get("hidden-model")).toMatchObject({ enable: false });
  });

  it("keeps legacy chat-scene responses readable", async () => {
    fetchMock.mockResolvedValue(response({
      chat: [{ key: "qmodel", display_name: "Qwen3.7-Plus", enable: true }],
    }));

    const catalog = await __test__.fetchQoderCatalogRaw(credentials);

    expect(catalog.models.map((model) => model.id)).toEqual(["qmodel"]);
  });
});

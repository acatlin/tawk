import { describe, expect, it, vi } from "vitest";
import { answer, type Chunk, type Generated, type PipelineDeps } from "../src/pipeline.js";
import { CHUNKS, FAQ } from "./fixtures.js";

function deps(overrides: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    faq: FAQ,
    faqOptions: { threshold: 0.45, margin: 0.1 },
    allowedSources: ["help.harbor.example"],
    retrieve: vi.fn(async () => CHUNKS),
    generate: vi.fn(async (_q: string, chunks: Chunk[]): Promise<Generated> => ({
      text: "Annual members use the priority phone line.",
      citations: [{ title: chunks[1]?.title ?? "", url: chunks[1]?.url ?? "", quote: "Annual members use the priority phone line (7am–9pm)." }],
      grounded: true,
    })),
    ...overrides,
  };
}

describe("answer()", () => {
  it("tier 1: a FAQ hit returns the canonical answer without calling the model", async () => {
    const d = deps();
    const a = await answer("i forgot my password", d);
    expect(a.tier).toBe("faq");
    expect(a.text).toContain("Forgot password");
    expect(a.citations[0]?.url).toBe("https://help.harbor.example/account/password");
    expect(d.retrieve).not.toHaveBeenCalled();
    expect(d.generate).not.toHaveBeenCalled();
    expect(a.handoff).toBe(false);
  });

  it("tier 2: a non-FAQ question goes to retrieval and returns a cited answer", async () => {
    const d = deps();
    const a = await answer("which support channel do annual members get?", d);
    expect(a.tier).toBe("sources");
    expect(d.generate).toHaveBeenCalledOnce();
    expect(a.citations).toHaveLength(1);
    expect(a.citations[0]?.url).toContain("help.harbor.example");
  });

  it("never passes chunks from outside the allow-list to the model", async () => {
    const leak: Chunk = { id: "x", title: "Random blog", url: "https://blog.elsewhere.example/post", text: "Annual members get a pony." };
    const d = deps({ retrieve: vi.fn(async () => [leak, ...CHUNKS]) });
    await answer("do annual members get a pony?", d);
    const passed = (d.generate as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as Chunk[];
    expect(passed.map((c) => c.id)).not.toContain("x");
  });

  it("falls back with handoff when retrieval finds nothing approved", async () => {
    const d = deps({ retrieve: vi.fn(async () => []) });
    const a = await answer("what is the capital of France?", d);
    expect(a.tier).toBe("fallback");
    expect(a.handoff).toBe(true);
    expect(a.reason).toBe("no-approved-chunks");
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("falls back when the model says the sources do not answer", async () => {
    const d = deps({ generate: vi.fn(async () => ({ text: "NOT_IN_SOURCES", citations: [], grounded: false })) });
    const a = await answer("can I bring my dog on the bike?", d);
    expect(a.tier).toBe("fallback");
    expect(a.reason).toBe("model-declined");
  });

  it("falls back when a model answer carries no allowed citation", async () => {
    const d = deps({ generate: vi.fn(async () => ({ text: "Sure, ponies for everyone.", citations: [{ title: "Blog", url: "https://blog.elsewhere.example/p" }], grounded: true })) });
    const a = await answer("do annual members get a pony?", d);
    expect(a.tier).toBe("fallback");
    expect(a.reason).toBe("insufficient-citations");
  });

  it("tier 0: an explicit request for a person short-circuits everything", async () => {
    const d = deps();
    const a = await answer("I want to talk to a human please", d);
    expect(a.handoff).toBe(true);
    expect(a.reason).toBe("visitor-requested-human");
    expect(d.retrieve).not.toHaveBeenCalled();
  });
});

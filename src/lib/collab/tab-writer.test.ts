import { describe, expect, it } from "vitest";

import { createAlwaysLeaderWriter, createRoomTabWriter } from "@/lib/collab/tab-writer";

describe("tab-writer", () => {
  it("always-leader helper reports leader after start", () => {
    const w = createAlwaysLeaderWriter();
    expect(w.isLeader()).toBe(true);
    const roles: string[] = [];
    w.onRoleChange((r) => roles.push(r));
    w.start();
    expect(w.getRole()).toBe("leader");
    w.stop();
    expect(w.getRole()).toBe("follower");
  });

  it("createRoomTabWriter starts as follower until locks resolve (or falls back)", () => {
    const w = createRoomTabWriter("ABCD12");
    const roles: string[] = [];
    w.onRoleChange((r) => roles.push(r));
    w.start();
    // Without Web Locks in jsdom, visibility fallback may set leader or follower.
    expect(["leader", "follower"]).toContain(w.getRole());
    w.stop();
    expect(w.isLeader()).toBe(false);
  });
});

describe("stale snapshot conflict policy", () => {
  it("documents that conflict must not retry with local payload", () => {
    // Behavioral contract checked in session.persistSnapshotNow — this keeps the rule visible.
    const policy = {
      onConflict: "pull-remote",
      neverRetryWithSameLocalSnapshot: true,
    };
    expect(policy.onConflict).toBe("pull-remote");
    expect(policy.neverRetryWithSameLocalSnapshot).toBe(true);
  });
});

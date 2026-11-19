import { describe, expect, it } from "vitest";
import {
  ancestorDirs,
  buildRows,
  isMarkdownFile,
  parentDir,
  relativeDirLabel,
} from "./fileTree";
import type { FileNode } from "../types";

describe("isMarkdownFile", () => {
  it("accepts md family case-insensitively", () => {
    expect(isMarkdownFile("a.md")).toBe(true);
    expect(isMarkdownFile("a.MARKDOWN")).toBe(true);
    expect(isMarkdownFile("a.mdx")).toBe(true);
    expect(isMarkdownFile("a.txt")).toBe(false);
    expect(isMarkdownFile("md")).toBe(false);
  });
});

describe("parentDir", () => {
  it("handles both separators", () => {
    expect(parentDir("D:\\Notes\\a\\b.md")).toBe("D:\\Notes\\a");
    expect(parentDir("/home/u/notes/b.md")).toBe("/home/u/notes");
    expect(parentDir("b.md")).toBe("b.md");
  });
});

describe("ancestorDirs", () => {
  it("returns workspace to parent chain on Windows paths", () => {
    expect(ancestorDirs("D:\\Notes\\a\\b\\c.md", "D:\\Notes")).toEqual([
      "D:\\Notes",
      "D:\\Notes\\a",
      "D:\\Notes\\a\\b",
    ]);
  });

  it("tolerates trailing separator on workspace", () => {
    expect(ancestorDirs("/notes/a/c.md", "/notes/")).toEqual(["/notes", "/notes/a"]);
  });

  it("matches case-insensitively", () => {
    expect(ancestorDirs("d:\\notes\\c.md", "D:\\Notes")).toEqual(["D:\\Notes"]);
  });

  it("returns only the root for a root-level file", () => {
    expect(ancestorDirs("D:\\Notes\\c.md", "D:\\Notes")).toEqual(["D:\\Notes"]);
  });

  it("rejects files outside the workspace", () => {
    expect(ancestorDirs("D:\\Other\\c.md", "D:\\Notes")).toEqual([]);
    expect(ancestorDirs("D:\\Notes2\\c.md", "D:\\Notes")).toEqual([]);
  });
});

describe("relativeDirLabel", () => {
  it("shows dot for the root and relative path for nested dirs", () => {
    expect(relativeDirLabel("D:\\Notes", "D:\\Notes")).toBe(".");
    expect(relativeDirLabel("D:\\Notes\\a\\b", "D:\\Notes")).toBe("a\\b");
  });
});

describe("buildRows", () => {
  it("carries sibling position for aria-setsize/posinset", () => {
    const nodes: FileNode[] = [
      { name: "a", path: "a", is_dir: true, children: [] },
      { name: "b.md", path: "b.md", is_dir: false, children: [] },
    ];
    const rows = buildRows(nodes, "root", 2);
    expect(rows.map((r) => [r.posInSet, r.setSize, r.depth, r.parentPath])).toEqual([
      [1, 2, 2, "root"],
      [2, 2, 2, "root"],
    ]);
  });
});
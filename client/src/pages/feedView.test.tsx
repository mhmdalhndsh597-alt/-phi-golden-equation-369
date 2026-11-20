import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdditionalPosts, accountLabel, nextFeedLimit, type FeedEntry } from "./feedView";

const entries: FeedEntry[] = [
  { id: 1, body: "المنشور الأول", imageUrl: null, author: { name: "عضو أول", location: "القاهرة", email: "one@example.com" } },
  { id: 2, body: "منشور إضافي", imageUrl: null, author: { name: "عضو ثانٍ", location: "الإسكندرية", email: "two@example.com" } },
];

describe("Feed post list", () => {
  it("renders multiple additional posts and the load-more control", () => {
    const markup = renderToStaticMarkup(<AdditionalPosts entries={entries} feedLimit={2} onLoadMore={() => undefined} />);
    expect(markup).toContain("منشور إضافي");
    expect(markup).toContain('data-testid="feed-post"');
    expect(markup).toContain('data-testid="load-more"');
  });

  it("invokes onLoadMore after a real button click", () => {
    let called = false;
    render(<AdditionalPosts entries={entries} feedLimit={2} onLoadMore={() => { called = true; }} />);
    fireEvent.click(screen.getByTestId("load-more"));
    expect(called).toBe(true);
  });

  it("increases the requested page size without exceeding the server cap", () => {
    expect(nextFeedLimit(10)).toBe(20);
    expect(nextFeedLimit(95)).toBe(100);
    expect(nextFeedLimit(100)).toBe(100);
  });

  it("keeps official and demo account labels explicit", () => {
    expect(accountLabel("official")).toBe("حساب رسمي");
    expect(accountLabel("demo")).toBe("حساب تجريبي");
    expect(accountLabel("member")).toBeNull();
  });
});

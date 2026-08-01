import feedData from "../public/feed.json";
import { UpstreamApp } from "@/components/UpstreamApp";
import type { Feed } from "@/types";

export default function Home() {
  return <UpstreamApp feed={feedData as Feed} />;
}

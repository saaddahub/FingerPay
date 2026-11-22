import type { ReactNode } from "react";
import { connection } from "next/server";
import { Theme } from "@astryxdesign/core/theme";
import { themes } from "@/astryx-themes";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "@/site/tokens.css";
import s from "./accounts.module.css";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  await connection();
  return <Theme theme={themes.fingerpay} mode="light"><div className={s.page}>{children}</div></Theme>;
}

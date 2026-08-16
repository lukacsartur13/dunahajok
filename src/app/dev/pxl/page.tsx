import type { Metadata } from "next";
import { PxlDevBench } from "./PxlDevBench";

/**
 * THE PXL CONFIGURATOR, ON THE BENCH — /dev/pxl
 *
 * The same configurator `/preview/pxl/configure` serves, with the development
 * instruments mounted beside it. It used to be a second implementation; see
 * `PxlDevBench` for why there is now only one.
 *
 * It stays a development route. `/boats/pxl` is where the product eventually
 * lives, and `PXL.published` is false until the yard signs off specifications,
 * colour names, branding and a sales destination — none of which exist.
 *
 * It is noindex and it is linked from nothing.
 */

export const metadata: Metadata = {
  title: "PXL configurator — development",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function PxlDevPage() {
  return <PxlDevBench />;
}

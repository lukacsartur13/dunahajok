import type { Metadata } from "next";
import { PxlConfigurator } from "./PxlConfigurator";

/**
 * THE PXL CONFIGURATOR — /dev/pxl
 *
 * A development route, and it stays one (§32). `/boats/pxl` is where the
 * product eventually lives, and `PXL.published` is false until the yard signs
 * off specifications, colour names, branding and a sales destination — none of
 * which exist. What runs here is the *foundation*: the model contract, the
 * material roles, the configuration state, the URL format and the presentation
 * layer, all of them production-shaped, so that publishing later is a routing
 * change rather than a rebuild.
 *
 * It is noindex, it is linked from nothing, and it carries development notices
 * that must not survive into a customer surface. See PHASE_2_6_REPORT.md.
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
  return <PxlConfigurator />;
}

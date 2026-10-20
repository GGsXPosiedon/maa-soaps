import { jsx as _jsx } from "react/jsx-runtime";
import { splitTypographyProps, usePageTypography } from "./pageTypography";
import { LandingPageFrame } from "./LandingPageFrame";
import { MENG_TO_SKETCHBOOK_TYPOGRAPHY } from "./pageRecipes";
export function MengToSketchbookLandingPage(props) {
    const [type, frame] = splitTypographyProps(props);
    const customization = usePageTypography(MENG_TO_SKETCHBOOK_TYPOGRAPHY, type);
    return _jsx(LandingPageFrame, { ...frame, customization: customization, title: "Meng To \u2014 Singapore Sketchbook", sourceUrl: "/landing-pages/meng-to-sketchbook.html" });
}

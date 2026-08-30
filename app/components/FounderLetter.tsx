"use client";

import { ChevronDown, Quote } from "lucide-react";
import { useState } from "react";
import { Trans, useI18n } from "./I18n";

const detailParagraphs = ["about.founderP2", "about.founderP3", "about.founderP4", "about.founderP5", "about.founderP6", "about.founderP7", "about.founderP8"];

export function FounderLetter() {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return <article className={`founder-letter ${expanded ? "is-expanded" : ""}`}>
    <header><span className="section-label"><Trans id="about.founderLabel" /></span><h2><Trans id="about.founderTitle" /></h2></header>
    <div className="founder-opening"><Quote size={30} aria-hidden="true" /><p><Trans id="about.founderP1" /></p></div>
    <div className="founder-letter-copy" id="founder-story-details" hidden={!expanded} aria-hidden={!expanded}>
      {detailParagraphs.map((id) => <p key={id}><Trans id={id} /></p>)}
      <p className="founder-conclusion"><Trans id="about.founderP9" /></p>
    </div>
    <button className="founder-story-toggle" type="button" aria-expanded={expanded} aria-controls="founder-story-details" onClick={() => setExpanded((value) => !value)}>
      <span>{expanded ? t("about.founderHide") : t("about.founderShowMore")}</span><ChevronDown size={19} aria-hidden="true" />
    </button>
    <footer><span><Trans id="about.founderSignoff" /></span><strong><Trans id="about.founderName" /></strong><small><Trans id="about.founderRole" /></small></footer>
  </article>;
}

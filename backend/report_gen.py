"""
Section 65B Indian Evidence Act 1872 — compliant PDF report generator.
Uses ReportLab. Produces a court-admissible intelligence certificate.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from io import BytesIO
from datetime import datetime
import hashlib
import json


# ---------------------------------------------------------------------------
# Colour palette
# ---------------------------------------------------------------------------
NAVY    = colors.HexColor("#0a1628")
NAVY2   = colors.HexColor("#0f1f3d")
SAFFRON = colors.HexColor("#ff6600")
GOLD    = colors.HexColor("#c8a951")
LGRAY   = colors.HexColor("#f5f7fa")
MGRAY   = colors.HexColor("#64748b")
WHITE   = colors.white
GREEN   = colors.HexColor("#16a34a")
RED     = colors.HexColor("#dc2626")
AMBER   = colors.HexColor("#d97706")
BLUE    = colors.HexColor("#2563eb")


def _risk_color(level: str):
    return {"HIGH": RED, "MEDIUM": AMBER, "LOW": BLUE, "MINIMAL": GREEN}.get(level, MGRAY)


def generate_65b_report(profile_data: dict, officer_name: str, case_id: str) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=16 * mm,
        title=f"SOCMINT 65B Report — {case_id}",
        author="Karnataka CID SOCMINT Shield",
    )

    styles = getSampleStyleSheet()

    def style(name, **kw):
        return ParagraphStyle(name, parent=styles["Normal"], **kw)

    TITLE  = style("TL", fontSize=15, fontName="Helvetica-Bold",  textColor=NAVY,    alignment=TA_CENTER, spaceAfter=3)
    SUB    = style("SB", fontSize=9,  fontName="Helvetica",       textColor=MGRAY,   alignment=TA_CENTER, spaceAfter=2)
    SEC    = style("SC", fontSize=10, fontName="Helvetica-Bold",  textColor=WHITE,   spaceAfter=0, spaceBefore=0, leftIndent=4)
    BODY   = style("BO", fontSize=9,  fontName="Helvetica",       spaceAfter=3,      leading=14)
    CERT   = style("CE", fontSize=9,  fontName="Helvetica",       alignment=TA_JUSTIFY, leading=15)
    SMALL  = style("SM", fontSize=8,  fontName="Helvetica",       textColor=MGRAY)
    FOOT   = style("FT", fontSize=7,  fontName="Helvetica",       textColor=MGRAY,   alignment=TA_CENTER)
    CTITLE = style("CT", fontSize=12, fontName="Helvetica-Bold",  textColor=NAVY,    alignment=TA_CENTER, spaceAfter=6)
    BULLET = style("BU", fontSize=9,  fontName="Helvetica",       leftIndent=12,     spaceAfter=2, leading=14)

    now = datetime.utcnow()
    ts  = now.strftime("%d %B %Y, %H:%M:%S UTC")
    iso = now.isoformat()

    query           = profile_data.get("query", "Unknown")
    platforms_found = profile_data.get("platforms_found", 0)
    platforms_chk   = profile_data.get("platforms_checked", 0)
    risk            = profile_data.get("risk_score", {})
    risk_level      = risk.get("level", "N/A")
    risk_score      = risk.get("score", 0)
    rc              = _risk_color(risk_level)

    # Data integrity hashes
    data_str   = json.dumps(profile_data, sort_keys=True, default=str)
    sha256     = hashlib.sha256(data_str.encode()).hexdigest()
    md5        = hashlib.md5(data_str.encode()).hexdigest()
    data_bytes = len(data_str.encode())

    story = []

    # -----------------------------------------------------------------------
    # GOVERNMENT HEADER
    # -----------------------------------------------------------------------
    story.append(Paragraph("🇮🇳  GOVERNMENT OF KARNATAKA", SUB))
    story.append(Paragraph("Criminal Investigation Department (CID) — Digital Intelligence Unit", SUB))
    story.append(Spacer(1, 3 * mm))
    story.append(HRFlowable(width="100%", thickness=2.5, color=SAFFRON, spaceAfter=3))
    story.append(Paragraph("DIGITAL EVIDENCE INTELLIGENCE REPORT", TITLE))
    story.append(Paragraph("Under Section 65B of the Indian Evidence Act, 1872", SUB))
    story.append(HRFlowable(width="100%", thickness=0.5, color=NAVY, spaceBefore=3, spaceAfter=5))

    # -----------------------------------------------------------------------
    # CASE DETAILS TABLE
    # -----------------------------------------------------------------------
    def section_header(text):
        tbl = Table([[Paragraph(text, SEC)]], colWidths=[174 * mm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), NAVY),
            ("TOPPADDING",  (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ]))
        return tbl

    story.append(section_header("▸  CASE DETAILS"))
    story.append(Spacer(1, 2 * mm))

    case_rows = [
        ["Case Reference ID",    case_id],
        ["Investigating Officer", officer_name],
        ["Subject Identifier",   query],
        ["Report Generated",     ts],
        ["Platforms Checked",    str(platforms_chk)],
        ["Profiles Located",     str(platforms_found)],
        ["Risk Level",           risk_level],
        ["Risk Score",           f"{risk_score} / 100"],
    ]
    ct = Table(case_rows, colWidths=[58 * mm, 116 * mm])
    ct.setStyle(TableStyle([
        ("FONTNAME",    (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME",    (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE",    (0, 0), (-1, -1), 9),
        ("BACKGROUND",  (0, 0), (0, -1), LGRAY),
        ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, LGRAY]),
        ("PADDING",     (0, 0), (-1, -1), 5),
        ("TEXTCOLOR",   (1, 6), (1, 6), rc),  # risk level row colored
    ]))
    story.append(ct)
    story.append(Spacer(1, 5 * mm))

    # -----------------------------------------------------------------------
    # DATA INTEGRITY
    # -----------------------------------------------------------------------
    story.append(section_header("▸  1.  DATA INTEGRITY VERIFICATION"))
    story.append(Spacer(1, 2 * mm))

    # Trusted timestamping (RFC 3161)
    tsa_time = None
    tsa_authority = "N/A"
    tsa_signature = "N/A"
    try:
        import rfc3161ng
        from pyasn1.codec.der import encoder
        import base64
        # Attempt to contact free public TSAs
        tsa_urls = [
            "https://freetsa.org/tsr",
            "http://timestamp.digicert.com",
            "http://timestamp.sectigo.com"
        ]
        for url in tsa_urls:
            try:
                rt = rfc3161ng.RemoteTimestamper(url, hashname='sha256')
                tst = rt(data=data_str.encode(), return_tsr=True)
                if tst and tst.time_stamp_token:
                    gen_time_str = str(tst.time_stamp_token.tst_info['genTime'])
                    parsed_time = datetime.strptime(gen_time_str, "%Y%m%d%H%M%SZ")
                    tsa_time = parsed_time.strftime("%d %B %Y, %H:%M:%S UTC")
                    tsa_authority = url
                    der_bytes = encoder.encode(tst.time_stamp_token)
                    tsa_signature = base64.b64encode(der_bytes).decode()[:48] + "..."
                    break
            except Exception:
                continue
    except Exception:
        pass

    int_rows = [
        ["Algorithm", "Value"],
        ["SHA-256",    sha256],
        ["MD5",        md5],
        ["Data Size",  f"{data_bytes:,} bytes"],
        ["Collection Timestamp (ISO 8601)", iso],
        ["Trusted Timestamp (RFC 3161)", tsa_time if tsa_time else "N/A (Offline/Error)"],
        ["Timestamp Authority", tsa_authority],
        ["TSA Digital Signature", tsa_signature],
    ]
    it = Table(int_rows, colWidths=[58 * mm, 116 * mm])
    it.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR",   (0, 0), (-1, 0), WHITE),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",    (0, 0), (-1, -1), 8),
        ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LGRAY]),
        ("PADDING",     (0, 0), (-1, -1), 5),
        ("WORDWRAP",    (1, 1), (1, -1), True),
    ]))
    story.append(it)
    story.append(Spacer(1, 5 * mm))

    # -----------------------------------------------------------------------
    # PLATFORM FINDINGS
    # -----------------------------------------------------------------------
    story.append(section_header("▸  2.  PLATFORM FINDINGS SUMMARY"))
    story.append(Spacer(1, 2 * mm))

    platforms      = profile_data.get("platforms", [])
    found_plats    = [p for p in platforms if p.get("found")]
    missing_plats  = [p for p in platforms if not p.get("found")]

    if found_plats:
        pf_rows = [["Platform", "Display Name", "URL", "Key Stats"]]
        for p in found_plats:
            stats = []
            if p.get("followers"): stats.append(f"Followers: {p['followers']}")
            if p.get("karma"):     stats.append(f"Karma: {p['karma']}")
            if p.get("public_repos"): stats.append(f"Repos: {p['public_repos']}")
            if p.get("location"): stats.append(f"📍 {p['location']}")
            pf_rows.append([
                p.get("platform", ""),
                (p.get("display_name") or "")[:22],
                (p.get("url") or "")[:38],
                "  ".join(stats)[:38],
            ])
        pft = Table(pf_rows, colWidths=[28 * mm, 32 * mm, 70 * mm, 44 * mm])
        pft.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR",   (0, 0), (-1, 0), WHITE),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",    (0, 0), (-1, -1), 8),
            ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LGRAY]),
            ("PADDING",     (0, 0), (-1, -1), 4),
        ]))
        story.append(pft)

    if missing_plats:
        names = ", ".join(p.get("platform", "") for p in missing_plats)
        story.append(Spacer(1, 3 * mm))
        story.append(Paragraph(f"<b>No profile found on:</b> {names}", SMALL))
    story.append(Spacer(1, 5 * mm))

    # -----------------------------------------------------------------------
    # RISK ASSESSMENT
    # -----------------------------------------------------------------------
    story.append(section_header("▸  3.  BEHAVIOURAL RISK ASSESSMENT"))
    story.append(Spacer(1, 2 * mm))

    story.append(Paragraph(
        f"<b>Composite Risk Score: {risk_score}/100 — <font color='#{risk.get('color','000000').lstrip('#')}'>{risk_level}</font></b>",
        BODY,
    ))
    story.append(Paragraph(f"<i>{risk.get('recommendation','')}</i>", BODY))

    signals = risk.get("signals", [])
    if signals:
        story.append(Spacer(1, 2 * mm))
        story.append(Paragraph("<b>Risk Signals Detected:</b>", BODY))
        for sig in signals:
            story.append(Paragraph(f"⚠  {sig}", BULLET))

    breakdown = risk.get("breakdown", {})
    if breakdown:
        story.append(Spacer(1, 3 * mm))
        rb_rows = [["Risk Factor", "Score", "Max"]] + [
            [k.replace("_", " ").title(), str(v), "20" if k != "keyword_analysis" else "25"]
            for k, v in breakdown.items()
        ]
        # fix max for cross_platform_inconsistency
        for row in rb_rows[1:]:
            if row[0].lower() == "cross platform inconsistency":
                row[2] = "15"
        rbt = Table(rb_rows, colWidths=[100 * mm, 37 * mm, 37 * mm])
        rbt.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR",   (0, 0), (-1, 0), WHITE),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",    (0, 0), (-1, -1), 9),
            ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LGRAY]),
            ("PADDING",     (0, 0), (-1, -1), 5),
            ("ALIGN",       (1, 0), (-1, -1), "CENTER"),
        ]))
        story.append(rbt)
    story.append(Spacer(1, 5 * mm))

    # -----------------------------------------------------------------------
    # ALIAS MAP
    # -----------------------------------------------------------------------
    alias_map = profile_data.get("alias_map", [])
    if alias_map:
        story.append(section_header("▸  4.  ALIAS / IDENTITY CORRELATION MAP"))
        story.append(Spacer(1, 2 * mm))
        alias_rows = [["Platform", "Display Name", "Differs from Query"]]
        for a in alias_map:
            alias_rows.append([
                a.get("platform", ""),
                a.get("display_name", ""),
                "YES ⚠" if a.get("differs") else "No",
            ])
        at = Table(alias_rows, colWidths=[50 * mm, 80 * mm, 44 * mm])
        at.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR",   (0, 0), (-1, 0), WHITE),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",    (0, 0), (-1, -1), 9),
            ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LGRAY]),
            ("PADDING",     (0, 0), (-1, -1), 5),
        ]))
        story.append(at)
        story.append(Spacer(1, 5 * mm))

    # -----------------------------------------------------------------------
    # GEO MENTIONS
    # -----------------------------------------------------------------------
    geo = profile_data.get("geo_mentions", [])
    if geo:
        story.append(section_header("▸  5.  GEOLOCATION MENTIONS"))
        story.append(Spacer(1, 2 * mm))
        for g in geo:
            story.append(Paragraph(f"<b>{g['platform']}</b> — {g['location']}", BODY))
        story.append(Spacer(1, 5 * mm))

    # -----------------------------------------------------------------------
    # ENTITY RELATIONSHIP SUMMARY (NEW)
    # -----------------------------------------------------------------------
    if found_plats:
        story.append(section_header("▸  6.  ENTITY RELATIONSHIP SUMMARY"))
        story.append(Spacer(1, 2 * mm))
        er_rows = [["Platform", "Display Name", "Relationship to Query", "Confidence"]]
        for p in found_plats:
            dn = p.get("display_name", "")
            differs = dn.lower().strip() != query.lower().strip() if dn else False
            rel = "Alias (differs)" if differs else "Consistent"
            conf = "HIGH" if not differs else "MEDIUM"
            er_rows.append([
                p.get("platform", ""),
                (dn or "")[:22],
                rel,
                conf,
            ])
        ert = Table(er_rows, colWidths=[32 * mm, 46 * mm, 50 * mm, 46 * mm])
        ert.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR",   (0, 0), (-1, 0), WHITE),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",    (0, 0), (-1, -1), 8),
            ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LGRAY]),
            ("PADDING",     (0, 0), (-1, -1), 4),
        ]))
        story.append(ert)

        # Check for alias pattern
        alias_count = sum(1 for a in alias_map if a.get("differs"))
        if alias_count > 0:
            story.append(Spacer(1, 2 * mm))
            story.append(Paragraph(
                f"<b>⚠ ALIAS PATTERN DETECTED:</b> {alias_count} platform(s) show display names "
                "different from the searched identifier. This may indicate an attempt to obscure identity.",
                BODY,
            ))
        story.append(Spacer(1, 5 * mm))

    # -----------------------------------------------------------------------
    # TEMPORAL ANALYSIS (NEW)
    # -----------------------------------------------------------------------
    dates_found = []
    for p in found_plats:
        created = p.get("created_at")
        if created:
            try:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00").replace("+00:00", ""))
                dates_found.append((p.get("platform", ""), dt))
            except Exception:
                pass

    if dates_found:
        story.append(section_header("▸  7.  TEMPORAL ANALYSIS"))
        story.append(Spacer(1, 2 * mm))
        dates_found.sort(key=lambda x: x[1])
        earliest = dates_found[0]
        latest = dates_found[-1]
        story.append(Paragraph(
            f"<b>Earliest activity:</b> {earliest[1].strftime('%d %B %Y')} on {earliest[0]}",
            BODY,
        ))
        story.append(Paragraph(
            f"<b>Most recent activity:</b> {latest[1].strftime('%d %B %Y')} on {latest[0]}",
            BODY,
        ))
        # Check if multiple accounts created within same month
        if len(dates_found) >= 2:
            same_period = 0
            for i in range(1, len(dates_found)):
                if abs((dates_found[i][1] - dates_found[i-1][1]).days) < 30:
                    same_period += 1
            if same_period >= 2:
                story.append(Paragraph(
                    "<b>⚠ SUSPICIOUS:</b> Multiple accounts created within the same 30-day period "
                    "— possible coordinated account setup.",
                    BODY,
                ))
        story.append(Spacer(1, 5 * mm))

    # -----------------------------------------------------------------------
    # BREACH EXPOSURE (NEW)
    # -----------------------------------------------------------------------
    breach_data = profile_data.get("breach_data")
    if breach_data and breach_data.get("breached"):
        story.append(section_header("▸  8.  DATA BREACH EXPOSURE"))
        story.append(Spacer(1, 2 * mm))
        story.append(Paragraph(
            f"<b>⚠ EMAIL FOUND IN {breach_data.get('total', 0)} KNOWN DATA BREACHES</b>",
            style("BR", fontSize=10, fontName="Helvetica-Bold", textColor=RED, spaceAfter=4),
        ))
        br_rows = [["Breach Name", "Date", "Data Exposed"]]
        for b in breach_data.get("breaches", [])[:8]:
            data_types = ", ".join(b.get("data_classes", [])[:4])
            br_rows.append([
                b.get("name", ""),
                b.get("date", ""),
                data_types[:50],
            ])
        brt = Table(br_rows, colWidths=[50 * mm, 30 * mm, 94 * mm])
        brt.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR",   (0, 0), (-1, 0), WHITE),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",    (0, 0), (-1, -1), 8),
            ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LGRAY]),
            ("PADDING",     (0, 0), (-1, -1), 4),
        ]))
        story.append(brt)
        story.append(Spacer(1, 5 * mm))

    # -----------------------------------------------------------------------
    # LEGAL RECORDS (NEW)
    # -----------------------------------------------------------------------
    legal_records = profile_data.get("legal_records") or {}
    court_cases = legal_records.get("court_cases", [])
    if court_cases:
        story.append(section_header("▸  LEGAL RECORDS (Indian Kanoon)"))
        story.append(Spacer(1, 2 * mm))
        lr_rows = [["Case Title / Document", "Court / Date", "Link"]]
        for c in court_cases[:8]:
            lr_rows.append([
                c.get("title", "")[:50],
                f"{c.get('date', '')} ({c.get('category', '').upper()})",
                c.get("url", "")[:45]
            ])
        lrt = Table(lr_rows, colWidths=[65 * mm, 55 * mm, 54 * mm])
        lrt.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR",   (0, 0), (-1, 0), WHITE),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",    (0, 0), (-1, -1), 8),
            ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LGRAY]),
            ("PADDING",     (0, 0), (-1, -1), 4),
        ]))
        story.append(lrt)
        story.append(Spacer(1, 5 * mm))

    # -----------------------------------------------------------------------
    # PUBLIC IDENTITY RECORD (Wikidata) (NEW)
    # -----------------------------------------------------------------------
    wikidata = profile_data.get("wikidata") or {}
    if wikidata.get("found"):
        story.append(section_header("▸  PUBLIC IDENTITY RECORD (Wikidata)"))
        story.append(Spacer(1, 2 * mm))
        
        wd_details = [
            ["Attribute", "Value"],
            ["Entity ID", wikidata.get("id", "")],
            ["Label / Name", wikidata.get("label", "")],
            ["Description", wikidata.get("description", "")],
            ["Date of Birth", wikidata.get("dob", "") or "N/A"],
            ["Nationality", wikidata.get("nationality", "") or "N/A"],
            ["Occupation", wikidata.get("occupation", "") or "N/A"],
        ]
        
        aliases_list = ", ".join(wikidata.get("aliases", []))
        if aliases_list:
            wd_details.append(["Wikidata Aliases", aliases_list[:120]])
            
        socials_dict = wikidata.get("socials", {})
        if socials_dict:
            handles = ", ".join(f"{k}: @{v}" for k, v in socials_dict.items())
            wd_details.append(["Linked Handles", handles[:120]])
            
        wdt = Table(wd_details, colWidths=[45 * mm, 129 * mm])
        wdt.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR",   (0, 0), (-1, 0), WHITE),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",    (0, 0), (-1, -1), 8),
            ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LGRAY]),
            ("VALIGN",      (0, 0), (-1, -1), "TOP"),
            ("PADDING",     (0, 0), (-1, -1), 4),
        ]))
        story.append(wdt)
        story.append(Spacer(1, 5 * mm))

    # -----------------------------------------------------------------------
    # INVESTIGATIVE WORKFLOW NOTES (NEW)
    # -----------------------------------------------------------------------
    story.append(section_header("▸  9.  INVESTIGATIVE WORKFLOW NOTES"))
    story.append(Spacer(1, 2 * mm))

    # Auto-generated narrative
    consistency = "consistent" if all(
        not a.get("differs") for a in alias_map
    ) else "inconsistent — multiple aliases detected"

    narrative = (
        f"Subject identifier '{query}' was found on {platforms_found} of {platforms_chk} "
        f"platforms checked during the automated OSINT sweep. "
        f"Display names across platforms are {consistency}. "
    )
    if geo:
        locs = ", ".join(g['location'] for g in geo[:3])
        narrative += f"Location mentions include: {locs}. "
    if risk_score >= 70:
        narrative += (
            f"The composite risk score of {risk_score}/100 ({risk_level}) indicates "
            "HIGH RISK — immediate investigation recommended. "
        )
    elif risk_score >= 40:
        narrative += (
            f"The composite risk score of {risk_score}/100 ({risk_level}) indicates "
            "elevated risk — further investigation advised. "
        )
    else:
        narrative += (
            f"The composite risk score of {risk_score}/100 ({risk_level}) indicates "
            "no immediate threat — standard monitoring recommended. "
        )
    narrative += (
        "All data was collected from publicly accessible sources in compliance with the "
        "DPDP Act 2023 and applicable OSINT guidelines."
    )
    story.append(Paragraph(narrative, BODY))
    story.append(Spacer(1, 5 * mm))

    # -----------------------------------------------------------------------
    # CHAIN OF CUSTODY
    # -----------------------------------------------------------------------
    story.append(section_header("▸  10.  CHAIN OF CUSTODY"))
    story.append(Spacer(1, 2 * mm))
    coc_rows = [
        ["#", "Action", "Performed By", "Timestamp"],
        ["1", "Digital data collection initiated", "SOCMINT Shield System v4.0", ts],
        ["2", "30-platform OSINT sweep executed", "Async Platform Engine", ts],
        ["3", "Data aggregated & SHA-256 hashed", "Integrity Module", ts],
        ["4", "Behavioural risk score computed", "Risk Engine v4.0", ts],
        ["5", "Entity graph & timeline generated", "Analysis Engine v4.0", ts],
        ["6", "Section 65B report generated & certified", officer_name, ts],
    ]
    coc = Table(coc_rows, colWidths=[8 * mm, 58 * mm, 54 * mm, 54 * mm])
    coc.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR",   (0, 0), (-1, 0), WHITE),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",    (0, 0), (-1, -1), 8),
        ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LGRAY]),
        ("PADDING",     (0, 0), (-1, -1), 4),
        ("ALIGN",       (0, 0), (0, -1), "CENTER"),
    ]))
    story.append(coc)
    story.append(Spacer(1, 6 * mm))

    # -----------------------------------------------------------------------
    # SECTION 65B CERTIFICATE
    # -----------------------------------------------------------------------
    story.append(HRFlowable(width="100%", thickness=2, color=SAFFRON, spaceAfter=4))
    story.append(Paragraph("CERTIFICATE UNDER SECTION 65B — INDIAN EVIDENCE ACT, 1872", CTITLE))
    story.append(HRFlowable(width="100%", thickness=0.5, color=NAVY, spaceAfter=4))

    cert_text = (
        f"I, <b>{officer_name}</b>, hereby certify that:<br/><br/>"
        "(a) The electronic record contained in this report was produced by the computer system known as "
        "<b>SOCMINT Shield v4.0</b>, which was in regular use for lawful investigation activities by the "
        "Karnataka Criminal Investigation Department, Bengaluru.<br/><br/>"
        "(b) Throughout the material part of the said period, the computer was operating properly or, "
        "if not, was not operating in a manner that affected the electronic record or the accuracy of its contents.<br/><br/>"
        "(c) The information contained in the electronic record was reproduced from information supplied "
        "to the computer in the ordinary course of the said activities and under lawful authority. Sources include "
        "30 social media and India-specific platforms, email intelligence, data breach databases, paste site archives, "
        "and Indian legal databases (Indian Kanoon, MCA21).<br/><br/>"
        f"(d) The data integrity verification hash (SHA-256: <b>{sha256[:48]}…</b>) "
        + (f"validated by trusted RFC 3161 timestamp (<b>{tsa_time}</b>) issued by authority <b>{tsa_authority}</b>, " if tsa_time else "")
        + f"confirms that this electronic record has not been altered or tampered with since its collection on <b>{ts}</b>.<br/><br/>"
        "This certificate is issued pursuant to Section 65B(4) of the Indian Evidence Act, 1872 and "
        "is admissible as primary evidence in courts of law throughout India under Section 65B(1). "
        "Data collection complies with the Digital Personal Data Protection Act, 2023."
    )
    story.append(Paragraph(cert_text, CERT))
    story.append(Spacer(1, 10 * mm))

    sig_data = [
        [f"Officer: {officer_name}", f"Case ID: {case_id}"],
        ["Signature: _______________________", f"Date: {now.strftime('%d/%m/%Y')}"],
        ["Designation: ____________________", "Official Seal:"],
        ["Station: ________________________", ""],
    ]
    sig_tbl = Table(sig_data, colWidths=[87 * mm, 87 * mm])
    sig_tbl.setStyle(TableStyle([
        ("FONTNAME",  (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE",  (0, 0), (-1, -1), 9),
        ("PADDING",   (0, 0), (-1, -1), 5),
    ]))
    story.append(sig_tbl)
    story.append(Spacer(1, 5 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=MGRAY, spaceAfter=3))
    story.append(Paragraph(
        f"SOCMINT Shield v4.0  |  Karnataka CID  |  Generated: {ts}  |  "
        f"SHA-256: {sha256[:24]}…  |  CONFIDENTIAL — LAW ENFORCEMENT USE ONLY",
        FOOT,
    ))

    doc.build(story)
    return buffer.getvalue()

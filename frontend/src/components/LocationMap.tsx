import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapPin, Calendar, FileText } from "lucide-react";

interface LocationMapProps {
  suspect: any; // SearchResponse structure
}

function parseLocationsFromProfile(result: any) {
  const capturedAt = result.timestamp || new Date().toISOString();
  const locations: any[] = [];
  const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
    bengaluru: { lat: 12.9716, lng: 77.5946 },
    bangalore: { lat: 12.9716, lng: 77.5946 },
    pune: { lat: 18.5204, lng: 73.8567 },
    delhi: { lat: 28.6139, lng: 77.2090 },
    mumbai: { lat: 19.0760, lng: 72.8777 },
    hyderabad: { lat: 17.3850, lng: 78.4867 },
    chennai: { lat: 13.0827, lng: 80.2707 },
    kolkata: { lat: 22.5726, lng: 88.3639 },
    jaipur: { lat: 26.9124, lng: 75.7873 },
    noida: { lat: 28.5355, lng: 77.3910 },
    gurugram: { lat: 28.4595, lng: 77.0266 },
    gurgaon: { lat: 28.4595, lng: 77.0266 },
    goa: { lat: 15.2993, lng: 74.1240 },
    mysuru: { lat: 12.2958, lng: 76.6394 },
    mysore: { lat: 12.2958, lng: 76.6394 },
    ahmedabad: { lat: 23.0225, lng: 72.5714 },
    gandhinagar: { lat: 23.2156, lng: 72.6369 },
    lucknow: { lat: 26.8467, lng: 80.9462 },
    patna: { lat: 25.5941, lng: 85.1376 },
    chandigarh: { lat: 30.7333, lng: 76.7794 },
    kochi: { lat: 9.9312, lng: 76.2673 },
    trivandrum: { lat: 8.5241, lng: 76.9366 },
    bhubaneswar: { lat: 20.2961, lng: 85.8245 },
    indore: { lat: 22.7196, lng: 75.8577 },
    bhopal: { lat: 23.2599, lng: 77.4126 },
    coimbatore: { lat: 11.0168, lng: 76.9558 },
    singapore: { lat: 1.3521, lng: 103.8198 },
    "san francisco": { lat: 37.7749, lng: -122.4194 },
    london: { lat: 51.5074, lng: -0.1278 },
    "new york": { lat: 40.7128, lng: -74.0060 },
    dubai: { lat: 25.2048, lng: 55.2708 },
    tokyo: { lat: 35.6762, lng: 139.6503 },
  };

  const HACKATHON_KEYWORDS = ["ethindia", "smart india hackathon", "sih", "devfest", "hackathon", "buildathon", "codeathon"];
  const CITIES = Object.keys(CITY_COORDS);
  const DATE_MAP: Record<string, string> = {
    "dec 2025": "2025-12-05",
    "nov 2025": "2025-11-12",
    "oct 2025": "2025-10-18",
    "sep 2025": "2025-09-22",
    "jan 2026": "2026-01-15",
    "feb 2026": "2026-02-10",
    "mar 2026": "2026-03-12",
  };

  const addLocation = (city: string, date: string, source: string, text: string) => {
    const normalizedCity = city === "bangalore" ? "bengaluru" : city;
    const exists = locations.some(loc => loc.locationName.toLowerCase() === normalizedCity);
    if (exists) return;

    let hackathon = "Public event / Visit";
    for (const keyword of HACKATHON_KEYWORDS) {
      if (text.includes(keyword)) { hackathon = keyword.toUpperCase(); break; }
    }

    const cityDisplay = normalizedCity.charAt(0).toUpperCase() + normalizedCity.slice(1);
    locations.push({
      lat: CITY_COORDS[city].lat,
      lng: CITY_COORDS[city].lng,
      locationName: cityDisplay,
      date,
      source,
      details: `Profile/post data indicates presence at ${hackathon} in ${cityDisplay}`,
    });
  };

  // Extract from platform bios/locations
  (result.platforms || []).forEach((acc: any) => {
    const text = `${acc.bio || ""} ${acc.display_name || ""} ${acc.location || ""}`.toLowerCase();
    CITIES.forEach((city) => {
      if (text.includes(city)) {
        let date = acc.created_at?.slice(0, 10) || capturedAt.slice(0, 10);
        for (const [key, val] of Object.entries(DATE_MAP)) {
          if (text.includes(key)) { date = val; break; }
        }
        addLocation(city, date, acc.platform, text);
      }
    });
  });

  // Extract from platform posts
  (result.platforms || []).forEach((acc: any) => {
    (acc.posts || []).forEach((post: any) => {
      const text = `${post.title || ""} ${post.name || ""} ${post.description || ""}`.toLowerCase();
      CITIES.forEach((city) => {
        if (text.includes(city)) {
          let date = post.created_at?.slice(0, 10) || post.published_at?.slice(0, 10) || capturedAt.slice(0, 10);
          for (const [key, val] of Object.entries(DATE_MAP)) {
            if (text.includes(key)) { date = val; break; }
          }
          addLocation(city, date, acc.platform, text);
        }
      });
    });
  });

  // Extract from news articles
  (result.news_articles || []).forEach((news: any) => {
    const text = `${news.title || ""} ${news.snippet || ""}`.toLowerCase();
    CITIES.forEach((city) => {
      if (text.includes(city)) {
        let date = news.date || capturedAt.slice(0, 10);
        addLocation(city, date, "Web News", text);
      }
    });
  });

  // Extract from wikidata
  if (result.wikidata && result.wikidata.found) {
    const wd = result.wikidata;
    const text = `${wd.description || ""} ${wd.label || ""} ${wd.nationality || ""} ${wd.aliases?.join(" ") || ""}`.toLowerCase();
    CITIES.forEach((city) => {
      if (text.includes(city)) {
        addLocation(city, capturedAt.slice(0, 10), "Wikidata", text);
      }
    });
  }

  // Extract from paste results
  (result.paste_results || []).forEach((paste: any) => {
    const text = `${paste.title || ""} ${paste.snippet || ""}`.toLowerCase();
    CITIES.forEach((city) => {
      if (text.includes(city)) {
        let date = paste.date || capturedAt.slice(0, 10);
        addLocation(city, date, paste.source || "Paste site", text);
      }
    });
  });

  // Map legal cases
  const mappedLegalRecords = (result.legal_records?.court_cases || []).map((rec: any, idx: number) => ({
    id: `ik-${idx}`,
    source: rec.source || "Indian Kanoon",
    recordType: "Court Case",
    title: rec.title,
    summary: rec.snippet,
    date: rec.date || capturedAt.slice(0, 10),
    url: rec.url,
  }));

  // Cross-reference locations with legal records (crime proximity)
  locations.forEach((loc) => {
    const locDate = new Date(loc.date);
    const matchedRecord = mappedLegalRecords.find((rec: any) => {
      const recText = `${rec.title} ${rec.summary}`.toLowerCase();
      const locationMatch = recText.includes(loc.locationName.toLowerCase()) ||
        (loc.locationName === "Bengaluru" && recText.includes("bangalore"));
      if (!locationMatch) return false;
      const diffDays = Math.abs(new Date(rec.date).getTime() - locDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 15;
    });

    if (matchedRecord) {
      loc.crimeMatched = { title: matchedRecord.title, date: matchedRecord.date, recordId: matchedRecord.id, severity: "CRITICAL" };
    }
  });

  locations.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return locations;
}

export default function LocationMap({ suspect }: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const locations = parseLocationsFromProfile(suspect);

  // Section 91 Form fields
  const [officerName, setOfficerName] = useState("Inspector Prasad");
  const [badgeNumber, setBadgeNumber] = useState("CY-8902");
  const [stationName, setStationName] = useState("Cyber Crime Police Station, Bengaluru City");
  const [authorityName, setAuthorityName] = useState("IRCTC Nodal Officer / Uber India Security Office");
  const [showLetterPreview, setShowLetterPreview] = useState(false);

  // Initialize Leaflet Map inside useEffect to prevent SSR compile crash
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let map: any;

    const initMap = async () => {
      try {
        const L = await import("leaflet");
        
        // Reset old map instance if existing
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Suspect center coordinates (e.g. Bangalore)
        const centerLat = locations[0]?.lat || 12.9716;
        const centerLng = locations[0]?.lng || 77.5946;

        map = L.map(mapContainerRef.current!, {
          center: [centerLat, centerLng],
          zoom: 6,
          zoomControl: true,
          attributionControl: false
        });

        // Apply OpenStreetMap tiles. In dashboard.css we will configure a filter to turn it dark!
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        setMapLoaded(true);

        // Plot markers and build route lines
        const pathCoords: [number, number][] = [];
        
        // Leaflet custom marker icons fix
        const DefaultIcon = L.icon({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        const AlertIcon = L.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
          iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        L.Marker.prototype.options.icon = DefaultIcon;

        locations.forEach((loc) => {
          pathCoords.push([loc.lat, loc.lng]);
          
          const markerIcon = loc.crimeMatched ? AlertIcon : DefaultIcon;
          const popupHtml = `
            <div class="font-mono text-xs p-1 text-slate-200" style="min-width: 180px;">
              <span class="font-bold text-white uppercase block mb-1">${loc.locationName}</span>
              <span class="text-slate-400 block text-[9px] mb-1">Date: ${loc.date}</span>
              <span class="text-slate-300 block text-[9px] mb-1">${loc.details}</span>
              <span class="text-blue-400 block text-[9px] mb-2">Source: ${loc.source.toUpperCase()}</span>
              ${loc.crimeMatched ? `
                <div class="mt-2 pt-2 border-t border-rose-950 text-[9px] text-rose-400 font-bold">
                  ⚠️ Crime scene proximity:
                  <span class="block text-rose-300 font-normal mt-0.5">${loc.crimeMatched.title}</span>
                </div>
              ` : ''}
            </div>
          `;

          L.marker([loc.lat, loc.lng], { icon: markerIcon })
            .addTo(map)
            .bindPopup(popupHtml);
        });

        // Draw connecting polyline representing movement route
        if (pathCoords.length > 1) {
          L.polyline(pathCoords, {
            color: "#3b82f6",
            weight: 3,
            dashArray: "6, 8",
            opacity: 0.75
          }).addTo(map);

          // Fit bounds
          map.fitBounds(L.polyline(pathCoords).getBounds(), { padding: [40, 40] });
        }

      } catch (err) {
        console.error("Leaflet initialization failed:", err);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [suspect, locations]);

  // Section 91 CrPC Letter template rendering
  const handlePrintLetter = () => {
    const printContent = document.getElementById("section-91-letter-print");
    if (!printContent) return;
    
    const win = window.open("", "_blank");
    if (!win) return;
    
    win.document.write(`
      <html>
        <head>
          <title>Section 91 CrPC Requisition Letter</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.5; color: #111; }
            .header { text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 25px; text-transform: uppercase; }
            .reference { margin-top: 15px; margin-bottom: 15px; display: flex; justify-content: space-between; }
            .content { text-align: justify; margin-bottom: 25px; font-size: 14px; }
            .signature { margin-top: 50px; float: right; width: 250px; font-size: 14px; }
            .legal-tag { font-size: 10px; color: #777; text-align: center; margin-top: 100px; border-top: 1px solid #ccc; padding-top: 10px; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "24px" }} className="leaflet-map-grid">
      
      {/* Left Column: Map & Geotag Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Map Header */}
        <div className="glass-card" style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <MapPin style={{ color: "#3b82f6" }} className="w-5 h-5" />
            <h4 style={{ margin: 0, color: "#fff", letterSpacing: "2px" }} className="mono">
              LOCATION GEOTAG TIMELINE & ROUTING
            </h4>
          </div>
          <span style={{ fontSize: "10px", color: "#64748b" }} className="mono">Dynamic OSINT coordinates mapping</span>
        </div>

        {/* Map Node element */}
        <div style={{ width: "100%", height: "380px", borderRadius: "16px", border: "1px solid rgba(99,202,183,0.15)", background: "#020c1b", overflow: "hidden", position: "relative" }}>
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%", zIndex: 10 }} />
          {!mapLoaded && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(2,12,27,0.85)", zIndex: 20, color: "#64748b", fontSize: "12px" }} className="mono">
              Initializing spatial mapping data...
            </div>
          )}
        </div>

        {/* Location Trace Timeline list */}
        <div className="glass-card" style={{ padding: "20px" }}>
          <h5 style={{ margin: "0 0 16px 0", color: "#fff", letterSpacing: "1px" }} className="mono">
            CHRONOLOGICAL GEOTAG TRACE
          </h5>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {locations.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#64748b", textAlign: "center" }} className="mono">
                No location geotags detected in public bios or posts.
              </div>
            ) : (
              locations.map((loc, idx) => {
                const isAlert = !!loc.crimeMatched;
                return (
                  <div 
                    key={idx}
                    style={{
                      display: "flex",
                      gap: "16px",
                      padding: "16px",
                      background: isAlert ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isAlert ? "rgba(239,68,68,0.2)" : "rgba(99,202,183,0.15)"}`,
                      borderRadius: "12px"
                    }}
                  >
                    <div style={{
                      padding: "8px",
                      borderRadius: "8px",
                      background: isAlert ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)",
                      color: isAlert ? "#ef4444" : "#3b82f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div style={{ flex: 1, fontSize: "12px" }} className="mono">
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: "bold", color: "#fff", fontSize: "13px" }}>{loc.locationName}</span>
                          {isAlert && (
                            <span style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)", padding: "2px 8px", borderRadius: "10px", fontSize: "8px", fontWeight: "bold" }}>
                              Crime Proximity Correlation
                            </span>
                          )}
                        </div>
                        <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Calendar className="w-3.5 h-3.5" /> {loc.date}
                        </span>
                      </div>
                      <p style={{ color: "#94a3b8", margin: "0 0 8px 0" }}>{loc.details}</p>
                      {isAlert && (
                        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", padding: "10px", borderRadius: "8px", marginBottom: "8px", color: "#fca5a5" }}>
                          <span style={{ fontWeight: "bold", display: "block", marginBottom: "4px" }}>⚠️ Nearby Crime Scene Match:</span>
                          {loc.crimeMatched?.title} (FIR Date: {loc.crimeMatched?.date})
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "16px", color: "#64748b", fontSize: "10px" }}>
                        <span>Source: <span style={{ color: "#63cab7" }}>{loc.source.toUpperCase()}</span></span>
                        <span>Coordinates: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Right Column: Private Records Request Generator */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "between", height: "100%", minHeight: "360px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <FileText style={{ color: "#3b82f6" }} className="w-5 h-5" />
              <h4 style={{ margin: 0, color: "#fff", letterSpacing: "2.5px" }} className="mono">
                SECTION 91 CrPC REQUEST
              </h4>
            </div>

            <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.6", margin: "0 0 24px 0" }} className="mono">
              Private data manifests (flight passengers, train reservations, FASTag tolls) are not open-source. Use this module to auto-generate the statutory CrPC Section 91 data request letter to served organizations.
            </p>

            {/* Config fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} className="mono">
              <div>
                <label style={{ fontSize: "10px", color: "#64748b", display: "block", marginBottom: "6px" }}>Served Service Authority</label>
                <input
                  type="text"
                  value={authorityName}
                  onChange={(e) => setAuthorityName(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(99,202,183,0.2)", borderRadius: "8px", color: "#e2e8f0", fontSize: "12px", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "10px", color: "#64748b", display: "block", marginBottom: "6px" }}>Requesting Officer Name</label>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(99,202,183,0.2)", borderRadius: "8px", color: "#e2e8f0", fontSize: "12px", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "10px", color: "#64748b", display: "block", marginBottom: "6px" }}>Badge & Registry ID</label>
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(99,202,183,0.2)", borderRadius: "8px", color: "#e2e8f0", fontSize: "12px", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "10px", color: "#64748b", display: "block", marginBottom: "6px" }}>Assigned Station Cell</label>
                <input
                  type="text"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(99,202,183,0.2)", borderRadius: "8px", color: "#e2e8f0", fontSize: "12px", outline: "none" }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(99,202,183,0.12)" }}>
            <button
              onClick={() => setShowLetterPreview(true)}
              style={{
                width: "100%",
                padding: "12px",
                background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                color: "#020c1b",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold",
                border: "none",
                cursor: "pointer"
              }}
              className="mono"
            >
              Draft Statutory Requisition
            </button>
          </div>

        </div>
      </div>

      {/* Requisition modal overlay */}
      {showLetterPreview && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10100, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ width: "100%", maxWidth: "680px", background: "#fff", color: "#111", padding: "32px", borderRadius: "16px", display: "flex", flexDirection: "column", height: "85vh", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
            
            {/* Modal Controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px", fontSize: "12px", color: "#64748b" }} className="mono">
              <span>LEGAL DEPARTMENT DRAFT REQUISITION</span>
              <div style={{ display: "flex", gap: "12px" }}>
                <button 
                  onClick={handlePrintLetter}
                  style={{ padding: "6px 14px", background: "#2563eb", color: "#fff", borderRadius: "8px", fontWeight: "bold", border: "none", cursor: "pointer" }}
                >
                  Print / PDF
                </button>
                <button 
                  onClick={() => setShowLetterPreview(false)}
                  style={{ padding: "6px 14px", background: "#f1f5f9", color: "#334155", borderRadius: "8px", fontWeight: "bold", border: "none", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Letter content for rendering */}
            <div style={{ flex: 1, overflowY: "auto", paddingRight: "8px" }} id="section-91-letter-print">
              <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "16px", marginBottom: "25px", textTransform: "uppercase" }}>
                OFFICE OF THE CYBER CRIME INVESTIGATION CELL<br />
                {stationName}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "20px" }}>
                <div><strong>Ref No:</strong> SEC91/KA/{suspect.caseReference ? suspect.caseReference.replace("SHIELD-2026-", "") : "CID-SWEEP"}</div>
                <div><strong>Date:</strong> {new Date().toLocaleDateString("en-IN")}</div>
              </div>

              <div style={{ fontSize: "13px", marginBottom: "20px" }}>
                <strong>TO,</strong><br />
                The Nodal Officer / Authorized Legal Custodian,<br />
                {authorityName}<br />
                India Office.
              </div>

              <div style={{ fontSize: "13px", textAlign: "justify", lineHeight: "1.6", marginBottom: "30px" }}>
                <p style={{ fontWeight: "bold", textDecoration: "underline", marginBottom: "15px" }}>
                  SUBJECT: REQUISITION UNDER SECTION 91 OF CODE OF CRIMINAL PROCEDURE, 1973 (CrPC) FOR PRODUCTION OF TRAVEL MANIFESTS AND TRANSACTION LOGS OF SUSPECT {(suspect.query || "unknown").toUpperCase()}.
                </p>
                <p>
                  This office is currently investigating a cybercrime register reference case involving financial irregularities, cheating, and money laundering under <strong>FIR case reference {suspect.caseReference || "CID-ACTIVE"}</strong>.
                </p>
                <p>
                  During active Open Source Intelligence (OSINT) sweeps, digital footprints verified that the suspect (using handle <strong>{suspect.query || "unknown"}</strong>) traveled across state boundaries. For the purpose of establishing a verified travel itinerary, you are hereby requested to provide:
                </p>
                <ol>
                  <li>Complete travel listings, ticket reservations, passenger manifest registers, and check-in times associated with the suspect's known phone number and email address.</li>
                  <li>FASTag toll transactions log registry and geolocation hits for vehicles registered or linked to suspect profiles.</li>
                  <li>IP addresses and browser telemetry logs recorded during the transaction window from May 1, 2026 to June 8, 2026.</li>
                </ol>
                <p>
                  Please treat this as urgent. The requested information may be handed over to the bearer of this letter or transmitted securely via government encrypted channels within 48 hours of receipt.
                </p>
              </div>

              <div style={{ float: "right", textAlign: "left", fontSize: "13px", marginTop: "30px", width: "250px" }}>
                Yours faithfully,<br /><br /><br /><br />
                ___________________________<br />
                <strong>{officerName}</strong><br />
                Badge ID: {badgeNumber}<br />
                {stationName}
              </div>

              <div style={{ fontSize: "10px", color: "#888", textAlign: "center", marginTop: "150px", borderTop: "1px solid #ddd", paddingTop: "10px", clear: "both" }}>
                CONFIDENTIALITY WARNING: The contents of this requisition letter are legally protected under cybersecurity guidelines. Unauthorized exposure is punishable under the IT Act 2000.
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

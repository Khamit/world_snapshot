import * as d3 from "d3";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import { useEffect, useRef, useState } from "react";
import * as topojson from "topojson-client";
import { countriesData, CountryData } from "../data/countries";
countries.registerLocale(en);

interface Props {
  onSelect: (country: CountryData | null) => void;
}

interface DeathStatistics {
  global: {
    daily: number;
    hourly: number;
    minute: number;
    second: number;
  };
  countries: Record<string, {
    name: string;
    deathsPerDay: number;
    deathsPerHour: number;
    deathsPerYear: number;
  }>;
  lastUpdated: string;
}

export default function WorldMap({ onSelect }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [deathStats, setDeathStats] = useState<DeathStatistics | null>(null);

  // Загружаем статистику смертей
  useEffect(() => {
    fetch('/api/deaths')
      .then(res => res.json())
      .then(data => setDeathStats(data))
      .catch(err => console.error('Failed to load death stats:', err));
  }, []);

  useEffect(() => {
    const width = 960;
    const height = 500;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const projection = d3
      .geoMercator()
      .scale(130)
      .translate([width / 2, height / 1.9]);

    const geoPath = d3.geoPath().projection(projection);

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip-card")
      .style("opacity", 0);
    
    tooltipRef.current = tooltip;

    fetch("/api/world-atlas/countries-50m.json")
      .then((res) => res.json())
      .then((worldData: any) => {
        const features = (topojson.feature(worldData, worldData.objects.countries) as any).features;

        svg
          .selectAll("path")
          .data(features)
          .enter()
          .append("path")
          .attr("d", (d: any) => geoPath(d) || "")
          .attr("fill", (d: any) => {
          const iso2 = countries.numericToAlpha2(String(d.id));
          const country = iso2 ? countriesData[iso2] : undefined;
            return country ? country.color : "#334155";
          })
          .attr("stroke", "#1e293b")
          .attr("stroke-width", 0.6)
          .attr("class", "country-path")
          .on("mouseover", function(this: any, event: MouseEvent, d: any) {
          const iso2 = countries.numericToAlpha2(String(d.id));
          const country = iso2 ? countriesData[iso2] : undefined;
            const eventCount = country?.events?.length || 0;
            const deathInfo = deathStats?.countries?.[d.id];
            
            let deathHtml = '';
            if (deathInfo) {
              deathHtml = `
                <div class="mt-2 pt-2 border-t border-slate-600 text-[11px]">
                  <div class="text-red-300"><i class="fas fa-skull mr-1"></i> mortality:</div>
                  <div><i class="far fa-calendar-alt mr-1"></i> per day: ${deathInfo.deathsPerDay.toLocaleString()}</div>
                  <div><i class="fas fa-clock mr-1"></i> в час: ${deathInfo.deathsPerHour.toLocaleString()}</div>
                  <div><i class="fas fa-chart-line mr-1"></i> per year: ${deathInfo.deathsPerYear.toLocaleString()}</div>
                </div>
              `;
            }
            
            tooltip
              .style("opacity", 1)
              .html(
                country
                  ? `<strong>${country.name}</strong><br/>
                    <span class="text-xs">${country.summary.substring(0, 80)}...</span><br/>
                    <span class="text-xs text-cyan-300"><i class="fas fa-newspaper mr-1"></i> ${eventCount} events</span>
                    ${deathHtml}`
                  : `<strong>${d.properties?.name || "Region"}</strong><br/>no data on tension`
              )
              .style("left", event.pageX + 12 + "px")
              .style("top", event.pageY - 40 + "px");
          })
          .on("mousemove", (event: MouseEvent) => {
            tooltip
              .style("left", event.pageX + 12 + "px")
              .style("top", event.pageY - 40 + "px");
          })
          .on("mouseout", () => {
            tooltip.style("opacity", 0);
          })
        .on("click", (_: MouseEvent, d: any) => {
          const iso2 = countries.numericToAlpha2(String(d.id));
          const country = iso2 ? countriesData[iso2] : null;
          onSelect(country || null);
        });

        setMapLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load map data:", err);
        svg
          .append("text")
          .attr("x", width / 2)
          .attr("y", height / 2)
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .text("Error loading map");
      });

    return () => {
      if (tooltipRef.current) {
        tooltipRef.current.remove();
      }
    };
  }, [onSelect, deathStats]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 960 500"
      className={`w-full h-full bg-slate-900 rounded-xl cursor-pointer transition-opacity ${mapLoaded ? 'opacity-100' : 'opacity-50'}`}
    />
  );
}
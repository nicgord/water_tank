import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// Version 20.0 - Visual Overhaul
console.info("%c WATER-TANK-CARD %c v20.0.0 ", "color: white; background: #0ea5e9; font-weight: 700;", "color: #0ea5e9; background: white; font-weight: 700;");

class WaterTankCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
    };
  }

  static getStubConfig() {
    return {
      entity: "sensor.water_tank_volume",
      temp_entity: "sensor.water_tank_temperature",
      rain_entity: "sensor.rain_total_today",
      inflow_entity: "sensor.rain_rate",
      outflow_entity: "binary_sensor.water_usage",
      roof_size: 100,
      us_units: false,
      warning_threshold: 20,
      low_level_threshold: 10,
      name: "Water Tank",
    };
  }

  static async getConfigElement() {
    await import("./water-tank-card-editor.js");
    return document.createElement("water-tank-card-editor");
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define a volume entity");
    }
    this.config = config;
  }

  render() {
    if (!this.hass || !this.config) {
      return html``;
    }

    const stateObj = this.hass.states[this.config.entity];
    const tempObj = this.hass.states[this.config.temp_entity];
    const rainTotalObj = this.hass.states[this.config.rain_entity];
    const inflowRateObj = this.hass.states[this.config.inflow_entity];
    const outflowObj = this.hass.states[this.config.outflow_entity];

    // --- OUTFLOW LOGIC ---
    let isOutflow = false;
    if (outflowObj) {
      const s = String(outflowObj.state).toLowerCase().trim();
      if (s === "on" || s === "true" || s === "active" || s === "open" || parseFloat(s) > 0) {
        isOutflow = true;
      }
    }

    // --- VOLUME LOGIC ---
    let percentage = 0;
    if (stateObj && !isNaN(parseFloat(stateObj.state))) {
      let volumeRaw = parseFloat(stateObj.state);
      percentage = volumeRaw;
      if (stateObj.attributes.unit_of_measurement !== "%" && this.config.max_volume) {
        percentage = (volumeRaw / this.config.max_volume) * 100;
      }
      percentage = Math.min(100, Math.max(0, percentage));
    }

    // --- UNITS ---
    const isUS = this.config.us_units;

    // --- TEMP LOGIC ---
    let tempC = null;
    let displayTemp = null;
    let displayTempUnit = isUS ? "°F" : "°C";

    if (tempObj && tempObj.state !== "unavailable" && tempObj.state !== "unknown") {
      const rawTemp = parseFloat(tempObj.state);
      if (!isNaN(rawTemp)) {
        const inputUnit = tempObj.attributes.unit_of_measurement || "°C";
        if (inputUnit === "°F") {
          tempC = (rawTemp - 32) * 5 / 9;
          displayTemp = isUS ? rawTemp : tempC;
        } else {
          tempC = rawTemp;
          displayTemp = isUS ? (rawTemp * 9 / 5) + 32 : rawTemp;
        }
      }
    }

    // --- INFLOW LOGIC ---
    let inflowRate = 0;
    if (inflowRateObj && !isNaN(parseFloat(inflowRateObj.state))) {
      inflowRate = parseFloat(inflowRateObj.state);
    }

    // --- RAIN TOTAL ---
    const rainTotalRaw = (rainTotalObj && !isNaN(parseFloat(rainTotalObj.state))) ? parseFloat(rainTotalObj.state) : 0;
    const roofSize = this.config.roof_size || 100;
    let displayRainTotal = isUS ? (rainTotalRaw * roofSize * 0.264172) : (rainTotalRaw * roofSize);
    let displayRainUnit = isUS ? "gal" : "L";

    // --- VISUALS ---
    const tempThreshold = this.config.warning_threshold || 20;
    const lowLevelThreshold = this.config.low_level_threshold ?? 10;

    const isTempWarning = tempC !== null && tempC > tempThreshold;
    const isLowWarning = percentage <= lowLevelThreshold;

    // Water color with temperature gradient
    let waterColorTop = "#38bdf8";
    let waterColorBottom = "#0369a1";
    if (tempC !== null) {
      if (isTempWarning) {
        waterColorTop = "#fb923c";
        waterColorBottom = "#c2410c";
      } else {
        const ratio = Math.max(0, Math.min(1, tempC / tempThreshold));
        const rT = Math.round(56 + (251 - 56) * ratio);
        const gT = Math.round(189 + (146 - 189) * ratio);
        const bT = Math.round(248 + (60 - 248) * ratio);
        const rB = Math.round(3 + (194 - 3) * ratio);
        const gB = Math.round(105 + (65 - 105) * ratio);
        const bB = Math.round(161 + (12 - 161) * ratio);
        waterColorTop = `rgb(${rT}, ${gT}, ${bT})`;
        waterColorBottom = `rgb(${rB}, ${gB}, ${bB})`;
      }
    }

    const waterPercent = percentage;

    /* GEOMETRY */
    const tankX = 50;
    const tankY = 40;
    const tankW = 100;
    const tankH = 120;
    const tankR = 8;

    // Water rect inside tank
    const waterTop = tankY + tankH * (1 - waterPercent / 100);
    const waterHeight = tankH * waterPercent / 100;
    const waterInset = 3;

    // Wave path at water surface
    const waveY = waterTop;
    const waveLeft = tankX + waterInset;
    const waveRight = tankX + tankW - waterInset;
    const waveW = waveRight - waveLeft;

    // Inflow pipe path: top-left, goes right then down into tank
    // Pipe enters from left, bends down into top of tank
    const pipeInX1 = 10;
    const pipeInY = 22;
    const pipeInX2 = tankX + 18;
    const pipeInBendY = tankY;

    // Outflow pipe path: right side of tank, goes right then down
    const pipeOutX1 = tankX + tankW;
    const pipeOutY = tankY + tankH - 20;
    const pipeOutX2 = 185;
    const pipeOutBendY = tankY + tankH + 25;

    return html`
            <ha-card>
                <div class="card-content">
                    <div class="header">
                        <svg class="header-icon" viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M12,2C6.5,2,2,6.5,2,12s4.5,10,10,10s10-4.5,10-10S17.5,2,12,2z M12,20c-4.4,0-8-3.6-8-8s3.6-8,8-8s8,3.6,8,8 S16.4,20,12,20z M12,6l-4,8h8L12,6z"/>
                        </svg>
                        <span>${this.config.name || "Water Tank"}</span>
                    </div>
                    
                    <div class="tank-container">
                        <svg class="tank-svg" viewBox="0 0 200 195" style="overflow: visible;">
                            <defs>
                                <!-- Water gradient -->
                                <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style="stop-color:${waterColorTop};stop-opacity:0.85"/>
                                    <stop offset="100%" style="stop-color:${waterColorBottom};stop-opacity:1"/>
                                </linearGradient>

                                <!-- Water shimmer overlay -->
                                <linearGradient id="waterShimmer" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:white;stop-opacity:0.15"/>
                                    <stop offset="40%" style="stop-color:white;stop-opacity:0"/>
                                    <stop offset="60%" style="stop-color:white;stop-opacity:0.08"/>
                                    <stop offset="100%" style="stop-color:white;stop-opacity:0"/>
                                </linearGradient>

                                <!-- Tank body gradient (subtle 3D) -->
                                <linearGradient id="tankBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" style="stop-color:var(--primary-text-color);stop-opacity:0.06"/>
                                    <stop offset="30%" style="stop-color:var(--primary-text-color);stop-opacity:0.03"/>
                                    <stop offset="70%" style="stop-color:var(--primary-text-color);stop-opacity:0.03"/>
                                    <stop offset="100%" style="stop-color:var(--primary-text-color);stop-opacity:0.08"/>
                                </linearGradient>

                                <!-- Pipe metallic gradient -->
                                <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style="stop-color:#94a3b8;stop-opacity:1"/>
                                    <stop offset="40%" style="stop-color:#cbd5e1;stop-opacity:1"/>
                                    <stop offset="60%" style="stop-color:#94a3b8;stop-opacity:1"/>
                                    <stop offset="100%" style="stop-color:#64748b;stop-opacity:1"/>
                                </linearGradient>

                                <!-- Pipe metallic gradient horizontal -->
                                <linearGradient id="pipeGradH" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style="stop-color:#94a3b8;stop-opacity:1"/>
                                    <stop offset="30%" style="stop-color:#e2e8f0;stop-opacity:1"/>
                                    <stop offset="70%" style="stop-color:#94a3b8;stop-opacity:1"/>
                                    <stop offset="100%" style="stop-color:#64748b;stop-opacity:1"/>
                                </linearGradient>

                                <!-- Tank shadow filter -->
                                <filter id="tankShadow" x="-10%" y="-10%" width="120%" height="130%">
                                    <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.15)"/>
                                </filter>

                                <!-- Glow for water surface -->
                                <filter id="surfaceGlow" x="-20%" y="-200%" width="140%" height="500%">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
                                    <feMerge>
                                        <feMergeNode in="blur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>

                                <!-- Clip path for water inside tank -->
                                <clipPath id="tankClip">
                                    <rect x="${tankX + waterInset}" y="${tankY + waterInset}" width="${tankW - waterInset * 2}" height="${tankH - waterInset * 2}" rx="${tankR - 2}"/>
                                </clipPath>
                            </defs>

                            <!-- ====== INFLOW PIPE ====== -->
                            <!-- Horizontal segment -->
                            <rect x="${pipeInX1}" y="${pipeInY - 5}" width="${pipeInX2 - pipeInX1}" height="10" rx="2" fill="url(#pipeGradH)"/>
                            <!-- Vertical segment -->
                            <rect x="${pipeInX2 - 5}" y="${pipeInY}" width="10" height="${pipeInBendY - pipeInY + 5}" rx="2" fill="url(#pipeGrad)"/>
                            <!-- Elbow joint -->
                            <circle cx="${pipeInX2}" cy="${pipeInY}" r="7" fill="url(#pipeGradH)" stroke="#64748b" stroke-width="1"/>
                            <circle cx="${pipeInX2}" cy="${pipeInY}" r="3.5" fill="#94a3b8"/>
                            <!-- Pipe cap at entry -->
                            <rect x="${pipeInX1 - 2}" y="${pipeInY - 7}" width="6" height="14" rx="2" fill="#64748b"/>

                            <!-- ====== OUTFLOW PIPE ====== -->
                            <!-- Horizontal segment -->
                            <rect x="${pipeOutX1 - 5}" y="${pipeOutY - 5}" width="${pipeOutX2 - pipeOutX1 + 10}" height="10" rx="2" fill="url(#pipeGradH)"/>
                            <!-- Vertical segment -->
                            <rect x="${pipeOutX2 - 5}" y="${pipeOutY}" width="10" height="${pipeOutBendY - pipeOutY}" rx="2" fill="url(#pipeGrad)"/>
                            <!-- Elbow joint -->
                            <circle cx="${pipeOutX2}" cy="${pipeOutY}" r="7" fill="url(#pipeGradH)" stroke="#64748b" stroke-width="1"/>
                            <circle cx="${pipeOutX2}" cy="${pipeOutY}" r="3.5" fill="#94a3b8"/>
                            <!-- Nozzle at bottom -->
                            <path d="M${pipeOutX2 - 6} ${pipeOutBendY} L${pipeOutX2 - 4} ${pipeOutBendY + 5} L${pipeOutX2 + 4} ${pipeOutBendY + 5} L${pipeOutX2 + 6} ${pipeOutBendY} Z" fill="#64748b"/>

                            <!-- ====== TANK BODY ====== -->
                            <g filter="url(#tankShadow)">
                                <!-- Tank fill -->
                                <rect x="${tankX}" y="${tankY}" width="${tankW}" height="${tankH}" rx="${tankR}" fill="url(#tankBodyGrad)"/>

                                <!-- Water body clipped to tank interior -->
                                <g clip-path="url(#tankClip)">
                                    <!-- Main water fill -->
                                    <rect x="${tankX + waterInset}" y="${waterTop}" width="${tankW - waterInset * 2}" height="${waterHeight + waterInset}" fill="url(#waterGrad)"/>

                                    <!-- Shimmer overlay -->
                                    <rect x="${tankX + waterInset}" y="${waterTop}" width="${tankW - waterInset * 2}" height="${waterHeight + waterInset}" fill="url(#waterShimmer)"/>

                                    <!-- Animated wave on surface -->
                                    ${waterPercent > 1 ? html`
                                    <path class="wave wave1" d="
                                        M ${waveLeft - 5} ${waveY}
                                        Q ${waveLeft + waveW * 0.15} ${waveY - 4}, ${waveLeft + waveW * 0.3} ${waveY}
                                        Q ${waveLeft + waveW * 0.45} ${waveY + 4}, ${waveLeft + waveW * 0.6} ${waveY}
                                        Q ${waveLeft + waveW * 0.75} ${waveY - 4}, ${waveLeft + waveW * 0.9} ${waveY}
                                        Q ${waveLeft + waveW * 0.95} ${waveY + 2}, ${waveRight + 5} ${waveY}
                                        L ${waveRight + 5} ${waveY + 8}
                                        L ${waveLeft - 5} ${waveY + 8} Z
                                    " fill="${waterColorTop}" opacity="0.6"/>
                                    <path class="wave wave2" d="
                                        M ${waveLeft - 5} ${waveY + 1}
                                        Q ${waveLeft + waveW * 0.2} ${waveY + 5}, ${waveLeft + waveW * 0.4} ${waveY + 1}
                                        Q ${waveLeft + waveW * 0.55} ${waveY - 3}, ${waveLeft + waveW * 0.7} ${waveY + 1}
                                        Q ${waveLeft + waveW * 0.85} ${waveY + 5}, ${waveRight + 5} ${waveY + 1}
                                        L ${waveRight + 5} ${waveY + 8}
                                        L ${waveLeft - 5} ${waveY + 8} Z
                                    " fill="${waterColorTop}" opacity="0.35"/>
                                    ` : ""}

                                    <!-- Bubbles -->
                                    ${waterPercent > 5 ? html`
                                    <circle class="bubble b1" cx="${tankX + 25}" cy="${tankY + tankH - 15}" r="2" fill="white" opacity="0.3"/>
                                    <circle class="bubble b2" cx="${tankX + 55}" cy="${tankY + tankH - 10}" r="1.5" fill="white" opacity="0.25"/>
                                    <circle class="bubble b3" cx="${tankX + 75}" cy="${tankY + tankH - 20}" r="2.5" fill="white" opacity="0.2"/>
                                    <circle class="bubble b4" cx="${tankX + 40}" cy="${tankY + tankH - 8}" r="1.8" fill="white" opacity="0.3"/>
                                    ` : ""}
                                </g>

                                <!-- Tank stroke (border) -->
                                <rect x="${tankX}" y="${tankY}" width="${tankW}" height="${tankH}" rx="${tankR}" fill="none" stroke="var(--primary-text-color)" stroke-width="2" stroke-opacity="0.6"/>

                                <!-- Tank rim highlight (top) -->
                                <line x1="${tankX + tankR}" y1="${tankY + 1}" x2="${tankX + tankW - tankR}" y2="${tankY + 1}" stroke="white" stroke-width="1" stroke-opacity="0.3" stroke-linecap="round"/>
                            </g>

                            <!-- ====== INFLOW ANIMATION ====== -->
                            ${inflowRate > 0 ? html`
                            <!-- Flowing stream from pipe into tank -->
                            <line class="flow-stream inflow-stream"
                                x1="${pipeInX2}" y1="${pipeInBendY + 3}"
                                x2="${pipeInX2}" y2="${Math.min(waterTop, tankY + tankH - 5)}"
                                stroke="${waterColorTop}" stroke-width="4" stroke-linecap="round"
                                stroke-dasharray="6 8" opacity="0.8"/>

                            <!-- Splash droplets at water surface -->
                            <circle class="splash s1" cx="${pipeInX2 - 6}" cy="${waterTop}" r="1.8" fill="${waterColorTop}" opacity="0.6"/>
                            <circle class="splash s2" cx="${pipeInX2 + 5}" cy="${waterTop - 2}" r="1.2" fill="${waterColorTop}" opacity="0.5"/>
                            <circle class="splash s3" cx="${pipeInX2 - 3}" cy="${waterTop - 4}" r="1" fill="${waterColorTop}" opacity="0.4"/>
                            <circle class="splash s4" cx="${pipeInX2 + 8}" cy="${waterTop - 1}" r="1.5" fill="${waterColorTop}" opacity="0.5"/>
                            ` : ""}

                            <!-- ====== OUTFLOW ANIMATION ====== -->
                            ${isOutflow ? html`
                            <!-- Flowing along horizontal pipe -->
                            <line class="flow-stream outflow-stream-h"
                                x1="${pipeOutX1}" y1="${pipeOutY}"
                                x2="${pipeOutX2}" y2="${pipeOutY}"
                                stroke="${waterColorTop}" stroke-width="4" stroke-linecap="round"
                                stroke-dasharray="6 8" opacity="0.7"/>

                            <!-- Flowing down vertical pipe -->
                            <line class="flow-stream outflow-stream-v"
                                x1="${pipeOutX2}" y1="${pipeOutY + 5}"
                                x2="${pipeOutX2}" y2="${pipeOutBendY + 3}"
                                stroke="${waterColorTop}" stroke-width="4" stroke-linecap="round"
                                stroke-dasharray="6 8" opacity="0.7"/>

                            <!-- Drips from nozzle -->
                            <circle class="drip d1" cx="${pipeOutX2}" cy="${pipeOutBendY + 8}" r="2" fill="${waterColorTop}" opacity="0.7"/>
                            <circle class="drip d2" cx="${pipeOutX2}" cy="${pipeOutBendY + 16}" r="1.5" fill="${waterColorTop}" opacity="0.5"/>
                            ` : ""}

                            <!-- ====== LEVEL MARKERS ====== -->
                            ${[25, 50, 75].map(lvl => html`
                                <line x1="${tankX + 3}" y1="${tankY + tankH * (1 - lvl / 100)}" x2="${tankX + 10}" y2="${tankY + tankH * (1 - lvl / 100)}" stroke="var(--primary-text-color)" stroke-width="0.5" stroke-opacity="0.3"/>
                            `)}
                        </svg>

                        <!-- OVERLAYS -->
                        <div class="tank-overlay" style="top: ${40 + 120 * (1 - waterPercent / 100) / 2 + 120 * waterPercent / 100 / 2}px;">
                            <div class="percentage ${isLowWarning ? 'low' : ''}">${percentage.toFixed(0)}<span class="pct">%</span></div>
                            ${displayTemp !== null ? html`
                                <div class="temperature ${isTempWarning ? 'warn' : ''}">${displayTemp.toFixed(1)}${displayTempUnit}</div>
                            ` : ""}
                        </div>

                        <!-- Warnings -->
                        ${isTempWarning ? html`
                            <div class="warning-icon temp-warning">
                                <svg viewBox="0 0 40 40" width="32" height="32">
                                    <path d="M20 5 L5 35 L35 35 Z" fill="#ef4444" stroke="white" stroke-width="2" rx="2"/>
                                    <text x="20" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="white">!</text>
                                </svg>
                            </div>
                        ` : ""}

                        ${isLowWarning ? html`
                            <div class="warning-icon low-warning">
                                <svg viewBox="0 0 40 40" width="32" height="32">
                                    <path d="M20 8 Q 30 20 30 26 A 10 10 0 1 1 10 26 Q 10 20 20 8 Z" fill="#3b82f6" stroke="white" stroke-width="1.5"/>
                                    <line x1="8" y1="35" x2="32" y2="10" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>
                                </svg>
                            </div>
                        ` : ""}
                    </div>

                    <div class="info-bar">
                        <div class="stat">
                            <div class="stat-icon">
                                <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12,2L4.5,20.3L5.2,21L12,18l6.8,3l0.7-0.7L12,2z"/></svg>
                            </div>
                            <div class="stat-data">
                                <span class="label">Today's Inflow</span>
                                <span class="value">${displayRainTotal.toFixed(1)} ${displayRainUnit}</span>
                            </div>
                        </div>
                        ${inflowRate > 0 ? html`
                        <div class="stat">
                            <div class="stat-icon active">
                                <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>
                            </div>
                            <div class="stat-data">
                                <span class="label">Rain Rate</span>
                                <span class="value">${inflowRate.toFixed(1)} mm/h</span>
                            </div>
                        </div>
                        ` : ""}
                        ${isOutflow ? html`
                        <div class="stat">
                            <div class="stat-icon outflow-active">
                                <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>
                            </div>
                            <div class="stat-data">
                                <span class="label">Outflow</span>
                                <span class="value">Active</span>
                            </div>
                        </div>
                        ` : ""}
                    </div>
                </div>
            </ha-card>
        `;
  }

  static getConfigurationElement() {
    return document.createElement("water-tank-card-editor");
  }

  static get styles() {
    return css`
            ha-card {
                padding: 16px;
                background: var(--ha-card-background, var(--card-background-color, rgba(255,255,255,0.05)));
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 16px;
            }
            .card-content {
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .header {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 1.15em;
                font-weight: 600;
                letter-spacing: 0.02em;
                color: var(--primary-text-color);
                margin-bottom: 4px;
            }
            .header-icon {
                color: var(--primary-color, #0ea5e9);
                flex-shrink: 0;
            }
            
            .tank-container {
                position: relative;
                width: 220px;
                height: 200px;
                margin-top: 8px;
                display: flex;
                justify-content: center;
            }
            
            .tank-svg {
                width: 100%;
                height: 100%;
            }

            /* ====== WAVE ANIMATION ====== */
            .wave {
                animation: waveShift 3s ease-in-out infinite alternate;
                transform-origin: center;
            }
            .wave.wave2 {
                animation: waveShift2 2.5s ease-in-out infinite alternate;
            }

            @keyframes waveShift {
                0%   { transform: translateX(-3px); }
                100% { transform: translateX(3px); }
            }
            @keyframes waveShift2 {
                0%   { transform: translateX(2px); }
                100% { transform: translateX(-2px); }
            }

            /* ====== BUBBLE ANIMATION ====== */
            .bubble {
                animation: rise 4s ease-in infinite;
            }
            .bubble.b2 { animation-delay: 1s; animation-duration: 3.5s; }
            .bubble.b3 { animation-delay: 2s; animation-duration: 5s; }
            .bubble.b4 { animation-delay: 0.5s; animation-duration: 3s; }

            @keyframes rise {
                0%   { transform: translateY(0); opacity: 0.3; }
                50%  { opacity: 0.15; }
                100% { transform: translateY(-60px); opacity: 0; }
            }

            /* ====== FLOW STREAM ANIMATION ====== */
            .flow-stream {
                animation: flowDash 0.8s linear infinite;
            }

            @keyframes flowDash {
                0%   { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: -14; }
            }

            /* ====== SPLASH ANIMATION ====== */
            .splash {
                animation: splashOut 1.2s ease-out infinite;
            }
            .splash.s2 { animation-delay: 0.3s; }
            .splash.s3 { animation-delay: 0.6s; }
            .splash.s4 { animation-delay: 0.15s; }

            @keyframes splashOut {
                0%   { transform: translate(0, 0) scale(1); opacity: 0.6; }
                50%  { transform: translate(var(--sx, -3px), -6px) scale(1.3); opacity: 0.3; }
                100% { transform: translate(var(--sx, -6px), -2px) scale(0.5); opacity: 0; }
            }

            /* ====== DRIP ANIMATION ====== */
            .drip {
                animation: dripFall 1.5s ease-in infinite;
            }
            .drip.d2 { animation-delay: 0.7s; }

            @keyframes dripFall {
                0%   { transform: translateY(0); opacity: 0.8; r: 2; }
                60%  { opacity: 0.5; }
                100% { transform: translateY(20px); opacity: 0; r: 1; }
            }

            /* ====== OVERLAY TEXT ====== */
            .tank-overlay {
                position: absolute;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                z-index: 10;
                color: white;
                text-shadow:
                    0 1px 3px rgba(0,0,0,0.7),
                    0 0 10px rgba(0,0,0,0.3);
                pointer-events: none;
                transition: top 1s ease;
            }
            
            .percentage {
                font-size: 2em;
                font-weight: 700;
                line-height: 1;
                letter-spacing: -0.02em;
            }
            .percentage .pct {
                font-size: 0.5em;
                font-weight: 500;
                opacity: 0.85;
                vertical-align: super;
            }
            .percentage.low {
                color: #fbbf24;
            }
            
            .temperature {
                font-size: 0.9em;
                margin-top: 4px;
                font-weight: 500;
                opacity: 0.9;
            }
            .temperature.warn {
                color: #fbbf24;
            }
            
            /* ====== WARNING ICONS ====== */
            .warning-icon {
                position: absolute;
                z-index: 20;
                animation: pulse 1.5s ease-in-out infinite;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            }
            
            .temp-warning {
                top: 5px;
                left: 50%;
                transform: translateX(-50%);
            }
            
            .low-warning {
                bottom: 40px;
                left: 50%;
                transform: translateX(-50%);
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
                50% { opacity: 0.5; transform: translateX(-50%) scale(0.9); }
            }
            
            /* ====== INFO BAR ====== */
            .info-bar {
                display: flex;
                justify-content: center;
                gap: 20px;
                width: 100%;
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid rgba(128,128,128,0.15);
            }
            .stat {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .stat-icon {
                color: var(--secondary-text-color);
                opacity: 0.5;
                display: flex;
                align-items: center;
            }
            .stat-icon.active {
                color: #3b82f6;
                opacity: 1;
                animation: pulse-icon 2s ease-in-out infinite;
            }
            .stat-icon.outflow-active {
                color: #f97316;
                opacity: 1;
                animation: pulse-icon 2s ease-in-out infinite;
            }

            @keyframes pulse-icon {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }

            .stat-data {
                display: flex;
                flex-direction: column;
            }
            .label {
                font-size: 0.7em;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--secondary-text-color);
                opacity: 0.7;
            }
            .value {
                font-size: 1.05em;
                font-weight: 600;
                color: var(--primary-text-color);
            }
        `;
  }
}

customElements.define("water-tank-card", WaterTankCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "water-tank-card",
  name: "Water Tank Card",
  preview: true,
  description: "A card to visualize water tank volume, temperature and flows with safety warnings.",
});

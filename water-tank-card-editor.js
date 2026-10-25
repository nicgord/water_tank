import {
    LitElement,
    html,
    css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

console.info("WATER TANK EDITOR LOADED");

class WaterTankCardEditor extends LitElement {
    static get properties() {
        return {
            hass: { type: Object },
            config: { type: Object },
        };
    }

    setConfig(config) {
        this.config = config;
    }

    _asBoolean(value, defaultValue = true) {
        if (value === undefined || value === null) {
            return defaultValue;
        }
        if (typeof value === "boolean") {
            return value;
        }
        const normalized = String(value).toLowerCase().trim();
        if (["true", "1", "on", "yes"].includes(normalized)) return true;
        if (["false", "0", "off", "no"].includes(normalized)) return false;
        return defaultValue;
    }

    _asBoolean(value, defaultValue = true) {
        if (value === undefined || value === null) {
            return defaultValue;
        }
        if (typeof value === "boolean") {
            return value;
        }
        const normalized = String(value).toLowerCase().trim();
        if (["true", "1", "on", "yes"].includes(normalized)) return true;
        if (["false", "0", "off", "no"].includes(normalized)) return false;
        return defaultValue;
    }

    _asBoolean(value, defaultValue = true) {
        if (value === undefined || value === null) {
            return defaultValue;
        }
        if (typeof value === "boolean") {
            return value;
        }
        const normalized = String(value).toLowerCase().trim();
        if (["true", "1", "on", "yes"].includes(normalized)) return true;
        if (["false", "0", "off", "no"].includes(normalized)) return false;
        return defaultValue;
    }

    render() {
        if (!this.hass || !this.config) {
            return html``;
        }

        return html`
            <div class="card-config">
                <div class="option">
                    <ha-formfield label="Show Litres Below Percentage">
                        <ha-checkbox
                            .checked=${this._asBoolean(this.config.show_volume, false)}
                            .configValue=${"show_volume"}
                            @change=${this._valueChanged}
                        ></ha-checkbox>
                    </ha-formfield>
                </div>
                <div class="option">
                    <label class="number-field">
                        <span>Tank Capacity (L, or US gal with US units)</span>
                        <input
                        min="0"
                        .value=${this.config.max_volume || ""}
                        .configValue=${"max_volume"}
                        type="number"
                        @input=${this._valueChanged}
                    >
                    </label>
                    <div class="helper">For % sensors, set capacity to calculate litres; otherwise match the volume sensor units.</div>
                </div>
                <div class="option">
                    <label class="number-field">
                        <span>Low Level Threshold (%)</span>
                        <input
                        .value=${this.config.low_level_threshold || 10}
                        .configValue=${"low_level_threshold"}
                        type="number"
                        @input=${this._valueChanged}
                    >
                    </label>
                </div>
                <div class="option">
                    <ha-formfield label="Show Pipes & Flow Animation">
                        <ha-checkbox
                            .checked=${this._asBoolean(this.config.show_pipes, true)}
                            .configValue=${"show_pipes"}
                            @change=${this._valueChanged}
                        ></ha-checkbox>
                    </ha-formfield>
                </div>
                <div class="option">
                    <ha-formfield label="Use Wide Tank">
                        <ha-checkbox
                            .checked=${this._asBoolean(this.config.wide_tank, false)}
                            .configValue=${"wide_tank"}
                            @change=${this._valueChanged}
                        ></ha-checkbox>
                    </ha-formfield>
                </div>
                <div class="option">
                    <ha-formfield label="Show Today's Inflow">
                        <ha-checkbox
                            .checked=${this._asBoolean(this.config.show_today_inflow, true)}
                            .configValue=${"show_today_inflow"}
                            @change=${this._valueChanged}
                        ></ha-checkbox>
                    </ha-formfield>
                </div>
                <div class="option">
                    <label class="number-field">
                        <span>Roof Size (m² or ft²)</span>
                        <input
                        .value=${this.config.roof_size || 100}
                        .configValue=${"roof_size"}
                        type="number"
                        @input=${this._valueChanged}
                    >
                    </label>
                </div>
                <div class="option">
                    <label class="number-field">
                        <span>High Temp Threshold (°C)</span>
                        <input
                        .value=${this.config.warning_threshold || 20}
                        .configValue=${"warning_threshold"}
                        type="number"
                        @input=${this._valueChanged}
                    >
                    </label>
                </div>

            </div>
        `;
    }

    _valueChanged(ev) {
        if (!this.config || !this.hass) {
            return;
        }
        const target = ev.target;
        if (target.configValue) {
            if (target.type === "checkbox" || target.tagName === "HA-CHECKBOX") {
                // Handle booleans (switches)
                this.config = {
                    ...this.config,
                    [target.configValue]: target.checked,
                };
            } else {
                // Handle strings/numbers (textfields, pickers)
                if (target.value === "" || target.value === undefined || target.value === null) {
                    const tmpConfig = { ...this.config };
                    delete tmpConfig[target.configValue];
                    this.config = tmpConfig;
                } else {
                    this.config = {
                        ...this.config,
                        [target.configValue]: target.value,
                    };
                }
            }
        }

        // Ensure values are numbers where expected
        if (this.config.roof_size) this.config.roof_size = Number(this.config.roof_size);
        if (this.config.max_volume) this.config.max_volume = Number(this.config.max_volume);
        if (this.config.warning_threshold) this.config.warning_threshold = Number(this.config.warning_threshold);
        if (this.config.low_level_threshold) this.config.low_level_threshold = Number(this.config.low_level_threshold);

        const event = new CustomEvent("config-changed", {
            detail: { config: this.config },
            bubbles: true,
            composed: true,
        });
        this.dispatchEvent(event);
    }

    static get styles() {
        return css`
            .card-config {
                display: flex;
                flex-direction: column;
            }
            .option {
                margin-bottom: 20px;
                display: block; /* Ensure block display key for spacing */
            }
            .number-field { display: flex; flex-direction: column; gap: 8px; }
            .number-field input {
                box-sizing: border-box;
                padding: 12px;
                border: 1px solid var(--divider-color, #888);
                border-radius: 4px;
                color: var(--primary-text-color);
                background: var(--card-background-color);
                font: inherit;
            }
            .helper { margin-top: 6px; color: var(--secondary-text-color); font-size: 0.85em; }
            .number-field input, ha-entity-picker {
                width: 100%;
                display: block;
            }
        `;
    }
}

customElements.define("water-tank-card-editor", WaterTankCardEditor);

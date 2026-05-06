import { useCallback, useState } from "react";
import type { ColorNode } from "../../shared/colorEngine";
import type { AiSettings, AiSuggestion, ReviewState, SuggestionConfidence, SuggestionRisk, RgbFrame } from "../../shared/aiGrading";
import {
  generateAutoBalanceAndDiagnostics,
  generateNaturalLanguageSuggestions,
  parseNaturalLanguageIntent
} from "../../shared/aiGrading";

interface AiPanelProps {
  settings: AiSettings;
  onSettingsChange: (settings: AiSettings) => void;
  onApplySuggestion: (nodes: ColorNode[]) => void;
  currentNodes: readonly ColorNode[];
  currentFrame?: RgbFrame;
}

type AiTab = "suggest" | "review" | "settings";

const CONFIDENCE_LABELS: Record<SuggestionConfidence, string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence"
};

const RISK_LABELS: Record<SuggestionRisk, string> = {
  safe: "Safe",
  moderate: "Moderate changes",
  aggressive: "Aggressive"
};

export function AiPanel({
  settings,
  onSettingsChange,
  onApplySuggestion,
  currentNodes,
  currentFrame
}: AiPanelProps) {
  const [selectedTab, setSelectedTab] = useState<AiTab>("suggest");
  const [intentPrompt, setIntentPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [reviewState, setReviewState] = useState<ReviewState>({
    accepted: [],
    rejected: [],
    pending: []
  });
  const [intentParseResult, setIntentParseResult] = useState<string | null>(null);

  const handleRunAutoBalance = useCallback(() => {
    if (!currentFrame) return;

    const results = generateAutoBalanceAndDiagnostics(currentFrame, currentNodes);
    setSuggestions(results);
    setReviewState(prev => ({
      ...prev,
      pending: [...prev.pending, ...results]
    }));
  }, [currentFrame, currentNodes]);

  const handleParseIntent = useCallback(() => {
    if (!intentPrompt.trim()) return;

    const parsed = parseNaturalLanguageIntent(intentPrompt);
    if (parsed.unsupportedTerms.length > 0 && parsed.actions.length === 0) {
      setIntentParseResult(`Could not understand: "${parsed.unsupportedTerms.join(", ")}". Try terms like "warmer", "contrasty", "less saturated".`);
    } else {
      const actions = parsed.actions.length > 0
        ? `Detected: ${parsed.actions.join(", ")}`
        : "No specific intents detected";
      setIntentParseResult(`${actions} (${Math.round(parsed.confidence * 100)}% confidence)`);
    }
  }, [intentPrompt]);

  const handleApplyIntent = useCallback(() => {
    if (!intentPrompt.trim()) return;

    const suggestion = generateNaturalLanguageSuggestions(intentPrompt, currentNodes);
    if (suggestion) {
      setSuggestions(prev => [...prev, suggestion]);
      setReviewState(prev => ({
        ...prev,
        pending: [...prev.pending, suggestion]
      }));
    }
  }, [intentPrompt, currentNodes]);

  const handleAcceptSuggestion = useCallback((suggestion: AiSuggestion) => {
    onApplySuggestion(suggestion.suggestedNodes);
    setReviewState(prev => ({
      pending: prev.pending.filter(s => s.id !== suggestion.id),
      accepted: [...prev.accepted, suggestion],
      rejected: prev.rejected
    }));
  }, [onApplySuggestion]);

  const handleRejectSuggestion = useCallback((suggestion: AiSuggestion) => {
    setReviewState(prev => ({
      pending: prev.pending.filter(s => s.id !== suggestion.id),
      accepted: prev.accepted,
      rejected: [...prev.rejected, suggestion]
    }));
  }, []);

  const handleClearAccepted = useCallback(() => {
    setReviewState(prev => ({ ...prev, accepted: [] }));
  }, []);

  const handleClearRejected = useCallback(() => {
    setReviewState(prev => ({ ...prev, rejected: [] }));
  }, []);

  const handleSettingChange = useCallback(<K extends keyof AiSettings>(key: K, value: AiSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  }, [settings, onSettingsChange]);

  return (
    <aside className="ai-panel">
      <div className="ai-tabs">
        <button
          type="button"
          className={selectedTab === "suggest" ? "is-active" : ""}
          onClick={() => setSelectedTab("suggest")}
        >
          Suggest
        </button>
        <button
          type="button"
          className={selectedTab === "review" ? "is-active" : ""}
          onClick={() => setSelectedTab("review")}
        >
          Review
          {reviewState.pending.length > 0 && (
            <span className="badge">{reviewState.pending.length}</span>
          )}
        </button>
        <button
          type="button"
          className={selectedTab === "settings" ? "is-active" : ""}
          onClick={() => setSelectedTab("settings")}
        >
          Settings
        </button>
      </div>

      <div className="ai-content">
        {selectedTab === "suggest" && (
          <div className="ai-section">
            <div className="ai-subsection">
              <h4>Auto Balance</h4>
              <p className="ai-description">
                Analyze the current frame and suggest exposure, contrast, white balance, and saturation corrections.
              </p>
              <button
                type="button"
                className="primary-action"
                onClick={handleRunAutoBalance}
                disabled={!currentFrame}
              >
                Run Auto Balance
              </button>
            </div>

            <div className="ai-subsection">
              <h4>Natural Language Intent</h4>
              <p className="ai-description">
                Describe the look you want in plain language.
              </p>
              <input
                type="text"
                className="ai-prompt-input"
                placeholder="e.g., warmer skin tones, softer contrast"
                value={intentPrompt}
                onChange={(e) => setIntentPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleParseIntent();
                  }
                }}
              />
              <div className="ai-prompt-actions">
                <button type="button" onClick={handleParseIntent}>
                  Parse Intent
                </button>
                <button
                  type="button"
                  className="primary-action"
                  onClick={handleApplyIntent}
                  disabled={!intentPrompt.trim()}
                >
                  Apply Intent
                </button>
              </div>
              {intentParseResult && (
                <div className="ai-parse-result">{intentParseResult}</div>
              )}
            </div>

            <div className="ai-subsection">
              <h4>Reference Match</h4>
              <p className="ai-description">
                Match the current shot to a reference still or graded frame.
              </p>
              <button type="button" disabled>
                Select Reference (Coming Soon)
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="ai-subsection">
                <h4>Generated Suggestions</h4>
                <div className="suggestion-list">
                  {suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="suggestion-card">
                      <div className="suggestion-header">
                        <span className={`confidence-${suggestion.metadata.confidence}`}>
                          {CONFIDENCE_LABELS[suggestion.metadata.confidence]}
                        </span>
                        <span className={`risk-${suggestion.metadata.risk}`}>
                          {RISK_LABELS[suggestion.metadata.risk]}
                        </span>
                      </div>
                      <p className="suggestion-reason">{suggestion.metadata.reason}</p>
                      <div className="suggestion-changes">
                        {suggestion.metadata.changedControls.slice(0, 3).map((change, i) => (
                          <span key={i} className="change-tag">{change.controlPath}</span>
                        ))}
                        {suggestion.metadata.changedControls.length > 3 && (
                          <span className="change-tag">+{suggestion.metadata.changedControls.length - 3}</span>
                        )}
                      </div>
                      <div className="suggestion-actions">
                        <button
                          type="button"
                          className="primary-action"
                          onClick={() => handleAcceptSuggestion(suggestion)}
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectSuggestion(suggestion)}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === "review" && (
          <div className="ai-section">
            {reviewState.pending.length > 0 && (
              <div className="review-subsection">
                <h4>Pending Review</h4>
                <div className="review-list">
                  {reviewState.pending.map((suggestion) => (
                    <div key={suggestion.id} className="review-card is-pending">
                      <div className="review-header">
                        <span className="review-type">{suggestion.metadata.type}</span>
                        <span className={`confidence-${suggestion.metadata.confidence}`}>
                          {CONFIDENCE_LABELS[suggestion.metadata.confidence]}
                        </span>
                      </div>
                      <p className="review-reason">{suggestion.metadata.reason}</p>
                      <div className="review-actions">
                        <button
                          type="button"
                          className="primary-action"
                          onClick={() => handleAcceptSuggestion(suggestion)}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectSuggestion(suggestion)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviewState.accepted.length > 0 && (
              <div className="review-subsection">
                <div className="review-section-header">
                  <h4>Accepted</h4>
                  <button type="button" className="clear-btn" onClick={handleClearAccepted}>
                    Clear
                  </button>
                </div>
                <div className="review-list">
                  {reviewState.accepted.map((suggestion) => (
                    <div key={suggestion.id} className="review-card is-accepted">
                      <div className="review-header">
                        <span className="review-type">{suggestion.metadata.type}</span>
                        <span className="review-time">
                          {new Date(suggestion.metadata.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="review-reason">{suggestion.metadata.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviewState.rejected.length > 0 && (
              <div className="review-subsection">
                <div className="review-section-header">
                  <h4>Rejected</h4>
                  <button type="button" className="clear-btn" onClick={handleClearRejected}>
                    Clear
                  </button>
                </div>
                <div className="review-list">
                  {reviewState.rejected.map((suggestion) => (
                    <div key={suggestion.id} className="review-card is-rejected">
                      <div className="review-header">
                        <span className="review-type">{suggestion.metadata.type}</span>
                        <span className="review-time">
                          {new Date(suggestion.metadata.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="review-reason">{suggestion.metadata.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviewState.pending.length === 0 &&
             reviewState.accepted.length === 0 &&
             reviewState.rejected.length === 0 && (
              <div className="ai-empty">
                <p>No suggestions reviewed yet.</p>
                <p className="muted">Run auto balance or enter a grade intent to get AI suggestions.</p>
              </div>
            )}
          </div>
        )}

        {selectedTab === "settings" && (
          <div className="ai-section">
            <div className="ai-settings-group">
              <label className="ai-setting-row">
                <span className="ai-setting-label">AI Features</span>
                <button
                  type="button"
                  className={`toggle-btn ${settings.enabled ? "is-on" : ""}`}
                  onClick={() => handleSettingChange("enabled", !settings.enabled)}
                >
                  {settings.enabled ? "On" : "Off"}
                </button>
              </label>

              <label className="ai-setting-row">
                <span className="ai-setting-label">Mode</span>
                <select
                  value={settings.mode}
                  onChange={(e) => handleSettingChange("mode", e.target.value as "offline" | "cloud-assisted")}
                  disabled={!settings.enabled}
                >
                  <option value="offline">Offline (Local)</option>
                  <option value="cloud-assisted">Cloud Assisted</option>
                </select>
              </label>

              {settings.mode === "cloud-assisted" && (
                <>
                  <label className="ai-setting-row">
                    <span className="ai-setting-label">API Provider</span>
                    <select
                      value={settings.cloudProvider ?? ""}
                      onChange={(e) => handleSettingChange("cloudProvider", e.target.value)}
                      disabled={!settings.enabled}
                    >
                      <option value="">Select provider...</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="openai">OpenAI</option>
                    </select>
                  </label>

                  <label className="ai-setting-row">
                    <span className="ai-setting-label">API Key</span>
                    <input
                      type="password"
                      value={settings.apiKey ?? ""}
                      onChange={(e) => handleSettingChange("apiKey", e.target.value)}
                      placeholder="Enter API key"
                      disabled={!settings.enabled}
                    />
                  </label>
                </>
              )}

              <label className="ai-setting-row">
                <span className="ai-setting-label">Request Budget</span>
                <div className="ai-setting-range">
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={settings.requestBudgetLimit ?? ""}
                    onChange={(e) => handleSettingChange("requestBudgetLimit", e.target.value ? Number(e.target.value) : undefined)}
                    disabled={!settings.enabled}
                    placeholder="Unlimited"
                  />
                  <span className="ai-setting-unit">requests/month</span>
                </div>
              </label>

              {settings.requestBudgetLimit !== undefined && (
                <div className="ai-budget-bar">
                  <div
                    className="ai-budget-fill"
                    style={{
                      width: `${Math.min(100, (settings.requestBudgetUsed / settings.requestBudgetLimit) * 100)}%`
                    }}
                  />
                  <span className="ai-budget-label">
                    {settings.requestBudgetUsed} / {settings.requestBudgetLimit}
                  </span>
                </div>
              )}

              <label className="ai-setting-row">
                <span className="ai-setting-label">Telemetry</span>
                <button
                  type="button"
                  className={`toggle-btn ${settings.telemetryConsent ? "is-on" : ""}`}
                  onClick={() => handleSettingChange("telemetryConsent", !settings.telemetryConsent)}
                  disabled={!settings.enabled}
                >
                  {settings.telemetryConsent ? "On" : "Off"}
                </button>
              </label>
              <p className="ai-setting-help">
                Help improve Chroma Node by sharing anonymous usage data.
              </p>

              <div className="ai-setting-divider" />

              <label className="ai-setting-row">
                <span className="ai-setting-label">Timeout</span>
                <div className="ai-setting-range">
                  <input
                    type="number"
                    min="1000"
                    max="120000"
                    step="1000"
                    value={settings.timeoutMs}
                    onChange={(e) => handleSettingChange("timeoutMs", Number(e.target.value))}
                    disabled={!settings.enabled}
                  />
                  <span className="ai-setting-unit">ms</span>
                </div>
              </label>

              <label className="ai-setting-row">
                <span className="ai-setting-label">Max Retries</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={settings.maxRetries}
                  onChange={(e) => handleSettingChange("maxRetries", Number(e.target.value))}
                  disabled={!settings.enabled}
                  className="ai-setting-number"
                />
              </label>

              <label className="ai-setting-row">
                <span className="ai-setting-label">Degraded Mode</span>
                <button
                  type="button"
                  className={`toggle-btn ${settings.degradedModeOnFailure ? "is-on" : ""}`}
                  onClick={() => handleSettingChange("degradedModeOnFailure", !settings.degradedModeOnFailure)}
                  disabled={!settings.enabled}
                >
                  {settings.degradedModeOnFailure ? "On" : "Off"}
                </button>
              </label>
              <p className="ai-setting-help">
                Continue with local-only features when cloud AI fails.
              </p>
            </div>

            <div className="ai-privacy-warning">
              <h4>Privacy Note</h4>
              <p>
                When cloud-assisted mode is enabled, media-derived data may be sent to your configured provider.
                File paths and media identifiers are redacted from logs by default.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

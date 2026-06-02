import { useCallback, useEffect, useState } from "react";
import type { EntitlementState, LicenseValidationResult } from "../../shared/entitlement";
import type { TelemetryConsentState } from "../../shared/telemetry";
import type { UpdateCheckResult } from "../../shared/update";

const api = window.chromaNode;

export function CommercialReadinessPanel() {
  const [license, setLicense] = useState<EntitlementState | undefined>();
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseValidation, setLicenseValidation] = useState<LicenseValidationResult | undefined>();
  const [telemetry, setTelemetry] = useState<TelemetryConsentState | undefined>();
  const [queueSize, setQueueSize] = useState(0);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | undefined>();
  const [message, setMessage] = useState("Commercial systems ready.");

  const refresh = useCallback(async () => {
    if (!api) return;

    const [licenseState, consentState, queue] = await Promise.all([
      api.getLicenseState(),
      api.getTelemetryConsent(),
      api.getTelemetryQueueSize()
    ]);

    if (licenseState.result.ok) {
      setLicense(licenseState.result.value);
    }
    if (consentState.result.ok) {
      setTelemetry(consentState.result.value);
    }
    if (queue.result.ok) {
      setQueueSize(queue.result.value);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const validateLicense = async () => {
    if (!api) return;
    const response = await api.validateLicense();
    if (!response.result.ok) {
      setMessage(response.result.error.message);
      return;
    }
    setLicenseValidation(response.result.value);
    setLicense(response.result.value.state);
    setMessage(response.result.value.valid ? "License valid." : response.result.value.error ?? "License invalid.");
  };

  const startTrial = async () => {
    if (!api) return;
    const response = await api.startTrial();
    if (!response.result.ok) {
      setMessage(response.result.error.message);
      return;
    }
    setLicense(response.result.value);
    setMessage("Trial started.");
  };

  const activate = async () => {
    if (!api || !licenseKey.trim()) return;
    const response = await api.activateLicense({ licenseKey: licenseKey.trim() });
    if (!response.result.ok) {
      setMessage(response.result.error.message);
      return;
    }
    if (!response.result.value.success) {
      setMessage(response.result.value.errorMessage ?? "Activation failed.");
      return;
    }
    setMessage(`Activated ${response.result.value.tier}.`);
    setLicenseKey("");
    await refresh();
  };

  const setTelemetryConsent = async (consent: "granted" | "declined") => {
    if (!api) return;
    const response = await api.setTelemetryConsent(consent);
    if (!response.result.ok) {
      setMessage(response.result.error.message);
      return;
    }
    setTelemetry(response.result.value);
    setMessage(consent === "granted" ? "Telemetry enabled." : "Telemetry declined.");
  };

  const flushTelemetry = async () => {
    if (!api) return;
    const response = await api.flushTelemetry();
    if (!response.result.ok) {
      setMessage(response.result.error.message);
      return;
    }
    setMessage(`Telemetry sent ${response.result.value.sent}; failed ${response.result.value.failed}.`);
    await refresh();
  };

  const checkForUpdate = async () => {
    if (!api) return;
    const response = await api.checkForUpdate();
    if (!response.result.ok) {
      setMessage(response.result.error.message);
      return;
    }
    setUpdateResult(response.result.value);
    setMessage(response.result.value.available ? `Update ${response.result.value.version} available.` : "No update available.");
  };

  const createSupportBundle = async () => {
    if (!api) return;
    const response = await api.createSupportBundle({
      includeLogs: true,
      includeProjectDiagnostics: true,
      includeMediaMetadata: true,
      redactPaths: true
    });
    setMessage(response.result.ok ? `Support bundle: ${response.result.value.path}` : response.result.error.message);
  };

  return (
    <section className="commercial-panel" aria-label="Commercial readiness">
      <dl className="metadata-table">
        <div>
          <dt>License</dt>
          <dd>{license ? `${license.tier} / ${license.status}` : "Unknown"}</dd>
        </div>
        <div>
          <dt>Telemetry</dt>
          <dd>{telemetry?.consent ?? "pending"} ({queueSize})</dd>
        </div>
        <div>
          <dt>Update</dt>
          <dd>{updateResult?.available ? updateResult.version ?? "available" : "idle"}</dd>
        </div>
      </dl>
      <div className="commercial-panel__row">
        <button type="button" onClick={validateLicense}>Validate</button>
        <button type="button" onClick={startTrial}>Trial</button>
        <button type="button" onClick={() => api?.deactivateLicense().then(refresh)}>Deactivate</button>
      </div>
      <div className="commercial-panel__input">
        <input
          type="text"
          value={licenseKey}
          onChange={(event) => setLicenseKey(event.currentTarget.value)}
          placeholder="License key"
          aria-label="License key"
        />
        <button type="button" onClick={activate} disabled={!licenseKey.trim()}>Activate</button>
      </div>
      <div className="commercial-panel__row">
        <button type="button" onClick={() => setTelemetryConsent("granted")}>Telemetry On</button>
        <button type="button" onClick={() => setTelemetryConsent("declined")}>Off</button>
        <button type="button" onClick={flushTelemetry}>Flush</button>
      </div>
      <div className="commercial-panel__row">
        <button type="button" onClick={checkForUpdate}>Updates</button>
        <button type="button" onClick={createSupportBundle}>Support</button>
      </div>
      {licenseValidation && !licenseValidation.valid ? <p className="muted">{licenseValidation.error}</p> : null}
      <p className="muted">{message}</p>
    </section>
  );
}

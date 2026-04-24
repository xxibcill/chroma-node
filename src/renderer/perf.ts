export interface PerformanceMeasurement {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export interface PerformanceReport {
  measurements: PerformanceMeasurement[];
  clipInfo?: {
    width: number;
    height: number;
    frameRate: number;
    totalFrames: number;
    codec: string;
  };
}

const MAX_MEASUREMENTS = 1000;

class PerformanceTracker {
  private measurements: PerformanceMeasurement[] = [];
  private startTimes: Map<string, number> = new Map();

  start(label: string): void {
    this.startTimes.set(label, performance.now());
  }

  end(label: string, unit: string = "ms"): PerformanceMeasurement | undefined {
    const startTime = this.startTimes.get(label);
    if (startTime === undefined) {
      return undefined;
    }

    this.startTimes.delete(label);
    const value = performance.now() - startTime;
    const measurement: PerformanceMeasurement = {
      name: label,
      value,
      unit,
      timestamp: Date.now()
    };

    this.measurements.push(measurement);
    if (this.measurements.length > MAX_MEASUREMENTS) {
      this.measurements.shift();
    }

    return measurement;
  }

  record(name: string, value: number, unit: string = "ms"): PerformanceMeasurement {
    const measurement: PerformanceMeasurement = {
      name,
      value,
      unit,
      timestamp: Date.now()
    };

    this.measurements.push(measurement);
    if (this.measurements.length > MAX_MEASUREMENTS) {
      this.measurements.shift();
    }

    return measurement;
  }

  getMeasurements(name?: string): PerformanceMeasurement[] {
    if (name === undefined) {
      return [...this.measurements];
    }

    return this.measurements.filter((m) => m.name.startsWith(name));
  }

  getReport(): PerformanceReport {
    return {
      measurements: [...this.measurements]
    };
  }

  clear(): void {
    this.measurements = [];
    this.startTimes.clear();
  }

  getAverage(name: string): number | undefined {
    const matching = this.measurements.filter((m) => m.name === name);
    if (matching.length === 0) {
      return undefined;
    }

    const sum = matching.reduce((acc, m) => acc + m.value, 0);
    return sum / matching.length;
  }

  getMin(name: string): number | undefined {
    const matching = this.measurements.filter((m) => m.name === name);
    if (matching.length === 0) {
      return undefined;
    }

    return Math.min(...matching.map((m) => m.value));
  }

  getMax(name: string): number | undefined {
    const matching = this.measurements.filter((m) => m.name === name);
    if (matching.length === 0) {
      return undefined;
    }

    return Math.max(...matching.map((m) => m.value));
  }
}

export const perf = new PerformanceTracker();

export function measureImportTime<T>(fn: () => T | Promise<T>): Promise<T> | T {
  perf.start("import.total");
  const result = fn();
  if (result instanceof Promise) {
    return (async () => {
      try {
        const value = await result;
        perf.end("import.total");
        return value;
      } catch (e) {
        perf.end("import.total");
        throw e;
      }
    })();
  }
  perf.end("import.total");
  return result;
}

export function measureFirstFrameTime<T>(fn: () => T | Promise<T>): Promise<T> | T {
  perf.start("firstFrame.total");
  const result = fn();
  if (result instanceof Promise) {
    return (async () => {
      try {
        const value = await result;
        perf.end("firstFrame.total");
        return value;
      } catch (e) {
        perf.end("firstFrame.total");
        throw e;
      }
    })();
  }
  perf.end("firstFrame.total");
  return result;
}

export function formatPerformanceSummary(): string {
  const lines: string[] = ["Performance Summary", "====================="];

  const categories = [
    { prefix: "import.", label: "Import" },
    { prefix: "firstFrame.", label: "First Frame" },
    { prefix: "playback.", label: "Playback" },
    { prefix: "scope.", label: "Scopes" },
    { prefix: "tracking.", label: "Tracking" },
    { prefix: "export.", label: "Export" }
  ];

  for (const { prefix, label } of categories) {
    const measurements = perf.getMeasurements(prefix);
    if (measurements.length === 0) {
      continue;
    }

    lines.push(`\n${label}:`);
    const byName = new Map<string, number[]>();
    for (const m of measurements) {
      const name = m.name.slice(prefix.length);
      if (!byName.has(name)) {
        byName.set(name, []);
      }
      byName.get(name)!.push(m.value);
    }

    for (const [name, values] of byName) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      lines.push(`  ${name}: avg=${avg.toFixed(2)}ms min=${min.toFixed(2)}ms max=${max.toFixed(2)}ms (n=${values.length})`);
    }
  }

  return lines.join("\n");
}

/**
 * Aggregates raw emotion scores from multiple data points into time buckets.
 * Used for generating global emotion trend charts.
 */
export function aggregateScores(allScores: any[]) {
    // Bucket by nearest minute (or 30s)
    // Structure: timeString -> { count, sumScores: { emotion: totalVal } }
    const buckets: Record<string, { count: number, sumScores: Record<string, number> }> = {};

    console.log(`[Analytics] Processing ${allScores.length} data points.`);

    for (const point of allScores) {
        let ts = typeof point.timestamp === "number" ? Math.floor(point.timestamp) : null;
        if (ts === null && point.time) {
            // Parse "MM:SS" back to seconds if needed, or check if point.time is consistent
        }

        // Use "MM:SS" string as key if available, otherwise derive from timestamp
        let timeKey = point.time;
        if (!timeKey && typeof point.timestamp === "number") {
            const m = Math.floor(point.timestamp / 60).toString().padStart(2, "0");
            const s = Math.floor(point.timestamp % 60).toString().padStart(2, "0");
            timeKey = `${m}:${s}`;
        }

        if (!timeKey) continue;

        if (!buckets[timeKey]) buckets[timeKey] = { count: 0, sumScores: {} };
        buckets[timeKey].count++;

        // Extract scores from point
        // Format A: { scores: { Joy: 0.5, ... } }
        // Format B: { emotions: [{ name: "Joy", score: 0.5 }, ... ] }
        let currentScores: Record<string, number> = {};

        if (point.scores) {
            currentScores = point.scores;
        } else if (Array.isArray(point.emotions)) {
            for (const e of point.emotions) {
                currentScores[e.name] = e.score;
            }
        }

        // Add to bucket sum
        for (const [emotion, score] of Object.entries(currentScores)) {
            buckets[timeKey].sumScores[emotion] = (buckets[timeKey].sumScores[emotion] || 0) + score;
        }
    }

    // Average out
    const result = Object.entries(buckets).map(([time, data]) => {
        const averagedScores: Record<string, number | string> = { time }; // Include time for Recharts
        for (const [emotion, total] of Object.entries(data.sumScores)) {
            averagedScores[emotion] = total / data.count;
        }
        return averagedScores;
    }).sort((a, b) => (a.time as string).localeCompare(b.time as string));

    console.log(`[Analytics] Resulted in ${result.length} time buckets.`);
    return result;
}

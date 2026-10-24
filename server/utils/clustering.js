/**
 * GrievancePulse AI — Duplicate Clustering Engine
 * Groups grievances by: geo-proximity (≤500m), hashtag overlap (≥2), or text similarity (≥0.7)
 */

const CLUSTER_RADIUS_METERS = 500;
const SIMILARITY_THRESHOLD = 0.7;
const HASHTAG_OVERLAP_MIN = 2;

// ─── Haversine Distance ───────────────────────────────────────────────────────

function haversineDistance(coord1, coord2) {
  const R = 6371000; // Earth radius in meters
  const toRad = deg => (deg * Math.PI) / 180;

  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Jaccard String Similarity ────────────────────────────────────────────────

function stringSimilarity(textA, textB) {
  const tokenize = t =>
    new Set(
      t
        .toLowerCase()
        .replace(/[^a-z0-9\s#]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2)
    );

  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;

  return intersection / union;
}

// ─── Hashtag Overlap Count ────────────────────────────────────────────────────

function hashtagOverlap(hashtagsA, hashtagsB) {
  const setA = new Set((hashtagsA || []).map(h => h.toLowerCase()));
  return (hashtagsB || []).filter(h => setA.has(h.toLowerCase())).length;
}

// ─── Main Clustering Algorithm ────────────────────────────────────────────────

/**
 * Assigns cluster IDs to records that don't have one yet,
 * and preserves existing cluster IDs from seed data.
 * Returns a new array with updated cluster assignments.
 */
function clusterGrievances(records) {
  // Work on a copy; preserve existing cluster IDs from seed
  const result = records.map(r => ({ ...r }));
  const usedClusterIds = new Set(result.map(r => r.duplicate_cluster_id).filter(Boolean));
  let clusterCounter = 1;

  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const a = result[i];
      const b = result[j];
      if (a.duplicate_cluster_id && b.duplicate_cluster_id) continue;
      if (a.department && b.department && a.department !== b.department) continue;
      if (a.sector && b.sector && a.sector !== b.sector) continue;
      if (a.category && b.category && a.category !== b.category) continue;

      let shouldCluster = false;

      // 1. Geo-proximity check
      if (
        a.coordinates && b.coordinates &&
        !a.coordinates_approximate && !b.coordinates_approximate
      ) {
        const dist = haversineDistance(a.coordinates, b.coordinates);
        if (dist <= CLUSTER_RADIUS_METERS) shouldCluster = true;
      }

      // 2. Hashtag overlap check
      if (!shouldCluster) {
        const overlap = hashtagOverlap(a.hashtags, b.hashtags);
        if (overlap >= HASHTAG_OVERLAP_MIN) shouldCluster = true;
      }

      // 3. Text similarity check
      if (!shouldCluster) {
        const sim = stringSimilarity(a.post_text, b.post_text);
        if (sim >= SIMILARITY_THRESHOLD) shouldCluster = true;
      }

      if (shouldCluster) {
        let clusterId = a.duplicate_cluster_id || b.duplicate_cluster_id;
        if (!clusterId) {
          do {
            clusterId = `AUTO_CLUSTER_${String(clusterCounter++).padStart(3, '0')}`;
          } while (usedClusterIds.has(clusterId));
          usedClusterIds.add(clusterId);
        }
        result[i].duplicate_cluster_id = clusterId;
        result[j].duplicate_cluster_id = clusterId;
      }
    }
  }

  return result;
}

// ─── Master Ticket Summaries ──────────────────────────────────────────────────

/**
 * Groups records by cluster ID and returns master ticket summaries.
 * Single-record "clusters" are excluded from the summary (not duplicates).
 */
function getMasterTickets(records) {
  const groups = {};

  for (const record of records) {
    const cid = record.duplicate_cluster_id;
    if (!cid) continue;
    if (!groups[cid]) {
      groups[cid] = {
        cluster_id: cid,
        member_ids: [],
        member_count: 0,
        department: record.department,
        category: record.category,
        location: record.location_tagged,
        max_severity: 0,
        representative_post: null,
        hashtags: new Set(),
      };
    }
    groups[cid].member_ids.push(record.id);
    groups[cid].member_count += 1;
    if (record.severity_score > groups[cid].max_severity) {
      groups[cid].max_severity = record.severity_score;
      groups[cid].representative_post = record.post_text?.slice(0, 120) + '...';
    }
    (record.hashtags || []).forEach(h => groups[cid].hashtags.add(h));
  }

  return Object.values(groups)
    .filter(g => g.member_count > 1)
    .map(g => ({ ...g, hashtags: [...g.hashtags] }))
    .sort((a, b) => b.max_severity - a.max_severity);
}

module.exports = { haversineDistance, stringSimilarity, hashtagOverlap, clusterGrievances, getMasterTickets };

export default {
  // Simplifies accessing the timeline
  timeline: () => {
    return get_delivery_details.data.timeline || [];
  },

  // Helper to get the very last status
  latestStatus: () => {
    const history = get_delivery_details.data.timeline;
    if (!history || history.length === 0) return "No Data";
    return history[history.length - 1].attempt_status;
  }
}
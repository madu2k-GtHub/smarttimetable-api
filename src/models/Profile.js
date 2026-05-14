class Profile {
  constructor(data) {
    this.id = data.id;                    // UUID from Android
    this.userId = data.user_id;           // Link to User
    this.name = data.name;
    this.age = data.age;
    this.totalStars = data.total_stars || 0;
    this.rewardGoal = data.reward_goal || 20;
    this.rewardName = data.reward_name || "Special Treat";
    this.data = data.data;                // Full JSON from Android (activities, tasks, etc.)
    this.lastSyncedAt = data.last_synced_at;
  }
}

module.exports = Profile;